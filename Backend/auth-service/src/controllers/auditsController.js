// src/controllers/auditController.js
const sequelize = require("../config/db"); // Sequelize instance

function assertAdmin(req, res) {
  if (req.user?.role !== "RL_NyAd") {
    res.status(403).json({
      status: false,
      message: "Forbidden: insufficient permissions",
    });
    return true;
  }
  return false;
}

// ========== Helper: build where clauses & replacements ==========
function buildWhere(fields) {
  const where = [];
  const repl = {};
  for (const f of fields) {
    if (f.value !== undefined && f.value !== null && f.value !== "") {
      where.push(f.clause);
      repl[f.key] = f.value;
    }
  }
  return { where, repl };
}

// ========== Audit Logs ==========
exports.getAuditLogs = async (req, res) => {
  if (assertAdmin(req, res)) return;
  try {
    const params = { ...req.query, ...req.body };
    const {
      org_code,
      object_type,
      object_id,
      search = "",
      startDate,
      endDate,
      timeZone = "UTC", // <- NEW: support timeZone param (defaults to UTC)
      page: rawPage,
      pageSize: rawPageSize,
    } = params;

    if (!org_code) {
      return res
        .status(400)
        .json({ status: false, message: "org_code is required" });
    }
    const page = Math.max(1, parseInt(rawPage, 10) || 1);
    const pageSize = Math.max(1, parseInt(rawPageSize, 10) || 25);

    // Build WHERE
    const fields = [
      { key: "org_code", clause: "al.org_code = :org_code", value: org_code },
      {
        key: "object_type",
        clause: "al.object_type = :object_type",
        value: object_type,
      },
      {
        key: "object_id",
        clause: "al.object_id = :object_id",
        value: object_id,
      },
      {
        key: "search",
        clause: `(
        al.changed_by ILIKE :search OR
        al.remarks    ILIKE :search OR
        al.action     ILIKE :search OR
        al.object_id::text ILIKE :search
      )`,
        value: search ? `%${search}%` : undefined,
      },
      {
        key: "startDate",
        clause: "al.changed_at >= :startDate",
        value: startDate,
      },
      { key: "endDate", clause: "al.changed_at <= :endDate", value: endDate },
    ];

    const { where, repl } = buildWhere(fields);
    repl.offset = (page - 1) * pageSize;
    repl.pageSize = pageSize;
    repl.tz = timeZone;

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // Main query (with to_char formatting!)
    const dataQuery = `
  SELECT 
    al.id, al.org_code, al.object_type, al.object_id,
    al.action, al.changed_by,
    CONCAT(u.first_name, ' ', u.last_name) AS user_name, 
    to_char(
      al.changed_at AT TIME ZONE 'UTC' AT TIME ZONE :tz,
      'MM/DD/YYYY HH12:MI:SS AM'
    ) AS changed_at,
    al.old_values, al.new_values, al.remarks,
    CASE 
      WHEN al.object_type = 'prod_quota' THEN q.quota_name
      ELSE NULL 
    END as quota_name
  FROM audit_log al
  LEFT JOIN users u ON u.emp_id = al.changed_by
  LEFT JOIN prod_quota q ON q.id::text = al.object_id AND al.object_type = 'prod_quota'
  ${whereClause}
  ORDER BY al.changed_at DESC
  LIMIT :pageSize OFFSET :offset
`;

    const countQuery = `
  SELECT COUNT(*) AS count
  FROM audit_log al
  LEFT JOIN users u ON u.emp_id = al.changed_by
  ${whereClause}
`;

    const [data, countRows] = await Promise.all([
      sequelize.query(dataQuery, {
        replacements: repl,
        type: sequelize.QueryTypes.SELECT,
      }),
      sequelize.query(countQuery, {
        replacements: repl,
        type: sequelize.QueryTypes.SELECT,
      }),
    ]);

    const total = Number(countRows[0]?.count || 0);

    return res.json({
      status: true,
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("getAuditLogs error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch audit logs",
      error: error.message,
    });
  }
};

// ========== Login Audit ==========
exports.getLoginAudit = async (req, res) => {
  if (assertAdmin(req, res)) return;
  try {
    const params = { ...req.query, ...req.body };
    const {
      org_code,
      page: rawPage = 1,
      pageSize: rawPageSize = 25,
      search = "",
      startDate,
      endDate,
      timeZone = "UTC", // <-- support timeZone (from client, fallback UTC)
    } = params;

    if (!org_code) {
      return res
        .status(400)
        .json({ status: false, message: "org_code is required" });
    }

    const page = Math.max(1, parseInt(rawPage, 10));
    const pageSize = Math.max(1, parseInt(rawPageSize, 10));
    const offset = (page - 1) * pageSize;

    // Build WHERE and replacements
    const where = ["u.org_code = :org_code"];
    const repl = { org_code, offset, pageSize, tz: timeZone };

    if (search) {
      repl.search = `%${search}%`;
      where.push(`(
        ua.user_id    ILIKE :search OR
        ua.email      ILIKE :search OR
        ua.action     ILIKE :search OR
        ua.ip_address ILIKE :search
      )`);
    }
    if (startDate) {
      repl.startDate = startDate;
      where.push("ua.created_at >= :startDate");
    }
    if (endDate) {
      repl.endDate = endDate;
      where.push("ua.created_at <= :endDate");
    }

    if (params.user_id) {
      where.push("ua.user_id = :user_id");
      repl.user_id = params.user_id;
    }
    const whereClause = `WHERE ${where.join(" AND ")}`;

    // Full details with formatted created_at
    const dataQuery = `
  SELECT
    ua.id, ua.user_id, ua.email, 
    CONCAT(u.first_name, ' ', u.last_name) AS user_name,
    ua.action, ua.ip_address, ua.user_agent,
    to_char(
      ua.created_at AT TIME ZONE 'UTC' AT TIME ZONE :tz,
      'MM/DD/YYYY HH12:MI:SS AM'
    ) AS created_at,
    ua.success, ua.details, ua.licence_type,
    ua.city, ua.country,
    ua.browser_name, ua.browser_version,
    ua.os_name, ua.os_version, ua.device_type,
    ua.auth_method, ua.mfa_used, ua.session_id,
    ua.ip_reputation, ua.response_time_ms, ua.correlation_id
  FROM user_login_audit ua
  LEFT JOIN users u ON u.emp_id = ua.user_id
  ${whereClause}
  ORDER BY ua.created_at DESC
  LIMIT :pageSize OFFSET :offset
`;

    const countQuery = `
  SELECT COUNT(*) AS count
  FROM user_login_audit ua
  JOIN users u ON u.emp_id = ua.user_id
  ${whereClause}
`;

    const [rows, countRows] = await Promise.all([
      sequelize.query(dataQuery, {
        replacements: repl,
        type: sequelize.QueryTypes.SELECT,
      }),
      sequelize.query(countQuery, {
        replacements: repl,
        type: sequelize.QueryTypes.SELECT,
      }),
    ]);

    const total = Number(countRows[0].count);

    return res.json({
      status: true,
      data: rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    console.error("getLoginAudit error:", err);
    return res.status(500).json({ status: false, message: err.message });
  }
};
