const sequelize = require("../config/db");
const { sendEmail } = require("./customFieldsController");
const { logAudit, AUDIT_ACTIONS, withAuditLog, logBulkAudit } = require("../utils/auditLogger");
const { getPresentDateAndTime } = require("../utils/dateHelper");

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

exports.editAndResubmitQuota = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { org_code, quota_id, prod_quota, prod_quota_cust, user_id, user_name, comment, temp_node_id } = req.body;
    const presentDateAndTime = getPresentDateAndTime();

    // 1. First fetch the old quota state (including custom fields) for audit
    const [oldQuota] = await sequelize.query(
      `SELECT pq.*, gpo.*
       FROM prod_quota pq 
       LEFT JOIN ${org_code}_prod_orders gpo ON gpo.prod_orders_row_id = pq.id
       WHERE pq.id = ?`,
      { 
        replacements: [quota_id],
        type: sequelize.QueryTypes.SELECT,
        transaction: t 
      }
    );
    // 1. Update quota main fields
    const mainFields = [
      "quota_name", "region", "sub_region", "department", "emp_id", "role_id",
      "quota_period", "yearly", "qtr_1", "qtr_2", "qtr_3", "qtr_4", "half_yearly_one", "half_yearly_two",
      "january", "february", "march", "april", "may", "june", "july", "august", "september", "october",
      "november", "december", "effective_from_date", "effective_to_date"
    ];
    const setClause = mainFields.map(f => `${f} = ?`).join(", ");
    const values = mainFields.map(f => prod_quota[f] ?? null);
    await sequelize.query(
      `UPDATE prod_quota SET ${setClause}, updated_by = ?, updated_at = ?, status = 'New' WHERE org_code = ? AND id = ?`,
      { replacements: [...values, user_id, presentDateAndTime, org_code, quota_id], transaction: t }
    );
    // 2. Update custom fields table if present
    if (prod_quota_cust && Object.keys(prod_quota_cust).length > 0) {
      const table = `${org_code}_prod_orders`;
      const customCols = Object.keys(prod_quota_cust);
      const customSet = customCols.map(col => `${col} = ?`).join(", ");
      const customValues = customCols.map(col => prod_quota_cust[col]);
      await sequelize.query(
        `UPDATE ${table} SET ${customSet} WHERE prod_orders_row_id = ?`,
        { replacements: [...customValues, quota_id], transaction: t }
      );
    }
    // 3. Mark all previous quota_history as updated
    await sequelize.query(
      `UPDATE prod_quota_history SET updated_at = ?, updated_by = ? WHERE quota_id = ? and temp_node_id =? AND updated_at IS NULL`,
      { replacements: [presentDateAndTime, user_id, quota_id, temp_node_id], transaction: t }
    );
    // 4. Insert new quota_history row, assigned to all admins
    const admins = await sequelize.query(
      `SELECT emp_id FROM users WHERE org_code = ? AND role = 'RL_NyAd' AND user_active = true`,
      { replacements: [org_code], type: sequelize.QueryTypes.SELECT, transaction: t }
    );
    let temAction = `Resubmitted after edit by : ${user_name}`;
    console.log("------------ 397 ----temAction-------- " + temAction)
    const [next_temp_node_id] = await sequelize.query(
      `select max(temp_node_id)+1 as temp_node_id from prod_quota_history a where a.quota_id = ?`,
      { replacements: [quota_id], type: sequelize.QueryTypes.SELECT, transaction: t }
    );
    const nextTempNodeId = next_temp_node_id.temp_node_id;
    for (const admin of admins) {
      await sequelize.query(
        `INSERT INTO prod_quota_history (status, assigned_to, created_by, created_at, quota_id,temp_node_id,node_id, remarks, quota_action)
         VALUES ('New', ?, ?, ?, ?,?, ?,?,?)`,
        { replacements: [admin.emp_id, user_id, presentDateAndTime, quota_id, nextTempNodeId, 0, comment, temAction], transaction: t }
      );
    }
    // 5. Notify all admins,
    await notifyUsersByEmpIds(
      admins.map(a => a.emp_id),
      'Quota Resubmitted for Approval',
      `<p>Hi {name},<br/>A quota has been <b>resubmitted</b> after editing. Please review and approve.</p>`,
      sequelize
    );
    // Fetch the new state for audit
    const [newQuota] = await sequelize.query(
      `SELECT pq.*, gpo.*
       FROM prod_quota pq 
       LEFT JOIN ${org_code}_prod_orders gpo ON gpo.prod_orders_row_id = pq.id
       WHERE pq.id = ?`,
      { 
        replacements: [quota_id],
        type: sequelize.QueryTypes.SELECT,
        transaction: t 
      }
    );

    await t.commit();

    // Log the audit with exact field values
    await logAudit({
      org_code,
      object_type: "prod_quota",
      object_id: quota_id,
      action: "EDIT_AND_RESUBMIT",
      changed_by: user_id,
      old_values: oldQuota,
      new_values: newQuota,
      remarks: `Quota "${oldQuota.quota_name}" edited and resubmitted by ${user_name}. Comment: ${comment}`
    });

    return res.json({ status: true, message: "Quota updated and resubmitted to admin for approval." });
  } catch (error) {
    await t.rollback();
    return res.status(500).json({ status: false, message: error.message });
  }
}; 

