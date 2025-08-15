const sequelize = require("../config/db");
const { sendEmail } = require("./customFieldsController");
const { logAudit } = require("../utils/auditLogger");

// Place at top, after your require statements
async function notifyUsersByEmpIds(empIds, subject, html, sequelize) {
  if (!empIds || empIds.length === 0) return;
  const users = await sequelize.query(
    `SELECT email, first_name, last_name FROM users WHERE emp_id IN (:empIds)`,
    { replacements: { empIds }, type: sequelize.QueryTypes.SELECT }
  );
  for (const u of users) {
    if (u.email) {
      await sendEmail(
        u.email,
        subject,
        html.replace(/\{name\}/g, u.first_name || "User")
      );
    }
  }
}

// getQuotaAnalytics.js (Controller)
exports.getQuotaAnalytics = async (req, res) => {
  try {
    const {
      org_code,
      role,
      user_id, // <-- this should be emp_id from frontend!
      timePeriod = "12 months",
      groupBy = "month",
    } = req.body || {};

    // Helper: Parse time interval
    function getInterval(period) {
      if (/^\d+\s*month/.test(period))
        return `NOW() - INTERVAL '${parseInt(period)} months'`;
      if (/^\d+\s*day/.test(period))
        return `NOW() - INTERVAL '${parseInt(period)} days'`;
      if (/^\d+\s*week/.test(period))
        return `NOW() - INTERVAL '${parseInt(period)} weeks'`;
      return "NOW() - INTERVAL '1 year'";
    }
    const createdFrom = getInterval(timePeriod);

    let data = {};

    // --- ADMIN ---
    if (role === "RL_NyAd") {
      const orgLicenses = await sequelize.query(
        `SELECT * FROM cmn_org_licences_mst WHERE org_code = ?`,
        { replacements: [org_code], type: sequelize.QueryTypes.SELECT }
      );
      const orgUsers = await sequelize.query(
        `SELECT u.*, r.role_name, r.description as role_desc
         FROM users u
         LEFT JOIN roles r ON u.role = r.role_id AND u.org_code = r.org_code
         WHERE u.org_code = ?`,
        { replacements: [org_code], type: sequelize.QueryTypes.SELECT }
      );
      const statusRows = await sequelize.query(
        `SELECT status, COUNT(*) AS total
         FROM prod_quota
         WHERE org_code = ?
         GROUP BY status
         ORDER BY total DESC`,
        { replacements: [org_code], type: sequelize.QueryTypes.SELECT }
      );
      let dateTrunc = "month",
        label = "month";
      if (groupBy === "week") {
        dateTrunc = "week";
        label = "week";
      }
      if (groupBy === "day") {
        dateTrunc = "day";
        label = "date";
      }
      const overTimeRows = await sequelize.query(
        `SELECT TO_CHAR(DATE_TRUNC('${dateTrunc}', created_at), 'YYYY-MM-DD') AS ${label}, COUNT(*) AS total
         FROM prod_quota
         WHERE org_code = ? AND created_at >= ${createdFrom}
         GROUP BY ${label}
         ORDER BY ${label} ASC`,
        { replacements: [org_code], type: sequelize.QueryTypes.SELECT }
      );
      const totalQuotas = statusRows.reduce(
        (sum, row) => sum + Number(row.total),
        0
      );
      const completedQuotas = statusRows
        .filter((row) =>
          ["Verified", "Approved"].includes((row.status || "").trim())
        )
        .reduce((sum, row) => sum + Number(row.total), 0);
      const completionRate =
        totalQuotas > 0 ? Math.round((completedQuotas / totalQuotas) * 100) : 0;
      const approvalRates = await sequelize.query(
        `SELECT status, COUNT(*) AS total
         FROM prod_quota_history
         WHERE status IN ('Approved', 'Rejected', 'Return')
           AND quota_id IN (SELECT id FROM prod_quota WHERE org_code = ?)
           AND created_at >= ${createdFrom}
         GROUP BY status`,
        { replacements: [org_code], type: sequelize.QueryTypes.SELECT }
      );
      const avgApprovalTimeRows = await sequelize.query(
        `SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/86400) AS avg_days
         FROM prod_quota_history
         WHERE status = 'Approved'
           AND quota_id IN (SELECT id FROM prod_quota WHERE org_code = ?)
           AND updated_at IS NOT NULL
           AND created_at IS NOT NULL
           AND created_at >= ${createdFrom}`,
        { replacements: [org_code], type: sequelize.QueryTypes.SELECT }
      );
      const avgApprovalTime = avgApprovalTimeRows[0]?.avg_days
        ? Number(avgApprovalTimeRows[0].avg_days).toFixed(2)
        : null;
      const recentActivity = await sequelize.query(
        `SELECT quota_id, status, assigned_to, node_id, remarks, created_by, to_char(created_at,'YYYY-MM-DD HH24:MI') as created_at
         FROM prod_quota_history
         WHERE quota_id IN (SELECT id FROM prod_quota WHERE org_code = ?)
         ORDER BY created_at DESC
         LIMIT 10`,
        { replacements: [org_code], type: sequelize.QueryTypes.SELECT }
      );
      data = {
        quotaStatusBreakdown: statusRows,
        quotasOverTime: overTimeRows,
        approvalRates,
        avgApprovalTime: avgApprovalTime || 0,
        recentActivity,
        completionRate,
        totalQuotas,
        completedQuotas,
        orgLicenses,
        orgUsers,
      };
    }
    // --- USER ---
    else {
      // Get user info by emp_id
      const [userRow] = await sequelize.query(
        `SELECT * FROM users WHERE org_code = ? AND emp_id = ?`,
        { replacements: [org_code, user_id], type: sequelize.QueryTypes.SELECT }
      );
      // Licenses assigned to this user
      let userLicenses = [];
      if (userRow?.licence_type) {
        userLicenses = await sequelize.query(
          `SELECT * FROM cmn_org_licences_mst WHERE org_code = ? AND licence_type = ?`,
          {
            replacements: [org_code, userRow.licence_type],
            type: sequelize.QueryTypes.SELECT,
          }
        );
      }
      // Quotas assigned to or created by this user (optional: adjust condition for your business logic)
      let userQuotas = [];
      if (userRow) {
        userQuotas = await sequelize.query(
          `SELECT id, quota_name, status, created_at
           FROM prod_quota
           WHERE org_code = ? AND (emp_id  = ? OR created_by = ?)
           ORDER BY created_at DESC
           LIMIT 20`,
          {
            replacements: [org_code, user_id, user_id],
            type: sequelize.QueryTypes.SELECT,
          }
        );
      }
      data = { userLicenses, userQuotas };
    }
    return res.json({ status: true, data });
  } catch (error) {
    console.error("Error fetching quota analytics:", error);
    res.status(500).json({
      status: false,
      message: "Failed to fetch quota analytics",
      error: error.message,
    });
  }
};

exports.getQuotaList = async (req, res) => {
  try {
    const { org_code, user_id, role_id } = req.body;
    console.log("---------- get quota list ");
    // custom field name
    const customFields = await sequelize.query(
      `SELECT field_name FROM prod_mapping_keys_info WHERE org_code = ? AND field_type = 'Quota' AND active = true
        ORDER BY field_sequence, field_name `,
      {
        replacements: [org_code],
        type: sequelize.QueryTypes.SELECT,
      }
    );
    const customColumnNames = customFields.length
      ? ", " + customFields.map((f) => `gpo."${f.field_name}"`).join(", ")
      : "";

    let filterConditions = "";
    if (role_id === "RL_NyAd") {
      filterConditions = ` pq.org_code = :org_code AND pq.created_by IN (SELECT emp_id FROM users WHERE org_code = :org_code)`;
    } else {
      filterConditions = ` pq.org_code = :org_code AND ( pq.created_by = :user_id or 
        pq.id in (select distinct quota_id from prod_quota_history where assigned_to=:user_id ) ) `;
    }

    const finalQuery = `  SELECT pq.id, pq.quota_id, pq.quota_name, pq.region, pq.sub_region, pq.department, pq.emp_id, pq.quota_period,
      pq.yearly, pq.qtr_1, pq.qtr_2, pq.qtr_3, pq.qtr_4, pq.half_yearly_one, pq.half_yearly_two,
      pq.january, pq.february, pq.march, pq.april, pq.may, pq.june, pq.july, pq.august, pq.september,
      pq.october, pq.november, pq.december, pq.status, b.first_name || ' ' || b.last_name as uploaded_by,
      to_char(pq.created_at,'dd/mm/yyyy hh24:mi') created_at, pq.effective_from_date, pq.effective_to_date,pq.created_by,pq.updated_by
      ${customColumnNames} ,  ph.pending_at 
      FROM prod_quota pq LEFT JOIN users b ON pq.created_by = b.emp_id
      ${
        customFields.length
          ? "LEFT JOIN gehc_prod_orders gpo ON gpo.prod_orders_row_id = pq.id"
          : ""
      }
      LEFT JOIN LATERAL (
      SELECT string_agg(u2.first_name || ' ' || u2.last_name, ', ' ORDER BY u2.first_name) AS pending_at
      FROM prod_quota_history a JOIN users u2 ON a.assigned_to = u2.emp_id
      WHERE a.quota_id = pq.id AND a.updated_at IS NULL
      ) ph ON TRUE
      WHERE ${filterConditions} order by pq.created_at DESC, pq.id DESC  `;

    const quotaList = await sequelize.query(finalQuery, {
      replacements: { org_code, user_id },
      type: sequelize.QueryTypes.SELECT,
    });
    const quotaIds = quotaList.map((row) => row.id).filter(Boolean);
    let quotaHistoryList = [];
    if (quotaIds.length) {
      const inClause = quotaIds.map(() => "?").join(",");
      const replacements = [...quotaIds, ...quotaIds]; 
      
      //  quotaHistoryList = await sequelize.query( `
      //    select distinct main.quota_id,main.assigned_from,main.quota_action as status,main.created_at,sub.assigned_to,sub.remarks,sub.sub_temp_node_id from
      //   (SELECT distinct qh.quota_id, b.first_name || ' ' || b.last_name as assigned_from,
      //   qh.quota_action,qh.status,qh.temp_node_id,qh.node_id,qh.remarks,to_char(qh.created_at ,'mm/dd/yyyy hh24:mi') as created_at
      //   FROM prod_quota_history qh LEFT JOIN users b ON qh.created_by = b.emp_id WHERE qh.quota_id IN(${inClause}) ) main left join
      //   (SELECT h.status,h.quota_id sub_quota_id,h.temp_node_id as sub_temp_node_id,h.node_id as sub_node, STRING_AGG(u.first_name || ' ' || u.last_name || ' ', ', ') AS assigned_to,h.remarks
      //   FROM prod_quota_history h LEFT JOIN users u ON h.assigned_to = u.emp_id
      //   WHERE h.quota_id in (${inClause}) GROUP BY h.status,h.quota_id,h.node_id,h.temp_node_id,h.remarks ) sub
      //   on main.quota_id = sub.sub_quota_id and main.node_id = sub.sub_node and main.temp_node_id = sub.sub_temp_node_id 
      //   and main.status = sub.status
      //   ORDER BY sub.sub_temp_node_id desc,created_at DESC `,    

        // quotaHistoryList = await sequelize.query( `
        //   select * from (SELECT distinct 
        //   m.quota_id, m.assigned_from, m.quota_action as status, m.created_at, s.assigned_to, s.remarks, s.temp_node_id
        // FROM ( 
        //   SELECT DISTINCT ON (qh.quota_id, qh.temp_node_id) qh.quota_id, b.first_name || ' ' || b.last_name AS assigned_from, 
        //   qh.quota_action, qh.status, to_char(qh.created_at, 'YYYY-MM-DD HH24:MI') AS created_at, qh.temp_node_id
        //   FROM prod_quota_history qh LEFT JOIN users b ON qh.created_by = b.emp_id
        //   WHERE qh.quota_id in (${inClause}) ORDER BY qh.quota_id, qh.temp_node_id, qh.created_at DESC
        // ) AS m
        // LEFT JOIN ( 
        //   SELECT h.quota_id, h.temp_node_id, h.status, STRING_AGG(u.first_name || ' ' || u.last_name, ', ') AS assigned_to, h.remarks
        //   FROM prod_quota_history h LEFT JOIN users u
        //     ON h.assigned_to = u.emp_id WHERE h.quota_id in (${inClause})
        //   GROUP BY h.quota_id, h.temp_node_id, h.status, h.remarks
        // ) AS s
        //   ON m.quota_id = s.quota_id AND m.temp_node_id = s.temp_node_id AND m.status= s.status )
        // ORDER BY temp_node_id DESC , created_at DESC           
        //   ` ,

        quotaHistoryList = await sequelize.query( `
        select a.quota_id,(select b.first_name || ' ' || b.last_name from users b where emp_id = a.created_by) as assigned_from, 
        a.quota_action as status,(select first_name || ' ' || last_name from users where emp_id = a.assigned_to) as assigned_to
        ,a.node_id,a.remarks,a.temp_node_id,to_char(a.created_at, 'YYYY-MM-DD HH24:MI') created_at 
        from  prod_quota_history a  where a.quota_id in (${inClause}) order by a.quota_id, a.temp_node_id desc
         `,
        {
          replacements,
          type: sequelize.QueryTypes.SELECT,
        }
      );
    }
    const historyMap = {};
    quotaHistoryList.forEach((hist) => {
      const key = parseInt(hist.quota_id, 10); // ensure it's an integer for robust mapping
      if (!historyMap[key]) historyMap[key] = [];
      historyMap[key].push(hist);
    });
    const result = quotaList.map((row) => ({
      ...row,
      quotaHistoryFlow: historyMap[row.id] || [],
    }));

    console.log("---------- get quota end ");
    return res.status(200).json({ status: true, data: result });
  } catch (error) {
    console.error("Error Fetching Quotas Data List.", error);
    res.status(500).json({
      status: false,
      message: "Failed to Fetch Quotas Data List.",
      error: error.message,
    });
  }
};

