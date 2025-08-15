const sequelize = require('../config/db');
const utils     = require('../utils/utils'); 

// create a new role
exports.createNewRole = async (req, res) => {
  const data = req.body;
  const missing = validationForCreateOrUpdateRole(data);
  if (missing.length) {
    return res.status(400).json({
      status: false,
      message: `Missing or invalid: ${missing.join(', ')}`
    });
  }

  const trans = await sequelize.transaction();
  try {
    // Unique role_id
    let roleId;
    do {
      roleId = 'RL_' + utils.generateRandomString(4);
      const dup = await sequelize.query(
        `SELECT 1 FROM roles WHERE role_id = :roleId OR (role_name = :role_name AND org_code = :org_code) LIMIT 1`,
        { replacements: { roleId, role_name: data.role_name, org_code: data.org_code }, type: sequelize.QueryTypes.SELECT, transaction: trans }
      );
      if (dup.length === 0) break;
    } while (true);

    // Insert role
    await sequelize.query(
      `INSERT INTO roles (role_name, role_id, description, status, org_code, created_by)
       VALUES (:role_name, :role_id, :description, true, :org_code, :created_by)`,
      { replacements: {
          role_name: data.role_name,
          role_id:   roleId,
          description: data.description || null,
          org_code:  data.org_code,
          created_by: data.done_by
        },
        type: sequelize.QueryTypes.INSERT,
        transaction: trans
      }
    );

    // role_permissions
    const permRows = data.permissions.map(p => [
      roleId, data.org_code, p.page_id, p.view, p.edit, p.delete,
      '1', p.add, p.download, data.done_by
    ]);
    await dataInsertToTables(trans, 'role_permissions', [
      'fk_role_id','org_code','page_id','is_view','is_edit','is_delete',
      'status','is_add','is_download','created_by'
    ], permRows);

    // templates rows
    const tmplRows = data.templates.map(tpl => [
      data.org_code, roleId, tpl.id, tpl.id, tpl.dreamType, tpl.effectiveDate, data.done_by, 
    ]);
    await dataInsertToTables(trans, 'cmn_user_role_template_mappring', [
      'org_code','role_id','template_id','work_flow_id','licence_type','effective_from_date','created_by','created_date'
    ], tmplRows.map(r => [...r, 'NOW()']));  

    await trans.commit();
    res.status(201).json({ status: true, message: 'New role created successfully.', role_id: roleId });
  } catch (err) {
    await trans.rollback();
    console.error('createNewRole error:', err);
    res.status(500).json({ status: false, message: err.message });
  }
};


// validation
function validationForCreateOrUpdateRole(data, requireId = false) {
  const errors = [];
  if (requireId && !data.role_id)           errors.push('role_id');
  if (!data.role_name)                      errors.push('role_name');
  if (!data.org_code)                       errors.push('org_code');
  if (!data.done_by)                        errors.push('created_by');
  if (!Array.isArray(data.permissions) || data.permissions.length === 0)
    errors.push('permissions');
  if (!Array.isArray(data.templates) || data.templates.length === 0)
    errors.push('templates');
  return errors;
}

// insert rows into tables(role_permissions,cmn_user_role_template_mappring)
async function dataInsertToTables(transaction, table, columns, rows) {
  const placeholders = rows.map(() => `(${columns.map(() => '?').join(',')})`).join(',');
  const sql = `INSERT INTO ${table} (${columns.join(',')}) VALUES ${placeholders}`;
  const flat = rows.flat();
  return sequelize.query(sql, { replacements: flat, type: sequelize.QueryTypes.INSERT, transaction });
}

// delete existing data from tables(role_permissions,cmn_user_role_template_mappring)
async function deleteDataFromTables(transaction, role_id, org_code) {
  await Promise.all([
    sequelize.query(`DELETE FROM role_permissions WHERE fk_role_id = :role_id AND org_code = :org_code`,
      { replacements: { role_id, org_code }, type: sequelize.QueryTypes.DELETE, transaction }
    ),
    sequelize.query(`DELETE FROM cmn_user_role_template_mappring WHERE role_id = :role_id AND org_code = :org_code`,
      { replacements: { role_id, org_code }, type: sequelize.QueryTypes.DELETE, transaction }
    )
  ]);
}