exports.quotaVerifiedByAdmin = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    // const now = new Date();
    const presentDateAndTime = getPresentDateAndTime();
    let {
      organization,
      user_id,
      quota_id,
      node_id,
      user_name,
      returnComment,
      status,
      temp_node_id,
    } = req.body;

    const quotaIds = Array.isArray(quota_id) ? quota_id : [quota_id];
    const nodeIds = Array.isArray(node_id) ? node_id : [node_id];
    const tempNodeIds = Array.isArray(temp_node_id) ? temp_node_id : [temp_node_id];

    if (!organization) throw new Error("Organization is required.");
    if (!quotaIds.length) throw new Error("quota_id(s) required.");
    if (!user_id) throw new Error("user_id required.");

    // fetch old quotas for audit
    const oldQuotas = await sequelize.query( `SELECT * FROM prod_quota WHERE id IN (:quotaIds)`,
      {
        replacements: { quotaIds },
        type: sequelize.QueryTypes.SELECT,
        transaction,
      }
    );
    // update prod_quota rows
    await sequelize.query(
      `UPDATE prod_quota SET updated_at = :presentDateAndTime, updated_by = :user_id, status  = :status
       WHERE id IN (:quotaIds) AND org_code = :organization`,
      {
        replacements: { presentDateAndTime, user_id, status, quotaIds, organization },
        type: sequelize.QueryTypes.UPDATE,
        transaction,
      }
    );
    // update existing history rows
    await sequelize.query(
      `UPDATE prod_quota_history SET updated_at = :presentDateAndTime,  updated_by = :user_id
       WHERE quota_id IN (:quotaIds) AND node_id   IN (:nodeIds) AND temp_node_id IN (:tempNodeIds) `,
      {
        replacements: { presentDateAndTime, user_id, quotaIds, nodeIds, tempNodeIds },
        type: sequelize.QueryTypes.UPDATE,
        transaction,
      }
    );
    // build new history entries
    const historyRows = quotaIds.map((qid, idx) => {
      const base = {
        status,
        assigned_to: status === "Return"
          ? null
          : user_id,
        node_id: nodeIds[idx] ?? 0,
        quota_action: status === "Return"
          ? `Returned by: ${user_name}`
          : `Verified by: ${user_name}`,
        created_by: user_id,
        created_at: presentDateAndTime,
        quota_id: qid,
        remarks: returnComment || null,
        temp_node_id: status === "Return"
          ? (tempNodeIds[idx] ?? 0)
          : ((tempNodeIds[idx] ?? 0) + 1),
      };
      return base;
    });
    // prepare bulk INSERT
    const columns = [
      "status", "assigned_to", "node_id", "quota_action", "created_by", "created_at", "quota_id", "remarks", "temp_node_id"
    ];
    const valuesSql = historyRows
      .map((_, i) =>
        `(${columns.map(col => `:${col}${i}`).join(", ")})`
      ).join(",\n");
    const replacements = {};
    historyRows.forEach((row, i) => {
      columns.forEach(col => {
        replacements[`${col}${i}`] = row[col];
      });
    });
    await sequelize.query(
      ` INSERT INTO prod_quota_history (${columns.join(", ")}) VALUES ${valuesSql} `,
      {
        replacements,
        type: sequelize.QueryTypes.INSERT,
        transaction,
      }
    );
    // fetch new quotas for audit
    const newQuotas = await sequelize.query( `SELECT * FROM prod_quota WHERE id IN (:quotaIds)`,
      {
        replacements: { quotaIds },
        type: sequelize.QueryTypes.SELECT,
        transaction,
      }
    );
    await transaction.commit();
    // perform audit logging
    for (const qid of quotaIds) {
      const oldQuota = oldQuotas.find(q => q.id === qid);
    const newQuota = newQuotas.find(q => q.id === qid);
    const quotaName = oldQuota?.quota_name || newQuota?.quota_name || 'Unknown';
    await logAudit({
        org_code: organization,
        object_type: "prod_quota",
        object_id: qid,
        action: "STATUS_UPDATE",
        changed_by: user_id,
        old_values: oldQuota,
        new_values: newQuota,
        remarks: `Quota "${quotaName}" ${status} by ${user_name}`,
      });
    }
    const msgMap = {
      Return: "Quotas returned and history updated.",
      Verified: "Quotas verified and history updated."
    };
    return res.json({ status: true, message: msgMap[status] || "Quotas updated." });
  } catch (error) {
    await transaction.rollback();
    console.error("Error verifying quotas and updating history.", error);
    return res.status(500).json({
      status: false,
      message: "Failed to verify/return quotas and update history.",
      error: error.message,
    });
  }
};