exports.getPendingQuotaList = async (req, res) => {
  try {
    const { org_code, user_id, role_id } = req.body;
    console.log("--------------getPendingQuotaList ------Start---------  ");
    const customFields = await sequelize.query(
      `SELECT field_name FROM prod_mapping_keys_info
        WHERE org_code = ? AND field_type = 'Quota' AND active = true
        ORDER BY field_sequence, field_name `,
      {
        replacements: [org_code],
        type: sequelize.QueryTypes.SELECT,
      }
    );
    const customColumnNames = customFields.length
      ? ", " + customFields.map((f) => `gpo."${f.field_name}"`).join(", ")
      : "";
    const finalQuery = ` select * from ( SELECT pq.id, pq.quota_id, pq.quota_name, pq.region, pq.sub_region, pq.department, pq.emp_id, pq.quota_period,
        pq.yearly, pq.qtr_1, pq.qtr_2, pq.qtr_3, pq.qtr_4, pq.half_yearly_one, pq.half_yearly_two,
        pq.january, pq.february, pq.march, pq.april, pq.may, pq.june, pq.july, pq.august, pq.september,
        pq.october, pq.november, pq.december, pq.status, b.first_name || ' ' || b.last_name as uploaded_by,
        to_char(pq.created_at,'dd/mm/yyyy hh24:mi') created_at, pq.effective_from_date, pq.effective_to_date,pq.created_by,pq.updated_by,pq.last_node 
        ${customColumnNames}  
        FROM prod_quota pq LEFT JOIN users b ON pq.created_by = b.emp_id
        ${
          customFields.length
            ? "LEFT JOIN gehc_prod_orders gpo ON gpo.prod_orders_row_id = pq.id"
            : ""
        }    
        WHERE pq.status not in('Verified') and pq.org_code = :org_code  ) main   right join 
        (select a.quota_id as sub_quota_id,u.first_name || ' ' || u.last_name AS pending_at,a.node_id,a.temp_node_id 
        from prod_quota_history a left join prod_quota b on a.quota_id = b.id
        left join users u ON a.assigned_to = u.emp_id where b.org_code= :org_code 
        and a.assigned_to= :user_id  and a.updated_at is null) sub on main.id = sub.sub_quota_id
        ORDER BY main.created_at  DESC ,main.id desc `;
    const quotaList = await sequelize.query(finalQuery, {
      replacements: { org_code, user_id },
      type: sequelize.QueryTypes.SELECT,
    });
    const quotaIds = quotaList.map((row) => row.id).filter(Boolean);
    let quotaHistoryList = [];
    if (quotaIds.length) {
      const inClause = quotaIds.map(() => "?").join(",");
      const replacements = [...quotaIds, ...quotaIds];
       
      // quotaHistoryList = await sequelize.query( `
      //    select distinct main.quota_id,main.assigned_from,main.quota_action as status,main.created_at,sub.assigned_to,sub.remarks,sub.sub_temp_node_id from
      //   (SELECT distinct qh.quota_id, b.first_name || ' ' || b.last_name as assigned_from,
      //   qh.quota_action,qh.status,qh.temp_node_id,qh.node_id,qh.remarks,to_char(qh.created_at ,'mm/dd/yyyy hh24:mi') as created_at
      //   FROM prod_quota_history qh LEFT JOIN users b ON qh.created_by = b.emp_id WHERE qh.quota_id IN(${inClause}) ) main left join
      //   (SELECT h.status,h.quota_id sub_quota_id,h.temp_node_id as sub_temp_node_id,h.node_id as sub_node, STRING_AGG(u.first_name || ' ' || u.last_name || ' ', ', ') AS assigned_to,h.remarks
      //   FROM prod_quota_history h LEFT JOIN users u ON h.assigned_to = u.emp_id
      //   WHERE h.quota_id in (${inClause}) GROUP BY h.status,h.quota_id,h.node_id,h.temp_node_id,h.remarks ) sub
      //   on main.quota_id = sub.sub_quota_id and main.node_id = sub.sub_node and main.temp_node_id = sub.sub_temp_node_id 
      //   and main.status = sub.status
      //   ORDER BY sub.sub_temp_node_id desc,created_at DESC `,     

      // quotaHistoryList = await sequelize.query( `
      //     select * from (SELECT distinct 
      //     m.quota_id, m.assigned_from, m.quota_action as status, m.created_at, s.assigned_to, s.remarks, s.temp_node_id
      //   FROM ( 
      //     SELECT DISTINCT ON (qh.quota_id, qh.temp_node_id) qh.quota_id, b.first_name || ' ' || b.last_name AS assigned_from, 
      //     qh.quota_action, qh.status, to_char(qh.created_at, 'YYYY-MM-DD HH24:MI') AS created_at, qh.temp_node_id
      //     FROM prod_quota_history qh LEFT JOIN users b ON qh.created_by = b.emp_id
      //     WHERE qh.quota_id in (${inClause}) ORDER BY qh.quota_id, qh.temp_node_id, qh.created_at DESC
      //   ) AS m
      //   LEFT JOIN ( 
      //     SELECT h.quota_id, h.temp_node_id, h.status, STRING_AGG(u.first_name || ' ' || u.last_name, ', ') AS assigned_to, h.remarks
      //     FROM prod_quota_history h LEFT JOIN users u
      //       ON h.assigned_to = u.emp_id WHERE h.quota_id in (${inClause})
      //     GROUP BY h.quota_id, h.temp_node_id, h.status, h.remarks
      //   ) AS s
      //     ON m.quota_id = s.quota_id AND m.temp_node_id = s.temp_node_id AND m.status= s.status )
      //   ORDER BY temp_node_id DESC , created_at DESC           
      //     ` ,

      quotaHistoryList = await sequelize.query( `
        select a.quota_id,(select b.first_name || ' ' || b.last_name from users b where emp_id = a.created_by) as assigned_from, 
        a.quota_action as status,(select first_name || ' ' || last_name from users where emp_id = a.assigned_to) as assigned_to
        ,a.node_id,a.remarks,a.temp_node_id,to_char(a.created_at, 'YYYY-MM-DD HH24:MI') created_at 
        from  prod_quota_history a  where a.quota_id in (${inClause}) order by a.quota_id, a.temp_node_id desc
         `,

        {
          replacements,
          type: sequelize.QueryTypes.SELECT,
        }
      );
    }
    const historyMap = {};
    quotaHistoryList.forEach((hist) => {
      const key = parseInt(hist.quota_id, 10); // ensure it's an integer for robust mapping
      if (!historyMap[key]) historyMap[key] = [];
      historyMap[key].push(hist);
    });
    const result = quotaList.map((row) => ({
      ...row,
      quotaHistoryFlow: historyMap[row.id] || [],
    }));

    console.log("--------------getPendingQuotaList ------End---------  ");
    return res.status(200).json({ status: true, data: result });
  } catch (error) {
    console.error("Error Fetching Pending Quotas Data List.", error);
    res.status(500).json({
      status: false,
      message: "Failed to Fetch Pending Quotas Data List.",
      error: error.message,
    });
  }
};

