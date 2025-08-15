// workflows/view/helpers.js

// Serialize one filter row to a string (e.g., "priority == 'low'" or "amount >= 150")
export function serializeFilter({ field, comparator, value }) {
  if (!field) return '';
  const op = comparator || '==';
  const num = Number(value);
  const val = Number.isNaN(num) ? `'${value}'` : num;
  return `${field} ${op} ${val}`;
}

// Serialize multiple conditions into a clause string
export function serializeConditions(filters) {
  return filters
    .filter((f) => f.field)
    .map((f, idx) => {
      const clause = serializeFilter(f);
      if (idx === 0) return clause;
      return f.andOr ? `${f.andOr} ${clause}` : clause;
    })
    .join(' ');
}

// 🔧 Check if connection is allowed before creating edge
export function isConnectionAllowed(sourceType, targetType) {
  const validConnections = {
    'start': ['action', 'decision', 'end'],
    'action': ['decision', 'end'], 
    'decision': ['action', 'end'],
    'end': []
  };
  
  const allowedTargets = validConnections[sourceType] || [];
  return allowedTargets.includes(targetType);
}

// 🔧 Get valid connection targets for a node type
export function getValidTargets(sourceType) {
  const validConnections = {
    'start': ['action', 'decision', 'end'],
    'action': ['decision', 'end'], 
    'decision': ['action', 'end'],
    'end': []
  };
  
  return validConnections[sourceType] || [];
}

// 🔧 Validate connection rules between nodes
export function validateConnectionRules(nodes, edges) {
  const errors = [];
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
  
  edges.forEach(edge => {
    const sourceNode = nodeMap[edge.source];
    const targetNode = nodeMap[edge.target];
    
    if (!sourceNode || !targetNode) return; // Skip if nodes don't exist
    
    const sourceType = sourceNode.typenode;
    const targetType = targetNode.typenode;
    
    if (!isConnectionAllowed(sourceType, targetType)) {
      const sourceLabel = sourceNode.data?.label || sourceNode.id;
      const targetLabel = targetNode.data?.label || targetNode.id;
      const allowedTargets = getValidTargets(sourceType);
      
      errors.push(
        `Invalid connection: ${sourceType.toUpperCase()} "${sourceLabel}" cannot connect to ${targetType.toUpperCase()} "${targetLabel}". ` +
        `${sourceType.toUpperCase()} nodes can only connect to: ${allowedTargets.map(t => t.toUpperCase()).join(', ')}`
      );
    }
  });
  
  return errors;
}

