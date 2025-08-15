const { WORKFLOW_TYPES, NODE_TYPES } = require('./workflowRouter');

class WorkflowStateManager {
  constructor(transaction) {
    this.transaction = transaction;
  }

  async validateTransition(params) {
    const {
      fromNode,
      toNode,
      currentUser,
      dispute,
      decision
    } = params;

    // Validate user permissions
    const hasPermission = await this.validateUserPermission(
      currentUser,
      fromNode,
      dispute
    );
    if (!hasPermission) {
      throw new Error('User does not have permission for this action');
    }

    // Validate transition is allowed
    const isValidTransition = await this.validateWorkflowTransition(
      fromNode,
      toNode,
      decision
    );
    if (!isValidTransition) {
      throw new Error('Invalid workflow transition');
    }

    return true;
  }

  async validateUserPermission(userId, node, dispute) {
    const [userRole] = await sequelize.query(
      `SELECT role, level, department
       FROM users 
       WHERE emp_id = :userId`,
      {
        replacements: { userId },
        type: sequelize.QueryTypes.SELECT,
        transaction: this.transaction
      }
    );

    if (!userRole) return false;

    // Check node-specific permissions
    switch (node.type_node) {
      case NODE_TYPES.ACTION:
        return this.validateActionPermission(userRole, node, dispute);
      
      case NODE_TYPES.DECISION:
        return this.validateDecisionPermission(userRole, node, dispute);
      
      case NODE_TYPES.PARALLEL:
        return this.validateParallelPermission(userRole, node, dispute);
      
      default:
        return true;
    }
  }

  async validateWorkflowTransition(fromNode, toNode, decision) {
    // Check if transition is allowed based on node types
    if (fromNode.type_node === NODE_TYPES.DECISION) {
      const allowedDirections = {
        'approved': 'yes',
        'rejected': 'no',
        'forward': 'forward'
      };
      
      const direction = allowedDirections[decision.toLowerCase()];
      if (!direction) return false;

      // Verify edge exists
      const [edge] = await sequelize.query(
        `SELECT 1 
         FROM work_flow_edges 
         WHERE source_node_id = :from
           AND destination_node_id = :to
           AND direction = :dir`,
        {
          replacements: {
            from: fromNode.id,
            to: toNode.id,
            dir: direction
          },
          type: sequelize.QueryTypes.SELECT,
          transaction: this.transaction
        }
      );

      return !!edge;
    }

    return true;
  }

  async handleParallelExecution(node, dispute) {
    // Get all parallel branches
    const branches = await sequelize.query(
      `SELECT *
       FROM work_flow_parallel_branches
       WHERE node_id = :nodeId`,
      {
        replacements: { nodeId: node.id },
        type: sequelize.QueryTypes.SELECT,
        transaction: this.transaction
      }
    );

    // Create history entries for each branch
    for (const branch of branches) {
      await sequelize.query(
        `INSERT INTO dispute_history
           (dispute_id, node_id, branch_id, status)
         VALUES (:disputeId, :nodeId, :branchId, 'pending')`,
        {
          replacements: {
            disputeId: dispute.id,
            nodeId: node.id,
            branchId: branch.id
          },
          transaction: this.transaction
        }
      );
    }

    return branches.map(b => b.target_node_id);
  }

  async checkParallelCompletion(node, dispute) {
    // Check if all parallel branches are complete
    const [result] = await sequelize.query(
      `SELECT COUNT(*) as total,
              COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
       FROM dispute_history
       WHERE dispute_id = :disputeId
         AND node_id = :nodeId`,
      {
        replacements: {
          disputeId: dispute.id,
          nodeId: node.id
        },
        type: sequelize.QueryTypes.SELECT,
        transaction: this.transaction
      }
    );

    return result.total === result.completed;
  }

  async logTransition(params) {
    const {
      dispute_id,
      from_node,
      to_node,
      user_id,
      action,
      comments
    } = params;

    await sequelize.query(
      `INSERT INTO workflow_transitions
         (dispute_id, from_node_id, to_node_id, 
          actioned_by, action, comments, created_at)
       VALUES (:dispute, :from, :to, :user, :action, :comments, NOW())`,
      {
        replacements: {
          dispute: dispute_id,
          from: from_node.id,
          to: to_node.id,
          user: user_id,
          action,
          comments
        },
        transaction: this.transaction
      }
    );
  }
}

module.exports = WorkflowStateManager;