// update Role Details
exports.selectedRoleUpdatedDetails = async (req, res) => {
  const data = req.body;
  const missing = validationForCreateOrUpdateRole(data, true);
  if (missing.length) {
    return res.status(400).json({
      status: false,
      message: `Missing or invalid: ${missing.join(', ')}`
    });
  }

  const trans = await sequelize.transaction();
  try {
    // Check duplicate name
    const dup = await sequelize.query(
      `SELECT 1 FROM roles WHERE org_code = :org_code AND role_name = :role_name AND role_id != :role_id LIMIT 1`,
      { 
        replacements: { org_code: data.org_code, role_name: data.role_name, role_id: data.role_id },
        type: sequelize.QueryTypes.SELECT, 
        transaction: trans 
      }
    );
    if (dup.length) {
      await trans.rollback();
      return res.status(400).json({ status: false, message: 'Name already in use' });
    }

    // Update selected role details
    await sequelize.query(
      `UPDATE roles SET role_name = :role_name, description = :description, updated_by = :updated_by, updated_at = NOW()
       WHERE role_id = :role_id AND org_code = :org_code`,
      { 
        replacements: {
          role_name: data.role_name,
          description: data.description,
          updated_by: data.done_by,
          role_id: data.role_id,
          org_code: data.org_code
        },
        type: sequelize.QueryTypes.UPDATE,
        transaction: trans
      }
    );

    // Delete old permissions and template mappings
    await deleteDataFromTables(trans, data.role_id, data.org_code);

    // Insert new permissions
    if (data.permissions && data.permissions.length > 0) {
      const permRows = data.permissions.map(p => [
        data.role_id, data.org_code, p.page_id, p.view, p.edit, p.delete, '1', p.add, p.download, data.done_by, 'NOW()'
      ]);
      await dataInsertToTables(trans, 'role_permissions', [
        'fk_role_id', 'org_code', 'page_id', 'is_view', 'is_edit', 'is_delete', 'status', 'is_add', 'is_download', 'created_by', 'created_at'
      ], permRows);
    }

    // MAIN FIX: Get correct workflow IDs for templates
    if (data.templates && data.templates.length > 0) {
      const tmplRows = [];
      
      for (const tpl of data.templates) {
        // Query the correct workflow_id for each template
        const [templateInfo] = await sequelize.query(
          `SELECT work_flow_id FROM templates WHERE id = :template_id AND org_code = :org_code`,
          {
            replacements: { template_id: tpl.id, org_code: data.org_code },
            type: sequelize.QueryTypes.SELECT,
            transaction: trans
          }
        );

        if (!templateInfo || !templateInfo.work_flow_id) {
          console.warn(`Template ${tpl.id} not found or has no workflow`);
          continue; 
        }

        console.log(`Template ${tpl.id} ? Workflow ${templateInfo.work_flow_id}`);

        // Use the CORRECT workflow_id from database
        tmplRows.push([
          data.org_code, 
          data.role_id, 
          tpl.id,                        
          templateInfo.work_flow_id,     
          tpl.dreamType, 
          tpl.effectiveDate, 
          data.done_by, 
          'NOW()'
        ]);
      }

      if (tmplRows.length > 0) {
        await dataInsertToTables(trans, 'cmn_user_role_template_mappring', [
          'org_code', 'role_id', 'template_id', 'work_flow_id', 'licence_type', 'effective_from_date', 'created_by', 'created_date'
        ], tmplRows);
      }
    }

    await trans.commit();
    res.status(200).json({ 
      status: true, 
      message: 'Selected role details updated successfully.', 
      role_id: data.role_id 
    });
    
  } catch (err) {
    await trans.rollback();
    console.error('updateSelectedRoleDetails error:', err);
    res.status(500).json({ status: false, message: err.message });
  }
};

exports.getRolesList = async (req, res) => {
  const { org_code } = req.body;
  if (!org_code) {
    return res.status(400).json({ status: false, message: 'org_code is required' });
  }
  try {
    const roles = await sequelize.query(
      ` SELECT r.id,r.role_name,r.role_id,r.org_code,r.status,r.level,r.description         
      FROM roles r WHERE r.org_code = :org_code ORDER BY r.role_name asc`,
      {
        replacements: { org_code },
        type: sequelize.SELECT
      }
    );
    return res.status(200).json({
      status: true,
      data: roles
    });
  } catch (error) {
    console.error('Error in getAllRoles:', error);
    return res.status(500).json({ status: false, message: error.message });
  }
};
 