// 🔧 Complete workflow validation with all rules
export function validateWorkflow(nodes, edges) {
  const errors = [];
  const warnings = [];
  
  // Basic validation - check for required nodes
  const startNodes = nodes.filter(n => n.typenode === 'start');
  const endNodes = nodes.filter(n => n.typenode === 'end');
  const actionNodes = nodes.filter(n => n.typenode === 'action');
  const decisionNodes = nodes.filter(n => n.typenode === 'decision');
  
  // Must have start and end nodes
  if (startNodes.length === 0) {
    errors.push('Workflow must have at least one Start node');
  }
  
  if (endNodes.length === 0) {
    errors.push('Workflow must have at least one End node');
  }
  
  // 🔧 Check for empty workflow (only start/end nodes)
  if (actionNodes.length === 0 && decisionNodes.length === 0) {
    errors.push('Workflow must have at least one Action or Decision node. Currently only Start/End nodes exist - disputes would be auto-resolved immediately.');
    return { errors, warnings, isValid: false }; // Early return for critical error
  }
  
  // Warn if no action nodes (auto-resolve workflow)
  if (actionNodes.length === 0) {
    warnings.push('Workflow has no Action nodes - disputes will be auto-resolved without human intervention');
  }
  
  // Check action nodes have assignees
  actionNodes.forEach(node => {
    if (!node.data?.action_user_id) {
      errors.push(`Action node "${node.data?.label || node.id}" has no assignee configured`);
    }
  });
  
  // Check decision nodes have outgoing edges
  decisionNodes.forEach(node => {
    const outgoingEdges = edges.filter(e => e.source === node.id);
    
    if (outgoingEdges.length === 0) {
      errors.push(`Decision node "${node.data?.label || node.id}" has no outgoing edges`);
    } else {
      // Check for Yes/No edges on decision nodes
      const hasYesEdge = outgoingEdges.some(e => 
        (e.label || '').toLowerCase() === 'yes'
      );
      const hasNoEdge = outgoingEdges.some(e => 
        (e.label || '').toLowerCase() === 'no'
      );
      
      if (!hasYesEdge) {
        warnings.push(`Decision node "${node.data?.label || node.id}" missing "Yes" edge`);
      }
      if (!hasNoEdge) {
        warnings.push(`Decision node "${node.data?.label || node.id}" missing "No" edge`);
      }
    }
  });
  
  // 🔧 Validate all connection rules
  const connectionErrors = validateConnectionRules(nodes, edges);
  errors.push(...connectionErrors);
  
  // Check reachability from start nodes
  if (startNodes.length > 0) {
    const reachableFromStart = findReachableNodes(nodes, edges, startNodes[0].id);
    const unreachableNodes = nodes.filter(n => 
      n.typenode !== 'start' && !reachableFromStart.has(n.id)
    );
    
    if (unreachableNodes.length > 0) {
      warnings.push(`${unreachableNodes.length} nodes are unreachable from Start: ${unreachableNodes.map(n => n.data?.label || n.id).join(', ')}`);
    }
  }
  
  // Check for orphaned nodes (nodes with no connections)
  const connectedNodeIds = new Set();
  edges.forEach(edge => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });
  
  const orphanedNodes = nodes.filter(n => 
    n.typenode !== 'start' && !connectedNodeIds.has(n.id)
  );
  
  if (orphanedNodes.length > 0) {
    warnings.push(`${orphanedNodes.length} unconnected nodes found: ${orphanedNodes.map(n => n.data?.label || n.id).join(', ')}`);
  }
  
  return { errors, warnings, isValid: errors.length === 0 };
}

// Find all nodes reachable from a starting node
function findReachableNodes(nodes, edges, startId) {
  const reachable = new Set();
  const queue = [startId];
  
  while (queue.length > 0) {
    const current = queue.shift();
    
    // 🔧 ESLint compliant - use if-else instead of continue
    if (!reachable.has(current)) {
      reachable.add(current);
      
      // Add all target nodes from current node's outgoing edges
      edges
        .filter(e => e.source === current)
        .forEach(e => {
          if (!reachable.has(e.target)) {
            queue.push(e.target);
          }
        });
    }
  }
  
  return reachable;
}

// Decision path tracing logic - traces paths from decision nodes to end
export function resolveDecisionPathsToEnd(nodes, edges) {
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const edgeMap = edges.reduce((map, edge) => {
    if (!map[edge.source]) map[edge.source] = [];
    map[edge.source].push(edge);
    return map;
  }, {});
  const results = [];

  // Helper function to recursively walk all paths
  function walk(fromNode, direction, currentId, path, visited) {
    if (visited.has(currentId)) return;
    visited.add(currentId);

    const currentNode = nodeMap[currentId];
    if (!currentNode) {
      // Debug: which edge points to a missing node?
      console.warn('Missing node for id:', currentId, '— called from', fromNode?.id, direction, path);
      path.push(`(missing:${currentId})`);
      results.push({
        from: fromNode.data?.label || fromNode.id,
        direction,
        path: [...path, `? (missing node ${currentId})`],
        endsInEnd: false,
      });
      path.pop();
      visited.delete(currentId);
      return;
    }

    path.push(currentNode.data?.label || currentNode.id);

    if (currentNode.typenode === 'end') {
      results.push({
        from: fromNode.data?.label || fromNode.id,
        direction,
        path: [...path],
        endsInEnd: true,
      });
      path.pop();
      visited.delete(currentId);
      return;
    }

    const nextEdges = edgeMap[currentId] || [];
    if (nextEdges.length === 0) {
      // Dead-end - no outgoing edges
      path.pop();
      visited.delete(currentId);
      return;
    }

    nextEdges.forEach((edge) => {
      walk(fromNode, direction, edge.target, path, visited);
    });

    path.pop();
    visited.delete(currentId);
  }

  // For each decision node, start path tracing from each outgoing edge
  nodes
    .filter((node) => node.typenode === 'decision')
    .forEach((node) => {
      const outgoingEdges = edgeMap[node.id] || [];
      outgoingEdges.forEach((edge) => {
        const direction = (edge.label || 'forward').toLowerCase();
        walk(node, direction, edge.target, [], new Set([node.id]));
      });
    });

  return results;
}

