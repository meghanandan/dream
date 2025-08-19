const { runWorkflowEngine, pickNextActionNode, processWorkflowAction } = require('./workflowEngine');
const sequelize = require('../config/db');
const axios = require('axios');
const moment = require("moment");
const { sendEmail } = require("./customFieldsController");
const { sendDisputeNotifications } = require('../utils/notificationFunctions');
const { logAudit } = require("../utils/auditLogger");

// console.log("[Env] GATEWAY_SERVICE_URL=", process.env.GATEWAY_SERVICE_URL);
// console.log("[Env] SERVICE_TOKEN=", process.env.SERVICE_TOKEN);

//const GATEWAY_SERVICE_URL = 'http://localhost:4000'; 
const GATEWAY_SERVICE_URL = 'https://dream.uniflo.ai/api'; // or your production URL
const SERVICE_TOKEN = 'Dream_notify_secret';

// Helper function to get meaningful stage name for any workflow type
async function getMeaningfulStageName(nodeData, workflowInfo, orgCode, transaction) {
  // First, check if node has a valid label
  const rawLabel = nodeData?.label;
  const isValidLabel = rawLabel && rawLabel.trim() && rawLabel.toLowerCase() !== 'unnamed';
  
  if (isValidLabel) {
    return rawLabel;
  }

  // If no valid label, get meaningful name based on workflow type
  const { work_flow_type, action_user_id } = workflowInfo;
  
  if (!action_user_id) {
    return 'Pending Review';
  }

  try {
    switch (work_flow_type) {
      case 'role': {
        // ?? FLEXIBLE: Query actual role name from database - works with ANY role
        const [roleInfo] = await sequelize.query(
          `SELECT role_name FROM roles WHERE role_id = :role_id AND org_code = :org_code`,
          { 
            replacements: { role_id: action_user_id, org_code: orgCode }, 
            type: sequelize.QueryTypes.SELECT, 
            transaction 
          }
        );
        
        if (roleInfo?.role_name) {
          return `${roleInfo.role_name} Review`;
        }
        
        // If no role found in roles table, try to clean up the role_id for display
        const cleanRoleId = action_user_id.replace(/^RL_/, '').replace(/_/g, ' ');
        return `${cleanRoleId} Review`;
      }

      case 'user': {
        // Get actual user name from database
        const [userInfo] = await sequelize.query(
          `SELECT first_name, last_name FROM users 
           WHERE emp_id = :emp_id AND org_code = :org_code`,
          { 
            replacements: { emp_id: action_user_id, org_code: orgCode }, 
            type: sequelize.QueryTypes.SELECT, 
            transaction 
          }
        );
        
        if (userInfo?.first_name) {
          const fullName = `${userInfo.first_name} ${userInfo.last_name || ''}`.trim();
          return `Assigned to ${fullName}`;
        }
        
        return `User Review (${action_user_id})`;
      }

      case 'hierarchy': {
        // ?? UPDATED: Handle level-based hierarchy system
        if (action_user_id === 'Admin') {
          return 'Admin Review';
        }
        
        // Handle numeric levels
        const level = parseInt(action_user_id, 10);
        if (!isNaN(level)) {
          return `Level ${level} Review`;
        }
        
        // Fallback for any other hierarchy format
        return `${action_user_id} Review`;
      }

      case 'smartrouting': {
        // For smart routing, use region/subregion info
        return `Smart Route Review`;
      }

      default:
        return 'Pending Review';
    }
  } catch (error) {
    console.error('Error getting meaningful stage name:', error);
    // Fallback: Clean up the action_user_id for display
    const cleanId = action_user_id.replace(/^(RL_|USR_|LVL_)/, '').replace(/_/g, ' ');
    return `${cleanId} Review`;
  }
}

const generateDynamicQuery = async (org_code, type) => {
  const mappingQuery = `select field_name, table_name,data_type,field_label, field_sequence,is_editable
      from prod_mapping_keys_info where org_code = ? and (destination_type = 0 OR destination_type = ?) 
      and is_visible = true `;

  const mappingResults = await sequelize.query(mappingQuery, {
    replacements: [org_code, type],
    type: sequelize.QueryTypes.SELECT,
  });
  if (!mappingResults.length) {
    throw new Error("No data found");
  }
  // Step 2: Group fields by table names
  const fieldGroups = {};
  const fieldLabels = {};
  const fieldSequences = {};
  const fieldDataTypes = {};
  mappingResults.forEach(
    ({ field_name, table_name, field_label, field_sequence, data_type }) => {
      if (!fieldGroups[table_name]) {
        fieldGroups[table_name] = [];
      }
      fieldGroups[table_name].push(field_name);
      fieldLabels[field_name] = field_label;
      fieldSequences[field_name] = field_sequence;
      fieldDataTypes[field_name] = data_type;
    }
  );
  // Step 3: Build SELECT and JOIN queries dynamically
  const baseTable = "prod_orders";
  const selectClauses = [
    `${baseTable}.id AS prod_orders_row_id`,
    `${baseTable}.org_code`,
  ];
  const joinClauses = [];
  const columns = [];

  Object.entries(fieldGroups).forEach(([table, fields]) => {
    fields.forEach((field) => {
      selectClauses.push(`${table}.${field}`);
      columns.push(field);
    });
    if (table !== baseTable) {
      joinClauses.push(
        `LEFT JOIN ${table} ON ${table}.prod_orders_row_id = ${baseTable}.id`
      );
    }
  });
  // Step 4: Construct final SQL query
  const sqlQuery = `SELECT ${selectClauses.join(
    ", "
  )}  FROM ${baseTable}  ${joinClauses.join(
    " "
  )} WHERE ${baseTable}.org_code = ? `;
  return { sqlQuery, replacements: [org_code], Queryfields: mappingResults };
};

exports.raiseDispute = async (req, res) => {
  try {
    const { order_id, template_id, org_code, user_id, type } = req.body;
    if (!order_id || !template_id || !org_code || !user_id || !type) {
      return res
        .status(400)
        .json({
          status: false,
          message:
            "Order Id, Template Id, User Id,Type and Organization Id are Mandatory",
        });
    }

    // 1. Get workflow ID from template
    const [template] = await sequelize.query(
      `SELECT work_flow_id FROM templates WHERE id = :template_id`,
      {
        replacements: { template_id },
        type: sequelize.QueryTypes.SELECT
      }
    );

    if (!template?.work_flow_id) {
      return res.status(400).json({
        status: false,
        message: "Template must have an associated workflow"
      });
    }

    // 2. Load workflow configuration
    const nodes = await sequelize.query(
      `SELECT * FROM work_flow_nodes WHERE work_flow_id = :wf`,
      { replacements: { wf: template.work_flow_id }, type: sequelize.QueryTypes.SELECT }
    );
    
    const edges = await sequelize.query(
      `SELECT * FROM work_flow_edges WHERE work_flow_id = :wf`,
      { replacements: { wf: template.work_flow_id }, type: sequelize.QueryTypes.SELECT }
    );

    // Just verify that we have at least one node
    if (!nodes.length) {
      return res.status(400).json({
        status: false,
        message: "Workflow has no nodes configured"
      });
    }

    // Check for parallel nodes that need to be initialized
    const parallelStartNodes = nodes.filter(n => n.type_node === 'parallel' && n.source_sl_no === 1);
    if (parallelStartNodes.length > 0) {
      console.log('[raiseDispute] Found parallel start nodes:', 
        parallelStartNodes.map(n => n.node_id)
      );
    }

    const { sqlQuery, replacements, Queryfields } = await generateDynamicQuery(
      org_code,
      type
    );
    console.log(sqlQuery, replacements, Queryfields, "query");
    // Check if the query contains JOIN and append the correct condition
    let query =
      sqlQuery +
      (sqlQuery.includes("JOIN") ? " AND prod_orders.id = ?" : " AND id = ?");
    // Push order_id into replacements array
    replacements.push(order_id);
    const [row] = await sequelize.query(query, {
      replacements,
      type: sequelize.QueryTypes.SELECT,
    });
    if (!row) {
      return res
        .status(404)
        .json({ status: false, message: "Order not found" });
    }
    let idCounter = 1;
    const formattedData = Object.entries(row).map(([key, value]) => {
      // Find the corresponding field from mappingResults
      const fieldInfo = Queryfields.find((field) => field.field_name === key);
      return {
        id: idCounter++,
        name: key,
        label: fieldInfo
          ? fieldInfo.field_label
          : key
              .replace(/_/g, " ")
              .replace(/\b\w/g, (char) => char.toUpperCase()), // Use field_label if available
        element: "input",
        value:
          fieldInfo && fieldInfo.data_type === "timestamp without time zone"
            ? moment(value).format("YYYY-MM-DD HH:mm:ss")
            : value,
        placeholder: "",
        required: true,
        disable: fieldInfo ? !fieldInfo.is_editable : true, // Use is_editable from mappingResults
        visible: true,
      };
    });
    // Fetch template details
    const trows = await sequelize.query(
      `select t.id AS template_id, t.work_flow_id, t.name AS template_name, tp.name AS template_type, 
        t.org_code, t.created_by, t.reason_code, tcf.custom_field_id, 
        mcf.id AS mcf_id, mcf.name AS field_name, mcf.field_type, mcf.label,mcf.placeholder, mcf.is_required
        from templates t join master_template_types tp ON t.template_type = tp.id
        left join template_custom_fields tcf ON t.id = tcf.template_id 
        left join master_template_custom_fields mcf ON tcf.custom_field_id = mcf.id 
        where t.id = ? AND t.org_code = ?`,
      {
        type: sequelize.QueryTypes.SELECT,
        replacements: [template_id, org_code],
      }     
    );
    if (!trows.length) {
      return res
        .status(404)
        .json({ status: false, message: "Template not found" });
    }
    // Extract common template metadata (from first row)
    const {
      template_id: tem_id,
      work_flow_id,
      template_name,
      template_type,
      org_code: org_id,
      created_by,
      reason_code,
    } = trows[0];
    // Format template fields
    const templateFields = trows.map((trow) => ({
      id: idCounter++, // Continue incrementing ID
      field_id: trow.custom_field_id,
      name: trow.field_name,
      label: trow.label,
      element: trow.field_type,
      value: null,
      placeholder: trow.placeholder,
      required: trow.is_required,
      disable: false,
      visible: true,
    }));
    // Merge order fields and template fields
    const fields = [...formattedData, ...templateFields];
    const filteredFields = fields.filter(
      (field) =>
        field.field_id !== null &&
        !["prod_orders_row_id", "org_code", "user_id"].includes(field.name)
    );
    const processFields = (fields) => {
      let processedFields = [];
      fields.forEach((field) => {
        let isViewOnly = field.disable === true || field.field_id; // Fields with disable: true or having an id are viewonly
        if (isViewOnly) {
          processedFields.push({ ...field, viewonly: true });
        } else {
          // If not viewonly, generate a pair of fields (one with is_negative: true, another with is_negative: false)
          processedFields.push(
            { ...field, viewonly: false, is_negative: true },
            { ...field, viewonly: false, is_negative: false }
          );
        }
      });
      return processedFields;
    };
    const processedFields = processFields(filteredFields);
    // Final structured response
    const responseData = {
      template_id: tem_id,
      work_flow_id,
      template_name,
      template_type,
      org_code: org_id,
      created_by,
      reason_code,
      fields: processedFields, // Merged fields array
    };
    return res.json({ status: true, data: responseData });
  } catch (error) {
    console.log(error, "error");
    return res
      .status(500)
      .json({ message: "Error while Raising Dispute", error: error.message });
  }
};

async function getDisputeDetails(dispute_id, nodeId) {
  const [row] = await sequelize.query(
    `
    SELECT
      wf.type         AS work_flow_type,
      df.node_id      AS dis_flow_node_id,
      wn.source_sl_no AS current_slno
    FROM disputes d
    JOIN work_flows wf    ON d.work_flow_id = wf.id
    JOIN dispute_flow df  ON d.id = df.dispute_id
    JOIN work_flow_nodes wn
      ON wn.node_id = df.node_id
    WHERE d.id     = :dispute_id
      AND df.node_id = :nodeId
    LIMIT 1
    `,
    {
      type: sequelize.QueryTypes.SELECT,
      replacements: { dispute_id, nodeId }
    }
  );
  return row;
}

async function updateDisputeFlow(
  work_flow_type,
  dispute_id,
  done_by,
  decision,
  comments,
  dis_flow_node_id
) {
  let query, replacements;
  let assigned_to = null;
  
  query = `update dispute_flow set dispute_stage = ?,updated_at = NOW(),updated_by = ?,comments = ? 
    where dispute_id = ? and node_id = ?`;
  replacements = [decision, done_by, comments, dispute_id, dis_flow_node_id];
  await sequelize.query(query, {
    type: sequelize.QueryTypes.UPDATE,
    replacements,
  });
  return { assigned_to, work_flow_type };
}
     

// controllers/disputeController.js
exports.getDreamLiteDisputeList = async (req, res) => {
  try {
    const { org_code, user_id } = req.body;
    if (!org_code || !user_id) {
      return res.status(400).json({ status: false, message: 'org_code and user_id are required' });
    }

    const query = `
      SELECT
        disp.id                    AS dispute_id,
        TO_CHAR(disp.created_at, 'MM-DD-YYYY') AS dispute_date,
        disp.description,
        disp.work_flow_id,
        disp.template_id,
        tmps.name                 AS template_name,
        disp.dispute_type,
        disp.priority,
        disp.severity,
        disp.dream_lite_source_data,
        disp.dream_lite_modified_data,
        disp.capture_image,
        disp.attachments,
        disp.remarks,
        disp.dispute_stage,
        usr.first_name || ' ' || usr.last_name AS raised_by,
        ph.pending_at
      FROM disputes AS disp
      LEFT JOIN users AS usr
        ON disp.created_by = usr.emp_id
      LEFT JOIN templates AS tmps
        ON disp.template_id = tmps.id
      LEFT JOIN LATERAL (
        SELECT STRING_AGG(DISTINCT u2.first_name || ' ' || u2.last_name, ', ' 
                         ORDER BY u2.first_name || ' ' || u2.last_name)
          AS pending_at
        FROM dispute_history AS dh
        JOIN users AS u2
          ON dh.assigned_to = u2.emp_id
        WHERE dh.dispute_id = disp.id
          AND dh.updated_at IS NULL
          AND dh.assigned_to IS NOT NULL
          AND dh.action != 'smart_auto_approved'
      ) AS ph ON TRUE
      WHERE disp.licence_type = 'DREAMLTE'
        AND disp.org_code    = :org_code
        AND disp.created_by  = :user_id
      ORDER BY disp.created_at DESC, disp.id DESC;
    `;

    const disputes = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT,
      replacements: { org_code, user_id },
    });

    return res.json({ status: true, data: disputes });
  } catch (error) {
    console.error('Error in getDreamLiteDisputeList:', error);
    return res.status(500).json({
      status:  false,
      message: 'Failed to fetch DreamLite disputes',
      error:   error.message,
    });
  }
};


 
async function getHistoryForDispute(dispute_id) {
  const historyQ = `
    SELECT
      ROW_NUMBER() OVER (ORDER BY dh.created_at) AS step_no,
      dh.done_by,
      u1.first_name || ' ' || u1.last_name AS done_by_name,
      dh.action,
      dh.dispute_stage,
      dh.assigned_to,
      u2.first_name || ' ' || u2.last_name AS assigned_to_name,
      TO_CHAR(dh.created_at,'MM-DD-YYYY HH24:MI') AS submitted_time,
      dh.node_decision,
      dh.comments,
      dh.status,
      dh.updated_at IS NOT NULL AS is_completed,
      CASE 
        WHEN dh.updated_at IS NULL THEN 'pending'
        WHEN dh.action IN ('transition', 'created') THEN 'assigned'
        ELSE 'processed'
      END as step_type
    FROM dispute_history dh
    LEFT JOIN users u1 ON dh.done_by     = u1.emp_id
    LEFT JOIN users u2 ON dh.assigned_to = u2.emp_id
    WHERE dh.dispute_id = :id
      AND dh.status = true
    ORDER BY dh.created_at
  `;
  
  const hist = await sequelize.query(historyQ, {
    replacements: { id: dispute_id },
    type: sequelize.QueryTypes.SELECT,
  });
  
  // ?? ENHANCED: Filter out final assignment steps that are immediately resolved
  // If we have consecutive assignment steps where the last one is to the same person as the first,
  // and the dispute is resolved, it likely means the workflow looped back for resolution
  if (hist.length > 1) {
    const [disputeStatus] = await sequelize.query(
      `SELECT dispute_stage FROM disputes WHERE id = :id`,
      { replacements: { id: dispute_id }, type: sequelize.QueryTypes.SELECT }
    );
    
    if (disputeStatus?.dispute_stage === 'resolved') {
      const lastStep = hist[hist.length - 1];
      const firstStep = hist[0];
      
      // If last step assigns back to original creator and is just assignment (not processed)
      if (lastStep.step_type === 'assigned' && 
          lastStep.assigned_to === firstStep.done_by &&
          !lastStep.is_completed) {
        
        // Add a resolution indicator instead of showing the confusing assignment
        hist[hist.length - 1] = {
          ...lastStep,
          action: 'resolved',
          dispute_stage: 'Resolved by System',
          assigned_to: null,
          assigned_to_name: 'System Resolution',
          step_type: 'resolved',
          comments: lastStep.comments || 'Dispute resolved after approval chain completion'
        };
      }
    }
  }
  
  return hist;
}