exports.updateSelectedQuotaDtls = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      organization,
      user_id,
      id: quota_id,
      node_id,
      user_name,
      comments = "",
      decision,
      temp_node_id, 
    } = req.body;

    // Sanity check
    if (!quota_id || !user_id || !decision || node_id == null) {
      return res.status(400).json({ status: false, message: "Missing required fields" });
    }
    // const now = new Date();
    const presentDateAndTime = getPresentDateAndTime();
    // If it's a Return, do only the return flow
    if (decision === "Return") {
      // 1) Mark the main quota as Returned
      await sequelize.query( `UPDATE prod_quota SET status  = 'Return', updated_by = ?, updated_at = ?  WHERE id = ?`,
        { replacements: [user_id,presentDateAndTime, quota_id], transaction }
      );

      // 2) Compute next temp_node_id
      const [tmp] = await sequelize.query(
        `SELECT COALESCE(MAX(temp_node_id),0) + 1 AS temp_node_id
           FROM prod_quota_history
          WHERE quota_id = ?`,
        { replacements: [quota_id], type: sequelize.QueryTypes.SELECT, transaction }
      );
      const nextTempNodeId = tmp.temp_node_id;

      // 3) Find who originally uploaded (temp_node_id = 0, status = 'New')
      const [orig] = await sequelize.query(
        `SELECT created_by
           FROM prod_quota_history
          WHERE quota_id = ?
            AND temp_node_id = 0
            AND status = 'New'`,
        { replacements: [quota_id], type: sequelize.QueryTypes.SELECT, transaction }
      );

      // 4) Stamp the original upload row as updated
      await sequelize.query(
        `UPDATE prod_quota_history SET updated_by = ?, updated_at = ?
         WHERE quota_id = ? AND temp_node_id = ? AND status = 'New'`,
        { replacements: [user_id,presentDateAndTime, quota_id,temp_node_id], transaction }
      );

      // 5) Insert one new “Return” history row
      await sequelize.query(
        `INSERT INTO prod_quota_history
           (quota_id, created_by, created_at, assigned_to,
            node_id, status, node_decision, temp_node_id, quota_action,remarks)
         VALUES (?, ?, ?, ?, ?, 'Return', 'returned', ?, ?,?)`,
        {
          replacements: [
            quota_id,                  // quota_id
            user_id,                   // created_by (who initiated the return)
            presentDateAndTime,                       // created_at 
            orig.created_by,           // assigned_to (original uploader)
            node_id,                   // node_id
            nextTempNodeId,            // temp_node_id
            `Return by : ${user_name}`, // quota_action
            comments
          ],
          type: sequelize.QueryTypes.INSERT,
          transaction,
        }
      );

     // Notify creator of approval
      const [row] = await sequelize.query(
        `SELECT created_by FROM prod_quota WHERE id = ?`,
        { replacements: [quota_id], type: sequelize.QueryTypes.SELECT, transaction }
      );
      if (row?.created_by) {
        await notifyUsersByEmpIds(
          [row.created_by],
          'Quota Approved',
          `<p>Hi {name},<br/>Your quota has been <b>approved</b> and finalized.<br/>You can view details in DReaM portal.</p>`,
          sequelize
        );
      }

      await transaction.commit();
      return res.json({
        status: true,
        message: "All selected quotas have been returned.",
      });
    }

    // --- Otherwise it's an Approve/No decision: ---
    // 1) updateHistoryAndFlow() as before (status/remarks on existing row + new history row)
    const { tempQuotaAction, nodeDecision } = await updateHistoryAndFlow();

    // 2) checkApprovals(), handleNextNode(), logAudit(), etc.
    const { assignedCount, approvedCount } = await checkApprovals();
    if (approvedCount < assignedCount) {
      await transaction.commit();
      return res.json({
        status: true,
        message: "Your approval has been recorded. Waiting for other approvers.",
      });
    }
    const nextStep = await handleNextNode(tempQuotaAction);
    // ... logAudit, commit, and return success/finalized ...

  } catch (err) {
    console.error("Error in update quota details:", err);
    await transaction.rollback();
    return res.status(500).json({ status: false, message: err.message });
  }
};