exports.getVerifiedQuotaList = async (req, res) => {
  try {
    const { org_code, user_id, role_id } = req.body;
    console.log("--------------getVerifiedQuotaList ------Start---------  ");
    const customFields = await sequelize.query(
      `SELECT field_name FROM prod_mapping_keys_info
        WHERE org_code = ? AND field_type = 'Quota' AND active = true
        ORDER BY field_sequence, field_name `,
      {
        replacements: [org_code],
        type: sequelize.QueryTypes.SELECT,
      }
    );
    const customColumnNames = customFields.length
      ? ", " + customFields.map((f) => `gpo."${f.field_name}"`).join(", ")
      : "";
    const finalQuery = ` select * from ( SELECT pq.id, pq.quota_id, pq.quota_name, pq.region, pq.sub_region, pq.department, pq.emp_id, pq.quota_period,
        pq.yearly, pq.qtr_1, pq.qtr_2, pq.qtr_3, pq.qtr_4, pq.half_yearly_one, pq.half_yearly_two,
        pq.january, pq.february, pq.march, pq.april, pq.may, pq.june, pq.july, pq.august, pq.september,
        pq.october, pq.november, pq.december, pq.status, b.first_name || ' ' || b.last_name as uploaded_by,
        to_char(pq.created_at,'dd/mm/yyyy hh24:mi') created_at, pq.effective_from_date, pq.effective_to_date,pq.created_by,pq.updated_by,pq.last_node 
        ${customColumnNames}  
        FROM prod_quota pq LEFT JOIN users b ON pq.created_by = b.emp_id
        ${
          customFields.length
            ? "LEFT JOIN gehc_prod_orders gpo ON gpo.prod_orders_row_id = pq.id"
            : ""
        }    
        WHERE pq.status = 'Verified' and  pq.org_code = :org_code  ) main   right join 
        (select a.quota_id as sub_quota_id,u.first_name || ' ' || u.last_name AS pending_at,a.node_id ,a.temp_node_id
        from prod_quota_history a left join prod_quota b on a.quota_id = b.id
        left join users u ON a.assigned_to = u.emp_id where b.org_code= :org_code 
        and a.assigned_to= :user_id and a.updated_at is null) sub on main.id = sub.sub_quota_id
        ORDER BY main.created_at  DESC ,main.id desc `;

    const quotaList = await sequelize.query(finalQuery, {
      replacements: { org_code, user_id },
      type: sequelize.QueryTypes.SELECT,
    });
    const quotaIds = quotaList.map((row) => row.id).filter(Boolean);
    let quotaHistoryList = [];
    if (quotaIds.length) {
      const inClause = quotaIds.map(() => "?").join(",");
      const replacements = [...quotaIds, ...quotaIds];
      // quotaHistoryList = await sequelize.query( `
      //    select distinct main.quota_id,main.assigned_from,main.quota_action as status,main.created_at,sub.assigned_to,sub.remarks,sub.sub_temp_node_id from
      //   (SELECT distinct qh.quota_id, b.first_name || ' ' || b.last_name as assigned_from,
      //   qh.quota_action,qh.status,qh.temp_node_id,qh.node_id,qh.remarks,to_char(qh.created_at ,'mm/dd/yyyy hh24:mi') as created_at
      //   FROM prod_quota_history qh LEFT JOIN users b ON qh.created_by = b.emp_id WHERE qh.quota_id IN(${inClause}) ) main left join
      //   (SELECT h.status,h.quota_id sub_quota_id,h.temp_node_id as sub_temp_node_id,h.node_id as sub_node, STRING_AGG(u.first_name || ' ' || u.last_name || ' ', ', ') AS assigned_to,h.remarks
      //   FROM prod_quota_history h LEFT JOIN users u ON h.assigned_to = u.emp_id
      //   WHERE h.quota_id in (${inClause}) GROUP BY h.status,h.quota_id,h.node_id,h.temp_node_id,h.remarks ) sub
      //   on main.quota_id = sub.sub_quota_id and main.node_id = sub.sub_node and main.temp_node_id = sub.sub_temp_node_id 
      //   and main.status = sub.status
      //   ORDER BY sub.sub_temp_node_id desc,created_at DESC `, 
 //, m.status
      // quotaHistoryList = await sequelize.query( `
      //     select * from (SELECT distinct 
      //     m.quota_id, m.assigned_from, m.quota_action as status, m.created_at, s.assigned_to, s.remarks, s.temp_node_id
      //   FROM ( 
      //     SELECT DISTINCT ON (qh.quota_id, qh.temp_node_id) qh.quota_id, b.first_name || ' ' || b.last_name AS assigned_from, 
      //     qh.quota_action, qh.status, to_char(qh.created_at, 'YYYY-MM-DD HH24:MI') AS created_at, qh.temp_node_id
      //     FROM prod_quota_history qh LEFT JOIN users b ON qh.created_by = b.emp_id
      //     WHERE qh.quota_id in (${inClause}) ORDER BY qh.quota_id, qh.temp_node_id, qh.created_at DESC
      //   ) AS m
      //   LEFT JOIN ( 
      //     SELECT h.quota_id, h.temp_node_id, h.status, STRING_AGG(u.first_name || ' ' || u.last_name, ', ') AS assigned_to, h.remarks
      //     FROM prod_quota_history h LEFT JOIN users u
      //       ON h.assigned_to = u.emp_id WHERE h.quota_id in (${inClause})
      //     GROUP BY h.quota_id, h.temp_node_id, h.status, h.remarks
      //   ) AS s
      //     ON m.quota_id = s.quota_id AND m.temp_node_id = s.temp_node_id AND m.status= s.status )
      //   ORDER BY temp_node_id DESC , created_at DESC           
      //     ` ,

      quotaHistoryList = await sequelize.query( `
        select a.quota_id,(select b.first_name || ' ' || b.last_name from users b where emp_id = a.created_by) as assigned_from, 
        a.quota_action as status,(select first_name || ' ' || last_name from users where emp_id = a.assigned_to) as assigned_to
        ,a.node_id,a.remarks,a.temp_node_id,to_char(a.created_at, 'YYYY-MM-DD HH24:MI') created_at 
        from  prod_quota_history a  where a.quota_id in (${inClause}) order by a.quota_id, a.temp_node_id desc
         `,
          
        {
          replacements,
          type: sequelize.QueryTypes.SELECT,
        }
      );
    }
    const historyMap = {};
    quotaHistoryList.forEach((hist) => {
      const key = parseInt(hist.quota_id, 10); // ensure it's an integer for robust mapping
      if (!historyMap[key]) historyMap[key] = [];
      historyMap[key].push(hist);
    });
    const result = quotaList.map((row) => ({
      ...row,
      quotaHistoryFlow: historyMap[row.id] || [],
    }));

    console.log("--------------getVerifiedQuotaList ------End---------  ");
    return res.status(200).json({ status: true, data: result });
  } catch (error) {
    console.error("Error Fetching Pending Quotas Data List.", error);
    res.status(500).json({
      status: false,
      message: "Failed to Fetch Pending Quotas Data List.",
      error: error.message,
    });
  }
};

exports.updateQuotaRow = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { quota_id, ...fields } = req.body;
    if (!quota_id)
      return res
        .status(400)
        .json({ status: false, message: "quota_id is required." });

    // 1. Fetch old quota for audit log
    const oldRows = await sequelize.query(
      `SELECT * FROM prod_quota WHERE quota_id = :quota_id`,
      {
        replacements: { quota_id },
        type: sequelize.QueryTypes.SELECT,
        transaction,
      }
    );
    const oldQuota = oldRows && oldRows.length ? oldRows[0] : null;

    // 2. Update
    const [affectedRows] = await sequelize.query(
      `UPDATE prod_quota SET quota_name = :quota_name, region = :region, december = :december WHERE quota_id = :quota_id`,
      {
        replacements: { quota_id, ...fields },
        type: sequelize.QueryTypes.UPDATE,
        transaction,
      }
    );

    if (affectedRows > 0) {
      // 3. Fetch new quota for audit log
      const newRows = await sequelize.query(
        `SELECT * FROM prod_quota WHERE quota_id = :quota_id`,
        {
          replacements: { quota_id },
          type: sequelize.QueryTypes.SELECT,
          transaction,
        }
      );
      const newQuota = newRows && newRows.length ? newRows[0] : null;

      await transaction.commit();
      // 4. Log audit
      await logAudit({
        org_code: oldQuota?.org_code || null,
        object_type: "prod_quota",
        object_id: quota_id,
        action: "UPDATE",
        changed_by: fields.updated_by || fields.user_id || null,
        old_values: oldQuota,
        new_values: newQuota,
        remarks: "Quota row updated",
      });

      return res.json({ status: true, message: "Quota updated successfully!" });
    } else {
      await transaction.rollback();
      return res
        .status(404)
        .json({ status: false, message: "Quota not found." });
    }
  } catch (error) {
    // Only rollback if not already committed or rolled back
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    return res.status(500).json({ status: false, message: error.message });
  }
};

// Delete a quota row by quota_id
exports.deleteQuotaRow = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { quota_id, user_id } = req.body;
    if (!quota_id)
      return res
        .status(400)
        .json({ status: false, message: "quota_id is required." });

    // ← Fetch old before delete
    const [oldRows] = await sequelize.query(
      `SELECT * FROM prod_quota WHERE id = ?`,
      {
        replacements: [quota_id],
        type: sequelize.QueryTypes.SELECT,
        transaction: t,
      }
    );
    const oldQuota = oldRows || null;

    const [affectedRows] = await sequelize.query(
      `DELETE FROM prod_quota WHERE id = ?`,
      {
        replacements: [quota_id],
        type: sequelize.QueryTypes.DELETE,
        transaction: t,
      }
    );
    if (!affectedRows) {
      await t.rollback();
      return res
        .status(404)
        .json({ status: false, message: "Quota not found." });
    }

    // ← Log audit: delete only has old_values
    await logAudit({
      org_code: oldQuota.org_code,
      object_type: "prod_quota",
      object_id: quota_id,
      action: "DELETE",
      changed_by: user_id,
      old_values: oldQuota,
      new_values: null,
      remarks: "Quota row deleted",
    });

    await t.commit();
    return res.json({ status: true, message: "Quota deleted successfully!" });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({ status: false, message: error.message });
  }
};

// exports.quotaApproveOrReturnByAdmin = async (req, res) => {
//   const transaction = await sequelize.transaction();
//   try {
//     const {
//       org_code,
//       user_id,
//       work_flow_id,
//       status,
//       list_checkbox_ids,
//       node_ids,
//     } = req.body;
//     let quotaIds = list_checkbox_ids;
//     if (typeof quotaIds === "string") {
//       try {
//         quotaIds = JSON.parse(quotaIds);
//       } catch {
//         throw new Error("Invalid JSON format for list_checkbox_ids");
//       }
//     }
//     if (!Array.isArray(quotaIds) || quotaIds.length === 0) {
//       throw new Error("Invalid or empty quota ID list");
//     }

//     const oldQuotas = await sequelize.query(
//       `SELECT * FROM prod_quota WHERE id IN (:quotaIds)`,
//       {
//         replacements: { quotaIds },
//         type: sequelize.QueryTypes.SELECT,
//         transaction,
//       }
//     );

//     const wfDetails = await sequelize.query(
//       ` SELECT distinct w.type AS work_flow_type,wn.action_user_id,wn.node_id,wn.source_sl_no, 
//           wn.source_node_id,'yes' as source_node_direction
//           FROM work_flows w JOIN work_flow_nodes wn ON w.id = wn.work_flow_id
//           left join work_flow_edges we ON wn.work_flow_id = we.work_flow_id and wn.source_node_id   = we.source_node_id
//           and wn.source_node_id   = we.destination_node_id
//           WHERE w.id = :work_flow_id AND LENGTH(wn.action_user_id) > 0  and wn.action_user_id is not null order by wn.source_sl_no`,
//       {
//         type: sequelize.QueryTypes.SELECT,
//         replacements: { work_flow_id },
//         transaction,
//       }
//     );
//     if (!wfDetails.length) throw new Error("No work flows found");
//     const flowRows = [];
//     // const historyRows = [];