function prettifyLabel(name = "") {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (chr) => chr.toUpperCase());
}

function formatValue(raw, queryFields = [], fieldName) {
  if (raw == null) return "";
  const fieldMeta = queryFields.find((f) => f.field_name === fieldName);
  if (fieldMeta && fieldMeta.data_type === "timestamp without time zone") {
    const moment = require("moment");
    return moment(raw).format("YYYY-MM-DD HH:mm:ss");
  }
  return raw;
}

async function buildDreamProDiff(disputeEntry, expansionContext) {
  const { expand_dispute_id, type: incomingType, order_id: incomingOrderId } = expansionContext;

  const targetId = parseInt(expand_dispute_id, 10);
  if (!targetId || targetId !== disputeEntry.dispute_id) {
    return null; // nothing to do
  }

  // 1. Load custom fields (modified values)
  const customFields = await sequelize.query(
    `SELECT field_name, field_label, field_value FROM dispute_custom_fields WHERE dispute_id = ? ORDER BY id`,
    {
      replacements: [targetId],
      type: sequelize.QueryTypes.SELECT,
    }
  );

  // 2. Extract context
  const org_code = disputeEntry.org_code; // requires that getDisputeList selects it; if not, you may need to include it
  let order_id = incomingOrderId;
  const type = incomingType;

  // Fallback: infer order_id from custom fields if absent
  if (!order_id) {
    const orderField = customFields.find(
      (f) => f.field_name && f.field_name.toLowerCase() === "order_id"
    );
    if (orderField) order_id = orderField.field_value;
  }

  if (!org_code || !type || !order_id) {
    // Can't reconstruct; return partial so UI can decide
    return {
      dream_lite_source_data: [],
      dream_lite_modified_data: customFields.map((f) => ({
        label: f.field_label || prettifyLabel(f.field_name),
        value: f.field_value,
      })),
      warning: "Insufficient context to reconstruct original values",
    };
  }

  // 3. Re-run the dynamic query to get the original row (same logic as raiseDispute)
  const { sqlQuery, replacements, Queryfields } = await generateDynamicQuery(org_code, type);

  const augmentQuery = sqlQuery + (sqlQuery.includes("JOIN") ? " AND prod_orders.id = ?" : " AND id = ?");
  replacements.push(order_id);

  const [originalRow] = await sequelize.query(augmentQuery, {
    replacements,
    type: sequelize.QueryTypes.SELECT,
  });

  // 4. Build dream-lite-style arrays
  const sourceArray = customFields.map((f) => {
    const rawSourceValue =
      originalRow && Object.prototype.hasOwnProperty.call(originalRow, f.field_name)
        ? originalRow[f.field_name]
        : "";
    return {
      label: f.field_label || prettifyLabel(f.field_name),
      value: formatValue(rawSourceValue, Queryfields, f.field_name),
    };
  });

  const modifiedArray = customFields.map((f) => ({
    label: f.field_label || prettifyLabel(f.field_name),
    value: f.field_value,
  }));

  return {
    dream_lite_source_data: sourceArray,
    dream_lite_modified_data: modifiedArray,
  };
}

exports.getDisputeList = async (req, res) => {
  try {
    const {
      search_key,
      user_id,
      org_code,
      from,
      to,
      role_id,
      expand_dispute_id,
      type: expansionType,
      order_id: expansionOrderId,
    } = req.body;

    if (!org_code || !user_id) {
      return res.status(400).json({ status: false, message: "Missing required fields" });
    }

    const startDate = from || moment().startOf("month").format("YYYY-MM-DD");
    const endDate = to || moment().format("YYYY-MM-DD");

    // Build dynamic WHERE clause pieces
    const whereClauses = [`d.org_code = :org_code`];
    if (role_id === "RL_NyAd") {
      // no extra filter
    } else if (role_id && role_id.startsWith("RL_")) {
      whereClauses.push(`
        (
          d.created_by = :user_id
          OR EXISTS (
            SELECT 1 FROM dispute_history dh
            WHERE dh.dispute_id = d.id
              AND (dh.assigned_to = :user_id OR dh.assigned_to = :role_id)
          )
        )
      `);
    } else {
      whereClauses.push(`d.created_by = :user_id`);
    }

    if (search_key) {
      whereClauses.push(`(u.first_name || ' ' || u.last_name) ILIKE :search_key`);
    }

    whereClauses.push(`
      d.created_at BETWEEN :startDate::timestamp
      AND (:endDate::date + 1)::timestamp
    `);

    const where = whereClauses.join(" AND ");

    // Main query
    const rows = await sequelize.query(
      `
      SELECT
        d.id                           AS dispute_id,
        INITCAP(REPLACE(d.dispute_stage,'_',' ')) AS dispute_status,
        d.created_by                   AS created_by_id,
        u.first_name || ' ' || u.last_name AS created_by_name,
        TO_CHAR(d.created_at,'MM-DD-YYYY')   AS dispute_date,
        t.name                         AS template_name,
        w.name                         AS work_flow_name,
        d.licence_type,
        d.priority,
        d.severity,
        d.dream_lite_source_data,
        d.dream_lite_modified_data,
        d.capture_image,
        d.attachments,
        d.remarks,
        d.description,
        ph.pending_at,
        d.org_code                    AS org_code  -- needed for expansion
      FROM disputes d
      LEFT JOIN templates t ON d.template_id = t.id
      LEFT JOIN work_flows w ON t.work_flow_id = w.id
      LEFT JOIN users u ON d.created_by = u.emp_id
      LEFT JOIN LATERAL (
        SELECT STRING_AGG(DISTINCT assignee_name, ', ' ORDER BY assignee_name) AS pending_at
        FROM (
          SELECT
            CASE
              WHEN dh.assigned_to LIKE 'RL_%' THEN
                u_role.first_name || ' ' || u_role.last_name
              ELSE
                u2.first_name || ' ' || u2.last_name
            END AS assignee_name
          FROM dispute_history dh
          LEFT JOIN users u2 ON dh.assigned_to = u2.emp_id
          LEFT JOIN LATERAL (
            SELECT u3.first_name, u3.last_name
            FROM users u3
            WHERE u3.role = dh.assigned_to
              AND u3.org_code = d.org_code
          ) u_role ON dh.assigned_to LIKE 'RL_%'
          WHERE dh.dispute_id = d.id
            AND dh.updated_at IS NULL
            AND dh.assigned_to IS NOT NULL
            AND d.dispute_stage NOT IN ('resolved', 'Rejected')
            AND dh.assigned_to != d.created_by
            AND (
              (dh.assigned_to NOT LIKE 'RL_%' AND u2.first_name IS NOT NULL)
              OR (dh.assigned_to LIKE 'RL_%' AND u_role.first_name IS NOT NULL)
            )
        ) pending_names
      ) ph ON TRUE
      WHERE ${where}
      ORDER BY d.created_at DESC, d.id DESC
      `,
      {
        replacements: {
          org_code,
          user_id,
          role_id,
          search_key: search_key ? `%${search_key}%` : undefined,
          startDate,
          endDate,
        },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // Attach history and optionally expanded diff
    const result = await Promise.all(
      rows.map(async (r) => {
        const history = await getHistoryForDispute(r.dispute_id);

        // If expansion requested and matches this dispute, build DreamPro diff
        let diff = null;
        if (expand_dispute_id && parseInt(expand_dispute_id, 10) === r.dispute_id) {
          diff = await buildDreamProDiff(r, {
            expand_dispute_id,
            type: expansionType,
            order_id: expansionOrderId,
          });
        }

        return { ...r, history, diff };
      })
    );

    return res.json({
      status: true,
      headers: [
        { key: "dispute_id", label: "Dispute Id" },
        { key: "dispute_status", label: "Status" },
        { key: "template_name", label: "Template" },
        { key: "work_flow_name", label: "Workflow" },
        { key: "created_by_name", label: "Created By" },
        { key: "pending_at", label: "Pending At" },
        { key: "history", label: "History" },
      ],
      data: result,
    });
  } catch (err) {
    console.error("getDisputeList error:", err);
    return res.status(500).json({ status: false, message: err.message });
  }
};


 
exports.getPendingDisputesList = async (req, res) => {
  const { org_code, user_id } = req.body;

  try {
    // 1. Get user role_id
    const [user] = await sequelize.query(
      `SELECT role FROM users WHERE emp_id = :user_id`,
      { replacements: { user_id }, type: sequelize.QueryTypes.SELECT }
    );

    const role_id = user?.role;
    const replacements = { org_code, user_id, role_id };

    // 2. Updated query: match both emp_id and role_id
    const query = `
      WITH pending_disputes AS (
        SELECT DISTINCT a.dispute_id, a.node_id,
               STRING_AGG(DISTINCT u.first_name || ' ' || u.last_name, ', ' ORDER BY u.first_name || ' ' || u.last_name) AS pending_at
        FROM dispute_history a
        JOIN disputes b ON a.dispute_id = b.id
        LEFT JOIN users u ON a.assigned_to = u.emp_id
        WHERE b.org_code = :org_code
          AND a.updated_at IS NULL
          AND a.assigned_to IS NOT NULL
          AND (a.assigned_to = :user_id OR a.assigned_to = :role_id)
          AND b.dispute_stage NOT IN ('resolved', 'Rejected')
        GROUP BY a.dispute_id, a.node_id
      )
      SELECT 
        d.id AS dispute_id,
        d.created_by AS created_by_id,
        u.first_name || ' ' || u.last_name AS created_by_name,
        to_char(d.created_at,'mm-dd-yyyy') AS dispute_date,
        t.name AS template_name,
        w.name AS work_flow_name,
        w.id AS work_flow_id,
        d.licence_type, d.priority, d.severity,
        d.dream_lite_source_data, d.dream_lite_modified_data,
        d.capture_image, d.attachments,
        d.remarks, d.description,
        pd.pending_at,
        pd.node_id
      FROM pending_disputes pd
      JOIN disputes d ON d.id = pd.dispute_id
      LEFT JOIN templates t ON d.template_id = t.id
      LEFT JOIN work_flows w ON t.work_flow_id = w.id
      LEFT JOIN users u ON d.created_by = u.emp_id
      WHERE d.org_code = :org_code
        AND d.created_by != :user_id
      ORDER BY d.created_at DESC, d.id DESC
    `;

    const result = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT,
      replacements,
    });

    return res.status(200).json({ data: result });

  } catch (error) {
    console.error("Error in getPendingDisputesList:", error);
    return res.status(500).json({ status: false, message: "Error while getting pending disputes list" });
  }
};


exports.getPendingDreamLTEDisputesList = async (req, res) => {
  console.log("---------getPendingDreamLTEDisputesList ----------- ")
  const { org_code, user_id } = req.body;
  try {
    const replacements = { org_code, user_id };
    let query = `select * from ( select disp.id as dispute_id, to_char(disp.created_at,'mm-dd-yyyy') AS dispute_date,disp.description,disp.work_flow_id,disp.template_id,tmps.name as template_name,
    disp.dispute_type,disp.priority,disp.severity,disp.dream_lite_source_data,disp.dream_lite_modified_data,disp.capture_image,
    disp.attachments,disp.remarks,disp.dispute_stage,concat(usr.first_name,' ',usr.last_name) as raised_by 
    from disputes disp left join users usr on disp.created_by = usr.emp_id left join work_flows wf on disp.work_flow_id = wf.id 
    left join templates tmps on disp.template_id = tmps.id 
    where disp.licence_type ='DREAMLTE' and disp.org_code = :org_code  ) main right join 
    (select 
      b.id as sub_dispute_id,
      STRING_AGG(DISTINCT u.first_name || ' ' || u.last_name, ', ' ORDER BY u.first_name || ' ' || u.last_name) AS pending_at,
      a.node_id 
    from dispute_history a 
    left join disputes b on a.dispute_id = b.id 
    left join users u ON a.assigned_to = u.emp_id 
    where b.org_code= :org_code 
      and b.licence_type ='DREAMLTE' 
      and a.assigned_to= :user_id 
      and a.updated_at is null
      and a.assigned_to IS NOT NULL
      and a.action != 'smart_auto_approved'
    GROUP BY b.id, a.node_id) sub on main.dispute_id = sub.sub_dispute_id 
    ORDER BY main.dispute_date DESC,main.dispute_id desc`;
    
    const result = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT,
      replacements,
    });
    
    // Process result to extract only filename from capture_image paths
    const path = require('path');
    result.forEach(row => {
      if (row.capture_image) {
        row.capture_image = path.basename(row.capture_image);
      }
    });
    
    return res.status(200).json({ data: result });
  } catch (error) {
    return res.status(500).json({status: false, message: "Error while getting pending disputes list", });
  }
};
   
