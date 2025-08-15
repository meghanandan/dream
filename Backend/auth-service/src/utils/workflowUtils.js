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