//     for (const quota_id of quotaIds) {
//       for (const {
//         work_flow_type,
//         action_user_id,
//         node_id,
//         quota_stage,
//         source_sl_no,
//         source_node_direction,
//       } of wfDetails) {
//         const assignees = await resolveAssignees({
//           org_code,
//           work_flow_type,
//           action_user_id,
//           created_by: user_id,
//         });
//         for (const emp_id of assignees) {
//           flowRows.push([
//             quota_id,
//             emp_id,
//             user_id,
//             quota_stage || status,
//             source_sl_no,
//             source_sl_no,
//             source_node_direction,
//             user_id,
//           ]);
//         }
//       }
//     }
//     await sequelize.query(
//       `UPDATE prod_quota SET status = 'In Progress',updated_at =now(),updated_by =  '${user_id}' , work_flow_id= '${work_flow_id}'   
//         WHERE id in (:quotaIds)  AND org_code = :org_code`,
//       {
//         replacements: { user_id, work_flow_id, quotaIds, org_code },
//         type: sequelize.QueryTypes.UPDATE,
//         transaction,
//       }
//     );
//     await sequelize.query(
//       `INSERT INTO prod_quota_flow
//          (quota_id, assigned_to, assigned_from, status, node_id, source_node_id, node_decision, created_by, created_at, assigned_at)
//        VALUES ${flowRows
//          .map(() => "(?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())")
//          .join(",")}`,
//       {
//         type: sequelize.QueryTypes.INSERT,
//         replacements: flowRows.flat(),
//         transaction,
//       }
//     );
//     const presentDateAndTime = new Date();

//     let tempWKNodeId = wfDetails[0].source_sl_no;
//     await sequelize.query(
//       `INSERT INTO prod_quota_history ( status, quota_id, created_by, assigned_to, node_decision, node_id,  created_at,quota_action)
//       ( SELECT 'In Progress ' as status, df.quota_id,created_by,df.assigned_to,df.node_decision,df.node_id ,
//        :presentDateAndTime::timestamp  AS created_at ,'test' as quota_action
//         FROM prod_quota_flow df WHERE df.quota_id in (:quotaIds) and df.node_id  = :tempWKNodeId ) `,
//       {
//         type: sequelize.QueryTypes.INSERT,
//         replacements: { presentDateAndTime, quotaIds, tempWKNodeId },
//         transaction,
//       }
//     );

//     const tempQuotaIds = quotaIds;
//     const tempNodeIds = node_ids;

//     const sql = ` UPDATE prod_quota_history  SET updated_at = NOW(), updated_by = ?
//     WHERE quota_id IN (${quotaIds}) AND node_id IN (${node_ids}) `;

//     const replacements = [user_id, ...tempQuotaIds, ...tempNodeIds];

//     await sequelize.query(sql, {
//       type: sequelize.QueryTypes.UPDATE,
//       replacements,
//       transaction,
//     });
//     const newQuotas = await sequelize.query(
//       `SELECT * FROM prod_quota WHERE id IN (:quotaIds)`,
//       {
//         replacements: { quotaIds },
//         type: sequelize.QueryTypes.SELECT,
//         transaction,
//       }
//     );
//     await transaction.commit();
//     for (const id of quotaIds) {
//       const oldQ = oldQuotas.find((q) => q.id === id) || null;
//       const newQ = newQuotas.find((q) => q.id === id) || null;
//       await logAudit({
//         org_code,
//         object_type: "prod_quota",
//         object_id: id,
//         action: "STATUS_UPDATE",
//         changed_by: user_id,
//         old_values: oldQ,
//         new_values: newQ,
//         remarks: `Quota ${status} by ${user_id}`,
//       });
//     }
//     return res.json({
//       status: true,
//       message: "Quota approvals recorded successfully.",
//     });
//   } catch (error) {
//     console.error("Error approving or returning quota:", error);
//     await transaction.rollback();
//     return res.status(500).json({
//       status: false,
//       message: "Failed to process quota approval.",
//       error: error.message,
//     });
//   }
// };

async function resolveAssignees({
  org_code,
  work_flow_type,
  action_user_id,
  created_by,
}) {
  try {
    if (work_flow_type === "user") {
      return [action_user_id];
    }
    if (work_flow_type === "role" || work_flow_type === "smartrouting") {
      const rows = await sequelize.query(
        `SELECT emp_id FROM users WHERE org_code = :org_code AND user_active = true AND role = :action_user_id ORDER BY first_name`,
        {
          type: sequelize.QueryTypes.SELECT,
          replacements: { org_code, action_user_id },
        }
      );
      return rows.map((r) => r.emp_id).filter(Boolean);
    }
    if (work_flow_type === "hierarchy") {
      let rows = null;
      if (action_user_id != "Admin") {
        rows = await sequelize.query(
          ` WITH RECURSIVE eh AS ( SELECT h.emp_id, h.reporting_to, 0 AS lvl 
          FROM hierarchy h WHERE h.org_code = :org_code AND h.emp_id = :created_by AND h.effective_end_date IS NULL 
          UNION ALL
          SELECT h.emp_id, h.reporting_to, eh.lvl + 1 FROM hierarchy h 
          JOIN eh ON h.emp_id = eh.reporting_to WHERE (h.effective_end_date IS NULL OR h.effective_end_date >= CURRENT_DATE) 
          AND h.effective_start_date <= CURRENT_DATE )
          SELECT emp_id FROM eh WHERE lvl = :action_user_id `,
          {
            type: sequelize.QueryTypes.SELECT,
            replacements: { org_code, created_by, action_user_id },
          }
        );
        return rows.map((r) => r.emp_id).filter(Boolean);
      }
      if (action_user_id == "Admin") {
        rows = await sequelize.query(
          `select emp_id from users where org_code=:org_code and role='RL_NyAd' and user_active='true' order by emp_id`,
          {
            type: sequelize.QueryTypes.SELECT,
            replacements: { org_code, created_by, action_user_id },
          }
        );
        return rows.map((r) => r.emp_id).filter(Boolean);
      }
    }
    return res.status(200).json({ status: true, data: quotaList });
  } catch (error) {
    console.error("Error Fetching Quotas Data List.", error);
    res.status(500).json({
      status: false,
      message: "Failed to Fetch Quotas Data List.",
      error: error.message,
    });
  }
}

exports.updateSelectedManualQuotaDetails = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { org_code, prod_quota, prod_quota_cust, quotaHistory, quota_id } =
      req.body;

    const [oldRows] = await sequelize.query(
      `SELECT * FROM prod_quota WHERE id = ?`,
      {
        replacements: [quota_id],
        type: sequelize.QueryTypes.SELECT,
        transaction: t,
      }
    );
    const oldQuota = oldRows || null;

    const prodQuotaFields = [
      "quota_name",
      "region",
      "sub_region",
      "department",
      "emp_id",
      "role_id",
      "quota_period",
      "yearly",
      "qtr_1",
      "qtr_2",
      "qtr_3",
      "qtr_4",
      "half_yearly_one",
      "half_yearly_two",
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
      "effective_from_date",
      "effective_to_date",
      "status",
    ];

    const prodQuotaUpdateQuery = `
      UPDATE prod_quota SET ${prodQuotaFields
        .map((field) => `${field} = ?`)
        .join(", ")}
      WHERE org_code = ? AND quota_id IN (${quota_id})
      RETURNING id
    `;

    const prodQuotaValues = prodQuotaFields.map(
      (field) => prod_quota[field] || null
    );

    const [updateResult] = await sequelize.query(prodQuotaUpdateQuery, {
      replacements: [...prodQuotaValues, org_code, quota_id],
      transaction: t,
    });

    if (updateResult.length === 0) {
      throw new Error("Quota not found or no changes detected");
    }

    const prodQuotaId = updateResult[0].id;
    const customColumns = Object.keys(prod_quota_cust);
    const customValues = Object.values(prod_quota_cust);
    const customTable = `${org_code}_prod_orders`;

    const customUpdateQuery = `
      UPDATE ${customTable} SET ${customColumns
      .map((col) => `${col} = ?`)
      .join(", ")} WHERE prod_orders_row_id = ? `;

    await sequelize.query(customUpdateQuery, {
      replacements: [...customValues, prodQuotaId],
      transaction: t,
    });

    const quotaHistoryQuery = ` 
    INSERT INTO prod_quota_history ( status, assigned_to, created_by, created_at, quota_id ) VALUES (?, ?, ?, ?, ?) `;

    await sequelize.query(quotaHistoryQuery, {
      replacements: [
        quotaHistory.status,
        quotaHistory.assigned_to,
        quotaHistory.created_by,
        quotaHistory.created_at,
        prodQuotaId,
      ],
      transaction: t,
    });

    await t.commit();

    const [newRows] = await sequelize.query(
      `SELECT * FROM prod_quota WHERE id = ?`,
      { replacements: [quota_id], type: sequelize.QueryTypes.SELECT }
    );
    const newQuota = newRows || null;

    await logAudit({
      org_code,
      object_type: "prod_quota",
      object_id: quota_id,
      action: "UPDATE",
      changed_by: quotaHistory.created_by,
      old_values: oldQuota,
      new_values: newQuota,
      remarks: "Manual quota and custom fields updated",
    });
    return res
      .status(200)
      .json({
        status: true,
        message: "Data updated successfully",
        id: prodQuotaId,
      });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({ status: false, message: error.message });
  }
};

const PROD_QUOTA_FIELD_TYPE = {
  quota_name: "string",
  region: "string",
  sub_region: "string",
  department: "string", // Use department, not department_id
  emp_id: "string",
  role_id: "string",
  quota_period: "string",
  yearly: "number",
  qtr_1: "number",
  qtr_2: "number",
  qtr_3: "number",
  qtr_4: "number",
  half_yearly_one: "number",
  half_yearly_two: "number",
  january: "number",
  february: "number",
  march: "number",
  april: "number",
  may: "number",
  june: "number",
  july: "number",
  august: "number",
  september: "number",
  october: "number",
  november: "number",
  december: "number",
  effective_from_date: "date",
  effective_to_date: "date",
};