// Enhanced debugging version - add this to your updateDispute function
async function determineTransitionType(currentNodeId, nextNodeId, work_flow_id, transaction) {
  try {
    // Get hierarchy info for both nodes
    const [currentNodeInfo] = await sequelize.query(
      `SELECT wn.action_user_id, wf.type AS work_flow_type
       FROM work_flow_nodes wn
       JOIN work_flows wf ON wn.work_flow_id = wf.id
       WHERE wn.node_id = :nodeId AND wn.work_flow_id = :workflowId`,
      { 
        replacements: { nodeId: currentNodeId, workflowId: work_flow_id },
        type: sequelize.QueryTypes.SELECT,
        transaction
      }
    );

    const [nextNodeInfo] = await sequelize.query(
      `SELECT wn.action_user_id, wf.type AS work_flow_type
       FROM work_flow_nodes wn
       JOIN work_flows wf ON wn.work_flow_id = wf.id
       WHERE wn.node_id = :nodeId AND wn.work_flow_id = :workflowId`,
      { 
        replacements: { nodeId: nextNodeId, workflowId: work_flow_id },
        type: sequelize.QueryTypes.SELECT,
        transaction
      }
    );

    if (!currentNodeInfo || !nextNodeInfo) {
      return { type: 'transition', direction: 'unknown' };
    }

    // Check workflow type
    if (currentNodeInfo.work_flow_type === 'hierarchy') {
      // For hierarchy workflows, we can compare the action_user_id values
      // which represent the hierarchy levels
      const currentLevel = parseInt(currentNodeInfo.action_user_id, 10) || 0;
      const nextLevel = parseInt(nextNodeInfo.action_user_id, 10) || 0;

      if (nextLevel < currentLevel) {
        return { type: 'return', direction: 'down', levelChange: currentLevel - nextLevel };
      } else if (nextLevel > currentLevel) {
        return { type: 'escalation', direction: 'up', levelChange: nextLevel - currentLevel };
      }
    }

    // For non-hierarchy workflows or when levels are the same
    return { type: 'transition', direction: 'lateral' };
  } catch (err) {
    console.error('Error determining transition type:', err);
    return { type: 'transition', direction: 'unknown' };
  }
}

