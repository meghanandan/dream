const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/db');
const WorkFlow = require('./../models/WorkFlow');
const { runWorkflowEngine } = require('./workflowEngine');

exports.createWorkflow = async (req, res) => {
  try {
    const {
      org_code,
      name,
      created_by,
      nodes = [],
      edges = [],
      type,
      mail_template_id
    } = req.body;

    // defaults
    const work_flow_stage   = 1;
    const community_access  = "public";
    const price             = 0;
    const currency          = "USD";
    const work_flow_status  = 1;

    // prevent duplicate names
    const existing = await WorkFlow.findOne({
      where: { name, org_code }
    });
    if (existing) {
      return res
        .status(200)
        .json({ status: false, message: "A workflow with that name already exists" });
    }

    // 1️⃣ Build a lookup of incoming-edge info per destination node
    const incoming = {};
    for (const edge of edges) {
      const from = nodes.find(n => n.id === edge.source);
      const isDecision = from?.typenode === 'decision';
      const direction = isDecision
        ? (edge.label || '').toLowerCase()
        : null;

      incoming[ edge.target ] = {
        source_node_id: edge.source,
        decision_id:    direction,
      };
    }

    // Create the workflow master row
    const workflow = await WorkFlow.create({
      org_code,
      name,
      type,
      work_flow_stage,
      community_access,
      price,
      currency,
      created_by,
      mail_template_id,
      work_flow_status
    });

    // 2️⃣ Insert nodes (including source_node_id & decision_id)
    if (nodes.length > 0) {
      const insertNodeSql = `
        INSERT INTO work_flow_nodes (
          node_id,
          work_flow_id,
          name,
          label,
          position,
          style,
          action_type,
          type,
          json_node,
          created_by,
          description,
          type_node,
          notification_status,
          attachment_status,
          commit_status,
          condition_status,
          action_user_id,
          exclude_users,
          escalation_time,
          source_node_id,    -- new
          decision_id        -- new
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `;

      for (const node of nodes) {
        const excludeUsersArr = node.data?.hiding_user || [];
        const excludeUsersStr = excludeUsersArr.join(',');

        const info = incoming[node.id] || {
          source_node_id: null,
          decision_id:    null
        };

        const values = [
          node.id || null,
          workflow.id,
          node.data?.label || "Unnamed Node",
          node.data?.label || "Unnamed Label",
          `(${node.position.x}, ${node.position.y})`,
          JSON.stringify(node.style || {}),
          node.action_type || "default",
          node.type || "default",
          JSON.stringify(node),
          created_by,
          node.data?.description || "",
          node.typenode || "",
          node.data?.notification || false,
          node.data?.attachment   || false,
          node.data?.comment      || false,
          node.data?.condition    || false,
          node.data?.assigned_to  || "",
          excludeUsersStr,
          node.data?.escalation   || "",
          info.source_node_id,    // ← from incoming map
          info.decision_id        // ← will be `null` instead of `'forward'`
        ];

        await sequelize.query(insertNodeSql, {
          replacements: values,
          type: sequelize.QueryTypes.INSERT,
        });
      }
    }

    // 3️⃣ Insert edges (unchanged)
    if (edges.length > 0) {
      const insertEdgeSql = `
        INSERT INTO work_flow_edges (
          edge_id,
          work_flow_id,
          source_node_id,
          destination_node_id,
          created_by,
          label,
          marker_end,
          source_handle,
          target_handle,
          direction
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `;

      for (const edge of edges) {
        const {
          id:             edgeId,
          source,
          target,
          label,
          markerEnd,
          sourceHandle,
          targetHandle
        } = edge;

        const from = nodes.find(n => n.id === source);
        const isDecision = from?.typenode === 'decision';
        const dir = isDecision
          ? (label || '').toLowerCase()
          : 'forward';

        const values = [
          edgeId,
          workflow.id,
          source,
          target,
          created_by,
          isDecision ? label : (label || "default arrow"),
          JSON.stringify(markerEnd || {}),
          sourceHandle || null,
          targetHandle || null,
          dir
        ];

        await sequelize.query(insertEdgeSql, {
          replacements: values,
          type: sequelize.QueryTypes.INSERT,
        });
      }
    }

    // done
    return res
      .status(200)
      .json({
        status:  true,
        message: "Workflow created successfully",
        data:    workflow
      });
  }
  catch (error) {
    console.error("Error creating workflow:", error);
    return res
      .status(500)
      .json({
        message: "Failed to create workflow",
        error:   error.message
      });
  }
};