exports.saveManualQuotaDetails = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    let {
      org_code,
      prod_quota: prodQuotas,
      prod_quota_cust: prodQuotaCusts,
      quotaHistory,
      user_name,
    } = req.body;
    const presentDateAndTime = new Date();
    if (!Array.isArray(prodQuotas)) prodQuotas = prodQuotas ? [prodQuotas] : [];
    if (!Array.isArray(prodQuotaCusts))
      prodQuotaCusts = prodQuotaCusts ? [prodQuotaCusts] : [];

    let typeErrors = [];
    let empIdNotFound = [];
    let alreadyExist = [];

    // --- Helper to sanitize numbers ---
    const sanitizeNumber = (val) =>
      val === undefined ||
      val === null ||
      val === "" ||
      isNaN(Number(val)) ||
      Number(val) < 0
        ? 0
        : Number(val);

    // Helper to get all columns and data types for a table (custom fields)
    async function getCustomTableCols(tableName, t) {
      return await sequelize.query(
        `SELECT column_name, data_type FROM information_schema.columns
         WHERE table_name = ? AND table_schema = 'public'`,
        {
          replacements: [tableName],
          type: sequelize.QueryTypes.SELECT,
          transaction: t,
        }
      );
    }

    // Fetch all emp_id from users table for org_code
    const users = await sequelize.query(
      `SELECT emp_id FROM users WHERE org_code = ? AND user_active = true`,
      {
        replacements: [org_code],
        type: sequelize.QueryTypes.SELECT,
        transaction: t,
      }
    );
    const validEmpIds = new Set(users.map((u) => u.emp_id));

    // Prepare unique keys for duplicate check
    const uniqueKeys = prodQuotas.map((q) => ({
      emp_id: q.emp_id,
      quota_name: q.quota_name,
      quota_period: q.quota_period,
      department: q.department,
    }));

    // Duplicate check by quota_id/quota_name/quota_period
    const quotaIds = prodQuotas.map((q) => q.quota_id).filter(Boolean);
    const quotaNames = prodQuotas.map((q) => q.quota_name).filter(Boolean);
    const quotaPeriods = prodQuotas.map((q) => q.quota_period).filter(Boolean);

    let duplicateCheckRows = [];
    if (quotaIds.length || quotaNames.length || quotaPeriods.length) {
      const conditions = [];
      const replacements = [org_code];

      if (quotaIds.length) {
        conditions.push(`quota_id IN (${quotaIds.map(() => "?").join(",")})`);
        replacements.push(...quotaIds);
      }
      if (quotaNames.length) {
        conditions.push(
          `quota_name IN (${quotaNames.map(() => "?").join(",")})`
        );
        replacements.push(...quotaNames);
      }
      if (quotaPeriods.length) {
        conditions.push(
          `quota_period IN (${quotaPeriods.map(() => "?").join(",")})`
        );
        replacements.push(...quotaPeriods);
      }

      const whereClause = conditions.length
        ? "AND (" + conditions.join(" and ") + ")"
        : "";
      const dupQuery = `
        SELECT id, quota_id, quota_name, quota_period FROM prod_quota WHERE org_code = ?
        ${whereClause}
      `;
      duplicateCheckRows = await sequelize.query(dupQuery, {
        replacements,
        type: sequelize.QueryTypes.SELECT,
        transaction: t,
      });
    }

    // Loop and collect errors (match by values)
    let duplicateErrors = [];
    prodQuotas.forEach((row, idx) => {
      if (
        duplicateCheckRows.some(
          (r) =>
            (row.emp_id && r.quota_id === row.emp_id) ||
            (row.quota_name && r.quota_name === row.quota_name) ||
            (row.quota_period && r.quota_period === row.quota_period) ||
            (row.effective_from_date &&
              r.effective_from_date === row.effective_from_date) ||
            (row.effective_to_date &&
              r.effective_to_date === row.effective_to_date)
        )
      ) {
        duplicateErrors.push({
          row: idx + 2,
          emp_id: row.emp_id,
          quota_name: row.quota_name,
          quota_period: row.quota_period,
          effective_from_date: row.effective_from_date,
          effective_to_date: row.effective_to_date,
        });
      }
    });

    if (duplicateErrors.length) {
      await t.rollback();
      const errStr = duplicateErrors
        .map((e) => {
          const fields = [];
          if (e.row !== undefined && e.row !== null)
            fields.push(`row ${e.row}`);
          if (e.emp_id) fields.push(`emp_id='${e.emp_id}'`);
          if (e.quota_id) fields.push(`quota_id='${e.quota_id}'`);
          if (e.quota_name) fields.push(`quota_name='${e.quota_name}'`);
          if (e.quota_period) fields.push(`quota_period='${e.quota_period}'`);
          if (e.effective_from_date)
            fields.push(`effective_from_date='${e.effective_from_date}'`);
          return fields.join(", ");
        })
        .join("; ");
      return res.json({
        message: `Duplicate values are found : ${errStr}`,
      });
    }

    // Duplicate check on emp_id+quota_period+department+quota_name
    let existRows = [];
    if (uniqueKeys.length) {
      existRows = await sequelize.query(
        `SELECT emp_id, quota_period, department, quota_name FROM prod_quota
         WHERE org_code = ? AND (${uniqueKeys
           .map(
             () =>
               `(emp_id = ? AND quota_period = ? AND department = ? AND quota_name = ?)`
           )
           .join(" OR ")})`,
        {
          replacements: [
            org_code,
            ...uniqueKeys.flatMap((u) => [
              u.emp_id,
              u.quota_period,
              u.department,
              u.quota_name,
            ]),
          ],
          type: sequelize.QueryTypes.SELECT,
          transaction: t,
        }
      );
    }

    const existKeySet = new Set(
      (existRows || []).map(
        (r) =>
          `${r.emp_id}__${r.quota_period}__${r.department}__${r.quota_name}`
      )
    );

    // (3) Type and empId validation
    prodQuotas.forEach((row, idx) => {
      Object.entries(PROD_QUOTA_FIELD_TYPE).forEach(([field, expectedType]) => {
        const value = row[field];
        if (value !== undefined && value !== null && value !== "") {
          if (expectedType === "number" && isNaN(Number(value))) {
            typeErrors.push({
              row: idx + 2,
              field,
              value,
              expected: expectedType,
            });
          }
          if (expectedType === "string" && typeof value !== "string") {
            typeErrors.push({
              row: idx + 2,
              field,
              value,
              expected: expectedType,
            });
          }
        }
      });

      // Check emp_id exists
      if (!validEmpIds.has(row.emp_id)) {
        empIdNotFound.push({ row: idx + 2, emp_id: row.emp_id });
      }

      // Check duplicate by emp_id+quota_period+department+quota_name
      const key = `${row.emp_id}__${row.quota_period}__${row.department}__${row.quota_name}`;
      if (existKeySet.has(key)) {
        alreadyExist.push({
          row: idx + 2,
          emp_id: row.emp_id,
          quota_name: row.quota_name,
          quota_period: row.quota_period,
          department: row.department,
        });
      }
    });

    if (typeErrors.length || empIdNotFound.length || alreadyExist.length) {
      await t.rollback();
      let errMsg = "Validation failed";
      if (empIdNotFound.length > 0) {
        const empRows = empIdNotFound.map((e) => `row ${e.row}`).join(", ");
        errMsg += `. Employee ID not found at ${empRows}`;
      }
      if (alreadyExist.length > 0) {
        const dupRows = alreadyExist.map((e) => `row ${e.row}`).join(", ");
        errMsg += `. Duplicate quota entry at ${dupRows}`;
      }
      if (typeErrors.length > 0) {
        const typeRows = typeErrors
          .map((e) => `row ${e.row} (field: ${e.field})`)
          .join(", ");
        errMsg += `. Data type error at ${typeRows}`;
      }

      return res.json({
        status: false,
        message: errMsg,
        typeErrors,
        // empIdNotFound,
        alreadyExist,
      });
    }

    // (4) Insert all valid rows
    const getNextQuotaSlNo = async (org_code, year) => {
      const query = `SELECT COUNT(*) AS count FROM prod_quota WHERE quota_id LIKE ?`;
      const [result] = await sequelize.query(query, {
        replacements: [`${org_code}_${year}%`],
        transaction: t,
      });
      return result[0].count + 1;
    };

    const generateQuotaId = async (org_code) => {
      const year = new Date().getFullYear();
      const slno = await getNextQuotaSlNo(org_code, year);
      return `${org_code}_${year}_${slno}`;
    };

    // ... [all your validation logic unchanged] ...

    // Prepare for custom table insert
    let prodQuotaIds = [];
    let allCustomTableCols = [];
    let numericColsCustomTable = [];

    const customTable = `${org_code}_prod_orders`;
    if (
      prodQuotaCusts.length > 0 &&
      Object.keys(prodQuotaCusts[0] || {}).length > 0
    ) {
      allCustomTableCols = await getCustomTableCols(customTable, t);
      numericColsCustomTable = allCustomTableCols
        .filter((col) =>
          [
            "integer",
            "numeric",
            "bigint",
            "smallint",
            "decimal",
            "real",
            "double precision",
          ].includes(col.data_type)
        )
        .map((col) => col.column_name);
    }
    allCustomTableCols = allCustomTableCols || []; // Safe default

    for (let i = 0; i < prodQuotas.length; i++) {
      const quota = prodQuotas[i];

      const prodQuotaQuery = ` INSERT INTO prod_quota (
          org_code,quota_id, quota_name, region, sub_region, department, emp_id, role_id, quota_period,
          yearly, qtr_1, qtr_2, qtr_3, qtr_4, half_yearly_one, half_yearly_two,
          january, february, march, april, may, june, july, august, september, october, november, december,
          effective_from_date, effective_to_date, created_by, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)
        RETURNING id, quota_id
      `;

      const replacements = [
        org_code,
        await generateQuotaId(org_code),
        quota.quota_name || null,
        quota.region || null,
        quota.sub_region || null,
        quota.department || null,
        quota.emp_id || null,
        quota.role_id || null,
        quota.quota_period || null,
        sanitizeNumber(quota.yearly),
        sanitizeNumber(quota.qtr_1),
        sanitizeNumber(quota.qtr_2),
        sanitizeNumber(quota.qtr_3),
        sanitizeNumber(quota.qtr_4),
        sanitizeNumber(quota.half_yearly_one),
        sanitizeNumber(quota.half_yearly_two),
        sanitizeNumber(quota.january),
        sanitizeNumber(quota.february),
        sanitizeNumber(quota.march),
        sanitizeNumber(quota.april),
        sanitizeNumber(quota.may),
        sanitizeNumber(quota.june),
        sanitizeNumber(quota.july),
        sanitizeNumber(quota.august),
        sanitizeNumber(quota.september),
        sanitizeNumber(quota.october),
        sanitizeNumber(quota.november),
        sanitizeNumber(quota.december),
        quota.effective_from_date || "01/01/1900",
        quota.effective_to_date || "12/31/2999",
        quotaHistory.created_by,
        quotaHistory.status,
        presentDateAndTime,
      ];

      const [prodQuotaResult] = await sequelize.query(prodQuotaQuery, {
        replacements,
        transaction: t,
      });
      const { id: prodQuotaId, quota_id } = prodQuotaResult[0];
      prodQuotaIds.push({ prodQuotaId, quota_id });

      // --- Insert into custom table if exists ---
      if (
        prodQuotaCusts &&
        prodQuotaCusts[i] &&
        typeof prodQuotaCusts[i] === "object" &&
        Object.keys(prodQuotaCusts[i]).length > 0
      ) {
        let prod_quota_cust = { ...prodQuotaCusts[i] };

        // Safely trim all string values
        Object.keys(prod_quota_cust).forEach((key) => {
          if (typeof prod_quota_cust[key] === "string") {
            prod_quota_cust[key] = prod_quota_cust[key].trim();
          }
        });

        allCustomTableCols.forEach((col) => {
          if (
            col.column_name === "prod_orders_row_id" ||
            col.column_name === "id"
          )
            return; // skip FK and serial PK
          const isNumeric = [
            "integer",
            "numeric",
            "bigint",
            "smallint",
            "decimal",
            "real",
            "double precision",
          ].includes(col.data_type);

          let value = prod_quota_cust[col.column_name];
          if (isNumeric) {
            prod_quota_cust[col.column_name] =
              value === undefined ||
              value === null ||
              value === "" ||
              isNaN(Number(value))
                ? 0
                : Number(value);
          } else {
            prod_quota_cust[col.column_name] =
              value === undefined || value === null || value === ""
                ? null
                : value;
          }
        });

        // Remove fields not in schema or 'id'
        prod_quota_cust = Object.fromEntries(
          Object.entries(prod_quota_cust).filter(([k]) =>
            allCustomTableCols
              .map((c) => c.column_name)
              .filter((colName) => colName !== "id")
              .includes(k)
          )
        );

        const customColumns = Object.keys(prod_quota_cust);
        if (customColumns.length > 0) {
          const customValues = Object.values(prod_quota_cust);
          const customQuery = `
            INSERT INTO ${customTable} (prod_orders_row_id, ${customColumns.join(
            ", "
          )})
            VALUES (?, ${customColumns.map(() => "?").join(", ")})`;
          await sequelize.query(customQuery, {
            replacements: [prodQuotaId, ...customValues],
            transaction: t,
          });
        }
      }

      // Insert quota history for each admin
      let nextAdmiEmpId = await sequelize.query(
        `select emp_id from users where role='RL_NyAd' and user_active=true and org_code = ?`,
        {
          replacements: [org_code],
          type: sequelize.QueryTypes.SELECT,
          transaction: t,
        }
      );
      const prodQuotaSql = `
  INSERT INTO prod_quota_history
    (status, assigned_to, created_by, created_at, quota_id, node_id, quota_action, temp_node_id)
  VALUES
    (:status, :assigned_to, :created_by, :created_at, :quota_id, :node_id, :quota_action, :temp_node_id); `;

const tempQuotaSql = `
  INSERT INTO temp_quota_history
    (status, assigned_to, created_by, created_at, quota_id, node_id, quota_action, temp_node_id)
  VALUES
    (:status, :assigned_to, :created_by, :created_at, :quota_id, :node_id, :quota_action, :temp_node_id); `;

  const now = new Date();
  const baseParams = {
    status:       quotaHistory.status,
    created_by:   quotaHistory.created_by,
    created_at:   now,
    quota_id:     prodQuotaId,
    node_id:      0,
    quota_action: `Data uploaded by : ${user_name}`,
    temp_node_id: 0,
  };

  for (const { emp_id } of nextAdmiEmpId) {
    const params = { ...baseParams, assigned_to: emp_id };

    // insert into prod_quota_history
    await sequelize.query(prodQuotaSql, {
      replacements: params,
      transaction:  t
    });

    // insert into temp_quota_history
    await sequelize.query(tempQuotaSql, {
      replacements: params,
      transaction:  t
    });
  }

  // once all inserts succeed 

      // for (const { emp_id } of nextAdmiEmpId) {
      //   const quotaHistoryQuery = `
      //     INSERT INTO prod_quota_history (status, assigned_to, created_by, created_at, quota_id,node_id,quota_action,temp_node_id)
      //      VALUES (?, ?, ?, ?, ?,?,?,?)`;
      //   await sequelize.query(quotaHistoryQuery, {
      //     replacements: [
      //       quotaHistory.status,
      //       emp_id,
      //       quotaHistory.created_by,
      //       presentDateAndTime,
      //       prodQuotaId,
      //       0,
      //       "Data uploaded by : " + user_name,
      //       0,
      //     ],
      //     transaction: t,
      //   });
      // }
    }

    // Send notification emails
    const emails = await sequelize.query(
      `SELECT DISTINCT u.email, u.first_name || ' ' || u.last_name AS name FROM users u WHERE u.user_active=true AND u.role='RL_NyAd' and u.org_code=?`,
      {
        replacements: [org_code],
        type: sequelize.QueryTypes.SELECT,
        transaction: t,
      }
    );
    for (const { email, name } of emails) {
      if (email) {
        await sendEmail(
          email,
          "New Quota Awaiting Your Action",
          `<div style="font-family:Helvetica,sans-serif;color:#333;padding:20px;">
              <h2 style="color:#007BFF;">DReaM Notification</h2>
              <p>Dear ${name},</p>
              <p>Quota uploaded, awaiting approval.</p>
              <a href="https://vyva.ai" style="background-color:#007BFF;color:#fff; padding:10px 20px;text-decoration:none;border-radius:5px;">View Quota Details</a>
            </div>`
        );
      }
    }

   
    for (const { prodQuotaId, quota_id } of prodQuotaIds) {
      await logAudit({
        org_code,
        object_type: "prod_quota",
        object_id: quota_id,
        action: "CREATE",
        changed_by: quotaHistory.created_by,
        new_values: prodQuotas.find((q) => q.quota_id === quota_id) || {},
        remarks: "Quota created (manual upload)",
      });
    }

     await t.commit();
    return res.status(200).json({
      status: true,
      message: "Data submitted successfully",
      ids: prodQuotaIds.map((i) => i.prodQuotaId),
      quota_ids: prodQuotaIds.map((i) => i.quota_id),
    });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