const updateHistoryAndFlow = async () => {
  const tempQuotaAction = `${decision} by : ${user_name}`;
  const nodeDecision    = getNodeDecision(decision);
// const now = new Date();
 const presentDateAndTime = getPresentDateAndTime();
  // 1) Update the existing prod_quota_history entry (but never overwrite the “New”/“Upload” row)
  await sequelize.query(
    `UPDATE prod_quota_history
       SET status        = ?,
           remarks       = ?,
           updated_by    = ?,
           updated_at    = ?,
           node_decision = ?
     WHERE quota_id     = ?
       AND node_id      = ?
       AND assigned_to  = ?
       AND temp_node_id = ?
       AND status NOT IN ('New', 'Upload')`,
    {
      type: sequelize.QueryTypes.UPDATE,
      replacements: [
        decision,    // new status
        comments,    // remarks
        user_id,     // updated_by
        presentDateAndTime,
        nodeDecision,
        quota_id,
        node_id,
        user_id,
        temp_node_id
      ],
      transaction,
    }
  );

  // 2) Update the flow table for this decision
  await sequelize.query(
    `UPDATE prod_quota_flow
       SET status        = ?,
           comments      = ?,
           updated_by    = ?,
           node_decision = ?,
           updated_at    = ? 
     WHERE quota_id    = ?
       AND node_id     = ?
       AND assigned_to = ?`,
    {
      type: sequelize.QueryTypes.UPDATE,
      replacements: [
        decision,
        comments,
        user_id,
        nodeDecision,
        presentDateAndTime,
        quota_id,
        node_id,
        user_id
      ],
      transaction,
    }
  );

  // 3) Compute a new temp_node_id for the append
  const [row] = await sequelize.query(
    `SELECT COALESCE(MAX(temp_node_id), 0) + 1 AS temp_node_id FROM prod_quota_history WHERE quota_id = ?`,
    {
      replacements: [quota_id],
      type: sequelize.QueryTypes.SELECT,
      transaction,
    }
  );
  const nextTempNodeId = row.temp_node_id;

  // 4) Insert the new history row for this decision
  await sequelize.query(
    `INSERT INTO prod_quota_history
       (quota_id, created_by, created_at, assigned_to, node_id,
        status, remarks, updated_by, updated_at, node_decision,
        temp_node_id, quota_action)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    {
      type: sequelize.QueryTypes.INSERT,
      replacements: [
        quota_id,          // quota_id
        user_id,           // created_by
        presentDateAndTime,               // created_at 
        user_id,           // assigned_to
        node_id,           // node_id
        decision,          // status
        comments,          // remarks
        user_id,           // updated_by
        presentDateAndTime,               // updated_at 
        nodeDecision,      // node_decision
        nextTempNodeId,    // temp_node_id
        tempQuotaAction    // quota_action
      ],
      transaction,
    }
  );
  return { tempQuotaAction, nodeDecision };
};

exports.quotaApproveOrReturnByAdmin = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      org_code,
      user_id,
      work_flow_id,
      status,
      list_checkbox_ids,
      node_ids, temp_node_ids, user_name
    } = req.body;
    let quotaIds = list_checkbox_ids;
    if (typeof quotaIds === "string") {
      try {
        quotaIds = JSON.parse(quotaIds);
      } catch {
        throw new Error("Invalid JSON format for list_checkbox_ids");
      }
    }
    if (!Array.isArray(quotaIds) || quotaIds.length === 0) {
      throw new Error("Invalid or empty quota ID list");
    }
    const presentDateAndTime = new Date();

    // const tempNodes = Array.isArray(temp_node_ids) ? temp_node_ids : [temp_node_ids];
    const oldQuotas = await sequelize.query( `SELECT * FROM prod_quota WHERE id IN (:quotaIds)`,
      {
        replacements: { quotaIds },
        type: sequelize.QueryTypes.SELECT,
        transaction,
      }
    );
    const wfDetails = await sequelize.query(
      ` SELECT distinct w.type AS work_flow_type,wn.action_user_id,wn.node_id,wn.source_sl_no, 
          wn.source_node_id,'yes' as source_node_direction
          FROM work_flows w JOIN work_flow_nodes wn ON w.id = wn.work_flow_id
          left join work_flow_edges we ON wn.work_flow_id = we.work_flow_id and wn.source_node_id   = we.source_node_id
          and wn.source_node_id   = we.destination_node_id
          WHERE w.id = :work_flow_id AND LENGTH(wn.action_user_id) > 0  and wn.action_user_id is not null order by wn.source_sl_no`,
      {
        type: sequelize.QueryTypes.SELECT,
        replacements: { work_flow_id },
        transaction,
      }
    );
    if (!wfDetails.length)  throw new Error("No work flows found"); 
    // const firstNodeCount = wfDetails.filter(r => r.source_node_id === firstSource).length;
    const maxWFNodeID = wfDetails[wfDetails.length - 1].source_sl_no; 
    const flowRows = []; 
    for (const quota_id of quotaIds) {
      for (const {
        work_flow_type,
        action_user_id,
        node_id,
        quota_stage,
        source_sl_no,
        source_node_direction,
      } of wfDetails) {
        const assignees = await resolveAssignees({
          org_code,
          work_flow_type,
          action_user_id,
          created_by: user_id,
        });
        for (const emp_id of assignees) {
          flowRows.push([
            quota_id,
            emp_id,
            user_id,
            quota_stage || status,
            source_sl_no,
            source_sl_no,
            source_node_direction,
            user_id,
            presentDateAndTime,
            presentDateAndTime,
          ]);
        }
      }
    }
    await sequelize.query(
      `UPDATE prod_quota SET status = 'In Progress',updated_at =now(),updated_by =  '${user_id}' , work_flow_id= '${work_flow_id}'
       ,last_node= '${maxWFNodeID}'   
        WHERE id in (:quotaIds)  AND org_code = :org_code`,
      {
        replacements: { user_id, work_flow_id, maxWFNodeID, quotaIds, org_code },
        type: sequelize.QueryTypes.UPDATE,
        transaction,
      }
    );
    await sequelize.query(
      `INSERT INTO prod_quota_flow
         (quota_id, assigned_to, assigned_from, status, node_id, source_node_id, node_decision, created_by, created_at, assigned_at)
       VALUES ${flowRows
        .map(() => "(?, ?, ?, ?, ?, ?, ?, ?,?,?)")
        .join(",")}`,
      {
        type: sequelize.QueryTypes.INSERT,
        replacements: flowRows.flat(),
        transaction,
      }
    );
    let tempAction = `Quota Assigned from : ${user_name}`
    let tempWKNodeId = wfDetails[0].source_sl_no;
    let tempNode = Array.isArray(temp_node_ids) ? temp_node_ids : [temp_node_ids];
    const firstTempNodeId = parseInt(tempNode[0], 10);
 
    console.log("-------tempWKNodeId---------"+tempWKNodeId)
    console.log("-------tempNode---------"+tempNode)
    console.log("-----firstTempNodeId-----------"+firstTempNodeId)
    const nextTempNodeId = firstTempNodeId + wfDetails.length; 
    console.log("-------nextTempNodeId---------"+nextTempNodeId)
    // :tempNode
    await sequelize.query(
      `INSERT INTO prod_quota_history
     (status, quota_id, created_by, assigned_to, node_decision, node_id, created_at, quota_action, temp_node_id)
   SELECT 'In Progress' AS status, df.quota_id, df.created_by, df.assigned_to, df.node_decision, df.node_id,
     :presentDateAndTime::timestamp AS created_at,
     :tempAction    AS quota_action,
     COALESCE(last_temp.temp_node_id, 0) +
       ROW_NUMBER() OVER (
         PARTITION BY df.quota_id
         ORDER BY df.assigned_at, df.id
       ) AS temp_node_id
   FROM prod_quota_flow df
   LEFT JOIN (
     SELECT quota_id, MAX(temp_node_id) AS temp_node_id
     FROM prod_quota_history
     WHERE quota_id IN (:quotaIds)
     GROUP BY quota_id
   ) last_temp ON df.quota_id = last_temp.quota_id
   WHERE df.quota_id IN (:quotaIds)
     AND df.node_id = :tempWKNodeId
  `,
      {
        type: sequelize.QueryTypes.INSERT,
        transaction,
        replacements: {
          presentDateAndTime,
          tempAction,
          tempWKNodeId,
          quotaIds,
        },
      }
    );  
    const tempQuotaIds = quotaIds;
    const tempNodeIds = node_ids; 
    const sql = ` UPDATE prod_quota_history  SET updated_at = ?, updated_by = ?
    WHERE quota_id IN (${quotaIds}) AND node_id IN (${node_ids}) and temp_node_id IN (${temp_node_ids}) `;

    const replacements = [presentDateAndTime,user_id, ...tempQuotaIds, ...tempNodeIds];
    await sequelize.query(sql, {
      type: sequelize.QueryTypes.UPDATE,
      replacements,
      transaction,
    });
    const newQuotas = await sequelize.query( `SELECT * FROM prod_quota WHERE id IN (:quotaIds)`,
      {
        replacements: { quotaIds },
        type: sequelize.QueryTypes.SELECT,
        transaction,
      }
    );
    await transaction.commit();
    for (const id of quotaIds) {
      const oldQ = oldQuotas.find((q) => q.id === id) || null;
      const newQ = newQuotas.find((q) => q.id === id) || null;
      const quotaName = oldQ?.quota_name || newQ?.quota_name || 'Unknown';
      await logAudit({
        org_code,
        object_type: "prod_quota",
        object_id: id,
        action: "STATUS_UPDATE",
        changed_by: user_id,
        old_values: oldQ,
        new_values: newQ,
        remarks: `Quota "${quotaName}" ${status} by ${user_name}`,
      });
    }
    return res.json({
      status: true,
      message: "Quota approvals recorded successfully.",
    });

  } catch (error) {
    console.error("Error approving or returning quota:", error);
    await transaction.rollback();
    return res.status(500).json({
      status: false,
      message: "Failed to process quota approval.",
      error: error.message,
    });
  }
};  

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