// Build complete workflow preview showing all possible execution paths
export function buildFullWorkflowPreview(nodes, edges) {
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
  const edgeMap = edges.reduce((m, e) => {
    m[e.source] = m[e.source] || [];
    m[e.source].push(e);
    return m;
  }, {});

  // Find all start nodes
  const starts = nodes.filter(n => n.typenode === 'start');
  if (!starts.length) return [];

  const results = [];

  // Depth-first search to find all paths
  function dfs(nodeId, path, visited) {
    if (visited.has(nodeId)) {
      // Cycle detected
      results.push(
        path.concat(`(cycle-to:${nodeMap[nodeId]?.data?.label || nodeId})`).join(' → ')
      );
      return;
    }

    const node = nodeMap[nodeId];
    if (!node) return;

    visited.add(nodeId);
    path.push(node.data?.label || nodeId);

    const outgoingEdges = edgeMap[nodeId] || [];
    if (outgoingEdges.length === 0) {
      // End of path
      results.push(path.join(' → '));
    } else {
      outgoingEdges.forEach(edge => {
        const nextPath = [...path];
        
        // Add edge label if it's meaningful (not default)
        if (edge.label && edge.label !== 'Default arrow' && edge.label !== 'forward') {
          nextPath.push(`[${edge.label}]`);
        }
        
        dfs(edge.target, nextPath, new Set(visited));
      });
    }
  }

  // Start DFS from each start node
  starts.forEach(start => {
    dfs(start.id, [], new Set());
  });

  // Remove duplicates and return
  return Array.from(new Set(results));
}

// 🔧 Get workflow statistics
export function getWorkflowStats(nodes, edges) {
  const stats = {
    totalNodes: nodes.length,
    startNodes: nodes.filter(n => n.typenode === 'start').length,
    actionNodes: nodes.filter(n => n.typenode === 'action').length,
    decisionNodes: nodes.filter(n => n.typenode === 'decision').length,
    endNodes: nodes.filter(n => n.typenode === 'end').length,
    totalEdges: edges.length,
    unassignedActionNodes: nodes.filter(n => n.typenode === 'action' && !n.data?.action_user_id).length,
  };

  // Calculate complexity score
  stats.complexityScore = (stats.decisionNodes * 2) + stats.actionNodes;
  
  return stats;
}

// 🔧 Check if workflow has valid complete paths
export function hasValidCompletePaths(nodes, edges) {
  const startNodes = nodes.filter(n => n.typenode === 'start');
  const endNodes = nodes.filter(n => n.typenode === 'end');
  
  if (startNodes.length === 0 || endNodes.length === 0) {
    return false;
  }

  // Check if any end node is reachable from any start node
  return startNodes.some(start => {
    const reachable = findReachableNodes(nodes, edges, start.id);
    return endNodes.some(end => reachable.has(end.id));
  });
}

// 🔧 Get all possible decision paths with outcomes
export function getDecisionPaths(nodes, edges) {
  const paths = [];
  const decisionNodes = nodes.filter(n => n.typenode === 'decision');
  
  decisionNodes.forEach(decision => {
    const outgoingEdges = edges.filter(e => e.source === decision.id);
    
    outgoingEdges.forEach(edge => {
      const targetNode = nodes.find(n => n.id === edge.target);
      if (targetNode) {
        paths.push({
          decisionNode: decision.data?.label || decision.id,
          decision: edge.label || 'forward',
          outcome: targetNode.data?.label || targetNode.id,
          outcomeType: targetNode.typenode
        });
      }
    });
  });
  
  return paths;
}