// exports.editAndResubmitQuota = async (req, res) => {
//   const t = await sequelize.transaction();
//   try {
//     const { org_code, quota_id, prod_quota, prod_quota_cust, user_id, user_name, comment,temp_node_id } = req.body;
//     const now = new Date();

//     // 1. Update quota main fields
//     const mainFields = [
//       "quota_name", "region", "sub_region", "department", "emp_id", "role_id",
//       "quota_period", "yearly", "qtr_1", "qtr_2", "qtr_3", "qtr_4", "half_yearly_one", "half_yearly_two",
//       "january", "february", "march", "april", "may", "june", "july", "august", "september", "october",
//       "november", "december", "effective_from_date", "effective_to_date"
//     ];
//     const setClause = mainFields.map(f => `${f} = ?`).join(", ");
//     const values = mainFields.map(f => prod_quota[f] ?? null);

//     await sequelize.query(
//       `UPDATE prod_quota SET ${setClause}, updated_by = ?, updated_at = ?, status = 'New' WHERE org_code = ? AND id = ?`,
//       { replacements: [...values, user_id, now, org_code, quota_id], transaction: t }
//     );

//     // 2. Update custom fields table if present
//     if (prod_quota_cust && Object.keys(prod_quota_cust).length > 0) {
//       const table = `${org_code}_prod_orders`;
//       const customCols = Object.keys(prod_quota_cust);
//       const customSet = customCols.map(col => `${col} = ?`).join(", ");
//       const customValues = customCols.map(col => prod_quota_cust[col]);
//       await sequelize.query(
//         `UPDATE ${table} SET ${customSet} WHERE prod_orders_row_id = ?`,
//         { replacements: [...customValues, quota_id], transaction: t }
//       );
//     }

//     // 3. Mark all previous quota_history as updated
//     await sequelize.query(
//       `UPDATE prod_quota_history SET updated_at = ?, updated_by = ? WHERE quota_id = ? and temp_node_id =? AND updated_at IS NULL`,
//       { replacements: [now, user_id, quota_id,temp_node_id], transaction: t }
//     );

//     // 4. Insert new quota_history row, assigned to all admins
//     const admins = await sequelize.query(
//       `SELECT emp_id FROM users WHERE org_code = ? AND role = 'RL_NyAd' AND user_active = true`,
//       { replacements: [org_code], type: sequelize.QueryTypes.SELECT, transaction: t }
//     );
//     for (const admin of admins) {
//       await sequelize.query(
//         `INSERT INTO prod_quota_history (status, assigned_to, created_by, created_at, quota_id, node_id, remarks,temp_node_id quota_action)
//          VALUES ('New', ?, ?, ?, ?, 0, ?, 'Resubmitted after edit')`,
//         { replacements: [admin.emp_id, user_id, now, quota_id,temp_node_id+1, comment || "Resubmitted after edit"], transaction: t }
//       );
//     }

//     // 5. Notify all admins,
//     await notifyUsersByEmpIds(
//       admins.map(a => a.emp_id),
//       'Quota Resubmitted for Approval',
//       `<p>Hi {name},<br/>A quota has been <b>resubmitted</b> after editing. Please review and approve.</p>`,
//       sequelize
//     );

//     await t.commit();
//     return res.json({ status: true, message: "Quota updated and resubmitted to admin for approval." });
//   } catch (error) {
//     await t.rollback();
//     return res.status(500).json({ status: false, message: error.message });
//   }
// };


// exports.quotaVerifiedByAdmin = async (req, res) => {
//   const transaction = await sequelize.transaction();
//   const presentDateAndTime = new Date();
//   try {
//     let {
//       organization,
//       user_id,
//       quota_id,
//       node_id,
//       user_name,
//       returnComment,
//       status,
//     } = req.body;

//     if (!Array.isArray(quota_id)) quota_id = [quota_id];
//     if (!Array.isArray(node_id)) node_id = [node_id];

//     if (!organization) throw new Error("Organization is required.");
//     if (!quota_id.length) throw new Error("quota_id(s) required.");
//     if (!user_id) throw new Error("user_id required.");
//     const oldQuotas = await sequelize.query(
//       `SELECT * FROM prod_quota WHERE id IN (:quotaIds)`,
//       {
//         replacements: { quotaIds: quota_id },
//         type: sequelize.QueryTypes.SELECT,
//         transaction,
//       }
//     );
//     await sequelize.query(
//       `UPDATE prod_quota SET updated_at=:presentDateAndTime,updated_by=:user_id ,status = :status
//         WHERE id IN (:quotaIds) AND org_code = :organization`,
//       {
//         replacements: {
//           presentDateAndTime,
//           user_id,
//           status,
//           quotaIds: quota_id,
//           organization,
//         },
//         type: sequelize.QueryTypes.UPDATE,
//         transaction,
//       }
//     );

//     await sequelize.query(
//       `UPDATE prod_quota_history SET updated_at = :presentDateAndTime, updated_by = :user_id
//        WHERE quota_id IN (:quotaIds) AND node_id IN (:nodeIds)`,
//       {
//         replacements: {
//           presentDateAndTime,
//           user_id,
//           quotaIds: quota_id,
//           nodeIds: node_id,
//         },
//         type: sequelize.QueryTypes.UPDATE,
//         transaction,
//       }
//     );

//     const now = new Date();
//     let historyRows = [];

//     if (status === "Return") {
//       const result = await sequelize.query(
//         `SELECT id, created_by FROM prod_quota WHERE id IN (:quotaIds) AND org_code = :organization`,
//         {
//           replacements: { quotaIds: quota_id, organization },
//           type: sequelize.QueryTypes.SELECT,
//           transaction,
//         }
//       );
//       const idToCreatedBy = {};
//       result.forEach((row) => {
//         idToCreatedBy[row.id] = row.created_by;
//       });

