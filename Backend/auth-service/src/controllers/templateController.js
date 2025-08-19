const Template = require('./../models/Template');
const sequelize = require('../config/db');

// Create a new template
exports.createTemplate = async (req, res) => {
  // try {
    const { name, template_type, work_flow_id, drag_data, created_by, org_code } = req.body;
    const status = 1;

    // Check if template already exists for the given name and organization
    const existingTemplate = await Template.findOne({
      where: {
        name: name,
        org_code: org_code,
      },
    });

    if (existingTemplate) {  // Fixed variable name
      return res.status(200).json({
        status: false,
        message: "A Template with the same name already exists in this organization",
      });
    }

    // Create a new template
    const template = await Template.create({
      org_code,
      name,
      template_type,
      work_flow_id,
      created_by,
      status,
    });

    // If drag_data exists, insert custom fields
    if (drag_data && drag_data.length > 0) {
      for (const drag of drag_data) {
        const query = `
          INSERT INTO template_custom_fields (
            custom_field_id, template_id, order_id, created_by
          )
          VALUES (?, ?, ?, ?)
        `;
        
        const values = [
          drag.value || null,  // Node ID or null if undefined
          template.id,  // Template ID
          drag.id,      // Order ID or ID of the drag data item
          created_by,   // Creator's identifier
        ];

        try {
          // Execute the custom query
          await sequelize.query(query, { replacements: values, type: sequelize.QueryTypes.INSERT });
        } catch (err) {
          console.error("Error inserting node:", err);
          throw err;  // Propagate error to the outer catch block
        }
      }
    }

    // Respond with the created template
    res.status(201).json({
      message: 'Template created successfully',
      data: template,
    });

  // } catch (error) {
  //   // Log the error and send a response with a failure message
  //   console.error(error);
  //   res.status(500).json({
  //     message: 'Failed to create template',
  //     error: error.message,
  //   });
  // }
};


// Get a specific template by ID
exports.getTemplateById = async (req, res) => {
  try {
    const id=req.params.id;
    const template = await Template.findByPk(id);

    if (!template) return res.status(404).json({ message: 'Template not found' });

    const dragData = await sequelize.query(
      `SELECT custom_field_id, template_id, order_id, created_by FROM template_custom_fields WHERE template_id = :id`,
      {
          replacements: {id },
          type: sequelize.QueryTypes.SELECT,
      }
  );
  const drag_data = dragData.map(drag => ({
    id: drag.order_id.toString(),
    value:drag.custom_field_id

}));

    res.status(200).json({ data: template, drag_data});
  } catch (error) {
    res.status(500).json({ message: 'Error fetching template', error: error.message });
  }
};

// Update an existing template
exports.updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type,resaon_code,commit, availableFields } = req.body;

    const template = await Template.findByPk(id);

    if (!template) return res.status(404).json({ message: 'Template not found' });

    await template.update({ name, type, resaon_code,commit, availableFields });

    res.status(200).json({ message: 'Template updated successfully', data: template });
  } catch (error) {
    res.status(500).json({ message: 'Error updating template', error: error.message });
  }
};

// Delete a template
exports.deleteTemplate = async (req, res) => {
  try {
    const data=req.body;
    var id = data.id;
    const template = await Template.findByPk(id);

    if (!template) return res.status(404).json({ message: 'Template not found' });

    await template.destroy();

    res.status(200).json({ status:true, message: 'Template deleted successfully' });
  } catch (error) {
    res.status(500).json({status:false, message: 'Error deleting template', error: error.message });
  }
};

// Get all templates
exports.getAllTemplates = async (req, res) => {
  try {
    // const templates = await Template.findAll();
    const templates = await sequelize.query('SELECT * FROM templates', {
      type: sequelize.QueryTypes.SELECT,
  });
    res.status(200).json({ data: templates });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching templates', error: error.message });
  }
};

exports.getWorkFlowList = async (req, res) => {
    const data = req.body;

    try {
        if (Object.keys(data).length !== 0) {
            const searchKey = data.search_key || '';
            const pageNumber = parseInt(data.page_number, 10) || 1;
            const pageSize = parseInt(data.page_size, 10) || 20;

            // Base query
            let query = `
                    SELECT 
                        wf.id, 
                        wf.name,
                        wf.type,
                        wf.status,
                        wf.work_flow_stage,
                        wf.community_access,
                        wf.org_code,
                        wf.created_at,
                        wf.updated_at,
                        u.first_name,
                        u.last_name,
                        us.first_name as up_first_name,
                        us.last_name as up_last_name,
                        wf.work_flow_status
                    FROM 
                        work_flows AS wf 
                    LEFT JOIN 
                        users u ON u.id = wf.created_by::INTEGER 
                    LEFT JOIN 
                        users us ON us.id = wf.updated_by::INTEGER
                    WHERE 
                        wf.name IS NOT NULL
            `;

            // Add search conditions if a search key is provided
            if (searchKey) {
                query += `
                    AND LOWER(wf.name) LIKE LOWER(:searchKey)
                `;
            }

            // Count query for total records
            const countQuery = `
                SELECT COUNT(*) AS total_count
                FROM work_flows
                WHERE status = true
                ${searchKey ? `AND LOWER(name) LIKE LOWER(:searchKey)` : ''}
            `;

            // Add sorting and pagination
            query += `
                ORDER BY wf.name
                LIMIT :limit OFFSET :offset
            `;

            // Fetch total count
            const countResult = await sequelize.query(countQuery, {
                replacements: { searchKey: `%${searchKey}%` },
                type: sequelize.QueryTypes.SELECT,
            });

            const totalRecords = countResult[0]?.total_count || 0;

            // Fetch paginated results
            const result = await sequelize.query(query, {
                replacements: {
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

exports.getWorkDropDown = async (req, res) => {
  try {
    const { search_key } = req.query;
    const { org_code } = req.body; // Get org_code from request body
    
    // Modified query to show only the most recent workflow for each unique name
    // This will help avoid showing multiple "Copy" versions of the same workflow
    // Also filter by org_code for data isolation
    let query = `
      SELECT wf.id, wf.name 
      FROM work_flows wf
      WHERE wf.status = false 
        AND wf.work_flow_status = '2'
        AND wf.org_code = ?
        AND wf.id = (
          SELECT MAX(wf2.id) 
          FROM work_flows wf2 
          WHERE wf2.name = wf.name 
            AND wf2.status = false 
            AND wf2.work_flow_status = '2'
            AND wf2.org_code = ?
        )
    `;

    let replacements = [org_code, org_code]; // Add org_code to replacements twice for both WHERE clauses

    if (search_key) {
      query += ' AND wf.name LIKE ?';
      replacements.push(`%${search_key}%`);
    }
    
    query += ' ORDER BY wf.name';
    
    const getWorkDropDown = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT,
      replacements: replacements
    });

    res.status(200).json({ data: getWorkDropDown });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching workflows', error: error.message });
  }
};

exports.getTemplateTypeDropDown = async (req, res) => {
  try {
    const { search_key } = req.query;
    
    let query = `SELECT id, name FROM master_template_types WHERE status=true `;
    let replacements = [];

    if (search_key) {
      query += ' AND name LIKE ?';
      replacements.push(`%${search_key}%`);
    }
    
    const getDropDown = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT,
      replacements: replacements
    });

    res.status(200).json({ data: getDropDown });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching templates', error: error.message });
  }
};