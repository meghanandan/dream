const sequelize = require('../config/db');

const getDisputeWorkflowDetails = async (dispute_id, nodeId, transaction) => {
  const [row] = await sequelize.query(
    `SELECT
      wf.type         AS work_flow_type,
      wf.org_code     AS org_code,
      df.node_id      AS dis_flow_node_id,
      wn.source_sl_no AS current_slno,
      wn.type_node,
      wn.is_end,
      d.created_by    AS original_user
    FROM disputes d
    JOIN work_flows wf    ON d.work_flow_id = wf.id
    JOIN dispute_flow df  ON d.id = df.dispute_id
    JOIN work_flow_nodes wn ON wn.node_id = df.node_id
    WHERE d.id = :dispute_id
      AND df.node_id = :nodeId
    LIMIT 1`,
    {
      replacements: { dispute_id, nodeId },
      type: sequelize.QueryTypes.SELECT,
      transaction
    }
  );
  return row;
};

const getNextNodes = async (workflowId, currentNodeId, decision, transaction) => {
  const dirMap = { 
    approved: 'yes', 
    rejected: 'no', 
    forward: 'forward' 
  };
  const edgeDir = dirMap[decision.toLowerCase()] || 'forward';

  const edges = await sequelize.query(
    `SELECT 
      destination_node_id AS next_node_id,
      direction,
      json_data
    FROM work_flow_edges
    WHERE work_flow_id = :wf
      AND source_node_id = :cur`,
    {
      replacements: { wf: workflowId, cur: currentNodeId },
      type: sequelize.QueryTypes.SELECT,
      transaction
    }
  );

  // First try exact direction match
  let nextEdge = edges.find(e => e.direction.toLowerCase() === edgeDir);
  
  // Fallback to forward direction
  if (!nextEdge) {
    nextEdge = edges.find(e => e.direction.toLowerCase() === 'forward');
  }

  // Last resort - take first available edge
  if (!nextEdge && edges.length > 0) {
    nextEdge = edges[0];
  }

  return nextEdge ? nextEdge.next_node_id : null;
};

const updateDisputeHistory = async (params, transaction) => {
  const { 
    dispute_id, 
    done_by, 
    nodeId, 
    decision, 
    comments, 
    assignedTo = null 
  } = params;

  await sequelize.query(
    `INSERT INTO dispute_history
      (dispute_id, done_by, created_by, assigned_to, 
       node_id, action, dispute_stage, comments, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    {
      replacements: [
        dispute_id,
        done_by,
        done_by,
        assignedTo,
        nodeId,
        decision,
        decision,
        comments
      ],
      transaction
    }
  );
};

const resolveNodeAssignees = async (params, transaction) => {
  const { workflowType, actionUserId, orgCode, createdBy } = params;

  switch (workflowType.toLowerCase()) {
    case 'role':
      const users = await sequelize.query(
        `SELECT emp_id 
         FROM users 
         WHERE role = :role 
           AND org_code = :org 
           AND active = true`,
        {
          replacements: { role: actionUserId, org: orgCode },
          type: sequelize.QueryTypes.SELECT,
          transaction
        }
      );
      return users.map(u => u.emp_id);

    case 'user':
      return [actionUserId];

    case 'hierarchy':
      const reports = await sequelize.query(
        `WITH RECURSIVE hierarchy AS (
           SELECT emp_id, reporting_to, 1 as level
           FROM users
           WHERE emp_id = :user
           UNION ALL
           SELECT u.emp_id, u.reporting_to, h.level + 1
           FROM users u
           JOIN hierarchy h ON u.reporting_to = h.emp_id
           WHERE h.level < 5
         )
         SELECT emp_id
         FROM hierarchy
         WHERE level = (
           SELECT MIN(level) 
           FROM hierarchy 
           WHERE emp_id = :target
         )`,
        {
          replacements: { user: createdBy, target: actionUserId },
          type: sequelize.QueryTypes.SELECT,
          transaction
        }
      );
      return reports.map(r => r.emp_id);

    default:
      throw new Error(`Unknown workflow type: ${workflowType}`);
  }
};

module.exports = {
  getDisputeWorkflowDetails,
  getNextNodes,
  updateDisputeHistory,
  resolveNodeAssignees
};