//       for (let i = 0; i < quota_id.length; i++) {
//         const qid = quota_id[i];
//         historyRows.push({
//           status,
//           assigned_to: idToCreatedBy[qid] || null,
//           node_id: node_id[i] ?? 0,
//           quota_action: `Returned by : ${user_name}`,
//           created_by: user_id,
//           created_at: now,
//           quota_id: qid,
//           remarks: returnComment,
//         });
//       }
//     } else {
//       // For Verified or other status
//       for (let i = 0; i < quota_id.length; i++) {
//         historyRows.push({
//           status,
//           assigned_to: user_id,
//           node_id: node_id[i] ?? 0,
//           quota_action: `Verified by : ${user_name}`,
//           created_by: user_id,
//           created_at: presentDateAndTime,
//           quota_id: quota_id[i],
//           remarks: returnComment,
//         });
//       }
//     }

//     const valuesSql = historyRows
//       .map(
//         (_, idx) =>
//           `(:status${idx}, :assigned_to${idx}, :node_id${idx}, :quota_action${idx}, :created_by${idx}, :created_at${idx}, :quota_id${idx}, :remarks${idx})`
//       )
//       .join(",");

//     const replacements = {};
//     historyRows.forEach((row, idx) => {
//       Object.entries(row).forEach(([key, value]) => {
//         replacements[`${key}${idx}`] = value;
//       });
//     });

//     const insertSql = ` INSERT INTO prod_quota_history
//       (status, assigned_to, node_id, quota_action, created_by, created_at, quota_id, remarks)
//       VALUES ${valuesSql} `;

//     await sequelize.query(insertSql, {
//       replacements,
//       type: sequelize.QueryTypes.INSERT,
//       transaction,
//     });
//     const newQuotas = await sequelize.query(
//       `SELECT * FROM prod_quota WHERE id IN (:quotaIds)`,
//       {
//         replacements: { quotaIds: quota_id },
//         type: sequelize.QueryTypes.SELECT,
//         transaction,
//       }
//     );
//     await transaction.commit();
//     for (let i = 0; i < quota_id.length; i++) {
//       await logAudit({
//         org_code: organization,
//         object_type: "prod_quota",
//         object_id: quota_id[i],
//         action: "STATUS_UPDATE",
//         changed_by: user_id,
//         old_values: oldQuotas.find((q) => q.id == quota_id[i]),
//         new_values: newQuotas.find((q) => q.id == quota_id[i]),
//         remarks: `Quota ${status} by ${user_name || user_id}`,
//       });
//     }
//     let msg = "Quotas updated.";
//     if (status === "Return") {
//       msg = "Quotas returned and history updated.";
//     } else if (status === "Verified") {
//       msg = "Quotas verified and history updated.";
//     }

//     return res.json({ status: true, message: msg });
//   } catch (error) {
//     if (transaction) await transaction.rollback();
//     console.error("Error verifying quotas and updating history.", error);
//     res.status(500).json({
//       status: false,
//       message: "Failed to verify/return quotas and update history.",
//       error: error.message,
//     });
//   }
// };

exports.resubmitQuotaByUser = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      id,
      node_id,
      comments,
      user_id,
      user_name,
      organization,
      updated_by,
    } = req.body;
    const [quota] = await sequelize.query(
      `SELECT status FROM prod_quota WHERE id = ? AND org_code = ? LIMIT 1`,
      {
        replacements: [id, organization],
        type: sequelize.QueryTypes.SELECT,
        transaction,
      }
    );
    if (!quota) throw new Error("Quota not found");
    if (quota.status !== "Return")
      throw new Error("Only returned quotas can be resubmitted");

    const [oldQuotaRow] = await sequelize.query(
      `SELECT * FROM prod_quota WHERE id = ?`,
      { replacements: [id], type: sequelize.QueryTypes.SELECT, transaction }
    );
    const oldQuota = oldQuotaRow || null;

    await sequelize.query(
      `UPDATE prod_quota SET status = 'New'  WHERE id = ?`,
      {
        replacements: [id],
        type: sequelize.QueryTypes.UPDATE,
        transaction,
      }
    );

    await sequelize.query(
      `UPDATE prod_quota_history SET updated_at = NOW(), updated_by = ? WHERE quota_id = ? AND node_id =? `,
      {
        replacements: [user_id, id, node_id],
        type: sequelize.QueryTypes.UPDATE,
        transaction,
      }
    );
    await sequelize.query(
      `INSERT INTO prod_quota_history
         (status, assigned_to, node_id, quota_action, created_by, created_at, quota_id, remarks) VALUES (?, ?, ?, ?, ?, NOW(), ?, ?)`,
      {
        replacements: [
          "New",
          updated_by,
          node_id || 0,
          `Resubmitted by : ${user_name || user_id}`,
          user_id,
          id,
          comments || null,
        ],
        type: sequelize.QueryTypes.INSERT,
        transaction,
      }
    );
    // Notify first approver (usually admin)
    const admins = await sequelize.query(
      `SELECT emp_id FROM users WHERE org_code = ? AND role = 'RL_NyAd' AND user_active = true`,
      { replacements: [organization], type: sequelize.QueryTypes.SELECT, transaction }
    );
    await notifyUsersByEmpIds(
      admins.map(a => a.emp_id),
      'Quota Resubmitted',
      `<p>Hi {name},<br/>A quota has been <b>resubmitted</b> and is pending your approval.</p>`,
      sequelize
    );
    const [newQuotaRow] = await sequelize.query(
      `SELECT * FROM prod_quota WHERE id = ?`,
      { replacements: [id], type: sequelize.QueryTypes.SELECT, transaction }
    );
    const newQuota = newQuotaRow || null;
    await transaction.commit();
    await logAudit({
      org_code: organization,
      object_type: "prod_quota",
      object_id: id,
      action: "RESUBMIT",
      changed_by: user_id,
      old_values: oldQuota,
      new_values: newQuota,
      remarks: `Quota resubmitted by ${user_name || user_id}`,
    });
    return res.json({
      status: true,
      message: "Quota resubmitted and workflow restarted.",
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({
      status: false,
      message: "Failed to resubmit quota.",
      error: error.message,
    });
  }
};

async function getSelectedQuotaDetails(id, nodeId) {
  const [result] = await sequelize.query(
    `select distinct d.work_flow_id, wf.type AS work_flow_type, df.node_id AS quota_flow_node_id
     from prod_quota d join work_flows wf on d.work_flow_id = wf.id
     join prod_quota_flow df on d.id = df.quota_id where d.id = ? and df.node_id= ? `,
    { type: sequelize.QueryTypes.SELECT, replacements: [id, nodeId] }
  );
  return result;
}
async function updateQuotaFlow(
  work_flow_type,
  id,
  user_id,
  decision,
  returnComment,
  quota_flow_node_id
) {
  // Basic validation
  if (
    [decision, user_id, returnComment, id, quota_flow_node_id].some(
      (v) => v === undefined
    )
  ) {
    throw new Error(`One or more required values are undefined: 
      decision=${decision}, user_id=${user_id}, returnComment=${returnComment}, id=${id}, quota_flow_node_id=${quota_flow_node_id}`);
  }

  const query = `  UPDATE prod_quota_flow  SET updated_at = NOW(), status = ?, updated_by = ?, comments = ?  WHERE quota_id = ? AND node_id = ? `;
  const replacements = [
    decision,
    user_id,
    returnComment,
    id,
    quota_flow_node_id,
  ];

  await sequelize.query(query, {
    type: sequelize.QueryTypes.UPDATE,
    replacements,
  });
  return { assigned_to: null, work_flow_type };
}

// exports.updateSelectedQuotaDtls = async (req, res) => {
//   const transaction = await sequelize.transaction();
//   try {
//     const {
//       organization,
//       user_id,
//       id: quota_id,
//       node_id,
//       user_name,
//       comments= "",
//       decision,
//       updated_by,
//       status,
//       created_by,
//       temp_node_id,
//     } = req.body;

//     const [oldRows] = await sequelize.query(
//       `SELECT * FROM prod_quota WHERE id in (${quota_id})`,
//       {
//         replacements: [quota_id],
//         type: sequelize.QueryTypes.SELECT,
//         transaction,
//       }
//     );
//     const oldQuota = oldRows || null;

//     if (
//       !quota_id ||
//       !user_id ||
//       !decision ||
//       node_id === undefined ||
//       node_id === null
//     ) {
//       return res
//         .status(400)
//         .json({ status: false, message: "Missing required fields" });
//     }
//     const currentStatus = Array.isArray(status) ? status[0] : status;
//     // Decision normalization
//     let nodeDecision =
//       decision === "Approved" ? "yes" : decision === "Return" ? "Return" : "no";
//     let tempStatus = "";
//       if(decision==="Return"){
//         console.log("--------------- am in if cond--------------------------")
//         const [mappingRow] = await sequelize.query(
//           `select status from prod_quota where id=? `,
//           {
//             type: sequelize.QueryTypes.SELECT,
//             replacements: [quota_id],
//             transaction,
//           }
//         );
//         console.log("--- 1965-- " +mappingRow)
//         tempStatus = mappingRow.status;
//         console.log("--- 1965--decision " +decision)
        
//       }else{
//         tempStatus = decision;
//       }

//     // 1. Update history and flow for this user
//     //  status=?, 
//     await sequelize.query(
//       `UPDATE prod_quota_history
//        SET updated_by = ?, updated_at = NOW(), node_decision = ?
//        WHERE quota_id in (${quota_id}) AND node_id in  (${node_id}) AND assigned_to  in  ('${user_id}')  
//        AND temp_node_id  in  ('${temp_node_id}')`,
//       {
//         type: sequelize.QueryTypes.UPDATE,
//         replacements: [   
//           // decision,
//           user_id,
//           nodeDecision,
//           quota_id,
//           node_id,
//           user_id,
//           temp_node_id,
//         ],
//         transaction,
//       }
//     );

//     await sequelize.query(
//       `UPDATE prod_quota_flow
//        SET updated_at = NOW(), status = ?, comments = ?, updated_by = ?, node_decision = ?
//        WHERE quota_id in (${quota_id}) AND node_id in  (${node_id}) AND assigned_to  in  ('${user_id}') `,
//       {
//         type: sequelize.QueryTypes.UPDATE,
//         replacements: [
//           decision,
//           comments,
//           user_id,
//           nodeDecision,
//           quota_id,
//           node_id,
//           user_id,
//         ],
//         transaction,
//       }
//     );

//     // 2. Return flow: stop everything and update records
//     if (decision === "Return") {
//       console.log(
//         "-~~~~~~~~~~~~~-- RAJESH---        1268 999999999 ------------ "
//       );
//       // normalize to arrays
//       const quotas = Array.isArray(quota_id) ? quota_id : [quota_id];
//       const nodes = Array.isArray(node_id) ? node_id : [node_id];
//       const tempNodes = Array.isArray(temp_node_id) ? temp_node_id : [temp_node_id];
//       const statuses = Array.isArray(status) ? status : [status];
//       const creators = Array.isArray(created_by) ? created_by : [created_by];
//       const lastUpdatedBy = Array.isArray(updated_by)
//         ? updated_by
//         : [updated_by];

//       for (let i = 0; i < quotas.length; i++) {
//         const q = quotas[i];
//         const n = nodes[i];
//         const tn = tempNodes[i];
//         const cs = statuses[i];
//         const cb = creators[i];
//         const lstUpdateUser = lastUpdatedBy[i];