exports.getWorkFlowList = async (req, res) => {
  const data = req.body;
  try {
    if (Object.keys(data).length !== 0) {
      const searchKey = data.search_key || '';
      const pageNumber = parseInt(data.page_number, 10) || 1;
      const pageSize = parseInt(data.page_size, 10) || 20;
      const org_code=data.org_code;
      // Base query
      let query = `SELECT wf.id,wf.name,wf.type,wf.status,wf.work_flow_stage,wf.community_access,wf.org_code,wf.created_at,wf.updated_at,
      u.first_name,u.last_name,us.first_name as up_first_name,us.last_name as up_last_name,wf.work_flow_status 
      FROM work_flows AS wf LEFT JOIN users u ON u.emp_id = wf.created_by LEFT JOIN users us ON us.emp_id = wf.updated_by 
      WHERE wf.work_flow_stage = '1' and wf.org_code=:org_code `;
      // Add search conditions if a search key is provided
      if (searchKey) {
          query += ` AND LOWER(wf.name) LIKE LOWER(:searchKey) `;
      }

      // Count query for total records
      const countQuery = ` SELECT COUNT(*) AS total_count FROM work_flows WHERE work_flow_stage = '1' 
        ${searchKey ? `AND LOWER(name) LIKE LOWER(:searchKey)` : ''} `;

            // Add sorting and pagination
            query += ` ORDER BY id LIMIT :limit OFFSET :offset `;

            // Fetch total count
            const countResult = await sequelize.query(countQuery, {
                replacements: {org_code, searchKey: `%${searchKey}%` },
                type: sequelize.QueryTypes.SELECT,
            });

            const totalRecords = countResult[0]?.total_count || 0;

            // Fetch paginated results
            const result = await sequelize.query(query, {
                replacements: {
                    org_code,
                    searchKey: `%${searchKey}%`,
                    limit: pageSize,
                    offset: (pageNumber - 1) * pageSize,
                },
                type: sequelize.QueryTypes.SELECT,
            });
            // Return success response
            return res.status(200).json({
                status: true,
                totalRecords,
                data: result,
            });
        } else {
            return res.status(400).json({ status: false, message: 'Request body is empty.' });
        }
    } catch (error) {
        console.error('Error fetching workflow list:', error.message);
        return res.status(500).json({
            status: false,
            message: 'Error while fetching workflows',
            error: error.message,
        });
    }
};


