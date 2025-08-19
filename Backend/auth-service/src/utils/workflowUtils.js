/**
 * Checks if the next assignee is the same as the initiator and should be auto-approved.
 * @param {string|string[]} assignees - The user ID(s) assigned to the next node.
 * @param {string} initiator - The user ID of the dispute creator.
 * @returns {boolean} True if auto-approval should occur.
 */
function shouldAutoApprove(assignees, initiator) {
  console.log(`?? AUTO-APPROVAL CHECK: assignees=${JSON.stringify(assignees)}, initiator=${initiator}`);
  if (!assignees || !initiator) {
    console.log(`?? AUTO-APPROVAL: FALSE - Missing data (assignees: ${!!assignees}, initiator: ${!!initiator})`);
    return false;
  }
  if (Array.isArray(assignees)) {
    const result = assignees.length === 1 && assignees[0] === initiator;
    console.log(`?? AUTO-APPROVAL: ${result} - Array check (length: ${assignees.length}, first: ${assignees[0]}, matches: ${assignees[0] === initiator})`);
    return result;
  }
  const result = assignees === initiator;
  console.log(`?? AUTO-APPROVAL: ${result} - String check (assignees: ${assignees}, initiator: ${initiator})`);
  return result;
}

/**
 * Checks if a decision node has a reject/no path in the workflow edges.
 * @param {Array} edges - Workflow edges for the current node.
 * @returns {boolean} True if a reject/no path exists.
 */
function hasRejectPath(edges) {
  if (!Array.isArray(edges)) return false;
  return edges.some(e => {
    const dir = (e.direction || e.label || '').toLowerCase();
    return dir === 'no' || dir === 'reject' || dir === 'denied';
  });
}

module.exports = {
  shouldAutoApprove,
  hasRejectPath
};
const getWorkflowNextSteps = async (workflowId, currentNodeId, decision, transaction) => {
  // Map API decisions to edge directions
  const directionMap = {
    'approved': 'yes',
    'rejected': 'no',
    'forward': 'forward'
  };

  const direction = directionMap[decision.toLowerCase()] || 'forward';

  // Get all possible edges from current node
  const edges = await sequelize.query(
    `SELECT 
      wfe.destination_node_id,
      wfe.direction,
      wfn.type_node,
      wfn.action_user_id,
      wfn.is_end
     FROM work_flow_edges wfe
     JOIN work_flow_nodes wfn ON wfn.node_id = wfe.destination_node_id
     WHERE wfe.work_flow_id = :wf_id 
       AND wfe.source_node_id = :node_id`,
    {
      replacements: { wf_id: workflowId, node_id: currentNodeId },
      type: sequelize.QueryTypes.SELECT,
      transaction
    }
  );

  // First try exact direction match
  let nextNode = edges.find(e => e.direction.toLowerCase() === direction);
  
  // Fallback to forward direction if no match
  if (!nextNode) {
    nextNode = edges.find(e => e.direction.toLowerCase() === 'forward');
  }

  // If still no match, use first available edge
  if (!nextNode && edges.length > 0) {
    nextNode = edges[0];
  }

  return nextNode;
};
