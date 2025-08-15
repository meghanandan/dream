const handleManagerDecision = async (node, payload, db) => {
  const isManager = db.hasReporting(payload.currentUser);
  
  if (!isManager) {
    return {
      status: false,
      message: "Only managers can make this decision"
    };
  }

  // For manager approval
  if (payload.decision === 'approved') {
    // Find admin node
    const adminEdge = payload.workflow.edges.find(e => 
      e.source === node.id && e.direction === 'yes'
    );
    
    if (adminEdge) {
      const adminNode = payload.workflow.nodes.find(n => 
        n.id === adminEdge.target && 
        n.data.assigned_role_id === 'RL_NyAd'
      );

      if (adminNode) {
        // Remove from manager's queue
        db.workflowState.removeDispute(
          payload.disputeId,
          'RL_8bgz' // Manager role
        );

        // Assign to admin role
        const admins = db.getByRole('RL_NyAd');
        admins.forEach(admin => {
          db.workflowState.assignDispute(
            payload.disputeId,
            'RL_NyAd',
            admin.emp_id
          );
        });

        return {
          status: true,
          message: "Manager approved, forwarded to admin",
          nextNodes: [adminNode.id]
        };
      }
    }
  }

  // For manager rejection
  if (payload.decision === 'rejected') {
    return {
      status: true,
      message: "Manager rejected the dispute",
      nextNodes: [] // End workflow
    };
  }

  return {
    status: false,
    message: "Invalid decision"
  };
};

const handleAdminDecision = async (node, payload, db) => {
  const isAdmin = db.users.find(u => 
    u.emp_id === payload.currentUser && 
    u.role === 'RL_NyAd'
  );

  if (!isAdmin) {
    return {
      status: false,
      message: "Only admins can make this decision"
    };
  }

  // For admin approval
  if (payload.decision === 'approved') {
    // Remove from admin queue
    db.workflowState.removeDispute(
      payload.disputeId,
      'RL_NyAd'
    );

    // Find end node
    const endEdge = payload.workflow.edges.find(e => 
      e.source === node.id && e.direction === 'yes'
    );
    
    if (endEdge) {
      const endNode = payload.workflow.nodes.find(n => 
        n.id === endEdge.target && 
        n.typenode === 'end'
      );

      if (endNode) {
        return {
          status: true,
          message: "Admin approved, workflow completed",
          nextNodes: [endNode.id]
        };
      }
    }
  }

  // For admin rejection
  if (payload.decision === 'rejected') {
    // Return to manager
    const managerNode = payload.workflow.nodes.find(n => 
      n.data.assigned_role_id === 'RL_8bgz'
    );

    if (managerNode) {
      // Remove from admin queue
      db.workflowState.removeDispute(
        payload.disputeId,
        'RL_NyAd'
      );

      // Reassign to manager
      const manager = db.getManager(payload.originalUser);
      if (manager) {
        db.workflowState.assignDispute(
          payload.disputeId,
          'RL_8bgz',
          manager.emp_id
        );

        return {
          status: true,
          message: "Admin rejected, returned to manager",
          nextNodes: [managerNode.id]
        };
      }
    }
  }

  return {
    status: false,
    message: "Invalid decision"
  };
};

module.exports = {
  handleManagerDecision,
  handleAdminDecision
};