exports.viewRolePermissions = async (req, res) => {
  try { 
    const data = req.body; 
    if ( !data.role_id) {
      return res.status(400).json({ status: false, message: 'role_id is required' });
    }
    console.log("------------ viewRolePermissions -------START---------")
    const roleId = data.role_id; 
    const permResults = await sequelize.query(
      ` SELECT r.role_name,r.description, mp.menu_order, mp.page_name, mp.route AS slug, mp.icon, rp.fk_role_id, rp.page_id,
        rp.is_view,rp.is_edit,rp.is_delete,rp.is_list,rp.is_add,rp.is_download,rp.is_approve,rp.parent_page_id,rp.created_by
      FROM role_permissions rp JOIN master_pages mp ON mp.id = rp.page_id
      JOIN roles r ON r.role_id = rp.fk_role_id
      WHERE rp.fk_role_id = :roleId ORDER BY mp.menu_order `,
      {
        replacements: { roleId },
        type: sequelize.QueryTypes.SELECT
      }
    );
    if (permResults.length === 0) {
      return res.status(200).json({ status: false, message: 'No permissions found for this role' });
    }
    const permissions = permResults.map(row => ({
      page_id:       row.page_id,
      page_name:       row.page_name,
      parent_page_id: row.parent_page_id,
      created_by:    row.created_by,
      view:          row.is_view,
      edit:          row.is_edit,
      add:           row.is_add,
      delete:        row.is_delete,
      download:      row.is_download,
      approve:       row.is_approve
    }));

    const { role_name, description, fk_role_id: id } = permResults[0];

    const tmplResults = await sequelize.query(
      ` SELECT template_id as id,work_flow_id,licence_type,to_char(effective_from_date, 'YYYY-MM-DD') AS effective_from_date, created_by
      FROM cmn_user_role_template_mappring WHERE role_id = :roleId
      ORDER BY effective_from_date DESC
      `,
      {
        replacements: { roleId },
        type: sequelize.QueryTypes.SELECT
      }
    );
    const templates = tmplResults.map(t => ({
      id:                   t.id,
      template_id:          t.template_id,
      work_flow_id:         t.work_flow_id,
      licence_type:         t.licence_type,
      effective_from_date:  t.effective_from_date,
      created_by:           t.created_by
    }));
    console.log("------------ viewRolePermissions ---------END-------")
    return res.status(200).json({
      status: true,
      data: {
        role: {
          id,
          role_name,
          description
        },
        permissions,
        templates
      }
    });
    
  } catch (err) {
    console.error('viewRolePermissions error:', err);
    return res.status(500).json({ status: false, message: err.message });
  }
};

exports.changeStatus = async (req, res) => {
  const data = req.body;
  if (R.isEmpty(data)) {
      return response.status(400).json({ "status": false, "message": "Data object required" });
  }
  try {
      const unique_id = data.unique_id;
      const id = parseInt(data.id, 10);
      const status = data.status;
      let query = "";
      if (data.slug == "roles") {
          query = `UPDATE roles SET status = :status WHERE role_id = :uniqueId AND id = :id`;
      }
      if (data.slug == "users") {
          query = "update users set  status='" + status + "' where emp_id='" + unique_id + "' and id=" + id + " "
      }
      if (data.slug == "workflow") {
          query = "update work_flows set  status='" + status + "' where  id=" + id + " "
      }         
      let result = await sequelize.query(
          query, {
          replacements: {status,uniqueId: unique_id,id,},
          type: sequelize.QueryTypes.UPDATE,
      }
      );
      // Return the generated role_id
      if (result) {
          return res.status(200).json({ "status": true, "message": "Status change" })
      }
      else {
          return res.status(200).json({ status: false, "message": "Error while creating role" })
      }
  } catch (error) {
      return res.status(200).json({ status: false, "message": error.message })
  }
};

exports.deleteRole = async (req, res) => {
  try {
    const { id } = req.body; 
    if (!id) {
        return res.status(400).json({ status: false, message: "User ID is required" });
    } 
    const user = await sequelize.query("SELECT id FROM roles WHERE role_id = ?",
      {
          replacements: [id],
          type: sequelize.QueryTypes.SELECT,
      }
    );
    if (user.length === 0) {
        return res.status(404).json({ status: false, message: "User not found" });
    }
        // Soft delete (set status = false)
    await sequelize.query(`UPDATE roles SET status = ? WHERE role_id = ?`,
      {
          replacements: [false, id],
          type: sequelize.QueryTypes.UPDATE,
      }
    );
        res.status(200).json({ status: true, message: "Role deleted successfully" });
  } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ status: false, message: "Error deleting user", error: error.message });
  }
};