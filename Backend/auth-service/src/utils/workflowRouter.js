const WORKFLOW_TYPES = {
  ROLE: 'role',
  USER: 'user',
  HIERARCHY: 'hierarchy',
  ROUND_ROBIN: 'round_robin',
  WORKLOAD: 'workload',
  DYNAMIC: 'dynamic'
};

const NODE_TYPES = {
  START: 'start',
  ACTION: 'action',
  DECISION: 'decision',
  END: 'end',
  PARALLEL: 'parallel',
  CONDITIONAL: 'conditional'
};

const ROUTING_STRATEGIES = {
  // Role based - assign to all users with role
  async roleBasedRouting({ roleId, orgCode, transaction }) {
    const users = await sequelize.query(
      `SELECT emp_id, active_tasks
       FROM users 
       WHERE role = :role 
         AND org_code = :org 
         AND active = true`,
      {
        replacements: { role: roleId, org: orgCode },
        type: sequelize.QueryTypes.SELECT,
        transaction
      }
    );
    return users.map(u => u.emp_id);
  },

  // Hierarchy based - follow reporting chain
  async hierarchyRouting({ userId, targetLevel, orgCode, transaction }) {
    const users = await sequelize.query(
      `WITH RECURSIVE reporting_chain AS (
         SELECT emp_id, reporting_to, level, 1 as chain_level
         FROM users
         WHERE emp_id = :user
         UNION ALL
         SELECT u.emp_id, u.reporting_to, u.level, rc.chain_level + 1
         FROM users u
         JOIN reporting_chain rc ON u.reporting_to = rc.emp_id
         WHERE rc.chain_level < 5
       )
       SELECT DISTINCT emp_id
       FROM reporting_chain
       WHERE level = :target_level
       AND chain_level = (
         SELECT MIN(chain_level) 
         FROM reporting_chain 
         WHERE level = :target_level
       )`,
      {
        replacements: { 
          user: userId,
          target_level: targetLevel,
          org: orgCode
        },
        type: sequelize.QueryTypes.SELECT,
        transaction
      }
    );
    return users.map(u => u.emp_id);
  },

  // Round robin - distribute evenly among eligible users
  async roundRobinRouting({ roleId, orgCode, transaction }) {
    const [nextUser] = await sequelize.query(
      `UPDATE users u
       SET active_tasks = active_tasks + 1
       WHERE emp_id = (
         SELECT emp_id
         FROM users
         WHERE role = :role
           AND org_code = :org
           AND active = true
         ORDER BY active_tasks ASC, 
                  LAST_ASSIGNED_AT ASC NULLS FIRST
         LIMIT 1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING emp_id`,
      {
        replacements: { role: roleId, org: orgCode },
        type: sequelize.QueryTypes.UPDATE,
        transaction
      }
    );
    return nextUser ? [nextUser.emp_id] : [];
  },

  // Workload based - assign to least loaded user
  async workloadRouting({ roleId, orgCode, maxTasks = 5, transaction }) {
    const users = await sequelize.query(
      `SELECT emp_id
       FROM users
       WHERE role = :role
         AND org_code = :org
         AND active = true
         AND active_tasks < :max
       ORDER BY active_tasks ASC
       LIMIT 1`,
      {
        replacements: { 
          role: roleId, 
          org: orgCode,
          max: maxTasks
        },
        type: sequelize.QueryTypes.SELECT,
        transaction
      }
    );
    return users.map(u => u.emp_id);
  },

  // Dynamic routing based on conditions
  async dynamicRouting({ conditions, dispute, orgCode, transaction }) {
    let query = `SELECT emp_id FROM users WHERE org_code = :org AND active = true`;
    const replacements = { org: orgCode };

    // Add dynamic conditions
    if (conditions.amount_threshold) {
      query += ` AND level >= (
        SELECT required_level FROM approval_levels 
        WHERE min_amount <= :amount 
        ORDER BY min_amount DESC LIMIT 1
      )`;
      replacements.amount = dispute.amount;
    }

    if (conditions.department) {
      query += ` AND department = :dept`;
      replacements.dept = dispute.department;
    }

    const users = await sequelize.query(query, {
      replacements,
      type: sequelize.QueryTypes.SELECT,
      transaction
    });
    return users.map(u => u.emp_id);
  }
};

async function resolveWorkflowAssignees(params) {
  const { 
    workflowType,
    routingConfig,
    orgCode,
    dispute,
    transaction 
  } = params;

  switch (workflowType) {
    case WORKFLOW_TYPES.ROLE:
      return await ROUTING_STRATEGIES.roleBasedRouting({
        roleId: routingConfig.roleId,
        orgCode,
        transaction
      });

    case WORKFLOW_TYPES.HIERARCHY:
      return await ROUTING_STRATEGIES.hierarchyRouting({
        userId: dispute.created_by,
        targetLevel: routingConfig.targetLevel,
        orgCode,
        transaction
      });

    case WORKFLOW_TYPES.ROUND_ROBIN:
      return await ROUTING_STRATEGIES.roundRobinRouting({
        roleId: routingConfig.roleId,
        orgCode,
        transaction
      });

    case WORKFLOW_TYPES.WORKLOAD:
      return await ROUTING_STRATEGIES.workloadRouting({
        roleId: routingConfig.roleId,
        orgCode,
        maxTasks: routingConfig.maxTasks,
        transaction
      });

    case WORKFLOW_TYPES.DYNAMIC:
      return await ROUTING_STRATEGIES.dynamicRouting({
        conditions: routingConfig.conditions,
        dispute,
        orgCode,
        transaction
      });

    default:
      throw new Error(`Unsupported workflow type: ${workflowType}`);
  }
}

module.exports = {
  WORKFLOW_TYPES,
  NODE_TYPES,
  resolveWorkflowAssignees
};
