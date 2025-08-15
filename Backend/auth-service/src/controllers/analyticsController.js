const sequelize = require("../config/db");

// Helper to build WHERE clause and replacements dynamically
function buildWhere({ org_code, from, to, status, type, priority, user_id }) {
  const where = [];
  const params = {};
  if (org_code) { where.push("org_code = :org_code"); params.org_code = org_code; }
  if (from && to) { where.push("created_at BETWEEN :from AND :to"); params.from = from; params.to = to; }
  if (status) { where.push("LOWER(dispute_stage) = LOWER(:status)"); params.status = status; }
  if (type) { where.push("LOWER(dispute_type) = LOWER(:type)"); params.type = type; }
  if (priority) { where.push("LOWER(priority) = LOWER(:priority)"); params.priority = priority; }
  if (user_id) { where.push("created_by = :user_id"); params.user_id = user_id; }
  return {
    whereSql: where.length ? `WHERE ${where.join(" AND ")}` : "",
    params
  };
}

// Disputes by Type
exports.getDisputesByType = async (req, res) => {
  try {
    const { whereSql, params } = buildWhere(req.body);
    const rows = await sequelize.query(
      `SELECT COALESCE(dispute_type, 'Unknown') AS label, COUNT(*) AS value
       FROM disputes
       ${whereSql}
       GROUP BY dispute_type
       ORDER BY value DESC`,
      { type: sequelize.QueryTypes.SELECT, replacements: params }
    );
    res.json({ status: true, data: rows });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// Disputes by Status
exports.getDisputesByStatus = async (req, res) => {
  try {
    const { whereSql, params } = buildWhere(req.body);
    const rows = await sequelize.query(
      `SELECT INITCAP(REPLACE(dispute_stage, '_', ' ')) AS label, COUNT(*) AS value
       FROM disputes
       ${whereSql}
       GROUP BY dispute_stage
       ORDER BY value DESC`,
      { type: sequelize.QueryTypes.SELECT, replacements: params }
    );
    res.json({ status: true, data: rows });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// Disputes by Month
exports.getDisputesByMonth = async (req, res) => {
  try {
    const { whereSql, params } = buildWhere(req.body);
    const rows = await sequelize.query(
      `SELECT to_char(created_at, 'YYYY-MM') AS label, COUNT(*) AS value
       FROM disputes
       ${whereSql}
       GROUP BY to_char(created_at, 'YYYY-MM')
       ORDER BY label ASC`,
      { type: sequelize.QueryTypes.SELECT, replacements: params }
    );
    res.json({ status: true, data: rows });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// Disputes by Escalation (priority)
exports.getDisputesByEscalation = async (req, res) => {
  try {
    const { whereSql, params } = buildWhere(req.body);
    const rows = await sequelize.query(
      `SELECT COALESCE(priority, 'Unknown') AS label, COUNT(*) AS value
       FROM disputes
       ${whereSql}
       GROUP BY priority
       ORDER BY value DESC`,
      { type: sequelize.QueryTypes.SELECT, replacements: params }
    );
    res.json({ status: true, data: rows });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// Average Resolution Time by Month
exports.getAvgResolutionTimeByMonth = async (req, res) => {
  try {
    const { whereSql, params } = buildWhere(req.body);
    const rows = await sequelize.query(
      `SELECT 
         to_char(created_at, 'YYYY-MM') AS label,
         ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(updated_at, NOW()) - created_at))/3600), 2) AS value
       FROM disputes
       ${whereSql}
       GROUP BY to_char(created_at, 'YYYY-MM')
       ORDER BY label ASC`,
      { type: sequelize.QueryTypes.SELECT, replacements: params }
    );
    res.json({ status: true, data: rows });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// Dispute Summary (cards)
exports.getDisputesSummary = async (req, res) => {
  try {
    const { whereSql, params } = buildWhere(req.body);
    const [row] = await sequelize.query(
      `SELECT
         COUNT(*) AS total_disputes,
         COUNT(*) FILTER (WHERE LOWER(dispute_stage) IN ('raised','in_progress')) AS in_progress,
         COUNT(*) FILTER (WHERE LOWER(dispute_stage) IN ('resolved','approved')) AS resolved,
         COUNT(*) FILTER (WHERE LOWER(dispute_stage) = 'rejected') AS rejected,
         COUNT(*) FILTER (WHERE LOWER(priority) = 'high') AS escalated,
         ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(updated_at, NOW()) - created_at))/86400), 2) AS avg_resolution_days
       FROM disputes
       ${whereSql}`,
      { type: sequelize.QueryTypes.SELECT, replacements: params }
    );
    res.json({ status: true, data: row });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// Disputes by License Type
exports.getDisputesByLicenceType = async (req, res) => {
  try {
    const { whereSql, params } = buildWhere(req.body);
    const rows = await sequelize.query(
      `SELECT COALESCE(licence_type, 'Unknown') AS label, COUNT(*) AS value
      FROM disputes
      ${whereSql}
      GROUP BY licence_type
      ORDER BY value DESC`,
      { type: sequelize.QueryTypes.SELECT, replacements: params }
    );
    res.json({ status: true, data: rows });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};