exports.updateDispute = async (req, res) => {
  const {
    dispute_id,
    work_flow_id,
    done_by,
    org_code,
    decision,
    comments = null
  } = req.body;

  console.log(`?? Starting updateDispute for dispute ${dispute_id} with decision: "${decision}"`);

  if (!dispute_id || !work_flow_id || !done_by || !org_code || !decision) {
    return res.status(400).json({ status: false, message: "Missing required fields" });
  }

  const t = await sequelize.transaction();
  try {
    // 1) Find current node
    const rows = await sequelize.query(
      `SELECT df.node_id, wn.type_node, wn.json_node
         FROM dispute_flow df
         JOIN work_flow_nodes wn ON df.node_id = wn.node_id
        WHERE df.dispute_id = :id
          AND df.status = true
        ORDER BY df.assigned_at DESC
        LIMIT 1`,
      {
        replacements: { id: dispute_id },
        type: sequelize.QueryTypes.SELECT,
        transaction: t
      }
    );

    if (!rows.length) {
      await t.rollback();
      return res.status(400).json({ 
        status: false, 
        message: "This dispute cannot be processed right now. Please contact your administrator for assistance."
      });
    }

    const currentNodeId = rows[0].node_id;
    const currentNodeType = rows[0].type_node;
    console.log(`?? Current node: ${currentNodeId} (type: ${currentNodeType})`);

    // 1.5) Get original dispute creator for hierarchy calculations
    const [disputeInfo] = await sequelize.query(
      `SELECT created_by AS original_creator FROM disputes WHERE id = :dispute_id`,
      {
        replacements: { dispute_id },
        type: sequelize.QueryTypes.SELECT,
        transaction: t
      }
    );
    
    const originalCreator = disputeInfo?.original_creator;
    console.log(`?? Original dispute creator: ${originalCreator}`);

    // 2) Get all outgoing edges from current node
    const outgoingEdges = await sequelize.query(
      `SELECT source_node_id, destination_node_id, direction, label, edge_id
       FROM work_flow_edges 
       WHERE work_flow_id = :wf AND source_node_id = :node`,
      {
        replacements: { wf: work_flow_id, node: currentNodeId },
        type: sequelize.QueryTypes.SELECT,
        transaction: t
      }
    );

    console.log(`?? Outgoing edges from node ${currentNodeId}:`, outgoingEdges.map(e => ({
      to: e.destination_node_id,
      direction: e.direction || e.label,
      edge_id: e.edge_id
    })));

    // 3) Check what the target nodes are
    if (outgoingEdges.length > 0) {
      const targetNodeIds = outgoingEdges.map(e => e.destination_node_id);
      const targetNodes = await sequelize.query(
        `SELECT node_id, type_node, json_node, action_user_id
         FROM work_flow_nodes 
         WHERE work_flow_id = $1 AND node_id = ANY($2)`,
        {
          bind: [work_flow_id, targetNodeIds],
          type: sequelize.QueryTypes.SELECT,
          transaction: t
        }
      );
      
      console.log(`?? Target nodes:`, targetNodes.map(n => ({
        id: n.node_id,
        type: n.type_node,
        hasAssignee: !!n.action_user_id
      })));
    }

    // 4) ?? FIX: Update dispute_flow status for ALL current assignees, not just one
    await sequelize.query(
      `UPDATE dispute_flow SET status = false, updated_at = NOW(), updated_by = :by 
       WHERE dispute_id = :id AND node_id = :node AND status = true`,
      {
        replacements: { id: dispute_id, node: currentNodeId, by: done_by },
        transaction: t,
        type: sequelize.QueryTypes.UPDATE
      }
    );

    // 5) Update history
    await sequelize.query(
      `UPDATE dispute_history
          SET updated_at = NOW(), updated_by = :by, action = :dec,
              comments = :cm, node_decision = :dec, status = true
        WHERE dispute_id = :id AND node_id = :node AND updated_at IS NULL`,
      {
        replacements: { id: dispute_id, node: currentNodeId, by: done_by, dec: decision, cm: comments },
        transaction: t,
        type: sequelize.QueryTypes.UPDATE
      }
    );

    // 6) Load full workflow
    const [nodes, edges] = await Promise.all([
      sequelize.query(
        `SELECT * FROM work_flow_nodes WHERE work_flow_id = :wf`,
        { replacements: { wf: work_flow_id }, type: sequelize.QueryTypes.SELECT, transaction: t }
      ),
      sequelize.query(
        `SELECT * FROM work_flow_edges WHERE work_flow_id = :wf`,
        { replacements: { wf: work_flow_id }, type: sequelize.QueryTypes.SELECT, transaction: t }
      )
    ]);

    console.log(`?? Total workflow: ${nodes.length} nodes, ${edges.length} edges`);
    
    // ?? REJECTION VALIDATION: Check if rejection is allowed in this workflow
    if (decision && (decision.toLowerCase() === 'rejected' || decision.toLowerCase() === 'reject')) {
      console.log(`?? REJECTION VALIDATION: Checking if rejection paths exist in workflow`);
      
      // Check if there are any rejection edges in the entire workflow
      const rejectionEdges = edges.filter(e => {
        const direction = (e.direction || e.label || '').toLowerCase();
        return direction.includes('reject') || 
               direction.includes('return') || 
               direction.includes('back') ||
               direction === 'no';
      });
      
      console.log(`?? Found ${rejectionEdges.length} rejection-related edges in workflow:`, 
        rejectionEdges.map(e => ({ source: e.source_node_id, target: e.destination_node_id, direction: e.direction || e.label })));
      
      // Also check if current node has rejection paths
      const currentNodeRejectionEdges = edges.filter(e => 
        (e.source_node_id || e.source) == currentNodeId && 
        ['rejected', 'reject', 'return', 'back', 'no'].includes((e.direction || e.label || '').toLowerCase())
      );
      
      console.log(`?? Current node ${currentNodeId} has ${currentNodeRejectionEdges.length} rejection edges`);
      
      if (rejectionEdges.length === 0) {
        await t.rollback();
        return res.status(400).json({
          status: false,
          message: "You cannot reject this dispute. Please approve it or contact your administrator."
        });
      }
      
      if (currentNodeRejectionEdges.length === 0) {
        await t.rollback();
        return res.status(400).json({
          status: false,
          message: "You cannot reject at this step. Please approve or contact your administrator."
        });
      }
      
      console.log(`?? REJECTION VALIDATION: Rejection is allowed, proceeding...`);
    }
    
    // Log the decision matching process
    console.log(`?? Looking for edges with direction matching: "${decision.toLowerCase()}"`);
    const matchingEdges = edges.filter(e => 
      (e.source_node_id || e.source) == currentNodeId && 
      (e.direction || e.label || '').toLowerCase() === decision.toLowerCase()
    );
    console.log(`? Found ${matchingEdges.length} matching edges:`, matchingEdges);

    // 7) Run workflow engine with decision mapping
    // ?? FIX: Handle common workflow pattern where:
    // - Action nodes have "forward" edges to decision nodes
    // - Decision nodes have "yes"/"no" edges
    // Map user decisions to workflow edge directions
    const decisionMapping = {
      'approved': 'yes',
      'rejected': 'no', 
      'approve': 'yes',
      'reject': 'no',
      'yes': 'yes',
      'no': 'no',
      'forward': 'forward'
    };
    
    const mappedDecision = decisionMapping[decision.toLowerCase()] || decision.toLowerCase();
    console.log(`?? Mapping user decision "${decision}" to workflow direction "${mappedDecision}"`);

    const payload = {
      currentNodeId: String(currentNodeId),
      decision: decision.toLowerCase(),
      action: 'process'
    };

    const { nextNode, log } = await runWorkflowEngine({ nodes, edges }, payload);

    // 8) Detailed logging of engine results
    console.log(`?? Workflow engine execution completed`);
    console.log(`?? Engine log:`, log);
    
    if (nextNode) {
      console.log(`?? Next node details:`, {
        id: nextNode.id,
        type: nextNode.type,
        label: nextNode.data?.label,
        is_end_from_type: nextNode.type === 'end',
        is_end_from_data: nextNode.data?.is_end === true,
        will_resolve: nextNode.type === 'end' || nextNode.data?.is_end === true
      });
    } else {
      console.log(`? Engine returned no next node!`);
    }

    if (!nextNode) {
      throw new Error(`Engine did not return a next node from ${currentNodeId}`);
    }

    // 9) Decision point - with extra logging
    const shouldResolve = nextNode.type === 'end' || nextNode.data?.is_end === true;
    console.log(`?? Should resolve dispute? ${shouldResolve}`);
    
    if (shouldResolve) {
      console.log(`?? RESOLVING DISPUTE - Engine reached end node: ${nextNode.id} (${nextNode.data?.label})`);
      
      // Determine final status based on decision path
      let finalStatus = 'resolved';
      let statusMessage = 'Dispute resolved';
      
      // Check if this resolution came from a rejection path
      if (decision && (decision.toLowerCase() === 'rejected' || decision.toLowerCase() === 'reject')) {
        finalStatus = 'rejected';
        statusMessage = 'Dispute rejected';
        console.log(`?? REJECTION PATH: Setting status to 'rejected' based on decision: ${decision}`);
      } else {
        console.log(`?? APPROVAL PATH: Setting status to 'resolved' based on decision: ${decision || 'approved'}`);
      }
      
      await sequelize.query(
        `UPDATE disputes SET dispute_stage = :status, updated_at = NOW(), updated_by = :by WHERE id = :id`,
        { replacements: { status: finalStatus, by: done_by, id: dispute_id }, transaction: t, type: sequelize.QueryTypes.UPDATE }
      );
      
      await t.commit();

    // ?? AUDIT LOG: Track dispute resolution
    try {
      await logAudit({
        org_code,
        object_type: "disputes",
        object_id: dispute_id,
        action: "RESOLVE",
        changed_by: done_by,
        old_values: { dispute_stage: 'in_progress' },
        new_values: { dispute_stage: 'resolved' },
        remarks: `Dispute resolved by ${done_by} with decision: ${decision}. Comments: ${comments || 'None'}`
      });
    } catch (auditErr) {
      console.warn('Audit logging failed for dispute resolution:', auditErr.message);
    }

      // NEW: Get dispute details for resolution notification
      const [disputeDetails] = await sequelize.query(
        `SELECT priority, severity, description FROM disputes WHERE id = :id`,
        { replacements: { id: dispute_id }, type: sequelize.QueryTypes.SELECT }
      );
      
      // Send resolution notification
      if (disputeDetails) {
        sendDisputeNotifications({
          type: 'UPDATE',
          dispute_id,
          org_code,
          assignees: [done_by], // Notify the resolver
          created_by: done_by,
          disputeData: {
            ...disputeDetails,
            comments,
            decision
          },
          nextStage: 'Resolved',
          sequelize
        }).catch(err => {
          console.error(`Error sending resolution notifications for dispute #${dispute_id}:`, err);
        });
      }

      return res.json({
        status: true,
        message: statusMessage,
        isComplete: true,
        finalStatus: finalStatus,
        debug: {
          currentNode: { id: currentNodeId, type: currentNodeType },
          nextNode: { id: nextNode.id, type: nextNode.type, label: nextNode.data?.label },
          decision: decision,
          finalStatus: finalStatus,
          engineLog: log
        }
      });
    }

    // 10) Check if next node is a decision node that needs auto-processing
    if (nextNode.type === 'decision') {
      console.log(`?? Next node is a DECISION node - need to auto-process it, not assign it`);
      
      // Decision nodes should not be assigned to users - they should be auto-processed
      // The engine should have already processed it, but if it stopped here, 
      // it means the decision edges might be missing or misconfigured
      
      // ?? Let's check what edges exist from this decision node
      const decisionEdges = await sequelize.query(
        `SELECT source_node_id, destination_node_id, direction, label, edge_id
         FROM work_flow_edges 
         WHERE work_flow_id = :wf AND source_node_id = :node`,
        {
          replacements: { wf: work_flow_id, node: nextNode.id },
          type: sequelize.QueryTypes.SELECT,
          transaction: t
        }
      );
      
      console.log(`?? Decision node edges:`, decisionEdges);
      
      const hasYesEdge = decisionEdges.some(e => ['yes', 'approve', 'forward'].includes(e.direction) || ['yes', 'approve', 'forward'].includes(e.label));
      const hasNoEdge = decisionEdges.some(e => ['no', 'reject', 'deny'].includes(e.direction) || ['no', 'reject', 'deny'].includes(e.label));
      const hasForwardEdge = decisionEdges.some(e => e.direction === 'forward' || e.label === 'forward');
      
      let errorMessage = `Workflow stopped at decision node "${nextNode.data?.label || nextNode.id}". `;
      
      if (decisionEdges.length === 0) {
        errorMessage += `This decision node has NO outgoing edges. Please add "yes" and "no" edges to route approved/rejected decisions.`;
      } else if (!hasYesEdge && !hasNoEdge) {
        if (hasForwardEdge) {
          errorMessage += `This decision node has a "forward" edge but is missing "yes"/"no" edges. The engine now supports using "forward" as the approval path. This might be a temporary processing issue - try again.`;
        } else {
          errorMessage += `This decision node is missing "yes" and "no" edges. Found edges: ${decisionEdges.map(e => e.direction || e.label).join(', ')}. Please add edges labeled "yes" and "no".`;
        }
      } else if (!hasYesEdge) {
        if (hasForwardEdge) {
          errorMessage += `This decision node has "no" and "forward" edges. The engine should now use "forward" as the approval path. This might be a temporary processing issue - try again.`;
        } else {
          errorMessage += `This decision node is missing a "yes" edge for approved decisions. Please add a "yes" edge or rename the approval edge to "yes".`;
        }
      } else if (!hasNoEdge) {
        errorMessage += `This decision node is missing a "no" edge for rejected decisions. Please add a "no" edge.`;
      } else {
        errorMessage += `Decision node has proper edges but workflow engine couldn't process the decision "${decision}". This might be an engine configuration issue.`;
      }
      
      await t.rollback();
      return res.status(400).json({
        status: false,
        message: errorMessage,
        debug: {
          nextNode: { id: nextNode.id, type: nextNode.type, label: nextNode.data?.label },
          availableEdges: decisionEdges.map(e => ({ direction: e.direction || e.label, to: e.destination_node_id })),
          userDecision: decision,
          suggestion: "In the workflow designer, add edges labeled 'yes' and 'no' from this decision node to the appropriate action nodes"
        }
      });
    }

    // 11) Continue with assignment to next action node
    console.log(`??  Continuing to next action node: ${nextNode.id} (${nextNode.data?.label})`);
    
    const nextNodeId = nextNode.id;

    // Get workflow type and assignee info for next node
    const [nd] = await sequelize.query(
      `SELECT wn.action_user_id, wn.json_node, COALESCE(wf.type,'role') AS work_flow_type
       FROM work_flow_nodes wn JOIN work_flows wf ON wn.work_flow_id = wf.id
       WHERE wn.work_flow_id = :wf AND wn.node_id = :node`,
      { replacements: { wf: work_flow_id, node: nextNodeId }, type: sequelize.QueryTypes.SELECT, transaction: t }
    );

    if (!nd) {
      throw new Error(`? Node ${nextNodeId} not found in work_flow_nodes table`);
    }

    // ?? DEBUG: Log the node data we retrieved
    console.log(`?? Node ${nextNodeId} data from DB:`, {
      action_user_id: nd.action_user_id,
      work_flow_type: nd.work_flow_type,
      action_user_id_type: typeof nd.action_user_id,
      action_user_id_raw: JSON.stringify(nd.action_user_id),
      json_node_sample: nd.json_node ? nd.json_node.substring(0, 200) + '...' : null
    });

    // ?? FALLBACK: If action_user_id is empty but json_node has data, try to extract it
    let finalActionUserId = nd.action_user_id;
    if ((!finalActionUserId || finalActionUserId.toString().trim() === '') && nd.json_node) {
      try {
        const jsonData = JSON.parse(nd.json_node);
        if (jsonData.action_user_id) {
          finalActionUserId = jsonData.action_user_id;
          console.log(`?? Extracted action_user_id from json_node: "${finalActionUserId}"`);
        }
      } catch (e) {
        console.warn(`?? Could not parse json_node for node ${nextNodeId}:`, e.message);
      }
    }

    const nextStage = await getMeaningfulStageName(
      nextNode.data, 
      nd, 
      org_code, 
      t
    );

    console.log(`?? Next stage will be: "${nextStage}" (from node: "${nextNode.data?.label}", role: "${nd.action_user_id}")`);

    // Resolve all assignees for the next node
    const assignees = await resolveAssignees({
      work_flow_type: nd.work_flow_type,
      action_user_id: finalActionUserId, // Use the extracted/fallback value
      org_code,
      created_by: done_by,
      originalCreator
    });

    if (!assignees.length) {
      // ?? ENHANCED ERROR MESSAGE: Provide more context
      console.error(`? No assignees found for node ${nextNodeId}:`, {
        work_flow_type: nd.work_flow_type,
        action_user_id: finalActionUserId,
        original_action_user_id: nd.action_user_id,
        org_code,
        done_by,
        originalCreator
      });
      throw new Error(`? No assignees found for node ${nextNodeId}. Check workflow configuration for work_flow_type="${nd.work_flow_type}" and action_user_id="${finalActionUserId}"`);
    }

    // ?? ENHANCED: Check if this assignment would create a "loop back" situation
    if (nd.work_flow_type === 'hierarchy' && finalActionUserId === '1') {
      console.log(`?? WARNING: Workflow is assigning to Level 1. This might indicate:`);
      console.log(`   - The workflow should END here instead of looping back`);
      console.log(`   - Or this should be an Admin level assignment`);
      console.log(`   - Current hierarchy: Creator(${originalCreator}) ? Current action user: Level ${finalActionUserId}`);
      
      // Check if this would assign back to the original creator
    if (originalCreator && assignees.includes(originalCreator)) {
      console.log(`?? LOOP DETECTED: Level 1 assignment goes back to original creator ${originalCreator}`);
      console.log(`?? SUGGESTION: Consider changing this action node to:`);
      console.log(`   - An END node (to resolve the dispute)`);
      console.log(`   - Admin level (action_user_id: "Admin")`);
      console.log(`   - Or Level 4+ to continue escalation`);
    }
    }
    const assignmentPromises = [];
	const historyPromises = [];

	// Determine transition type before creating history entries
	const transitionInfo = await determineTransitionType(currentNodeId, nextNodeId, work_flow_id, t);
	console.log(`?? Transition type: ${transitionInfo.type}, direction: ${transitionInfo.direction}`);

	for (const assignee of assignees) {
	  // Insert into dispute_flow for each assignee (unchanged)
	      assignmentPromises.push(
		sequelize.query(
		  `INSERT INTO dispute_flow (dispute_id, assigned_to, node_id, dispute_stage, created_by, assigned_at, status)
		   VALUES (?, ?, ?, ?, ?, NOW(), true)`,
		  { replacements: [dispute_id, assignee, nextNodeId, nextStage, done_by], transaction: t }
		)
	  );	  // Determine appropriate action based on transition info and decision
	  let actionType = 'transition';
	  
	  if (transitionInfo.type === 'return' && 
		  (decision.toLowerCase() === 'rejected' || decision.toLowerCase() === 'no')) {
		actionType = 'returned_after_rejection';
	  } else if (transitionInfo.type === 'escalation' && 
				(decision.toLowerCase() === 'approved' || decision.toLowerCase() === 'yes')) {
		actionType = 'escalated_after_approval';
	  } else if (transitionInfo.type === 'return' && 
				(decision.toLowerCase() === 'approved' || decision.toLowerCase() === 'yes')) {
		actionType = 'returned_for_completion';
	  }

	  // Insert history record with enhanced action type and decision context
	  historyPromises.push(
		sequelize.query(
		  `INSERT INTO dispute_history (
			dispute_id, done_by, created_by, assigned_to, node_id, 
			action, dispute_stage, node_decision, created_at, status
		  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), true)`,
		  { 
			replacements: [
			  dispute_id, done_by, done_by, assignee, nextNodeId, 
			  actionType, nextStage, decision
			],
			transaction: t 
		  }
		)
	  );
	}

    // Execute all assignments and history entries in parallel
    await Promise.all([...assignmentPromises, ...historyPromises]);

    await t.commit();
    
    // ?? AUDIT LOG: Track dispute workflow progression
    try {
      await logAudit({
        org_code,
        object_type: "disputes",
        object_id: dispute_id,
        action: "UPDATE",
        changed_by: done_by,
        old_values: {
          current_node: currentNodeId,
          current_assignee: done_by
        },
        new_values: {
          next_node: nextNodeId,
          next_assignees: assignees,
          decision: decision,
          next_stage: nextStage
        },
        remarks: `Dispute updated with decision: ${decision}. Assigned to ${assignees.length} user(s): ${assignees.join(', ')} at ${nextStage}. Comments: ${comments || 'None'}`
      });
    } catch (auditErr) {
      console.warn('Audit logging failed for dispute workflow update:', auditErr.message);
    }
    
    // NEW: Get dispute details for notification after transaction commit
    const [disputeDetails] = await sequelize.query(
      `SELECT priority, severity, description FROM disputes WHERE id = :id`,
      { replacements: { id: dispute_id }, type: sequelize.QueryTypes.SELECT }
    );
    
    // Send notifications to new assignees
    if (disputeDetails) {
      sendDisputeNotifications({
        type: 'UPDATE',
        dispute_id,
        org_code,
        assignees,
        created_by: done_by,
        disputeData: {
          ...disputeDetails,
          comments,
          decision
        },
        nextStage,
        sequelize
      }).catch(err => {
        console.error(`Error sending update notifications for dispute #${dispute_id}:`, err);
      });
    }
    
    console.log(`? Successfully assigned dispute to ${assignees.length} users at next node: ${nextNodeId}`);
    
    return res.json({
      status: true,
      nextNode: nextNodeId,
      assigned_to: assignees, // ?? Return all assignees
      assigneeCount: assignees.length,
      nextStage,
      debug: {
        currentNode: { id: currentNodeId, type: currentNodeType },
        nextNode: { id: nextNode.id, type: nextNode.type, label: nextNode.data?.label },
        decision: decision,
        engineLog: log
      }
    });

  } catch (err) {
    await t.rollback();
    console.error("? updateDispute error:", err);
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.createDispute = async (req, res) => {
  const {
    org_code, work_flow_id, template_id, template_type, created_by,
    fields, priority, severity, description, getAmount, dispute_type,
    comments = null, attachments = null,
    licence_type = null, dream_lite_source_data = null, dream_lite_modified_data = null
  } = req.body;

  console.log(`?? Creating dispute with priority: ${priority}, severity: ${severity}, amount: ${getAmount}`);

  if (!org_code || !work_flow_id || !template_id || !template_type ||
      !created_by || priority == null || severity == null || !dispute_type ||
      !description || getAmount == null || !Array.isArray(fields) || !fields.length) {
    return res.status(400).json({ status: false, message: 'Missing required fields including dispute_type' });
  }

  const t = await sequelize.transaction();
  try {
    // 1) Create dispute
    const [[{ id: dispute_id }]] = await sequelize.query(
      `INSERT INTO disputes (org_code, work_flow_id, template_id, template_type,
          created_by, priority, severity, description, dispute_amount, dispute_stage, dispute_type, attachments,
          licence_type, dream_lite_source_data, dream_lite_modified_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'raised', ?, ?, ?, ?, ?) RETURNING id`,
      {
        replacements: [org_code, work_flow_id, template_id, template_type,
          created_by, priority, severity, description, getAmount, dispute_type, attachments,
          licence_type, 
          dream_lite_source_data ? JSON.stringify(dream_lite_source_data) : null,
          dream_lite_modified_data ? JSON.stringify(dream_lite_modified_data) : null],
        type: sequelize.QueryTypes.INSERT, transaction: t
      }
    );

    // 2) Add custom fields
    for (const f of fields) {
      await sequelize.query(
        `INSERT INTO dispute_custom_fields (dispute_id, field_name, field_label, field_type, field_value, is_negative, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        {
          replacements: [dispute_id, f.name, f.label, f.element, f.value, f.is_negative, created_by],
          type: sequelize.QueryTypes.INSERT, transaction: t
        }
      );
    }

    // 3) Load workflow
    const [nodes, edges] = await Promise.all([
      sequelize.query(
        `SELECT * FROM work_flow_nodes WHERE work_flow_id = :wf ORDER BY node_id`,
        { replacements: { wf: work_flow_id }, type: sequelize.QueryTypes.SELECT, transaction: t }
      ),
      sequelize.query(
        `SELECT * FROM work_flow_edges WHERE work_flow_id = :wf ORDER BY source_node_id, destination_node_id`,
        { replacements: { wf: work_flow_id }, type: sequelize.QueryTypes.SELECT, transaction: t }
      )
    ]);

    // ?? PROACTIVE WORKFLOW VALIDATION: Check workflow integrity before processing
    const startNode = nodes.find(n => n.type_node === 'start');
    const actionNodes = nodes.filter(n => n.type_node === 'action');
    
    if (!startNode) {
      await t.rollback();
      return res.status(400).json({ 
        status: false, 
        message: "This workflow is missing a start point and cannot process disputes. Please contact your administrator to fix the workflow configuration.",
        error_type: "MISSING_START_NODE",
        workflow_id: work_flow_id
      });
    }
    
    if (actionNodes.length === 0) {
      await t.rollback();
      return res.status(400).json({ 
        status: false, 
        message: "This workflow has no approval steps configured and cannot process disputes. Please contact your administrator to add approval steps to the workflow.",
        error_type: "NO_ACTION_NODES",
        workflow_id: work_flow_id
      });
    }
    
    // Check if START node has any outgoing connections
    const startNodeEdges = edges.filter(e => e.source_node_id === startNode.node_id);
    if (startNodeEdges.length === 0) {
      console.warn(`?? Workflow ${work_flow_id} has disconnected START node - will use fallback assignment`);
    }

    // 4) Run the engine from start - NO currentNodeId so it will stop at first action node
    const payload = { 
      priority, 
      severity, 
      amount: getAmount, 
      action: 'process' 
      // ?? KEY: No currentNodeId = createDispute mode = stops at first action
    };
    
    console.log(`?? DEBUG: Available workflow nodes:`, nodes.map(n => ({ id: n.node_id, type: n.type_node, label: n.json_node ? JSON.parse(n.json_node).label : 'No label' })));
    console.log(`?? DEBUG: Available workflow edges:`, edges.map(e => ({ 
      from: e.source_node_id, 
      to: e.destination_node_id, 
      direction: e.direction || e.label,
      label: e.label 
    })));
    
    console.log(`?? Running workflow engine from START node (will stop at first action)...`);
    const { nextNode: engineNextNode, log } = await runWorkflowEngine({ nodes, edges }, payload);

    console.log(`?? ENGINE EXECUTION LOG:`, log);

    if (!engineNextNode) {
      throw new Error('? Engine did not return a node');
    }

    console.log(`?? ENGINE RESULT: Stopped at node ${engineNextNode.id} (type: ${engineNextNode.type}, label: ${engineNextNode.data?.label})`);

    // Use a mutable variable for the final next node
    let nextNode = engineNextNode;
    // 5) Check if it's an end node (shouldn't happen with fixed engine)
    const isEndNode = nextNode.type === 'end' || nextNode.data?.is_end === true;
    
    if (isEndNode) {
      console.log(`?? WARNING: Engine stopped at end node on creation - this suggests workflow has no action nodes`);
      await sequelize.query(
        `UPDATE disputes SET dispute_stage = 'resolved', updated_at = NOW(), updated_by = :by WHERE id = :id`,
        { replacements: { by: created_by, id: dispute_id }, transaction: t }
      );
      await t.commit();
      return res.status(201).json({ 
        status: true, 
        dispute_id, 
        assigned_to: null, 
        isComplete: true,
        warning: "No action nodes in workflow - resolved immediately"
      });
    }

    // ?? ENHANCED: Handle case where engine stops at START node due to missing edges
    if (nextNode.type === 'start') {
      console.error(`? Workflow Error: Engine could not move past START node`);
      console.error(`   This indicates the workflow (ID: ${work_flow_id}) has no outgoing edges from START node`);
      console.error(`   Available nodes:`, nodes.map(n => ({ id: n.node_id, type: n.type_node })));
      console.error(`   Available edges:`, edges.map(e => ({ from: e.source_node_id, to: e.destination_node_id, direction: e.direction })));
      
      // ?? FALLBACK: Try to assign to the first available action node
      const firstActionNode = nodes.find(n => n.type_node === 'action');
      if (firstActionNode) {
        console.log(`?? FALLBACK: Assigning to first available action node: ${firstActionNode.node_id}`);
        
        // Use the first action node as if the engine found it
        const fallbackNextNode = {
          id: firstActionNode.node_id,
          type: 'action',
          data: firstActionNode.json_node ? JSON.parse(firstActionNode.json_node) : { label: 'Action Node' }
        };
        
        // Continue with assignment logic using the fallback node
        nextNode = fallbackNextNode;
      } else {
        // ?? USER-FRIENDLY ERROR: Return a helpful message instead of technical error
        await t.rollback();
        return res.status(400).json({ 
          status: false, 
          message: "The selected workflow is incomplete and cannot process disputes. Please contact your administrator to review and fix the workflow configuration, or select a different workflow.",
          error_type: "INCOMPLETE_WORKFLOW",
          workflow_id: work_flow_id,
          suggestion: "Try selecting a different workflow or contact support to fix this workflow design."
        });
      }
    }

    // 6) This should now be an action node - assign it
    if (nextNode.type !== 'action') {
      throw new Error(`Expected action node but got ${nextNode.type}. Check workflow design.`);
    }

    console.log(`? Correctly stopped at action node: ${nextNode.id} (${nextNode.data?.label})`);
    
    const nextNodeId = nextNode.id;

   // 7) Get assignment info
    const [nd] = await sequelize.query(
      `SELECT wn.action_user_id, wn.json_node, COALESCE(wf.type,'role') AS work_flow_type
       FROM work_flow_nodes wn JOIN work_flows wf ON wn.work_flow_id = wf.id
       WHERE wn.work_flow_id = :wf AND wn.node_id = :node`,
      { replacements: { wf: work_flow_id, node: nextNodeId }, type: sequelize.QueryTypes.SELECT, transaction: t }
    );

    if (!nd) {
      throw new Error(`? Node ${nextNodeId} not found in work_flow_nodes table`);
    }

    // ?? FALLBACK: If action_user_id is empty but json_node has data, try to extract it
    let finalActionUserId = nd.action_user_id;
    if ((!finalActionUserId || finalActionUserId.toString().trim() === '') && nd.json_node) {
      try {
        const jsonData = JSON.parse(nd.json_node);
        if (jsonData.action_user_id) {
          finalActionUserId = jsonData.action_user_id;
          console.log(`?? CreateDispute: Extracted action_user_id from json_node: "${finalActionUserId}"`);
        }
      } catch (e) {
        console.warn(`?? CreateDispute: Could not parse json_node for node ${nextNodeId}:`, e.message);
      }
    }

    const nextStage = await getMeaningfulStageName(
      nextNode.data, 
      nd, 
      org_code, 
      t
    );

    console.log(`?? Setting initial stage as: "${nextStage}" (from node: "${nextNode.data?.label}", role: "${nd.action_user_id}")`);

    let assignees = await resolveAssignees({
      work_flow_type: nd.work_flow_type,
      action_user_id: finalActionUserId, // Use the extracted/fallback value
      org_code,
      created_by,
      originalCreator: created_by // In createDispute, the creator IS the original creator
    });

    if (!assignees.length) {
      console.warn(`?? No assignees found for node ${nextNodeId}, using fallback assignment to creator`);
      // Fallback: assign to dispute creator
      assignees = [created_by];
    }

    console.log(`?? Found ${assignees.length} assignee(s): ${assignees.join(', ')}`);

    // ?? SMART WORKFLOW POSITIONING: Check if creator should skip levels or start elsewhere
    const smartPosition = await findSmartWorkflowPosition({
      created_by,
      workflow_nodes: nodes,
      workflow_edges: edges,
      org_code,
      current_node_id: nextNodeId,
      template_id
    });

    console.log(`?? Smart Workflow Analysis:`, smartPosition);

    if (smartPosition.shouldSkip) {
      console.log(`?? SMART SKIP: Moving dispute to appropriate level based on creator's position`);
      
      // Use the smart positioning to determine the right starting point
      const smartNodeId = smartPosition.targetNode.node_id;
      
      // Get assignment info for the smart target node
      const [smartNd] = await sequelize.query(
        `SELECT wn.action_user_id, wn.json_node, COALESCE(wf.type,'role') AS work_flow_type
         FROM work_flow_nodes wn JOIN work_flows wf ON wn.work_flow_id = wf.id
         WHERE wn.work_flow_id = :wf AND wn.node_id = :node`,
        { 
          replacements: { wf: work_flow_id, node: smartNodeId }, 
          type: sequelize.QueryTypes.SELECT, 
          transaction: t 
        }
      );
      
      if (smartNd) {
        let smartActionUserId = smartNd.action_user_id;
        if ((!smartActionUserId || smartActionUserId.toString().trim() === '') && smartNd.json_node) {
          try {
            const jsonData = JSON.parse(smartNd.json_node);
            if (jsonData.action_user_id) {
              smartActionUserId = jsonData.action_user_id;
            }
          } catch (e) {
            console.warn(`?? Smart positioning: Could not parse json_node for smart node ${smartNodeId}:`, e.message);
          }
        }
        
        const smartAssignees = await resolveAssignees({
          work_flow_type: smartNd.work_flow_type,
          action_user_id: smartActionUserId,
          org_code,
          created_by,
          originalCreator: created_by
        });
        
        const smartStage = await getMeaningfulStageName(
          smartPosition.targetNode.data || {},
          smartNd,
          org_code,
          t
        );
        
        console.log(`?? SMART POSITIONING: Assigning to ${smartAssignees.join(', ')} at smart node ${smartNodeId}`);
        
        // Record the smart positioning in history
        await sequelize.query(
          `INSERT INTO dispute_history(dispute_id, done_by, created_by, assigned_to, node_id, action, dispute_stage, created_at, status, node_decision, comments)
           VALUES(?, ?, ?, ?, ?, 'smart_positioned', ?, NOW(), true, 'smart_skip', ?)`,
          { 
            replacements: [
              dispute_id, created_by, created_by, created_by, 
              nextNodeId, nextStage, smartPosition.reason
            ], 
            transaction: t 
          }
        );
        
        // Assign to the smart node
        const assignmentPromises = [];
        const historyPromises = [];
        
        for (const assignee of smartAssignees) {
          assignmentPromises.push(
            sequelize.query(
              `INSERT INTO dispute_flow(dispute_id, assigned_to, node_id, dispute_stage, created_by, assigned_at)
               VALUES(?, ?, ?, ?, ?, NOW())`,
              { 
                replacements: [dispute_id, assignee, smartNodeId, smartStage, created_by], 
                transaction: t 
              }
            )
          );

          historyPromises.push(
            sequelize.query(
              `INSERT INTO dispute_history(dispute_id, done_by, created_by, assigned_to, node_id, action, dispute_stage, created_at, status)
               VALUES(?, ?, ?, ?, ?, 'created', ?, NOW(), true)`,
              { 
                replacements: [dispute_id, created_by, created_by, assignee, smartNodeId, smartStage], 
                transaction: t 
              }
            )
          );
        }
        
        await Promise.all([...assignmentPromises, ...historyPromises]);
        await t.commit();
        
        console.log(`? Successfully created dispute ${dispute_id} with smart positioning and assigned to ${smartAssignees.length} users: ${smartAssignees.join(', ')} at smart node ${smartNodeId}`);
        
        return res.status(201).json({ 
          status: true, 
          dispute_id, 
          assigned_to: smartAssignees,
          assignee_count: smartAssignees.length,
          nextStage: smartStage,
          smart_positioned: true,
          positioning_reason: smartPosition.reason,
          debug: {
            stoppedAtNode: smartNodeId,
            nodeType: 'action',
            engineLog: log,
            smartPositioning: smartPosition,
            originalNode: nextNodeId
          }
        });
      }
    }

    // ?? AUTO-APPROVAL LOGIC: Check if dispute creator is assigned to first action node
    const shouldAutoApprove = assignees.includes(created_by);
    
    if (shouldAutoApprove) {
      console.log(`?? AUTO-APPROVAL: Dispute creator ${created_by} is assigned to first action node. Auto-approving and moving to next step.`);
      
      // Get outgoing edges from current node to find next step
      const outgoingEdges = edges.filter(e => e.source_node_id === nextNodeId);
      const forwardEdge = outgoingEdges.find(e => 
        (e.direction || e.label || '').toLowerCase() === 'forward'
      );
      
      if (forwardEdge) {
        // Run workflow engine with auto-approval to get the next assignee
        const autoApprovalPayload = {
          currentNodeId: String(nextNodeId),
          decision: 'forward',
          action: 'process'
        };
        
        const { nextNode: autoNextNode, log: autoLog } = await runWorkflowEngine({ nodes, edges }, autoApprovalPayload);
        
        console.log(`?? AUTO-APPROVAL ENGINE LOG:`, autoLog);
        
        if (autoNextNode && autoNextNode.type === 'action') {
          // Get the next node's assignment info
          const [nextNd] = await sequelize.query(
            `SELECT wn.action_user_id, wn.json_node, COALESCE(wf.type,'role') AS work_flow_type
             FROM work_flow_nodes wn JOIN work_flows wf ON wn.work_flow_id = wf.id
             WHERE wn.work_flow_id = :wf AND wn.node_id = :node`,
            { 
              replacements: { wf: work_flow_id, node: autoNextNode.id }, 
              type: sequelize.QueryTypes.SELECT, 
              transaction: t 
            }
          );
          
          if (nextNd) {
            let nextFinalActionUserId = nextNd.action_user_id;
            if ((!nextFinalActionUserId || nextFinalActionUserId.toString().trim() === '') && nextNd.json_node) {
              try {
                const jsonData = JSON.parse(nextNd.json_node);
                if (jsonData.action_user_id) {
                  nextFinalActionUserId = jsonData.action_user_id;
                }
              } catch (e) {
                console.warn(`?? Auto-approval: Could not parse json_node for next node ${autoNextNode.id}:`, e.message);
              }
            }
            
            const nextAssignees = await resolveAssignees({
              work_flow_type: nextNd.work_flow_type,
              action_user_id: nextFinalActionUserId,
              org_code,
              created_by,
              originalCreator: created_by
            });
            
            const nextNextStage = await getMeaningfulStageName(
              autoNextNode.data, 
              nextNd, 
              org_code, 
              t
            );
            
            console.log(`?? AUTO-APPROVAL: Moving to next node ${autoNextNode.id}, assigning to: ${nextAssignees.join(', ')}`);
            
            // Record the auto-approval in history for the original node
            await sequelize.query(
              `INSERT INTO dispute_history(dispute_id, done_by, created_by, assigned_to, node_id, action, dispute_stage, created_at, status, updated_at, updated_by, node_decision, comments)
               VALUES(?, ?, ?, ?, ?, 'auto_approved', ?, NOW(), true, NOW(), ?, 'forward', 'Auto-approved by dispute creator')`,
              { 
                replacements: [dispute_id, created_by, created_by, created_by, nextNodeId, nextStage, created_by], 
                transaction: t 
              }
            );
            
            // Assign to the next node instead
            const assignmentPromises = [];
            const historyPromises = [];
            
            for (const assignee of nextAssignees) {
              assignmentPromises.push(
                sequelize.query(
                  `INSERT INTO dispute_flow(dispute_id, assigned_to, node_id, dispute_stage, created_by, assigned_at)
                   VALUES(?, ?, ?, ?, ?, NOW())`,
                  { 
                    replacements: [dispute_id, assignee, autoNextNode.id, nextNextStage, created_by], 
                    transaction: t 
                  }
                )
              );

              historyPromises.push(
                sequelize.query(
                  `INSERT INTO dispute_history(dispute_id, done_by, created_by, assigned_to, node_id, action, dispute_stage, created_at, status)
                   VALUES(?, ?, ?, ?, ?, 'created', ?, NOW(), true)`,
                  { 
                    replacements: [dispute_id, created_by, created_by, assignee, autoNextNode.id, nextNextStage], 
                    transaction: t 
                  }
                )
              );
            }
            
            await Promise.all([...assignmentPromises, ...historyPromises]);
            await t.commit();
            
            const disputeData = {
              priority,
              severity,
              description,
              comments
            };
            
            // Audit log for auto-approved dispute
            try {
              await logAudit({
                org_code,
                object_type: "disputes",
                object_id: dispute_id,
                action: "CREATE_AUTO_APPROVED",
                changed_by: created_by,
                old_values: null,
                new_values: {
                  dispute_id,
                  work_flow_id,
                  template_id,
                  template_type,
                  dispute_type,
                  priority,
                  severity,
                  description,
                  dispute_amount: getAmount,
                  created_by,
                  assignees: nextAssignees,
                  nextStage: nextNextStage,
                  licence_type,
                  dream_lite_source_data: dream_lite_source_data ? JSON.stringify(dream_lite_source_data) : null,
                  dream_lite_modified_data: dream_lite_modified_data ? JSON.stringify(dream_lite_modified_data) : null
                },
                remarks: `Dispute created with auto-approval and assigned to ${nextAssignees.length} user(s): ${nextAssignees.join(', ')}`
              });
            } catch (auditErr) {
              console.warn('Audit logging failed for auto-approved dispute creation:', auditErr.message);
            }
            
            sendDisputeNotifications({
              type: 'CREATE',
              dispute_id,
              org_code,
              assignees: nextAssignees,
              created_by,
              disputeData,
              nextStage: nextNextStage,
              sequelize
            }).catch(err => {
              console.error(`Error sending notifications for dispute #${dispute_id}:`, err);
            });
            
            console.log(`? Successfully created dispute ${dispute_id} with auto-approval and assigned to ${nextAssignees.length} users: ${nextAssignees.join(', ')} at node ${autoNextNode.id}`);
            
            return res.status(201).json({ 
              status: true, 
              dispute_id, 
              assigned_to: nextAssignees,
              assignee_count: nextAssignees.length,
              nextStage: nextNextStage,
              auto_approved: true,
              debug: {
                stoppedAtNode: autoNextNode.id,
                nodeType: autoNextNode.type,
                engineLog: log,
                autoApprovalLog: autoLog,
                skippedNode: nextNodeId
              }
            });
          }
        } else if (autoNextNode && (autoNextNode.type === 'end' || autoNextNode.data?.is_end === true)) {
          // Auto-approval led directly to resolution
          await sequelize.query(
            `UPDATE disputes SET dispute_stage = 'resolved', updated_at = NOW(), updated_by = :by WHERE id = :id`,
            { replacements: { by: created_by, id: dispute_id }, transaction: t }
          );
          
          await sequelize.query(
            `INSERT INTO dispute_history(dispute_id, done_by, created_by, assigned_to, node_id, action, dispute_stage, created_at, status, updated_at, updated_by, node_decision, comments)
             VALUES(?, ?, ?, ?, ?, 'auto_resolved', 'resolved', NOW(), true, NOW(), ?, 'forward', 'Auto-approved and resolved by dispute creator')`,
            { 
              replacements: [dispute_id, created_by, created_by, created_by, nextNodeId, created_by], 
              transaction: t 
            }
          );
          
          await t.commit();
          
          return res.status(201).json({ 
            status: true, 
            dispute_id, 
            assigned_to: null, 
            isComplete: true,
            auto_approved: true,
            auto_resolved: true,
            debug: {
              stoppedAtNode: autoNextNode.id,
              nodeType: autoNextNode.type,
              engineLog: log,
              autoApprovalLog: autoLog
            }
          });
        }
      }
      
      // Fallback: if auto-approval logic fails, continue with normal assignment but log the attempt
      console.warn(`?? AUTO-APPROVAL: Failed to auto-approve, falling back to normal assignment`);
    }

    // 8) Normal assignment logic (when no auto-approval needed or as fallback)
    const assignmentPromises = [];
    const historyPromises = [];
    
    for (const assignee of assignees) {
      // Insert into dispute_flow for each assignee
      assignmentPromises.push(
        sequelize.query(
          `INSERT INTO dispute_flow(dispute_id, assigned_to, node_id, dispute_stage, created_by, assigned_at)
           VALUES(?, ?, ?, ?, ?, NOW())`,
          { replacements: [dispute_id, assignee, nextNodeId, nextStage, created_by], transaction: t }
        )
      );

      // Insert into dispute_history for each assignee
      historyPromises.push(
        sequelize.query(
          `INSERT INTO dispute_history(dispute_id, done_by, created_by, assigned_to, node_id, action, dispute_stage, created_at, status)
           VALUES(?, ?, ?, ?, ?, 'created', ?, NOW(), true)`,
          { replacements: [dispute_id, created_by, created_by, assignee, nextNodeId, nextStage], transaction: t }
        )
      );
    }

    // Execute all assignments and history entries in parallel
    await Promise.all([...assignmentPromises, ...historyPromises]);

    await t.commit();
        const disputeData = {
      priority,
      severity,
      description,
      comments
    };
    
    // ?? AUDIT LOG: Track dispute creation
    try {
      await logAudit({
        org_code,
        object_type: "disputes",
        object_id: dispute_id,
        action: "CREATE",
        changed_by: created_by,
        old_values: null,
        new_values: {
          dispute_id,
          work_flow_id,
          template_id,
          template_type,
          dispute_type,
          priority,
          severity,
          description,
          dispute_amount: getAmount,
          created_by,
          assignees,
          nextStage,
          licence_type,
          dream_lite_source_data: dream_lite_source_data ? JSON.stringify(dream_lite_source_data) : null,
          dream_lite_modified_data: dream_lite_modified_data ? JSON.stringify(dream_lite_modified_data) : null
        },
        remarks: `Dispute created and assigned to ${assignees.length} user(s): ${assignees.join(', ')}`
      });
    } catch (auditErr) {
      console.warn('Audit logging failed for dispute creation:', auditErr.message);
    }
    
    // Send notifications asynchronously
    sendDisputeNotifications({
      type: 'CREATE',
      dispute_id,
      org_code,
      assignees,
      created_by,
      disputeData,
      nextStage,
      sequelize
    }).catch(err => {
      console.error(`Error sending notifications for dispute #${dispute_id}:`, err);
    });

    console.log(`? Successfully created dispute ${dispute_id} and assigned to ${assignees.length} users: ${assignees.join(', ')} at action node ${nextNodeId}`);

    return res.status(201).json({ 
      status: true, 
      dispute_id, 
      assigned_to: assignees, // ?? Return all assignees, not just the first one
      assignee_count: assignees.length,
      nextStage,
      auto_approved: false,
      smart_positioned: false,
      debug: {
        stoppedAtNode: nextNodeId,
        nodeType: nextNode.type,
        engineLog: log
      }
    });

  } catch (err) {
    await t.rollback();
    console.error('? createDispute error:', err);
    return res.status(500).json({ status: false, message: err.message });
  }
};

async function resolveAssignees({ work_flow_type, action_user_id, org_code, created_by, originalCreator = null }) {
  console.log(`?? RESOLVE ASSIGNEES: type=${work_flow_type}, action_user_id=${action_user_id}, org_code=${org_code}, created_by=${created_by}, originalCreator=${originalCreator}`);
  
  switch (work_flow_type) {
    case 'role': {
      const users = await sequelize.query(
        `SELECT emp_id AS user_id FROM users WHERE role=:role AND org_code=:org AND status = true`,
        {
          replacements: { role: action_user_id, org: org_code },
          type: sequelize.QueryTypes.SELECT
        }
      );
      return users.map(u => u.user_id);
    }
    case 'user':
      return [action_user_id];
    case 'hierarchy': {
  console.log(`?? Processing hierarchy assignment for level: "${action_user_id}" (type: ${typeof action_user_id}), created_by: ${created_by}`);
  
  // ?? VALIDATE INPUT: Check if action_user_id is valid
  if (!action_user_id || action_user_id.toString().trim() === '') {
    console.error(`? ERROR: action_user_id is empty or undefined:`, { 
      action_user_id, 
      type: typeof action_user_id, 
      work_flow_type, 
      created_by 
    });
    throw new Error(`Invalid hierarchy assignment: action_user_id is empty. Expected a level number or 'Admin'.`);
  }
  
  // Special handling for Admin level
  if (action_user_id === 'Admin') {
    const adminUsers = await sequelize.query(
      `SELECT emp_id AS user_id 
       FROM users 
       WHERE reporting_to IS NULL 
         AND org_code = :org_code 
         AND status = true`,
      {
        replacements: { org_code },
        type: sequelize.QueryTypes.SELECT
      }
    );
    console.log(`?? Found ${adminUsers.length} admin users:`, adminUsers.map(u => u.user_id));
    return adminUsers.map(u => u.user_id);
  }
  
  // ?? DYNAMIC HIERARCHY ASSIGNMENT - No hardcoding!
  const workflowLevel = parseInt(action_user_id.toString().trim(), 10);
  if (isNaN(workflowLevel) || workflowLevel < 1) {
    console.error(`? ERROR: Invalid hierarchy level:`, { 
      action_user_id, 
      parsed: workflowLevel, 
      work_flow_type, 
      created_by 
    });
    throw new Error(`Invalid hierarchy level: "${action_user_id}". Expected a positive integer or 'Admin'.`);
  }
  
  // ?? Use original dispute creator for hierarchy calculation if available
  const hierarchyBase = originalCreator || created_by;
  console.log(`?? Finding assignee for hierarchy base: ${hierarchyBase} at workflow level ${workflowLevel}`);
  
  // Get hierarchy base user info
  const [baseUserInfo] = await sequelize.query(
    `SELECT emp_id, reporting_to, first_name, last_name 
     FROM users 
     WHERE emp_id = :user_id AND org_code = :org_code AND status = true`,
    {
      replacements: { user_id: hierarchyBase, org_code },
      type: sequelize.QueryTypes.SELECT
    }
  );
  
  if (!baseUserInfo) {
    throw new Error(`Hierarchy base user ${hierarchyBase} not found`);
  }
  
  console.log(`?? Base user info:`, {
    emp_id: baseUserInfo.emp_id,
    reporting_to: baseUserInfo.reporting_to,
    name: `${baseUserInfo.first_name} ${baseUserInfo.last_name}`
  });
  
  let assignees = [];
  
  // ?? DYNAMIC LEVEL ASSIGNMENT:
  // Level N = Walk up N-1 steps from the base user
  // Level 1 = base user (0 steps up)
  // Level 2 = base user's manager (1 step up) 
  // Level 3 = manager's manager (2 steps up)
  // etc.
  
  if (workflowLevel === 1) {
    // Level 1 = assign to base user (original creator or current assignee)
    assignees = [hierarchyBase];
    console.log(`? Level 1 assignment: Back to base user ${hierarchyBase}`);
  } else {
    // Level 2+ = Walk up the management chain from base user
    let currentUserId = hierarchyBase;
    let stepsToTake = workflowLevel - 1; // Steps needed to reach target level
    
    console.log(`?? Need to walk up ${stepsToTake} steps from ${hierarchyBase} to reach level ${workflowLevel}`);
    
    for (let step = 1; step <= stepsToTake; step++) {
      const [userInfo] = await sequelize.query(
        `SELECT reporting_to, first_name, last_name FROM users 
         WHERE emp_id = :user_id AND org_code = :org_code AND status = true`,
        {
          replacements: { user_id: currentUserId, org_code },
          type: sequelize.QueryTypes.SELECT
        }
      );
      
      if (!userInfo?.reporting_to) {
        console.log(`?? No manager found for user ${currentUserId} at step ${step}/${stepsToTake}`);
        console.log(`?? Cannot reach level ${workflowLevel} - organization hierarchy is not deep enough`);
        break;
      }
      
      currentUserId = userInfo.reporting_to;
      console.log(`?? Step ${step}/${stepsToTake}: Moving up to ${currentUserId} (${userInfo.first_name} ${userInfo.last_name})`);
      
      if (step === stepsToTake) {
        // We've reached the target level
        assignees = [currentUserId];
        console.log(`? Level ${workflowLevel} assignment: ${currentUserId}`);
        break;
      }
    }
  }
  
  // Fallback logic if we couldn't find anyone at the exact level
  if (assignees.length === 0) {
    console.warn(`?? No assignees found at level ${workflowLevel}, using fallback...`);
    
    if (baseUserInfo.reporting_to) {
      assignees = [baseUserInfo.reporting_to];
      console.log(`?? Fallback: Using base user's direct manager: ${baseUserInfo.reporting_to}`);
    } else {
      // Ultimate fallback: any admin user
      const [adminFallback] = await sequelize.query(
        `SELECT emp_id FROM users 
         WHERE reporting_to IS NULL AND org_code = :org_code AND status = true 
         LIMIT 1`,
        { replacements: { org_code }, type: sequelize.QueryTypes.SELECT }
      );
      if (adminFallback) {
        assignees = [adminFallback.emp_id];
        console.log(`?? Ultimate fallback: Using admin: ${adminFallback.emp_id}`);
      }
    }
  }
  
  console.log(`? Final hierarchy assignees: ${assignees.join(', ')}`);
  return assignees;
}
    case 'smartrouting': {
      console.log(`?? Processing smart routing assignment for region/department/role: "${action_user_id}", org_code: ${org_code}`);
      
      // Smart routing can be region, department, or role-based
      // action_user_id contains the specific region/department/role value
      if (!action_user_id || action_user_id.toString().trim() === '') {
        throw new Error('Smart routing requires a valid region, department, or role value');
      }
      
      const routingValue = action_user_id.toString().trim();
      
      // Try to find users by region first
      let smartUsers = await sequelize.query(
        `SELECT emp_id AS user_id FROM users 
         WHERE region = :routing_value AND org_code = :org_code AND status = true`,
        {
          replacements: { routing_value: routingValue, org_code },
          type: sequelize.QueryTypes.SELECT
        }
      );
      
      // If no users found by region, try department
      if (smartUsers.length === 0) {
        smartUsers = await sequelize.query(
          `SELECT emp_id AS user_id FROM users 
           WHERE department = :routing_value AND org_code = :org_code AND status = true`,
          {
            replacements: { routing_value: routingValue, org_code },
            type: sequelize.QueryTypes.SELECT
          }
        );
      }
      
      // If no users found by department, try sub_region
      if (smartUsers.length === 0) {
        smartUsers = await sequelize.query(
          `SELECT emp_id AS user_id FROM users 
           WHERE sub_region = :routing_value AND org_code = :org_code AND status = true`,
          {
            replacements: { routing_value: routingValue, org_code },
            type: sequelize.QueryTypes.SELECT
          }
        );
      }
      
      // If still no users found, try as role
      if (smartUsers.length === 0) {
        smartUsers = await sequelize.query(
          `SELECT emp_id AS user_id FROM users 
           WHERE role = :routing_value AND org_code = :org_code AND status = true`,
          {
            replacements: { routing_value: routingValue, org_code },
            type: sequelize.QueryTypes.SELECT
          }
        );
      }
      
      if (smartUsers.length === 0) {
        console.warn(`?? No users found for smart routing value: ${routingValue}`);
        // Fallback to admin users
        smartUsers = await sequelize.query(
          `SELECT emp_id AS user_id FROM users 
           WHERE reporting_to IS NULL AND org_code = :org_code AND status = true
           LIMIT 1`,
          {
            replacements: { org_code },
            type: sequelize.QueryTypes.SELECT
          }
        );
      }
      
      const assigneeList = smartUsers.map(u => u.user_id);
      console.log(`? Smart routing found ${assigneeList.length} assignees: ${assigneeList.join(', ')}`);
      return assigneeList;
    }
    default:
      throw new Error(`Unknown routing type "${work_flow_type}"`);
  }
}

// Smart Workflow Positioning Function
async function findSmartWorkflowPosition({
  created_by,
  workflow_nodes,
  workflow_edges,
  org_code,
  current_node_id,
  template_id
}) {
  try {
    console.log(`?? Analyzing smart workflow position for creator: ${created_by}`);
    console.log(`?? Workflow nodes:`, workflow_nodes.map(n => ({ 
      id: n.node_id, 
      type: n.type_node, 
      assignee: n.action_user_id 
    })));
    
    // 1. Find all action nodes and sort them by proper workflow sequence
    let actionNodes = workflow_nodes.filter(n => n.type_node === 'action');
    
    // Better sorting: Use source_sl_no if available, otherwise try to determine sequence from edges
    actionNodes.sort((a, b) => {
      // Primary sort: source_sl_no (sequence number)
      if (a.source_sl_no && b.source_sl_no) {
        return a.source_sl_no - b.source_sl_no;
      }
      
      // Fallback: Try to order based on workflow edges or creation order
      // For now, use the node creation order as a reasonable proxy
      const aTime = new Date(a.created_at || 0).getTime();
      const bTime = new Date(b.created_at || 0).getTime();
      return aTime - bTime;
    });
    
    console.log(`?? Action nodes in proper workflow sequence:`, actionNodes.map((n, idx) => ({ 
      sequence: idx,
      id: n.node_id, 
      assignee: n.action_user_id,
      source_sl_no: n.source_sl_no,
      label: n.label || n.name
    })));
    
    // 2. Check if creator is directly assigned to any action node
    const creatorNodeIndex = actionNodes.findIndex(node => 
      node.action_user_id === created_by ||
      (node.json_node && node.json_node.includes(created_by))
    );
    
    if (creatorNodeIndex !== -1) {
      const creatorNode = actionNodes[creatorNodeIndex];
      console.log(`?? Creator ${created_by} found in workflow at sequence position: ${creatorNodeIndex}, node: ${creatorNode.node_id}, label: ${creatorNode.label || creatorNode.name}`);
      
      // If creator is found in workflow, skip to the NEXT level after their position
      const nextNodeIndex = creatorNodeIndex + 1;
      
      if (nextNodeIndex < actionNodes.length) {
        const targetNode = actionNodes[nextNodeIndex];
        console.log(`?? Smart skip: Moving to next level after creator's position: ${targetNode.node_id}`);
        
        return {
          shouldSkip: true,
          targetNode: targetNode,
          reason: `Creator ${created_by} is assigned to workflow node ${creatorNode.node_id}. Auto-approving their level and moving to next: ${targetNode.action_user_id}`,
          skipType: 'creator_level_skip',
          skippedLevels: creatorNodeIndex + 1, // Skip all levels up to and including creator's level
          creatorNodeId: creatorNode.node_id
        };
      } else {
        // Creator is at the last level - should auto-resolve or escalate
        console.log(`?? Creator is at final approval level - should auto-resolve`);
        return {
          shouldSkip: true,
          targetNode: null, // Will trigger auto-resolution
          reason: `Creator ${created_by} is at the final approval level. Auto-resolving dispute.`,
          skipType: 'auto_resolve',
          skippedLevels: actionNodes.length,
          creatorNodeId: creatorNode.node_id
        };
      }
    }
    
    // 3. Check if creator's manager is in workflow (hierarchy analysis)
    const [creatorInfo] = await sequelize.query(
      `SELECT reporting_to, first_name, last_name FROM users 
       WHERE emp_id = :emp_id AND org_code = :org_code AND status = true`,
      { 
        replacements: { emp_id: created_by, org_code },
        type: sequelize.QueryTypes.SELECT 
      }
    );
    
    if (creatorInfo?.reporting_to) {
      console.log(`?? Creator reports to: ${creatorInfo.reporting_to}`);
      
      const managerNodeIndex = actionNodes.findIndex(node => 
        node.action_user_id === creatorInfo.reporting_to ||
        (node.json_node && node.json_node.includes(creatorInfo.reporting_to))
      );
      
      if (managerNodeIndex !== -1) {
        const managerNode = actionNodes[managerNodeIndex];
        console.log(`?? Creator's manager found in workflow at node: ${managerNode.node_id} (index: ${managerNodeIndex})`);
        
        // Start from manager's level since creator reports to them
        return {
          shouldSkip: true,
          targetNode: managerNode,
          reason: `Creator ${created_by} reports to ${creatorInfo.reporting_to} who is in workflow. Starting from manager level.`,
          skipType: 'manager_level_start',
          skippedLevels: managerNodeIndex,
          managerNodeId: managerNode.node_id
        };
      }
      
      // 4. Walk up hierarchy to find workflow participant
      let currentUser = creatorInfo.reporting_to;
      let depth = 1;
      
      while (currentUser && depth <= 5) {
        const hierarchyNodeIndex = actionNodes.findIndex(node => 
          node.action_user_id === currentUser ||
          (node.json_node && node.json_node.includes(currentUser))
        );
        
        if (hierarchyNodeIndex !== -1) {
          const hierarchyNode = actionNodes[hierarchyNodeIndex];
          console.log(`?? Found workflow participant ${currentUser} at hierarchy depth ${depth}, node index ${hierarchyNodeIndex}`);
          
          // If creator's hierarchy suggests starting at different point
          if (depth <= 3) { // Creator is reasonably close to workflow participant
            return {
              shouldSkip: true,
              targetNode: hierarchyNode,
              reason: `Creator reports through hierarchy to workflow participant ${currentUser}. Starting from appropriate level.`,
              skipType: 'hierarchy_based',
              skippedLevels: hierarchyNodeIndex,
              hierarchyDepth: depth
            };
          }
          break;
        }
        
        const [nextLevel] = await sequelize.query(
          `SELECT reporting_to FROM users WHERE emp_id = :emp_id AND org_code = :org_code`,
          { 
            replacements: { emp_id: currentUser, org_code },
            type: sequelize.QueryTypes.SELECT 
          }
        );
        
        currentUser = nextLevel?.reporting_to;
        depth++;
      }
    }
    
    // 5. No smart positioning needed - use normal flow
    console.log(`?? No smart positioning applicable - using normal workflow flow`);
    return {
      shouldSkip: false,
      reason: 'Creator not found in workflow hierarchy - using normal workflow flow',
      skipType: 'none'
    };
    
  } catch (error) {
    console.error(`?? Error in smart workflow positioning:`, error);
    return {
      shouldSkip: false,
      reason: 'Error in analysis - falling back to normal flow',
      skipType: 'error',
      error: error.message
    };
  }
}


exports.createDreamLiteDispute = async (req, res) => {
  const {
    org_code,
    description,
    work_flow_id,
    template_id,
    dispute_type,
    licence_type,
    priority,
    severity,
    trusted_site_url,
    screen_name,
    table_column_header,
    table_column_data,
    dream_lite_source_data,
    remarks,
    created_by
  } = req.body;

  // Convert "unknown" strings to null and ensure integers
  const processedWorkFlowId = work_flow_id === "unknown" ? null : parseInt(work_flow_id);
  const processedTemplateId = template_id === "unknown" ? null : parseInt(template_id);

  console.log(`?? Creating DreamLite dispute with priority: ${priority}, severity: ${severity}, workflow: ${processedWorkFlowId}`);

  // Validation - similar to createDispute
  if (!org_code || !processedWorkFlowId || !processedTemplateId || 
      !created_by || priority == null || severity == null ||
      !description || !licence_type) {
    return res.status(400).json({ 
      status: false, 
      message: 'Missing required fields for DreamLite dispute' 
    });
  }

  let dream_lite_modified_data;
  try {
    dream_lite_modified_data = JSON.parse(req.body.dream_lite_modified_data);
  } catch (e) {
    return res.status(400).json({ status: false, message: "Invalid modified data" });
  }

  const screenshot = req.files?.capture_image?.[0]?.path || null;
  const attachment = req.files?.attachment?.[0]?.path || null;
  const t = await sequelize.transaction();

  try {
    // 1) Create dispute - using same pattern as createDispute
    const [[{ id: dispute_id }]] = await sequelize.query(
      `INSERT INTO disputes (
         org_code, work_flow_id, template_id, licence_type, created_by, 
         priority, severity, description, dispute_stage,
         dispute_type, trusted_site_url, screen_name,
         table_column_header, table_column_data,
         dream_lite_source_data, dream_lite_modified_data,
         capture_image, attachments, remarks
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'raised', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
       RETURNING id`,
      {
        replacements: [
          org_code, processedWorkFlowId, processedTemplateId, licence_type, created_by,
          priority, severity, description,
          dispute_type, trusted_site_url, screen_name,
          table_column_header, table_column_data,
          JSON.stringify(dream_lite_source_data),
          JSON.stringify(dream_lite_modified_data),
          screenshot, attachment, remarks
        ],
        type: sequelize.QueryTypes.INSERT, 
        transaction: t
      }
    );

    if (!dispute_id) {
      throw new Error("Failed to create DreamLite dispute");
    }

    // 2) Load workflow - EXACTLY like createDispute
    const [nodes, edges] = await Promise.all([
      sequelize.query(
        `SELECT * FROM work_flow_nodes WHERE work_flow_id = :wf ORDER BY node_id`,
        { 
          replacements: { wf: processedWorkFlowId }, 
          type: sequelize.QueryTypes.SELECT, 
          transaction: t 
        }
      ),
      sequelize.query(
        `SELECT * FROM work_flow_edges WHERE work_flow_id = :wf ORDER BY source_node_id, destination_node_id`,
        { 
          replacements: { wf: processedWorkFlowId }, 
          type: sequelize.QueryTypes.SELECT, 
          transaction: t 
        }
      )
    ]);

    // ?? PROACTIVE WORKFLOW VALIDATION: Check workflow integrity before processing
    const startNode = nodes.find(n => n.type_node === 'start');
    const actionNodes = nodes.filter(n => n.type_node === 'action');
    
    if (!startNode) {
      await t.rollback();
      return res.status(400).json({ 
        status: false, 
        message: "This workflow is missing a start point and cannot process DreamLite disputes. Please contact your administrator to fix the workflow configuration.",
        error_type: "MISSING_START_NODE",
        workflow_id: processedWorkFlowId
      });
    }
    
    if (actionNodes.length === 0) {
      await t.rollback();
      return res.status(400).json({ 
        status: false, 
        message: "This workflow has no approval steps configured and cannot process DreamLite disputes. Please contact your administrator to add approval steps to the workflow.",
        error_type: "NO_ACTION_NODES",
        workflow_id: processedWorkFlowId
      });
    }
    
    // Check if START node has any outgoing connections
    const startNodeEdges = edges.filter(e => e.source_node_id === startNode.node_id);
    if (startNodeEdges.length === 0) {
      console.warn(`?? DreamLite Workflow ${processedWorkFlowId} has disconnected START node - will use fallback assignment`);
    }

    // 3) Run the engine from start - SAME as createDispute
    const payload = { 
      priority, 
      severity, 
      amount: 0, // Default amount for DreamLite disputes
      action: 'process' 
      // ?? KEY: No currentNodeId = createDispute mode = stops at first action
    };
    
    console.log(`?? DEBUG: Available workflow nodes:`, nodes.map(n => ({ id: n.node_id, type: n.type_node, label: n.json_node ? JSON.parse(n.json_node).label : 'No label' })));
    console.log(`?? DEBUG: Available workflow edges:`, edges.map(e => ({ 
      from: e.source_node_id, 
      to: e.destination_node_id, 
      direction: e.direction || e.label,
      label: e.label 
    })));
    
    console.log(`?? Running workflow engine from START node (will stop at first action)...`);
    const { nextNode: engineNextNode, log } = await runWorkflowEngine({ nodes, edges }, payload);

    console.log(`?? ENGINE EXECUTION LOG:`, log);

    if (!engineNextNode) {
      throw new Error('? Engine did not return a node');
    }

    console.log(`?? ENGINE RESULT: Stopped at node ${engineNextNode.id} (type: ${engineNextNode.type}, label: ${engineNextNode.data?.label})`);

    // Use a mutable variable for the final next node
    let nextNode = engineNextNode;

    // 4) Check if it's an end node - SAME logic as createDispute
    const isEndNode = nextNode.type === 'end' || nextNode.data?.is_end === true;
    
    if (isEndNode) {
      console.log(`?? WARNING: Engine stopped at end node on creation - resolving immediately`);
      await sequelize.query(
        `UPDATE disputes SET dispute_stage = 'resolved', updated_at = NOW(), updated_by = :by WHERE id = :id`,
        { replacements: { by: created_by, id: dispute_id }, transaction: t }
      );
      await t.commit();
      return res.status(201).json({ 
        status: true, 
        dispute_id, 
        assigned_to: null, 
        isComplete: true,
        warning: "No action nodes in workflow - resolved immediately"
      });
    }

    // ?? ENHANCED: Handle case where engine stops at START node due to missing edges
    if (nextNode.type === 'start') {
      console.error(`? DreamLite Workflow Error: Engine could not move past START node`);
      console.error(`   This indicates the workflow (ID: ${processedWorkFlowId}) has no outgoing edges from START node`);
      console.error(`   Available nodes:`, nodes.map(n => ({ id: n.node_id, type: n.type_node })));
      console.error(`   Available edges:`, edges.map(e => ({ from: e.source_node_id, to: e.destination_node_id, direction: e.direction })));
      
      // ?? FALLBACK: Try to assign to the first available action node
      const firstActionNode = nodes.find(n => n.type_node === 'action');
      if (firstActionNode) {
        console.log(`?? FALLBACK: Assigning to first available action node: ${firstActionNode.node_id}`);
        
        // Use the first action node as if the engine found it
        const fallbackNextNode = {
          id: firstActionNode.node_id,
          type: 'action',
          data: firstActionNode.json_node ? JSON.parse(firstActionNode.json_node) : { label: 'Action Node' }
        };
        
        // Continue with assignment logic using the fallback node
        nextNode = fallbackNextNode;
      } else {
        // ?? USER-FRIENDLY ERROR: Return a helpful message instead of technical error
        await t.rollback();
        return res.status(400).json({ 
          status: false, 
          message: "The selected workflow is incomplete and cannot process DreamLite disputes. Please contact your administrator to review and fix the workflow configuration, or select a different workflow.",
          error_type: "INCOMPLETE_WORKFLOW",
          workflow_id: processedWorkFlowId,
          suggestion: "Try selecting a different workflow or contact support to fix this workflow design."
        });
      }
    }

    // 5) This should be an action node - SAME validation as createDispute
    if (nextNode.type !== 'action') {
      throw new Error(`Expected action node but got ${nextNode.type}. Check workflow design.`);
    }

    console.log(`? Correctly stopped at action node: ${nextNode.id} (${nextNode.data?.label})`);
    
    const nextNodeId = nextNode.id;

    // 6) Get assignment info - SAME query pattern as createDispute
    const [nd] = await sequelize.query(
      `SELECT wn.action_user_id, wn.json_node, COALESCE(wf.type,'role') AS work_flow_type
       FROM work_flow_nodes wn JOIN work_flows wf ON wn.work_flow_id = wf.id
       WHERE wn.work_flow_id = :wf AND wn.node_id = :node`,
      { 
        replacements: { wf: processedWorkFlowId, node: nextNodeId }, 
        type: sequelize.QueryTypes.SELECT, 
        transaction: t 
      }
    );

    if (!nd) {
      throw new Error(`? Node ${nextNodeId} not found in work_flow_nodes table`);
    }

    // ?? FALLBACK: If action_user_id is empty but json_node has data, try to extract it
    let finalActionUserId = nd.action_user_id;
    if ((!finalActionUserId || finalActionUserId.toString().trim() === '') && nd.json_node) {
      try {
        const jsonData = JSON.parse(nd.json_node);
        if (jsonData.action_user_id) {
          finalActionUserId = jsonData.action_user_id;
          console.log(`?? CreateDreamLiteDispute: Extracted action_user_id from json_node: "${finalActionUserId}"`);
        }
      } catch (e) {
        console.warn(`?? CreateDreamLiteDispute: Could not parse json_node for node ${nextNodeId}:`, e.message);
      }
    }

    // 7) Get meaningful stage name - using getMeaningfulStageName like createDispute
    const nextStage = await getMeaningfulStageName(
      nextNode.data, 
      nd, 
      org_code, 
      t
    );

    console.log(`??? Setting initial stage as: "${nextStage}" (from node: "${nextNode.data?.label}", role: "${nd.action_user_id}")`);

    // ?? SMART WORKFLOW POSITIONING: Check BEFORE resolving assignees to avoid duplicate assignments
    const smartPosition = await findSmartWorkflowPosition({
      created_by,
      workflow_nodes: nodes,
      workflow_edges: edges,
      org_code,
      current_node_id: nextNodeId,
      template_id: processedTemplateId
    });

    console.log(`?? Smart Workflow Analysis:`, smartPosition);

    if (smartPosition.shouldSkip) {
      console.log(`?? SMART SKIP: Moving dispute to appropriate level based on creator's position`);
      
      // Use the smart positioning to determine the right starting point
      const smartNodeId = smartPosition.targetNode.node_id;
      
      // Get assignment info for the smart target node
      const [smartNd] = await sequelize.query(
        `SELECT wn.action_user_id, wn.json_node, COALESCE(wf.type,'role') AS work_flow_type
         FROM work_flow_nodes wn JOIN work_flows wf ON wn.work_flow_id = wf.id
         WHERE wn.work_flow_id = :wf AND wn.node_id = :node`,
        { 
          replacements: { wf: processedWorkFlowId, node: smartNodeId }, 
          type: sequelize.QueryTypes.SELECT, 
          transaction: t 
        }
      );
      
      if (smartNd) {
        let smartActionUserId = smartNd.action_user_id;
        if ((!smartActionUserId || smartActionUserId.toString().trim() === '') && smartNd.json_node) {
          try {
            const jsonData = JSON.parse(smartNd.json_node);
            if (jsonData.action_user_id) {
              smartActionUserId = jsonData.action_user_id;
            }
          } catch (e) {
            console.warn(`?? Smart positioning: Could not parse json_node for smart node ${smartNodeId}:`, e.message);
          }
        }
        
        const smartAssignees = await resolveAssignees({
          work_flow_type: smartNd.work_flow_type,
          action_user_id: smartActionUserId,
          org_code,
          created_by,
          originalCreator: created_by
        });
        
        const smartStage = await getMeaningfulStageName(
          smartPosition.targetNode.data || {},
          smartNd,
          org_code,
          t
        );
        
        console.log(`?? SMART POSITIONING: Assigning to ${smartAssignees.join(', ')} at smart node ${smartNodeId}`);
        
        // ?? Check for auto-approval after smart positioning: If smart positioning was triggered because creator is in workflow, auto-approve
        const shouldAutoApproveSmartPosition = smartPosition.skipType === 'creator_level_skip' || 
                                               smartPosition.skipType === 'manager_level_start' ||
                                               smartPosition.skipType === 'hierarchy_based';
        
        if (shouldAutoApproveSmartPosition) {
          console.log(`?? SMART POSITION AUTO-APPROVAL: Creator ${created_by} found in workflow (${smartPosition.skipType}). Auto-approving their level and using smart positioned target.`);
          
          // Smart positioning already found the correct target - use it directly without running workflow engine again
          try {
            console.log(`?? SMART POSITION AUTO-APPROVAL: Using pre-calculated smart target ${smartNodeId} with assignees: ${smartAssignees.join(', ')}`);
            
            // Record the auto-approval for creator's level (the level they would have been assigned to originally)
            await sequelize.query(
              `INSERT INTO dispute_history(dispute_id, done_by, created_by, assigned_to, node_id, action, dispute_stage, created_at, status, node_decision, comments)
               VALUES(?, ?, ?, ?, ?, 'smart_auto_approved', ?, NOW(), true, 'approved', ?)`,
              { 
                replacements: [
                  dispute_id, created_by, created_by, created_by, 
                  smartPosition.creatorNodeId || smartNodeId, smartStage, 
                  `Creator found in workflow - auto-approved their level via smart positioning`
                ], 
                transaction: t 
              }
            );
            
            // Assign directly to the smart positioned target (Admin level)
            for (const assignee of smartAssignees) {
              await sequelize.query(
                `INSERT INTO dispute_flow(dispute_id, assigned_to, node_id, dispute_stage, created_by, assigned_at, status)
                 VALUES(?, ?, ?, ?, ?, NOW(), true)`,
                { 
                  replacements: [dispute_id, assignee, smartNodeId, smartStage, created_by], 
                  transaction: t 
                }
              );

              await sequelize.query(
                `INSERT INTO dispute_history(dispute_id, done_by, created_by, assigned_to, node_id, action, dispute_stage, created_at, status)
                 VALUES(?, ?, ?, ?, ?, 'created', ?, NOW(), true)`,
                { 
                  replacements: [dispute_id, created_by, created_by, assignee, smartNodeId, smartStage], 
                  transaction: t 
                }
              );
            }
            
            await t.commit();
            
            console.log(`? Successfully created DreamLite dispute ${dispute_id} with smart positioning + auto-approval, assigned to ${smartAssignees.length} users: ${smartAssignees.join(', ')} at node ${smartNodeId}`);
            
            return res.status(201).json({ 
              message: 'Dispute created successfully with smart positioning and auto-approval', 
              dispute_id,
              status: 'success',
              positioning_reason: smartPosition.reason,
              assignees: smartAssignees,
              current_node: smartNodeId,
              stage: smartStage,
              smart_positioned: true,
              auto_approved: true,
              metadata: {
                smartPositioning: smartPosition,
                autoApproval: true,
                skipReason: 'smart_positioned_auto_approved'
              }
            });
            
          } catch (autoError) {
            console.error(`?? Error in smart position auto-approval:`, autoError);
            // Fall through to normal smart assignment
          }
        }
        
        // If not auto-approved, do normal smart assignment
        for (const assignee of smartAssignees) {
          await sequelize.query(
            `INSERT INTO dispute_flow(dispute_id, assigned_to, node_id, dispute_stage, created_by, assigned_at, status)
             VALUES(?, ?, ?, ?, ?, NOW(), true)`,
            { 
              replacements: [dispute_id, assignee, smartNodeId, smartStage, created_by], 
              transaction: t 
            }
          );

          await sequelize.query(
            `INSERT INTO dispute_history(dispute_id, done_by, created_by, assigned_to, node_id, action, dispute_stage, created_at, status)
             VALUES(?, ?, ?, ?, ?, 'created', ?, NOW(), true)`,
            { 
              replacements: [dispute_id, created_by, created_by, assignee, smartNodeId, smartStage], 
              transaction: t 
            }
          );
        }
        
        await t.commit();
        
        console.log(`? Successfully created DreamLite dispute ${dispute_id} with smart positioning and assigned to ${smartAssignees.length} users: ${smartAssignees.join(', ')} at smart node ${smartNodeId}`);
        
        return res.status(201).json({ 
          status: true, 
          dispute_id, 
          assigned_to: smartAssignees,
          assignee_count: smartAssignees.length,
          nextStage: smartStage,
          smart_positioned: true,
          positioning_reason: smartPosition.reason,
          debug: {
            stoppedAtNode: smartNodeId,
            nodeType: 'action',
            engineLog: log,
            smartPositioning: smartPosition,
            originalNode: nextNodeId
          }
        });
      }
    }

    // ?? NORMAL WORKFLOW: Handle cases where smart positioning doesn't apply (regular users not in workflow)
    console.log(`?? NORMAL WORKFLOW: Smart positioning did not apply, proceeding with standard assignment`);
    
    // Resolve assignees using normal logic
    let assignees = await resolveAssignees({
      work_flow_type: nd.work_flow_type,
      action_user_id: finalActionUserId,
      org_code,
      created_by,
      originalCreator: created_by
    });

    if (!assignees.length) {
      console.warn(`?? No assignees found for node ${nextNodeId}, using fallback assignment to creator`);
      assignees = [created_by];
    }

    console.log(`?? Found ${assignees.length} assignee(s): ${assignees.join(', ')}`);

    // Check if creator would be assigned to themselves (normal auto-approval)
    const shouldAutoApprove = assignees.includes(created_by);
    
    if (shouldAutoApprove) {
      console.log(`?? NORMAL AUTO-APPROVAL: Dispute creator ${created_by} is assigned to first node. Auto-approving and moving to next step.`);
      
      // Get next node in workflow
      const outgoingEdges = edges.filter(e => e.source_node_id === nextNodeId);
      const forwardEdge = outgoingEdges.find(e => 
        (e.direction || e.label || '').toLowerCase() === 'forward'
      );
      
      if (forwardEdge) {
        const autoApprovalPayload = {
          currentNodeId: String(nextNodeId),
          decision: 'forward',
          action: 'process'
        };
        
        const { nextNode: autoNextNode, log: autoLog } = await runWorkflowEngine({ nodes, edges }, autoApprovalPayload);
        
        if (autoNextNode && autoNextNode.type === 'action') {
          // Get next node assignment info
          const [autoNd] = await sequelize.query(
            `SELECT wn.action_user_id, wn.json_node, COALESCE(wf.type,'role') AS work_flow_type
             FROM work_flow_nodes wn JOIN work_flows wf ON wn.work_flow_id = wf.id
             WHERE wn.work_flow_id = :wf AND wn.node_id = :node`,
            { 
              replacements: { wf: processedWorkFlowId, node: autoNextNode.id }, 
              type: sequelize.QueryTypes.SELECT, 
              transaction: t 
            }
          );
          
          if (autoNd) {
            let autoActionUserId = autoNd.action_user_id;
            if ((!autoActionUserId || autoActionUserId.toString().trim() === '') && autoNd.json_node) {
              try {
                const jsonData = JSON.parse(autoNd.json_node);
                if (jsonData.action_user_id) {
                  autoActionUserId = jsonData.action_user_id;
                }
              } catch (e) {
                console.warn(`?? Normal auto-approval: Could not parse json_node for auto node ${autoNextNode.id}:`, e.message);
              }
            }
            
            const autoAssignees = await resolveAssignees({
              work_flow_type: autoNd.work_flow_type,
              action_user_id: autoActionUserId,
              org_code,
              created_by,
              originalCreator: created_by
            });
            
            const autoStage = await getMeaningfulStageName(
              autoNextNode.data || {},
              autoNd,
              org_code,
              t
            );
            
            // Record auto-approval
            await sequelize.query(
              `INSERT INTO dispute_history(dispute_id, done_by, created_by, assigned_to, node_id, action, dispute_stage, created_at, status, node_decision, comments)
               VALUES(?, ?, ?, ?, ?, 'auto_approved', ?, NOW(), true, 'approved', ?)`,
              { 
                replacements: [
                  dispute_id, created_by, created_by, created_by, 
                  nextNodeId, nextStage, 'Creator auto-approved their own level'
                ], 
                transaction: t 
              }
            );
            
            // Assign to next level
            for (const assignee of autoAssignees) {
              await sequelize.query(
                `INSERT INTO dispute_flow(dispute_id, assigned_to, node_id, dispute_stage, created_by, assigned_at, status)
                 VALUES(?, ?, ?, ?, ?, NOW(), true)`,
                { 
                  replacements: [dispute_id, assignee, autoNextNode.id, autoStage, created_by], 
                  transaction: t 
                }
              );

              await sequelize.query(
                `INSERT INTO dispute_history(dispute_id, done_by, created_by, assigned_to, node_id, action, dispute_stage, created_at, status)
                 VALUES(?, ?, ?, ?, ?, 'created', ?, NOW(), true)`,
                { 
                  replacements: [dispute_id, created_by, created_by, assignee, autoNextNode.id, autoStage], 
                  transaction: t 
                }
              );
            }
            
            await t.commit();
            
            return res.status(201).json({ 
              status: true, 
              dispute_id, 
              assigned_to: autoAssignees,
              assignee_count: autoAssignees.length,
              nextStage: autoStage,
              auto_approved: true,
              debug: {
                stoppedAtNode: autoNextNode.id,
                nodeType: 'action',
                autoApproval: true,
                skippedNode: nextNodeId
              }
            });
          }
        }
      }
    }

    // Normal assignment (no auto-approval needed)
    const assignmentPromises = [];
    const historyPromises = [];
    
    for (const assignee of assignees) {
      assignmentPromises.push(
        sequelize.query(
          `INSERT INTO dispute_flow(dispute_id, assigned_to, node_id, dispute_stage, created_by, assigned_at, status)
           VALUES(?, ?, ?, ?, ?, NOW(), true)`,
          { 
            replacements: [dispute_id, assignee, nextNodeId, nextStage, created_by], 
            transaction: t 
          }
        )
      );

      historyPromises.push(
        sequelize.query(
          `INSERT INTO dispute_history(dispute_id, done_by, created_by, assigned_to, node_id, action, dispute_stage, created_at, status)
           VALUES(?, ?, ?, ?, ?, 'created', ?, NOW(), true)`,
          { 
            replacements: [dispute_id, created_by, created_by, assignee, nextNodeId, nextStage], 
            transaction: t 
          }
        )
      );
    }
    
    await Promise.all([...assignmentPromises, ...historyPromises]);
    await t.commit();

    console.log(`? Successfully created DreamLite dispute ${dispute_id} with normal assignment and assigned to ${assignees.length} users: ${assignees.join(', ')}`);
    
    return res.status(201).json({ 
      status: true, 
      dispute_id, 
      assigned_to: assignees,
      assignee_count: assignees.length,
      nextStage: nextStage
    });

    // Send notifications asynchronously (don't await)
    sendDisputeNotifications({
      type: 'DREAMLITE_CREATE',
      dispute_id,
      org_code,
      assignees,
      created_by,
      disputeData,
      nextStage,
      sequelize
    }).catch(err => {
      console.error(`Error sending notifications for dispute #${dispute_id}:`, err);
    });

    console.log(`? Successfully created DreamLite dispute ${dispute_id} and assigned to ${assignees.length} users: ${assignees.join(', ')} at action node ${nextNodeId}`);

    return res.status(201).json({ 
      status: true, 
      dispute_id, 
      assigned_to: assignees, // Return all assignees, not just the first one
      assignee_count: assignees.length,
      nextStage,
      auto_approved: false,
      smart_positioned: false,
      debug: {
        stoppedAtNode: nextNodeId,
        nodeType: nextNode.type,
        engineLog: log
      }
    });

  } catch (err) {
    await t.rollback();
    console.error('? createDreamLiteDispute error:', err);
    return res.status(500).json({ 
      status: false, 
      message: `Failed to create DreamLite dispute: ${err.message}` 
    });
  }
};


exports.getDisputePendingCountForLTE = async (req, res) => {
  const data = req.body; 
  const org_code=data.org_code;
  const user_id=data.user_id;
  try {
    let query = `select count(*) :: integer as pending_count from ( select disp.id as dispute_id  
        from disputes disp where disp.licence_type ='DREAMLTE' and disp.org_code = :org_code  ) main right join 
        (select a.dispute_id as dispute_his_id from dispute_history a left join disputes b on a.dispute_id = b.id  
        where b.org_code= :org_code and b.licence_type ='DREAMLTE' and a.assigned_to= :user_id and a.updated_at is null) 
        sub on main.dispute_id = sub.dispute_his_id `;
    const result = await sequelize.query(query, {
      replacements: {
          org_code,
          user_id,
      },
      type: sequelize.QueryTypes.SELECT,
    });
    return res.status(200).json({ data: result });
  } catch (error) {
    return res.status(500).json({ status: false, message: "Error while getting pending count" });
  }
};


// Approve or reject a dispute using the workflow engine
exports.actOnDispute = async (req, res) => {
  const { dispute_id, decision, comments, user_id } = req.body;

  // 1. Fetch dispute
  const [dispute] = await sequelize.query(
    'SELECT * FROM disputes WHERE id = ?',
    { replacements: [dispute_id], type: sequelize.QueryTypes.SELECT }
  );
  if (!dispute) {
    return res.status(404).json({ status: false, message: 'Dispute not found' });
  }

  // 2. Fetch workflow nodes and edges
  const nodes = await sequelize.query(
    'SELECT * FROM work_flow_nodes WHERE work_flow_id = ?',
    { replacements: [dispute.work_flow_id], type: sequelize.QueryTypes.SELECT }
  );
  const edges = await sequelize.query(
    'SELECT * FROM work_flow_edges WHERE work_flow_id = ?',
    { replacements: [dispute.work_flow_id], type: sequelize.QueryTypes.SELECT }
  );

  // 3. Prepare payload for engine
  const decisionNormalized = (decision === 'approved' ? 'yes'
                           : decision === 'rejected' ? 'no'
                           : decision.toLowerCase());
  const payload = {
    priority: dispute.priority,
    severity: dispute.severity,
    amount: dispute.dispute_amount,
    decision: decisionNormalized, // User's action
    comments,
    // Add any other fields that are used in node conditions!
  };

  // 4. Clean up node and edge shapes
  const cleanNodes = nodes.map(n => ({
    ...n,
    id: String(n.node_id),
    typenode: n.type_node,
    data: { ...(n.json_node ? JSON.parse(n.json_node) : {}), ...n }
  }));
  const cleanEdges = edges.map(e => ({
    ...e,
    id: String(e.edge_id),
    source: String(e.source_node_id),
    target: String(e.destination_node_id),
    label: e.label
  }));

  // 5. Run engine
  const { log } = await runWorkflowEngine({ nodes: cleanNodes, edges: cleanEdges }, payload);

  // 6. Get last node in the log (the node the workflow advanced to)
  const lastStep = log[log.length - 1];
  const lastNode = lastStep?.node;

  // 7. Update assignments/history based on node type
  if (!lastNode) {
    return res.status(400).json({ status: false, message: "Workflow did not advance" });
  }

  // Example: update dispute_flow and dispute_history
  const t = await sequelize.transaction();
  try {
    // 7a. Mark previous history as completed
    await sequelize.query(
      'UPDATE dispute_history SET updated_at = NOW(), updated_by = ? WHERE dispute_id = ? AND assigned_to = ? AND updated_at IS NULL',
      { replacements: [user_id, dispute_id, user_id], transaction: t, type: sequelize.QueryTypes.UPDATE }
    );

    // 7b. If next is END, mark dispute as resolved/closed
    if (lastNode.typenode === 'end') {
      await sequelize.query(
        'UPDATE disputes SET dispute_stage = ?, updated_at = NOW() WHERE id = ?',
        { replacements: ['resolved', dispute_id], transaction: t, type: sequelize.QueryTypes.UPDATE }
      );
      await t.commit();
      return res.json({ status: true, message: "Dispute resolved!", workflow_log: log });
    }

    // 7c. If next is ACTION, assign to next user(s)
    if (lastNode.typenode === 'action') {
      // Decide who is the next assignee(s) - from lastNode.data.action_user_id, etc
      // Example: handle for single user
      const nextUserId = lastNode.data.action_user_id; // or role logic
      await sequelize.query(
        `INSERT INTO dispute_flow (dispute_id, assigned_to, node_id, dispute_stage, created_by, assigned_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        { replacements: [dispute_id, nextUserId, lastNode.id, lastNode.data.label, user_id], transaction: t, type: sequelize.QueryTypes.INSERT }
      );
      await sequelize.query(
        `INSERT INTO dispute_history (dispute_id, done_by, created_by, assigned_to, node_id, action, dispute_stage, comments, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        { replacements: [
            dispute_id, user_id, user_id, nextUserId, lastNode.id,
            decision, lastNode.data.label, comments
          ], transaction: t, type: sequelize.QueryTypes.INSERT }
      );
      await t.commit();
      return res.json({ status: true, message: `Moved to next step, assigned to user ${nextUserId}`, workflow_log: log });
    }

    await t.commit();
    res.json({ status: true, workflow_log: log });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ status: false, message: err.message });
  }
};