//         // 2a. Mark flow & history as returned
//         await sequelize.query(
//           `UPDATE prod_quota_flow
//          SET status = 'Return', updated_by = ?, updated_at = NOW(), node_decision = 'returned'
//        WHERE quota_id = ? AND node_id = ? AND status IS DISTINCT FROM 'returned'`,
//           {
//             replacements: [user_id, q, n],
//             type: sequelize.QueryTypes.UPDATE,
//             transaction,
//           }
//         );
//         await sequelize.query(
//           `UPDATE prod_quota_history
//          SET updated_by = ?, updated_at = NOW(), node_decision = 'returned'
//        WHERE quota_id = ? AND node_id = ? AND temp_node_id =? AND status IS DISTINCT FROM 'returned'`,
//           {
//             replacements: [user_id, q, n,tn],
//             type: sequelize.QueryTypes.UPDATE,
//             transaction,
//           }
//         );

//         // 2b. Roll main quota back to Return
//         await sequelize.query(
//           `UPDATE prod_quota SET status = 'Return', updated_by = ?, updated_at = NOW() WHERE id = ?`,
//           {
//             replacements: [user_id, q],
//             type: sequelize.QueryTypes.UPDATE,
//             transaction,
//           }
//         );

//         // 2c. Insert an audit record
//         const tempAssignedTo = cs === "New" ? cb : updated_by;
        
//         console.log(
//           "---------------- 1307-----------tempAssignedTo---- " + tempAssignedTo
//         );
//         await sequelize.query(
//           `INSERT INTO prod_quota_history
//          (quota_id, created_by, created_at, assigned_to, node_id, status, node_decision, remarks,temp_node_id)
//        VALUES (?, ?, NOW(), ?, ?, 'Return', 'returned', ?,?)`,
//           {
//             replacements: [
//               q, // quota_id
//               user_id, // created_by (who triggered the return)
//              // NOW(),
//               tempAssignedTo,
//               n, // node_id
//               comments || "Returned by approver",
//               tn+1,
//             ],
//             type: sequelize.QueryTypes.INSERT,
//             transaction,
//           }
//         );
//       }

//       // Notify creator(s) when returned
//       for (let i = 0; i < quotas.length; i++) {
//         const qid = quotas[i];
//         const result = await sequelize.query(
//           `SELECT created_by FROM prod_quota WHERE id = ?`,
//           { replacements: [qid], type: sequelize.QueryTypes.SELECT, transaction }
//         );
//         if (result[0]?.created_by) {
//           await notifyUsersByEmpIds(
//             [result[0].created_by],
//             'Quota Returned - Action Needed',
//             `<p>Hi {name},<br/>Your quota has been <b>returned</b> for changes.<br/>Comment: ${comments || "N/A"}</p>`,
//             sequelize
//           );
//         }
//       }


//       await transaction.commit();
//       return res.json({
//         status: true,
//         message: "All selected quotas have been returned.",
//       });
//     }

//     // 3. Get assigned users (pending) and approvals at this node
//     const assignedUsers = await sequelize.query(
//       `SELECT assigned_to FROM prod_quota_flow WHERE (status IS NULL OR status = '' OR status = 'In Progress') and quota_id = ? AND node_id = ?`,

//       {
//         type: sequelize.QueryTypes.SELECT,
//         replacements: [quota_id, node_id],
//         transaction,
//       }
//     );
//     const approvals = await sequelize.query(
//       `SELECT COUNT(*)::int AS approved_count FROM prod_quota_flow
//        WHERE quota_id = ? AND node_id = ? AND node_decision = 'yes'`,
//       {
//         type: sequelize.QueryTypes.SELECT,
//         replacements: [quota_id, node_id],
//         transaction,
//       }
//     );

//     const assignedCount = assignedUsers.length;
//     const approvedCount = approvals[0]?.approved_count || 0;
//     // 4. If not all assigned users have approved, wait
//     if (approvedCount < assignedCount) {
//       await transaction.commit();
//       return res.json({
//         status: true,
//         message:
//           "Your approval has been recorded. Waiting for other approvers.",
//       });
//     }

//     // 5. All approved! Find next node (if any)
//     const nextNodeRow = await sequelize.query(
//       `SELECT node_id FROM prod_quota_flow WHERE quota_id = ? AND node_id > ? ORDER BY node_id ASC LIMIT 1`,
//       {
//         type: sequelize.QueryTypes.SELECT,
//         replacements: [quota_id, node_id],
//         transaction,
//       }
//     );

//     if (!nextNodeRow.length) {
//       // Last node, mark quota as Approved
//       await sequelize.query(
//         `UPDATE prod_quota SET status = 'Approved', updated_by = ?, updated_at = NOW() WHERE id = ?`,
//         {
//           type: sequelize.QueryTypes.UPDATE,
//           replacements: [user_id, quota_id],
//           transaction,
//         }
//       );
//       // Notify creator of approval
//       const [row] = await sequelize.query(
//         `SELECT created_by FROM prod_quota WHERE id = ?`,
//         { replacements: [quota_id], type: sequelize.QueryTypes.SELECT, transaction }
//       );
//       if (row?.created_by) {
//         await notifyUsersByEmpIds(
//           [row.created_by],
//           'Quota Approved',
//           `<p>Hi {name},<br/>Your quota has been <b>approved</b> and finalized.<br/>You can view details in DReaM portal.</p>`,
//           sequelize
//         );
//       }

//       await transaction.commit();
//       return res.json({
//         status: true,
//         message: "All approvals complete. Quota finalized.",
//       });
//     }

//     const nextNodeId = nextNodeRow[0].node_id;

//     // 6. Assign next node users (if not already in history)
//     const nextAssignees = await sequelize.query(
//       `SELECT assigned_to FROM prod_quota_flow WHERE quota_id = ? AND node_id = ?`,
//       {
//         type: sequelize.QueryTypes.SELECT,
//         replacements: [quota_id, nextNodeId],
//         transaction,
//       }
//     );
//     // await notifyUsersByEmpIds(
//     //   nextAssignees.map(a => a.assigned_to),
//     //   'Quota Approval Needed',
//     //   `<p>Hi {name},<br/>You have a quota item pending approval.<br/>Please login to the DReaM portal.</p>`,
//     //   sequelize
//     // ); 

//     // if (assignedCount == 0) {
//     //   const [mappingRow] = await sequelize.query(
//     //       `select emp_id from prod_quota where id=? `,
//     //       {
//     //         type: sequelize.QueryTypes.SELECT,
//     //         replacements: [quota_id],
//     //         transaction,
//     //       }
//     //     );
//     //     const mappingUserId = mappingRow.emp_id;

//     //   for (const assignee of nextAssignees) {
//     //     // Insert only if not already in history for this node/user
         
//     //     await sequelize.query(
//     //       `INSERT INTO prod_quota_history (quota_id, created_by, created_at, assigned_to, node_id, status)
//     //       SELECT ?, ?, ?, ?, ?, 'In Progress'
//     //       WHERE NOT EXISTS (
//     //         SELECT 1 FROM prod_quota_history WHERE quota_id = ? AND node_id = ? AND assigned_to = ?
//     //       )`,
//     //       {
//     //         type: sequelize.QueryTypes.INSERT,
//     //         replacements: [
//     //           quota_id,
//     //           user_id,
//     //           presentDateAndTime,
//     //           mappingUserId,
//     //           nextNodeId,
//     //           quota_id,
//     //           nextNodeId,
//     //           assignee.assigned_to,
//     //         ],
//     //         transaction,
//     //       }
//     //     );
//     //   }
//     // }

//     if (assignedCount === 0) {
//   // 1. Get the original creator as the mapping user
//   const [mappingRow] = await sequelize.query(
//     `SELECT emp_id FROM prod_quota WHERE id = ?`,
//     { replacements: [quota_id], type: sequelize.QueryTypes.SELECT, transaction }
//   );
//   const mappingUserId = mappingRow.emp_id;

//   console.log("--mappingUserId-- "+mappingUserId)
//   // 2. Deduplicate the nextAssignees list
//   // const uniqueAssignees = Array.from(
//   //   new Set(mappingUserId.map(a => a.assigned_to))
//   // );

//   // 3. For each unique assignee, insert only if not already in history
//   const presentDateAndTime = new Date(); 
//   await sequelize.query(
//         `INSERT INTO prod_quota_history
//          (quota_id, created_by, created_at, assigned_to, node_id,temp_node_id, status)
//          VALUES (?, ?,?, ?, ?,?, 'In Progress')`,
//         {
//           replacements: [
//             quota_id,
//             user_id,      // who performed this action
//             presentDateAndTime,
//             mappingUserId,
//             nextNodeId,
//             temp_node_id+1
//           ],
//           type: sequelize.QueryTypes.INSERT,
//           transaction,
//         }
//       );
//   // for (const assignedTo of mappingUserId) {
//   //   const exists = await sequelize.query(
//   //     `SELECT 1 FROM prod_quota_history
//   //      WHERE quota_id = ? AND node_id = ? AND assigned_to = ?`,
//   //     {
//   //       replacements: [quota_id, nextNodeId, assignedTo],
//   //       type: sequelize.QueryTypes.SELECT,
//   //       transaction,
//   //     }
//   //   );

//   //   if (exists.length === 0) {
//   //     await sequelize.query(
//   //       `INSERT INTO prod_quota_history
//   //        (quota_id, created_by, created_at, assigned_to, node_id, status)
//   //        VALUES (?, ?, NOW(), ?, ?, 'In Progress')`,
//   //       {
//   //         replacements: [
//   //           quota_id,
//   //           user_id,      // who performed this action
//   //           assignedTo,
//   //           nextNodeId,
//   //         ],
//   //         type: sequelize.QueryTypes.INSERT,
//   //         transaction,
//   //       }
//   //     );
//   //   }
//   // }
// }
//     // 7. Set quota status as 'In Progress'
//     await sequelize.query(
//       `UPDATE prod_quota SET status = 'In Progress', updated_by = ?, updated_at = NOW() WHERE id = ?`,
//       {
//         type: sequelize.QueryTypes.UPDATE,
//         replacements: [user_id, quota_id],
//         transaction,
//       }
//     );

//     const [finalRows] = await sequelize.query(
//       `SELECT * FROM prod_quota WHERE id = ?`,
//       {
//         replacements: [quota_id],
//         type: sequelize.QueryTypes.SELECT,
//         transaction,
//       }
//     );
//     const finalQuota = finalRows || null;
//     await transaction.commit();
//     await logAudit({
//       org_code: organization,
//       object_type: "prod_quota",
//       object_id: quota_id,
//       action: decision === "Approved" ? "APPROVE" : "IN_PROGRESS",
//       changed_by: user_id,
//       old_values: oldQuota,
//       new_values: finalQuota,
//       remarks: `Quota ${decision} by ${user_name}`,
//     });

//     return res.json({
//       status: true,
//       message: "All users approved. Moved to next node.",
//       nextNodeId,
//       nextAssignees: nextAssignees.map((x) => x.assigned_to),
//     });
//   } catch (err) {
//     console.error("Error in update quota details:", err);
//     await transaction.rollback();
//     return res.status(500).json({ status: false, message: err.message });
//   }
// };
