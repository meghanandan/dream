function parseJsonNode(jsonStr) {
  if (!jsonStr) return {};
  try {
    return typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
  } catch (e) {
    console.error('Error parsing json_node:', e);
    return {};
  }
}

function logStep(log, message, node) {
  log.push({ step: log.length + 1, message, node: { id: node.id, label: node.data.label } });
}

function matchCondition(node, payload) {
  if (!node.data?.actionFilters) return true;
  for (const f of node.data.actionFilters) {
    const val = payload[f.field];
    if (val == null) return false;
    switch (f.comparator) {
      case '>':   if (!(+val >  +f.value)) return false; break;
      case '>=':  if (!(+val >= +f.value)) return false; break;
      case '<':   if (!(+val <  +f.value)) return false; break;
      case '<=':  if (!(+val <= +f.value)) return false; break;
      case '==':  if (!(String(val) === String(f.value))) return false; break;
      case '!=':  if (!(String(val) !== String(f.value))) return false; break;
      default: return false;
    }
  }
  return true;
}

/**
 * ENHANCED: Workflow engine that properly handles action?decision?action patterns
 */
async function runWorkflowEngine({ nodes = [], edges = [] }, payload = {}, hooks = {}) {
  if (!Array.isArray(nodes) || !Array.isArray(edges)) {
    throw new Error('nodes and edges must be arrays');
  }

  // Normalize nodes
  const cleanNodes = nodes.map(n => {
    const jsonData = n.json_node ? parseJsonNode(n.json_node) : {};
    return {
      id: String(n.node_id || n.id),
      type: n.type_node || n.typenode || n.type,
      data: {
        ...n.data,
        ...jsonData,
        label: n.data?.label || jsonData.label || 'Unnamed',
        is_end: n.type_node === 'end' || jsonData.is_end === true
      }
    };
  });

  // Build adjacency map
  const edgeMap = edges.reduce((m, e) => {
    const src = String(e.source_node_id || e.source);
    if (!m[src]) m[src] = [];
    m[src].push({
      id:    String(e.edge_id   || e.id),
      source:String(e.source_node_id || e.source),
      target:String(e.destination_node_id || e.target),
      label: e.label,
      direction: (e.direction || e.label || 'forward').toLowerCase()
    });
    return m;
  }, {});

  // Determine entry point
  let current;
  if (payload.forceNextNode) {
    current = cleanNodes.find(n => n.id === String(payload.forceNextNode));
  } else if (payload.currentNodeId) {
    current = cleanNodes.find(n => n.id === String(payload.currentNodeId));
  } else {
    current = cleanNodes.find(n => n.type === 'start');
  }
  
  if (!current) {
    throw new Error(payload.forceNextNode || payload.currentNodeId
      ? `Could not find entry node: ${payload.forceNextNode || payload.currentNodeId}`
      : 'No start node found in workflow');
  }

  const log = [], seen = new Set();
  logStep(log, `Entering ${current.data.label}`, current);

  while (true) {
    // Handle action nodes - stopping point for user interaction
    if (current.type === 'action') {
      logStep(log, `Reached action node`, current);
      if (hooks.onAction) await hooks.onAction(current, payload, log);
      
      // For createDispute (no currentNodeId), stop at first action node
      if (!payload.currentNodeId) {
        logStep(log, `Stopping at first action node for assignment`, current);
        break;
      }
      
      // For updateDispute: Only continue FROM the current node, stop at the NEXT action node
      if (payload.currentNodeId && current.id !== String(payload.currentNodeId)) {
        logStep(log, `Stopping at next action node for user decision`, current);
        break;
      }
      
      // If this IS the current node, continue processing the user's decision
    }

    // Handle end nodes
    if (current.type === 'end' || current.data.is_end) {
      logStep(log, 'Reached end node', current);
      if (hooks.onEnd) await hooks.onEnd(current, payload, log);
      break;
    }

    // Cycle detection
    if (seen.has(current.id)) {
      logStep(log, `Cycle detected at ${current.data.label}`, current);
      break;
    }
    seen.add(current.id);

    // Get outgoing edges and filter by conditions
    const outgoing = (edgeMap[current.id] || []).filter(e => matchCondition(current, payload));
    let nextEdge;

    // ?? INTELLIGENT DECISION ROUTING - Auto-detect approval/rejection paths
    if (current.type === 'decision') {
      const want = (payload.decision || '').toLowerCase();
      if (!want) {
        logStep(log, `Decision node requires explicit decision, but none provided`, current);
        break;
      }
      
      // ?? SMART EDGE DETECTION: Classify user decisions into approval/rejection
      const isApprovalDecision = ['approved', 'approve', 'accept', 'yes', 'confirm', 'allow', 'grant'].includes(want);
      const isRejectionDecision = ['rejected', 'reject', 'deny', 'no', 'decline', 'refuse', 'cancel'].includes(want);
      
      if (!isApprovalDecision && !isRejectionDecision) {
        logStep(log, `Unknown decision type: "${want}". Treating as approval.`, current);
      }
      
      // ?? AUTOMATIC PATH DETECTION: Analyze target nodes to determine which path is which
      const edgeAnalysis = outgoing.map(edge => {
        const targetNode = cleanNodes.find(n => n.id === edge.target);
        const edgeLabel = (edge.direction || edge.label || '').toLowerCase();
        
        // Score this edge for approval likelihood
        let approvalScore = 0;
        let rejectionScore = 0;
        
        // 1. Check edge label for approval/rejection keywords
        if (['yes', 'approve', 'forward', 'accept', 'allow'].some(keyword => edgeLabel.includes(keyword))) {
          approvalScore += 3;
        }
        if (['no', 'reject', 'deny', 'decline', 'refuse'].some(keyword => edgeLabel.includes(keyword))) {
          rejectionScore += 3;
        }
        
        // 2. Check target node for end/termination patterns (rejections often end workflows)
        if (targetNode) {
          if (targetNode.type === 'end' || targetNode.data.is_end) {
            rejectionScore += 2; // Rejections more likely to end workflow
          }
          if (targetNode.type === 'action') {
            approvalScore += 1; // Approvals more likely to continue to next action
          }
          
          // Check target node label for hints
          const targetLabel = (targetNode.data.label || '').toLowerCase();
          if (['reject', 'deny', 'end', 'close', 'terminate'].some(keyword => targetLabel.includes(keyword))) {
            rejectionScore += 2;
          }
          if (['approve', 'escalate', 'continue', 'next', 'forward'].some(keyword => targetLabel.includes(keyword))) {
            approvalScore += 2;
          }
        }
        
        // 3. Positional analysis: first edge often approval, second often rejection
        const edgeIndex = outgoing.indexOf(edge);
        if (edgeIndex === 0 && outgoing.length === 2) approvalScore += 1;
        if (edgeIndex === 1 && outgoing.length === 2) rejectionScore += 1;
        
        return {
          edge,
          targetNode,
          approvalScore,
          rejectionScore,
          isLikelyApproval: approvalScore > rejectionScore,
          isLikelyRejection: rejectionScore > approvalScore,
          confidence: Math.abs(approvalScore - rejectionScore)
        };
      });
      
      logStep(log, `Analyzing ${outgoing.length} edges for decision "${want}"`, current);
      edgeAnalysis.forEach((analysis, i) => {
        logStep(log, `  Edge ${i+1}: "${analysis.edge.direction}" ? ${analysis.targetNode?.data.label || 'Unknown'} (Approval:${analysis.approvalScore}, Rejection:${analysis.rejectionScore})`, current);
      });
      
      // ?? SELECT BEST MATCHING EDGE
      // First, try to find exact direction match
      const exactMatch = outgoing.find(e => (e.direction || e.label || '').toLowerCase() === want);
      if (exactMatch) {
        nextEdge = exactMatch;
        logStep(log, `Found EXACT match for "${want}": edge "${exactMatch.direction || exactMatch.label}"`, current);
      } else if (isApprovalDecision || !isRejectionDecision) {
        // Look for approval path using intelligent analysis
        const approvalCandidates = edgeAnalysis.filter(a => a.isLikelyApproval).sort((a, b) => b.confidence - a.confidence);
        nextEdge = approvalCandidates.length > 0 ? approvalCandidates[0].edge : edgeAnalysis[0]?.edge;
        
        if (nextEdge) {
          const analysis = edgeAnalysis.find(a => a.edge === nextEdge);
          logStep(log, `Selected APPROVAL path: "${nextEdge.direction}" (confidence: ${analysis?.confidence || 0})`, current);
        }
      } else {
        // Look for rejection path using intelligent analysis
        const rejectionCandidates = edgeAnalysis.filter(a => a.isLikelyRejection).sort((a, b) => b.confidence - a.confidence);
        nextEdge = rejectionCandidates.length > 0 ? rejectionCandidates[0].edge : edgeAnalysis[1]?.edge || edgeAnalysis[0]?.edge;
        
        if (nextEdge) {
          const analysis = edgeAnalysis.find(a => a.edge === nextEdge);
          logStep(log, `Selected REJECTION path: "${nextEdge.direction}" (confidence: ${analysis?.confidence || 0})`, current);
        }
      }
      
      if (!nextEdge) {
        logStep(log, `No suitable edge found for decision "${want}" after intelligent analysis`, current);
        break;
      }
    } 
    else if (current.type === 'action' && payload.currentNodeId) {
      // Action nodes in updateDispute: Move forward to decision node first
      nextEdge = outgoing.find(e => e.direction === 'forward') || outgoing[0];
      if (nextEdge) {
        logStep(log, `Action node: moving forward to decision node`, current);
      }
    }
    else {
      // Default: take forward edge or first available
      nextEdge = outgoing.find(e => e.direction === 'forward') || outgoing[0];
    }

    if (!nextEdge) {
      logStep(log, 'No suitable outgoing edges found', current);
      break;
    }

    const target = cleanNodes.find(n => n.id === nextEdge.target);
    if (!target) {
      logStep(log, `Missing target node ${nextEdge.target}`, current);
      break;
    }

    logStep(log, `? ${nextEdge.direction.toUpperCase()} to ${target.data.label} (${target.type})`, current);
    current = target;
    
    // ?? SPECIAL HANDLING: If we just moved to a decision node from an action node,
    // and we have a decision, immediately process the decision
    if (current.type === 'decision' && payload.decision && payload.currentNodeId) {
      logStep(log, `Auto-processing decision node with user decision: ${payload.decision}`, current);
      // Continue the loop to process the decision node - don't break here
      continue;
    }
    
    // ?? For other decision nodes (without currentNodeId), also continue processing
    if (current.type === 'decision' && payload.decision && !payload.currentNodeId) {
      logStep(log, `Auto-processing decision node in createDispute mode: ${payload.decision}`, current);
      continue;
    }
  }

  return { nextNode: current, log };
}

module.exports = { runWorkflowEngine };