exports.getWorkflowDetails = async (req, res) => {
  try {
    const { id } = req.body;
    // Don't parse as int, treat as string
    const workflowId = id;

    if (!workflowId) {
      return res.status(400).json({
        status: false,
        message: "Workflow ID is required",
      });
    }

    // Fetch workflow meta info
    const [workflow] = await sequelize.query(
      `SELECT id, name, type, status, work_flow_stage, community_access, mail_template_id, hours_workflow 
       FROM work_flows WHERE id = :id`,
      {
        replacements: { id: workflowId },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    if (!workflow) {
      return res.status(404).json({
        status: false,
        message: "Workflow not found",
      });
    }

    // Fetch nodes (IDs are strings)
    const rawNodes = await sequelize.query(
      `SELECT node_id, work_flow_id, name, label, position, style, action_type, type, description,type_node,notification_status,
      attachment_status, commit_status, condition_status, action_user_id,smartrouting, exclude_users, escalation_time, priority, severity,
       priority_severity_condition, amount,amount_condition,json_node,node_condition,region,sub_region 
      FROM work_flow_nodes WHERE work_flow_id = :id`,
      {
        replacements: { id: workflowId },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const rawnodes = rawNodes.map((node) => {
      let parsedJsonNode = {};
      try {
        parsedJsonNode = JSON.parse(node.json_node || '{}');
      } catch (err) {
        console.error('Invalid JSON in json_node:', err);
      }
      const assignedTo = node.action_user_id;
      const isRole = assignedTo?.startsWith('RL_');

      return {
        id: String(node.node_id), // UUID
        data: {
          label: node.label,
          description: node.description,
          notification: node.notification_status,
          attachment: node.attachment_status,
          comment: node.commit_status,
          hiding_user: node.exclude_users ? node.exclude_users.split(',') : 0,
          action_user_id: node.action_user_id,
          assigned_type: isRole ? 'role' : 'user',
          condition: node.description !== '' ? null : node.condition_status,
          escalation: node.escalation_time,
          assigned_role_id: isRole ? assignedTo : (parsedJsonNode?.data?.assigned_role_id || ''),
          priority:node.priority,
          severity:node.severity,
          priority_severity_condition:node.priority_severity_condition,
          amount:node.amount,
          amount_condition:node.amount_condition,
          json_node:node.json_node,
          node_conditions: node.node_condition,
          region: node.region,
          sub_region : node.sub_region  
        },
        position: node.position,
        style: JSON.parse(node.style || '{}'),
        type: node.type || 'default',
        typenode: node.type_node,
      };
    });

    // Fetch edges (IDs/refs are strings)
    const rawEdges = await sequelize.query(
      `SELECT edge_id, source_node_id, destination_node_id, label, marker_end,source_handle, target_handle, direction 
       FROM work_flow_edges WHERE work_flow_id = :id`,
      {
        replacements: { id: workflowId },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const rawedges = rawEdges.map((edge) => ({
      id: String(edge.edge_id),      // UUID
      source: String(edge.source_node_id),
      target: String(edge.destination_node_id),
      label: edge.label,
      marker_end: JSON.parse(edge.marker_end || '{}'),
      sourceHandle: edge.source_handle,
      targetHandle: edge.target_handle,
      direction: edge.direction || 'forward'
    }));

    return res.status(200).json({
      status: true,
      message: "Workflow details fetched successfully",
      data: {
        workflow,
        rawnodes,
        rawedges,
      },
    });
  } catch (error) {
    console.error("Error fetching workflow details:", error);
    res.status(500).json({status: false,message: "Failed to fetch workflow details",error: error.message,});
  }
};
  

exports.updateWorkflow = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      id,
      org_code,
      name,
      created_by,
      nodes = [],
      edges = [],
      mail_template_id
    } = req.body;

    // 1) Load & bump version
    const workflow = await WorkFlow.findByPk(id, { transaction: t });
    if (!workflow) {
      await t.rollback();
      return res.status(404).json({ status: false, message: "Workflow not found" });
    }
    await workflow.increment('workflow_version', { by: 1, transaction: t });
    await workflow.update(
      { org_code, name, updated_by: created_by, mail_template_id },
      { transaction: t }
    );

    // 2) Clear out old nodes & edges
    await Promise.all([
      sequelize.query(
        `DELETE FROM work_flow_nodes WHERE work_flow_id = :id`,
        { replacements: { id }, type: sequelize.QueryTypes.DELETE, transaction: t }
      ),
      sequelize.query(
        `DELETE FROM work_flow_edges WHERE work_flow_id = :id`,
        { replacements: { id }, type: sequelize.QueryTypes.DELETE, transaction: t }
      )
    ]);

    // Build a quick lookup of valid node IDs
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    // 3) Filter out any edges whose source or target doesn’t exist
    const validEdges = edges.filter(e => {
      if (!nodeMap.has(e.source) || !nodeMap.has(e.target)) {
        console.warn(`Dropping orphan edge ${e.id}`);
        return false;
      }
      return true;
    });

    // Build incoming map (for source_sl_no / decision_id)
    const incoming = {};
    for (const e of validEdges) {
      const from = nodeMap.get(e.source);
      const isDecision = from?.typenode === 'decision';
      incoming[e.target] = {
        source_node_id: e.source,
        decision_id: isDecision ? (e.label || '').toLowerCase() : null
      };
    }

    // 4) Re-insert nodes
    const sourceSlNo = {};
    let nextSl = 1;

    const nodeSql = `
      INSERT INTO work_flow_nodes (
        node_id, work_flow_id, name,  label,
        position, style,       action_type,
        type,    json_node,    created_by,
        description, type_node, notification_status,
        attachment_status, commit_status, condition_status,
        action_user_id, region,    sub_region,
        exclude_users, escalation_time, priority,
        severity, priority_severity_condition,
        amount, amount_condition, node_condition,
        source_node_id, decision_id, source_sl_no
      ) VALUES (${Array(30).fill('?').join(',')})
    `;

    for (const n of nodes) {
      const info = incoming[n.id] || { source_node_id: null, decision_id: null };
      let slNo = null;
      if (info.source_node_id) {
        slNo = sourceSlNo[info.source_node_id]
             || (sourceSlNo[info.source_node_id] = nextSl++);
      }

      await sequelize.query(nodeSql, {
        replacements: [
          n.id,
          workflow.id,
          n.data.label || "Unnamed",
          n.data.label || "Unnamed",
          `(${n.position.x}, ${n.position.y})`,
          JSON.stringify(n.style || {}),
          n.action_type || "default",
          n.type || "default",
          JSON.stringify(n),
          created_by,
          n.data.description || "",
          n.typenode || "",
          n.data.notification || false,
          n.data.attachment   || false,
          n.data.comment      || false,
          n.data.condition    || false,
          n.data.action_user_id || "",
          n.data.region       || "",
          n.data.sub_region   || "",
          Array.isArray(n.data.hiding_user)
            ? n.data.hiding_user.join(',')
            : "",
          n.data.escalation   || "",
          n.data.priority     || null,
          n.data.severity     || null,
          n.data.priority_severity_condition || null,
          n.data.amount       || null,
          n.data.amount_condition || null,
          n.data.node_conditions || null,
          info.source_node_id,
          info.decision_id,
          slNo
        ],
        type: sequelize.QueryTypes.INSERT,
        transaction: t
      });
    }

    // 5) Re-insert edges
    const edgeSql = `
      INSERT INTO work_flow_edges (
        edge_id, work_flow_id,
        source_node_id, destination_node_id,
        created_by, label,
        marker_end, source_handle,
        target_handle, direction
      ) VALUES (${Array(10).fill('?').join(',')})
    `;

    for (const e of validEdges) {
      const from = nodeMap.get(e.source);
      // if it’s a decision-node edge, read yes/no; otherwise always “forward”
      const dir = from?.typenode === 'decision'
                ? (e.sourceHandle === 'yes' ? 'yes'
                   : e.sourceHandle === 'no'  ? 'no'
                   : 'forward')
                : 'forward';

      await sequelize.query(edgeSql, {
        replacements: [
          e.id,
          workflow.id,
          e.source,
          e.target,
          created_by,
          e.label || "forward",
          JSON.stringify(e.markerEnd || {}),
          e.sourceHandle || null,
          e.targetHandle || null,
          dir
        ],
        type: sequelize.QueryTypes.INSERT,
        transaction: t
      });
    }

    // 6) Commit & return
    await t.commit();
    return res.json({
      status: true,
      message: "Workflow updated",
      workflow_id: workflow.id,
      new_version: workflow.workflow_version + 1
    });
  }
  catch (err) {
    console.error("updateWorkflow failed:", err);
    await t.rollback();
    return res.status(500).json({ status: false, message: err.message });
  }
};



exports.getWorkStatus = async (req, res) => {
  try {
    const { id, status, created_by } = req.body;
    if (!id) {
      return res.status(400).json({status: false,message: "Workflow ID is required",});
    }
    // Fetch workflow by ID
    let workflow = await WorkFlow.findByPk(parseInt(id));
    if (!workflow) {
        return res.status(404).json({status: false,message: "Workflow not found",});
    }
    // Debugging: Log before update
    console.log("Before Update:", workflow);
    // Update workflow status
    workflow.work_flow_status = status;
    workflow.updated_by = created_by;
    await workflow.save(); //  Ensures update works
    // Debugging: Log after update
    console.log("After Update:", workflow);
    // Prepare response
    const response = {
        id: workflow.id,
        status: workflow.work_flow_status,
        updatedAt: workflow.updatedAt,
    };
     res.status(200).json({status: true,message: "Workflow status updated successfully",data: response,});
    } catch (error) {
        console.error("Error updating workflow status:", error);
        res.status(500).json({status: false,message: "Failed to update workflow status",error: error.message,});
    }
};

exports.deleteWorkflow = async (req, res) => {
  try {
    const { id } = req.body;
    // Validate input
    if (!id) {
        return res.status(400).json({ status: false, message: "User ID is required" });
    }
    // Check if the user exists
    const user = await sequelize.query("SELECT id FROM work_flows WHERE id = ?",
    {
        replacements: [id],
        type: sequelize.QueryTypes.SELECT,
    });
    if (user.length === 0) {
        return res.status(404).json({ status: false, message: "Workflow not found" });
    }
   // Soft delete (set status = false)
    await sequelize.query(`UPDATE work_flows SET work_flow_stage = ? WHERE id = ?`,
    {
        replacements: ['0', id],
        type: sequelize.QueryTypes.UPDATE,
    } );
    res.status(200).json({ status: true, message: "Workflow deleted successfully" });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ status: false, message: "Error deleting user", error: error.message });
    }
};

exports.copyWorkflow = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { originalId, newName, created_by, org_code } = req.body;

    // Validate input
    if (!originalId || !newName || !created_by || !org_code) {
      await t.rollback();
      return res.status(400).json({ 
        status: false, 
        message: "Original ID, new name, created_by, and org_code are required" 
      });
    }

    // Check if original workflow exists
    const [originalWorkflow] = await sequelize.query(
      "SELECT * FROM work_flows WHERE id = ? AND org_code = ?",
      {
        replacements: [originalId, org_code],
        type: sequelize.QueryTypes.SELECT,
        transaction: t
      }
    );

    if (!originalWorkflow) {
      await t.rollback();
      return res.status(404).json({ 
        status: false, 
        message: "Original workflow not found" 
      });
    }

    // Check if workflow with new name already exists
    const [existingWorkflow] = await sequelize.query(
      "SELECT id FROM work_flows WHERE name = ? AND org_code = ? AND work_flow_stage != '0'",
      {
        replacements: [newName.trim(), org_code],
        type: sequelize.QueryTypes.SELECT,
        transaction: t
      }
    );

    if (existingWorkflow) {
      await t.rollback();
      return res.status(400).json({ 
        status: false, 
        message: "A workflow with this name already exists" 
      });
    }

    // Create new workflow - simple copy with new name
    const [newWorkflow] = await sequelize.query(
      `INSERT INTO work_flows (
        name, type, status, work_flow_stage, community_access, 
        mail_template_id, hours_workflow, created_by, updated_by, org_code,
        workflow_version, work_flow_status, price, currency
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      {
        replacements: [
          newName.trim(),
          originalWorkflow.type,
          originalWorkflow.status,
          originalWorkflow.work_flow_stage,
          originalWorkflow.community_access,
          originalWorkflow.mail_template_id,
          originalWorkflow.hours_workflow,
          created_by,
          created_by,
          org_code,
          1, // Start with version 1
          originalWorkflow.work_flow_status,
          originalWorkflow.price || 0,
          originalWorkflow.currency || 'USD'
        ],
        type: sequelize.QueryTypes.SELECT,
        transaction: t
      }
    );

    const newWorkflowId = newWorkflow.id;

    // Copy nodes - simple duplication with new IDs
    const nodes = await sequelize.query(
      "SELECT * FROM work_flow_nodes WHERE work_flow_id = ?",
      {
        replacements: [originalId],
        type: sequelize.QueryTypes.SELECT,
        transaction: t
      }
    );

    const nodeIdMapping = {};
    for (const node of nodes) {
      const newNodeId = uuidv4();
      nodeIdMapping[node.node_id] = newNodeId;
    }

    // Now insert nodes with updated references
    for (const node of nodes) {
      const newNodeId = nodeIdMapping[node.node_id];

      // Extract position from json_node first, then fallback to position field
      let position = '(0,0)'; // default fallback
      let originalPosition = null;
      
      if (node.json_node) {
        try {
          const jsonData = JSON.parse(node.json_node);
          if (jsonData.position && jsonData.position.x !== undefined && jsonData.position.y !== undefined) {
            position = `(${jsonData.position.x},${jsonData.position.y})`;
            originalPosition = jsonData.position;
          }
        } catch (err) {
          console.warn('Failed to parse json_node for position:', err);
        }
      }
      
      // If no position found in json_node, use the position field
      if (position === '(0,0)' && node.position) {
        if (typeof node.position === 'string' && node.position.startsWith('(') && node.position.endsWith(')')) {
          position = node.position;
        }
      }

      // Update source_node_id to point to new node ID if it exists
      let newSourceNodeId = node.source_node_id;
      if (node.source_node_id && nodeIdMapping[node.source_node_id]) {
        newSourceNodeId = nodeIdMapping[node.source_node_id];
      }

      // Update json_node to use the new node ID and preserve position
      let updatedJsonNode = node.json_node;
      if (node.json_node) {
        try {
          const jsonData = JSON.parse(node.json_node);
          // Update the ID in the JSON data to match the new node ID
          jsonData.id = newNodeId;
          // Preserve original position data in json_node if it existed
          if (originalPosition) {
            jsonData.position = originalPosition;
          }
          updatedJsonNode = JSON.stringify(jsonData);
        } catch (err) {
          console.warn('Failed to parse json_node, keeping original:', err);
        }
      }

      await sequelize.query(
        `INSERT INTO work_flow_nodes (
          node_id, work_flow_id, name, label, position, style, action_type,
          type, description, type_node, notification_status, attachment_status,
          commit_status, condition_status, action_user_id, smartrouting,
          exclude_users, escalation_time, priority, severity, json_node,
          created_by, updated_by, priority_severity_condition, amount, 
          amount_condition, node_condition, region, sub_region, source_node_id, 
          decision_id, source_sl_no
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        {
          replacements: [
            newNodeId,
            newWorkflowId,
            node.name,
            node.label,
            position, // Properly formatted PostgreSQL point
            node.style,
            node.action_type,
            node.type,
            node.description,
            node.type_node,
            node.notification_status,
            node.attachment_status,
            node.commit_status,
            node.condition_status,
            node.action_user_id,
            node.smartrouting,
            node.exclude_users,
            node.escalation_time,
            node.priority,
            node.severity,
            updatedJsonNode, // Updated JSON with new node ID
            created_by,
            created_by,
            node.priority_severity_condition,
            node.amount,
            node.amount_condition,
            node.node_condition,
            node.region,
            node.sub_region,
            newSourceNodeId, // Updated to use new node ID mapping
            node.decision_id, // Keep decision_id as is (it's not a node reference)
            node.source_sl_no
          ],
          type: sequelize.QueryTypes.INSERT,
          transaction: t
        }
      );
    }

    // Copy edges - simple duplication with updated node references
    const edges = await sequelize.query(
      "SELECT * FROM work_flow_edges WHERE work_flow_id = ?",
      {
        replacements: [originalId],
        type: sequelize.QueryTypes.SELECT,
        transaction: t
      }
    );

    for (const edge of edges) {
      const newEdgeId = uuidv4();
      const newSourceNodeId = nodeIdMapping[edge.source_node_id];
      const newDestinationNodeId = nodeIdMapping[edge.destination_node_id];

      if (newSourceNodeId && newDestinationNodeId) {
        await sequelize.query(
          `INSERT INTO work_flow_edges (
            edge_id, work_flow_id, source_node_id, destination_node_id,
            created_by, label, marker_end, source_handle, target_handle, direction
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          {
            replacements: [
              newEdgeId,
              newWorkflowId,
              newSourceNodeId,
              newDestinationNodeId,
              created_by,
              edge.label,
              edge.marker_end,
              edge.source_handle,
              edge.target_handle,
              edge.direction
            ],
            type: sequelize.QueryTypes.INSERT,
            transaction: t
          }
        );
      }
    }

    await t.commit();
    res.status(200).json({ 
      status: true, 
      message: "Workflow copied successfully",
      data: { id: newWorkflowId, name: newName.trim() }
    });

  } catch (error) {
    await t.rollback();
    console.error("Error copying workflow:", error);
    res.status(500).json({ 
      status: false, 
      message: "Error copying workflow", 
      error: error.message 
    });
  }
};

exports.renameWorkflow = async (req, res) => {
  try {
    const { id, name, updated_by } = req.body;

    // Validate input
    if (!id || !name || !updated_by) {
      return res.status(400).json({ 
        status: false, 
        message: "ID, name, and updated_by are required" 
      });
    }

    // Check if workflow exists
    const [workflow] = await sequelize.query(
      "SELECT org_code FROM work_flows WHERE id = ?",
      {
        replacements: [id],
        type: sequelize.QueryTypes.SELECT,
      }
    );

    if (!workflow) {
      return res.status(404).json({ 
        status: false, 
        message: "Workflow not found" 
      });
    }

    // Check if another workflow with the new name already exists in the same organization
    const [existingWorkflow] = await sequelize.query(
      "SELECT id FROM work_flows WHERE name = ? AND org_code = ? AND id != ? AND work_flow_stage != '0'",
      {
        replacements: [name.trim(), workflow.org_code, id],
        type: sequelize.QueryTypes.SELECT,
      }
    );

    if (existingWorkflow) {
      return res.status(400).json({ 
        status: false, 
        message: "A workflow with this name already exists" 
      });
    }

    // Update workflow name
    await sequelize.query(
      "UPDATE work_flows SET name = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      {
        replacements: [name.trim(), updated_by, id],
        type: sequelize.QueryTypes.UPDATE,
      }
    );

    res.status(200).json({ 
      status: true, 
      message: "Workflow renamed successfully" 
    });

  } catch (error) {
    console.error("Error renaming workflow:", error);
    res.status(500).json({ 
      status: false, 
      message: "Error renaming workflow", 
      error: error.message 
    });
  }
};


// exports.getUsersByHierarchy = async (req, res) => {
//     try {
//       const { org_code } = req.body;  
//       const results = await sequelize.query(`select designation_code, designation_name, designation_level 
//         from cmn_designation_mst where org_code= :org_code order by designation_level`,
//         {
//           replacements: { org_code },
//           type: sequelize.QueryTypes.SELECT,
//         }
//       );  
//       res.status(200).json({ status: true, data: results });
//     } catch (error) {
//       console.error("Error fetching hierarchy users:", error);
//       res.status(500).json({ status: false, message: "Failed to fetch hierarchy users", error: error.message });
//     }
//   };

exports.getOrganizationHierarchyList = async (req, res) => {
    try {
      const { org_code } = req.body;  
      // const results = await sequelize.query(`select distinct level as level_id, 'Level'|| ' ' || level as level_desc  from (
      //   WITH RECURSIVE downward_hierarchy AS (
      //   select u.emp_id, u.first_name || ' ' || u.last_name AS emp_name,u.email,r.role_name, u.reporting_to,
      //   rptu.first_name || ' ' || rptu.last_name AS reporting_emp_name,rptu.email AS reporting_emp_email, 1 AS level
      //   from users u left join hierarchy h on u.emp_id = h.emp_id left join roles r on u.role = r.role_id
      //   left join users rptu on u.reporting_to = rptu.emp_id
      //   where h.effective_end_date is null and u.org_code = :org_code
      //   union all
      //   select u.emp_id, u.first_name || ' ' || u.last_name AS emp_name,u.email,r.role_name, u.reporting_to,
      //   rptu.first_name || ' ' || rptu.last_name AS reporting_emp_name,rptu.email AS reporting_emp_email,dh.level + 1
      //   from users u inner join downward_hierarchy dh on u.reporting_to = dh.emp_id
      //   left join hierarchy h on u.emp_id = h.emp_id left join roles r on u.role = r.role_id
      //   left join users rptu on u.reporting_to = rptu.emp_id where h.effective_end_date is null )
      //   select emp_id,emp_name,email,role_name,reporting_to,reporting_emp_name,reporting_emp_email,level
      //   from downward_hierarchy order by level )`,
       const results = await sequelize.query(`select distinct level:: text as level_id, 'Level'|| ' ' || level as level_desc  from (
        WITH RECURSIVE organization_levels AS (
        select u.emp_id, u.first_name || ' ' || u.last_name AS emp_name,u.email,r.role_name, u.reporting_to,
        rptu.first_name || ' ' || rptu.last_name AS reporting_emp_name,rptu.email AS reporting_emp_email, 1 AS level
        from users u left join hierarchy h on u.emp_id = h.emp_id left join roles r on u.role = r.role_id
        left join users rptu on u.reporting_to = rptu.emp_id
        where h.effective_end_date is null and u.org_code = :org_code
        union all
        select u.emp_id, u.first_name || ' ' || u.last_name AS emp_name,u.email,r.role_name, u.reporting_to,
        rptu.first_name || ' ' || rptu.last_name AS reporting_emp_name,rptu.email AS reporting_emp_email,dh.level + 1
        from users u inner join organization_levels dh on u.reporting_to = dh.emp_id
        left join hierarchy h on u.emp_id = h.emp_id left join roles r on u.role = r.role_id
        left join users rptu on u.reporting_to = rptu.emp_id where h.effective_end_date is null )
        select emp_id,emp_name,email,role_name,reporting_to,reporting_emp_name,reporting_emp_email,level
        from organization_levels order by level ) 
        union all select 'Admin' ::text  as level_id,'Admin' as level_desc`,
        {
          replacements: { org_code },
          type: sequelize.QueryTypes.SELECT,
        }
      );  
      res.status(200).json({ status: true, data: results });
    } catch (error) {
      console.error("Error fetching hierarchy users:", error);
      res.status(500).json({ status: false, message: "Failed to fetch hierarchy users", error: error.message });
    }
  };


  // Get list of unique regions for an org
exports.getOrganizationRegionList = async (req, res) => {
  try {
    const { org_code } = req.body;
    let results = await sequelize.query(
      `SELECT DISTINCT region FROM users WHERE org_code = :org_code AND user_active = 'true' ORDER BY region`,
      {
        replacements: { org_code },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    res.status(200).json({ status: true, data: results });
  } catch (error) {
    console.error("Error fetching organization region list:", error);
    res.status(500).json({
      status: false,
      message: "Failed to fetch organization region list",
      error: error.message,
    });
  }
};

// Get list of unique subregions for a given org and region
exports.getOrganizationSubRegionList = async (req, res) => {
  try {
    const { org_code, region } = req.body;
    let results = await sequelize.query(
      `SELECT DISTINCT sub_region FROM users WHERE org_code = :org_code AND region = :region AND user_active = 'true' ORDER BY sub_region`,
      {
        replacements: { org_code, region },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    res.status(200).json({ status: true, data: results });
  } catch (error) {
    console.error("Error fetching organization subregion list:", error);
    res.status(500).json({
      status: false,
      message: "Failed to fetch organization subregion list",
      error: error.message,
    });
  }
};




  exports.getOrganizationSmartRoutingList = async (req, res) => {
    try {
      const { org_code } = req.body;  
        
       let results = await sequelize.query(`select * from 
(SELECT
            INITCAP(REPLACE(column_name, '_', ' ')) AS smartRouting
          FROM information_schema.columns
          WHERE table_name   = 'prod_quota'
            AND column_name IN ('region','sub_region','department')
          ORDER BY column_name asc )
UNION all
(SELECT 'Roles' as smartRegion)`,
        {
          replacements: { org_code },
          type: sequelize.QueryTypes.SELECT,
        }
      );  
      res.status(200).json({ status: true, data: results });
    } catch (error) {
      console.error("Error fetching organization smart routing list :", error);
      res.status(500).json({ status: false, message: "Failed to fetch organization smart routing list. ", error: error.message });
    }
  };

  
  exports.getOrganizationSubSmartRoutingList = async (req, res) => {
  try {
    const { org_code, region } = req.body;

    if (!region) {
      return res
        .status(400)
        .json({ status: false, message: 'Missing search_key' });
    }
 
    const normalize = str =>
      str.toString().toLowerCase().replace(/[\s_]+/g, '');
 
    const allowedColumns = {
      department: 'department',
      region:     'region',
      subregion:  'sub_region', 
      roles : 'Roles',
    };

    const keyNorm = normalize(region);
    const col_name = allowedColumns[keyNorm];

    if (!col_name) {
      return res
        .status(400)
        .json({ status: false, message: `Invalid search_key: ${region}` });
    }
    let sql = null;
if(col_name!='Roles'){  //prod_quota
     sql = `
      SELECT DISTINCT ${col_name} as subSmartRouting
      FROM users
      WHERE org_code = :org_code and ${col_name} is not null  and length( ${col_name})>0
      ORDER BY ${col_name};
    `;
  } else {
    sql =` SELECT b.role_id, b.role_name as subSmartRegion FROM  roles b where org_code ='${org_code}'  ` ;
  }
    const results = await sequelize.query(sql, {
      replacements: { org_code },
      type: sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({ status: true, data: results });
  } catch (error) {
    console.error('Error fetching organization routing list:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to fetch organization routing list',
      error: error.message,
    });
  }
};


// POST /api/workflows/execute
exports.executeWorkflow = async (req, res) => {
  try {
    const { workflow_id, payload } = req.body;
    // Fetch workflow nodes/edges using your existing query
    const [workflow] = await sequelize.query(
      `SELECT id FROM work_flows WHERE id = :id`,
      { replacements: { id: workflow_id }, type: sequelize.QueryTypes.SELECT }
    );
    if (!workflow) return res.status(404).json({ status: false, message: 'Workflow not found' });

    // Fetch nodes
    const nodes = await sequelize.query(
      `SELECT * FROM work_flow_nodes WHERE work_flow_id = :id`,
      { replacements: { id: workflow_id }, type: sequelize.QueryTypes.SELECT }
    );
    // Fetch edges
    const edges = await sequelize.query(
      `SELECT * FROM work_flow_edges WHERE work_flow_id = :id`,
      { replacements: { id: workflow_id }, type: sequelize.QueryTypes.SELECT }
    );
    // Format as engine expects
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

    // Run engine!
    const result = await runWorkflowEngine({ nodes: cleanNodes, edges: cleanEdges }, payload);
    res.json({ status: true, ...result });
  } catch (e) {
    res.status(500).json({ status: false, message: e.message });
  }
};

// Get workflow templates for library
exports.getTemplateList = async (req, res) => {
  try {
    const { org_code } = req.body;
    
    if (!org_code) {
      return res.status(400).json({ 
        status: false, 
        message: "Organization code is required" 
      });
    }

    // Fetch workflow templates
    const templates = await sequelize.query(
      `SELECT 
        wf.id, 
        wf.name, 
        wf.type, 
        wf.template_description as description,
        wf.template_category as category,
        wf.created_at,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM work_flows AS wf 
      LEFT JOIN users u ON u.emp_id = wf.created_by 
      WHERE wf.is_template = true 
        AND wf.work_flow_stage = '1' 
        AND (wf.org_code = :org_code OR wf.community_access = 'public')
        AND wf.work_flow_status = '2'
      ORDER BY wf.template_category, wf.name`,
      {
        replacements: { org_code },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    return res.status(200).json({
      status: true,
      message: "Templates fetched successfully",
      data: templates,
    });
  } catch (error) {
    console.error("Error fetching templates:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch templates",
      error: error.message,
    });
  }
};

// Create workflow from template
exports.createFromTemplate = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { templateId, newName, created_by, org_code } = req.body;

    // Validate input
    if (!templateId || !newName || !created_by || !org_code) {
      await t.rollback();
      return res.status(400).json({ 
        status: false, 
        message: "Template ID, new name, created_by, and org_code are required" 
      });
    }

    // Check if template exists and is accessible
    const [template] = await sequelize.query(
      `SELECT * FROM work_flows 
       WHERE id = ? 
         AND is_template = true 
         AND work_flow_stage = '1' 
         AND work_flow_status = '2'
         AND (org_code = ? OR community_access = 'public')`,
      {
        replacements: [templateId, org_code],
        type: sequelize.QueryTypes.SELECT,
        transaction: t
      }
    );

    if (!template) {
      await t.rollback();
      return res.status(404).json({ 
        status: false, 
        message: "Template not found or not accessible" 
      });
    }

    // Check if workflow with new name already exists
    const [existingWorkflow] = await sequelize.query(
      "SELECT id FROM work_flows WHERE name = ? AND org_code = ? AND work_flow_stage != '0'",
      {
        replacements: [newName.trim(), org_code],
        type: sequelize.QueryTypes.SELECT,
        transaction: t
      }
    );

    if (existingWorkflow) {
      await t.rollback();
      return res.status(400).json({ 
        status: false, 
        message: "A workflow with this name already exists" 
      });
    }

    // Create new workflow from template
    const [newWorkflow] = await sequelize.query(
      `INSERT INTO work_flows (
        name, type, status, work_flow_stage, community_access, 
        mail_template_id, hours_workflow, created_by, updated_by, org_code,
        workflow_version, work_flow_status, price, currency, is_template
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      {
        replacements: [
          newName.trim(),
          template.type,
          template.status,
          '1', // Normal workflow stage
          'private', // User workflows are private by default
          template.mail_template_id,
          template.hours_workflow,
          created_by,
          created_by,
          org_code,
          1, // Start with version 1
          '1', // Pending approval
          template.price || 0,
          template.currency || 'USD',
          false // Not a template
        ],
        type: sequelize.QueryTypes.SELECT,
        transaction: t
      }
    );

    const newWorkflowId = newWorkflow.id;

    // Copy nodes from template
    const nodes = await sequelize.query(
      "SELECT * FROM work_flow_nodes WHERE work_flow_id = ?",
      {
        replacements: [templateId],
        type: sequelize.QueryTypes.SELECT,
        transaction: t
      }
    );

    const nodeIdMapping = {};
    for (const node of nodes) {
      const newNodeId = uuidv4();
      nodeIdMapping[node.node_id] = newNodeId;
    }

    // Insert copied nodes with new IDs
    for (const node of nodes) {
      const newNodeId = nodeIdMapping[node.node_id];

      // Extract position from json_node first, then fallback to position field
      let position = '(0,0)';
      let originalPosition = null;
      
      if (node.json_node) {
        try {
          const jsonData = JSON.parse(node.json_node);
          if (jsonData.position && jsonData.position.x !== undefined && jsonData.position.y !== undefined) {
            position = `(${jsonData.position.x},${jsonData.position.y})`;
            originalPosition = jsonData.position;
          }
        } catch (err) {
          console.warn('Failed to parse json_node for position:', err);
        }
      }
      
      if (position === '(0,0)' && node.position) {
        if (typeof node.position === 'string' && node.position.startsWith('(') && node.position.endsWith(')')) {
          position = node.position;
        }
      }

      // Update source_node_id mapping
      let newSourceNodeId = node.source_node_id;
      if (node.source_node_id && nodeIdMapping[node.source_node_id]) {
        newSourceNodeId = nodeIdMapping[node.source_node_id];
      }

      // Update json_node with new ID and preserved position
      let updatedJsonNode = node.json_node;
      if (node.json_node) {
        try {
          const jsonData = JSON.parse(node.json_node);
          jsonData.id = newNodeId;
          if (originalPosition) {
            jsonData.position = originalPosition;
          }
          updatedJsonNode = JSON.stringify(jsonData);
        } catch (err) {
          console.warn('Failed to update json_node:', err);
        }
      }

      await sequelize.query(
        `INSERT INTO work_flow_nodes (
          node_id, work_flow_id, name, label, position, style, action_type,
          type, description, type_node, notification_status, attachment_status,
          commit_status, condition_status, action_user_id, smartrouting,
          exclude_users, escalation_time, priority, severity, json_node,
          created_by, updated_by, priority_severity_condition, amount, 
          amount_condition, node_condition, region, sub_region, source_node_id, 
          decision_id, source_sl_no
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        {
          replacements: [
            newNodeId, newWorkflowId, node.name, node.label, position, node.style,
            node.action_type, node.type, node.description, node.type_node,
            node.notification_status, node.attachment_status, node.commit_status,
            node.condition_status, node.action_user_id, node.smartrouting,
            node.exclude_users, node.escalation_time, node.priority, node.severity,
            updatedJsonNode, created_by, created_by, node.priority_severity_condition,
            node.amount, node.amount_condition, node.node_condition, node.region,
            node.sub_region, newSourceNodeId, node.decision_id, node.source_sl_no
          ],
          type: sequelize.QueryTypes.INSERT,
          transaction: t
        }
      );
    }

    // Copy edges from template
    const edges = await sequelize.query(
      "SELECT * FROM work_flow_edges WHERE work_flow_id = ?",
      {
        replacements: [templateId],
        type: sequelize.QueryTypes.SELECT,
        transaction: t
      }
    );

    for (const edge of edges) {
      const newEdgeId = uuidv4();
      const newSourceNodeId = nodeIdMapping[edge.source_node_id];
      const newDestinationNodeId = nodeIdMapping[edge.destination_node_id];

      if (newSourceNodeId && newDestinationNodeId) {
        await sequelize.query(
          `INSERT INTO work_flow_edges (
            edge_id, work_flow_id, source_node_id, destination_node_id,
            created_by, label, marker_end, source_handle, target_handle, direction
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          {
            replacements: [
              newEdgeId, newWorkflowId, newSourceNodeId, newDestinationNodeId,
              created_by, edge.label, edge.marker_end, edge.source_handle,
              edge.target_handle, edge.direction
            ],
            type: sequelize.QueryTypes.INSERT,
            transaction: t
          }
        );
      }
    }

    await t.commit();
    res.status(200).json({ 
      status: true, 
      message: "Workflow created from template successfully",
      data: { id: newWorkflowId, name: newName.trim() }
    });

  } catch (error) {
    await t.rollback();
    console.error("Error creating workflow from template:", error);
    res.status(500).json({ 
      status: false, 
      message: "Error creating workflow from template", 
      error: error.message 
    });
  }
};

// Mark workflow as template (admin only)
exports.markAsTemplate = async (req, res) => {
  try {
    const { id, description, category, updated_by } = req.body;

    // Validate input
    if (!id || !updated_by) {
      return res.status(400).json({ 
        status: false, 
        message: "Workflow ID and updated_by are required" 
      });
    }

    // Check if workflow exists and is approved
    const [workflow] = await sequelize.query(
      "SELECT * FROM work_flows WHERE id = ? AND work_flow_status = '2'",
      {
        replacements: [id],
        type: sequelize.QueryTypes.SELECT,
      }
    );

    if (!workflow) {
      return res.status(404).json({ 
        status: false, 
        message: "Workflow not found or not approved" 
      });
    }

    // Update workflow to mark as template
    await sequelize.query(
      `UPDATE work_flows 
       SET is_template = true, 
           template_description = ?, 
           template_category = ?, 
           updated_by = ?, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      {
        replacements: [description || workflow.name, category || workflow.type, updated_by, id],
        type: sequelize.QueryTypes.UPDATE,
      }
    );

    res.status(200).json({ 
      status: true, 
      message: "Workflow marked as template successfully" 
    });

  } catch (error) {
    console.error("Error marking workflow as template:", error);
    res.status(500).json({ 
      status: false, 
      message: "Error marking workflow as template", 
      error: error.message 
    });
  }
};