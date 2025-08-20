// const Pages = require('../models/Pages'); // Adjust the path to your Sequelize model
const Template = require('./../models/Template');
const sequelize = require('../config/db');
const utils = require('../utils/utils');
const R = require('ramda');
// const bcrypt = require('bcryptjs');
const { Op } = require("sequelize");
const sgMail = require("@sendgrid/mail");
const API_KEY = process.env.SEND_GRID_EMAIL_API_KEY
const SENDGRID_EMAIL = process.env.SENDGRID_EMAIL
const URL = process.env.URL
const { sendEmail } = require('./customFieldsController');
const multer = require("multer");
const xlsx = require("xlsx");
 

exports.getMasterPages = async (req, res) => {
    try { 
        const pages = await sequelize.query('SELECT * FROM master_pages', {
            type: sequelize.QueryTypes.SELECT,
        }); 
        if (!pages || pages.length === 0) {
            return res.status(404).json({ message: 'No master pages found' });
        }
        if (pages.length != 0) {
            let mainPages = [];
            pages.forEach((parentRow, pkey) => {
                let page = {
                    'page_id': parentRow['id'],
                    'parent_page_id': null,
                    'page_name': parentRow['page_name'],
                    'slug': parentRow['route'],
                    'icon': parentRow['icon'],
                    'permissions': {
                        'view': parentRow['view'],
                        'edit': parentRow['edit'],
                        'add': parentRow['add'],
                        'delete': parentRow['delete'],
                        'download': parentRow['download'],
                        'approve': parentRow['approve']
                    }
                }
                let subPages = [];
                pages.forEach((childRow, ckey) => {
                    if (parentRow['id'] == parseInt(childRow['parent_page_id'])) {
                        submenu = {
                            'page_id': childRow['id'],
                            'parent_page_id': parentRow['id'],
                            'page_name': childRow['page_name'],
                            'slug': childRow['route'],
                            'icon': childRow['icon'],
                            'permissions': {
                                'view': childRow['view'],
                                'edit': childRow['edit'],
                                'add': childRow['add'],
                                'delete': childRow['delete'],
                                'download': childRow['download'],
                                'approve': childRow['approve']
                            }
                        }
                        subPages.push(submenu);
                    }
                })
                page['submenu'] = subPages;
                if (parentRow.parent_page_id == null) {
                    mainPages.push(page);
                }
            }) 
            res.status(200).json({ "status": true, "data": mainPages })
        } else {
            res.status(200).json({ "status": true, "messsage": "No data found" })
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// exports.insertRoleName = async (req, res) => {
//     try {
//         const data = req.body;
//         const role_name = data.role_name;
//         const created_by = data.done_by;
//         const description = data.description;
//         const org_code = data.org_code;
        
//         if (!role_name || !created_by || !org_code) {
//             return res.status(400).json({ status: false, message: "Missing required fields" });
//         }
//         let role = utils.generateRandomString(4);
//         const role_id = "RL_" + role;
//         const status = true;
//         // Check if role_name or role_id already exists in the same organization
//         let existingRoles = await sequelize.query(
//             "SELECT * FROM roles WHERE (role_name = ? OR role_id = ?) AND org_code = ?  and status = ?",
//             {
//                 replacements: [role_name, role_id, org_code,true], 
//                 type: sequelize.QueryTypes.SELECT, 
//             }
//         );
//         if (existingRoles.length > 0) {
//             return res.status(400).json({ status: false, message: "Role Name already exists" });
//         }
//         // Insert the new role
//         let result = await sequelize.query(
//             "INSERT INTO roles (role_name, role_id, description, status, org_code, created_by) VALUES (?, ?, ?, ?, ?, ?)",
//             {
//                 replacements: [role_name, role_id, description, status, org_code, created_by],
//                 type: sequelize.QueryTypes.INSERT,
//             }
//         );
//         if (result) {
//             return res.status(201).json({ status: true, role_id: role_id, message: "Role created successfully." });
//         } else {
//             return res.status(500).json({ status: false, message: "Error while creating role" });
//         }

//     } catch (error) {
//         return res.status(500).json({ status: false, message: error.message });
//     }
// };


// exports.createRole = async (req, res) => {
//     try {
//         const data = req.body
//         if (R.isEmpty(data)) {
//             return res.status(400).json({ "status": false, "message": "Data object required" });
//         }
//         if (!data.permissions || data.permissions.length <= 0) {
//             return res.status(200).json({ "status": false, "message": "Permissions required" });
//         }
//         if (!data.role_id) {
//             return res.status(400).json({ "status": false, "message": "Failed to insert role" });
//         }
//         const permissionsData = data.permissions.permissions.map((Row) => [
//             data.role_id,
//             Row.page_id,
//             Row.view,
//             Row.edit,
//             Row.delete,
//             '1', // status
//             Row.add,
//             Row.download,
//             Row.p_id,
//             true, // is_list
//             data.created_by,
//             Row.approve,
//         ]);
//         await sequelize.query(`insert into role_permissions 
//             (fk_role_id,  page_id, is_view, is_edit, is_delete, status, is_add, is_download, parent_page_id, is_list,
//              created_by,is_approve) VALUES ${permissionsData.map(() => '(?)').join(',')}`,
//             {
//                 replacements: permissionsData,
//                 type: sequelize.QueryTypes.INSERT,
//             }
//         );
//         return res.status(200).json({ "status": true, "message": "Data inserted successfully" });
//     }
//     catch (err) {
//         res.status(200).json({ 'message': 'Error while getting Master Pages' });
//     }
// };

// exports.getRolesList = async (req, res) => {
//     let status = '1';
//     let resData = [];
//     let data = req.body;
//     try {
//         if (Object.keys(data).length !== 0) {
//             let search_key = data.search_key || '';
//             let page_number = parseInt(data.page_number, 10) || 1;
//             let page_size = parseInt(data.page_size, 10) || 20;
//             let org_code = data.org_code;
//             // Base query with org_code filter
//             let query = ` select distinct on (role_name) id as uid, role_id AS id,role_name AS name 
//             from roles where status is true and org_code = :org_code `;
//             // Modify query if action is 'list'
//             if (data.action === 'list') {
//                 query = `
//                 SELECT DISTINCT ON (role_name) id AS uid,role_id,role_name,description,created_by,updated_by, status 
//                 FROM roles WHERE status IS TRUE  AND org_code = :org_code `;
//             }
//             // Add role_id filter
//             if (data.role_id) {
//                 query += ` AND role_id = :role_id`;
//             }
//             // Add search filter
//             if (search_key) {
//                 query += ` AND ( LOWER(role_name) LIKE LOWER(:search_key) OR LOWER(role_id) LIKE LOWER(:search_key) )`;
//             }
//             query += ` ORDER BY role_name, id`;
//             // Count query
//             const countQuery = `SELECT COUNT(*) FROM (${query}) AS subquery;`;
//             const roles_count = await sequelize.query(countQuery, {
//                 replacements: { org_code, role_id: data.role_id, search_key: `%${search_key}%` },
//                 type: sequelize.QueryTypes.SELECT,
//             });
//             // Add pagination
//             if (data.action === 'list' && !search_key) {
//                 query += ` LIMIT :limit OFFSET :offset`;
//             }
//             const result = await sequelize.query(query, {
//                 replacements: {
//                     org_code,
//                     role_id: data.role_id,
//                     search_key: `%${search_key}%`,
//                     limit: page_size,
//                     offset: (page_number - 1) * page_size,
//                 },
//                 type: sequelize.QueryTypes.SELECT,
//             });
//             // Check for empty result
//             if (!result || result.length === 0) {
//                 res.status(200).json({ status: true, data: resData });
//             } else {
//                 res.status(200).json({
//                     status: true,
//                     count: roles_count[0].count,
//                     data: result,
//                 });
//             }
//         } else {
//             res.status(400).json({ status: false, message: 'Invalid request data' });
//         }
//     } catch (error) {
//         console.error('Error fetching roles:', error);
//         res.status(500).json({ status: false, message: error.message });
//     }
// };

// exports.viewRolePermissions = async (req, res) => {
//     try {
//         const data = req.body;
//         if (!R.isEmpty(data)) {
//             var roleId = data.role_id;
//             const results = await sequelize.query(
//                 `select r.role_name,r.description,mp.menu_order,mp.page_name,mp.route AS slug,mp.icon,rp.fk_role_id,rp.page_id,
//                 rp.is_view,rp.is_edit,rp.is_delete,rp.is_list,rp.is_add,rp.is_download,rp.is_approve,rp.parent_page_id,rp.created_by 
//                 from role_permissions rp join master_pages mp ON mp.id = rp.page_id join roles r ON r.role_id = rp.fk_role_id  
//                 WHERE rp.fk_role_id = :roleId ORDER BY mp.menu_order `,
//                 {
//                     replacements: { roleId }, // Safely injects the `roleId` variable
//                     type: sequelize.QueryTypes.SELECT, // Ensures it's a SELECT query
//                 }
//             );
//             if (results.length != 0) {
//                 let mainPages = [];
//                 let rolename = results[0].role_name;
//                 let roleid = results[0].fk_role_id;
//                 let description = results[0].description;
//                 results.forEach((parentRow, pkey) => {
//                     let page = {
//                         'page_id': parentRow['page_id'],
//                         'p_id': parentRow['parent_page_id'],
//                         'created_by': parentRow['created_by'],
//                         'view': parentRow['is_view'],
//                         'edit': parentRow['is_edit'],
//                         'add': parentRow['is_add'],
//                         'delete': parentRow['is_delete'],
//                         'download': parentRow['is_download'],
//                         'approve': parentRow['is_approve']
//                     }
//                     mainPages.push(page);
//                 })
//                 res.status(200).json({ "status": true, "data": mainPages, "roledata": { "role_name": rolename, "description": description, "id": roleid } })
//             }
//             else {
//                 res.status(200).json({ "status": false, "messsage": "No data found" })
//             }
//         } else {
//             res.status(200).json({ "status": false, "messsage": "User not valid" })
//         }
//     }
//     catch (err) {
//         console.log(err);
//         res.status(500).json({ 'status': "failed", 'data': [{ err }] });
//     }
// };

// exports.updateRoleName = async (req, res) => {
//     const data = req.body;
//     if (!data || Object.keys(data).length === 0) {
//         return res.status(400).json({ "status": false, "message": "Data object required" });
//     }
//     try {
//         const { role_name, done_by, role_id, description, org_code } = data; 
//         // Check if the role name already exists, excluding the current role_id
//         let existingRole = await sequelize.query(
//             `SELECT * FROM roles WHERE role_name = ? AND role_id != ? AND org_code = ?  and status= ?`,
//             {
//                 replacements: [role_name, role_id, org_code,true], 
//                 type: sequelize.QueryTypes.SELECT,
//             }
//         );
//         if (existingRole.length > 0) {
//             return res.status(200).json({ "status": false, "message": "Role Name already exists" });
//         }
//         // Proceed with the update
//         let updateResult = await sequelize.query(
//             `update roles set role_name = ?, description = ?, updated_by = ? WHERE role_id = ? AND org_code = ?`,
//             {
//                 replacements: [role_name, description, done_by, role_id, org_code],
//                 type: sequelize.QueryTypes.UPDATE,
//             }
//         );
//         if (updateResult[1] > 0) { // Sequelize UPDATE returns an array, second value is affected row count
//             return res.status(200).json({ "status": true, "message": "Role updated successfully" });
//         } else {
//             return res.status(200).json({ "status": false, "message": "Error while updating role" });
//         }
//     } catch (error) {
//         return res.status(500).json({ "status": false, "message": error.message });
//     }
// };

// exports.updateRole = async (req, res) => {
//     const data = req.body;
//     try {
//         if (R.isEmpty(data)) {
//             return res.status(400).json({ "status": false, "message": "Data object required" });
//         }
//         if (!data.role_id) {
//             return res.status(400).json({ "status": false, "message": "Failed to insert role" });
//         }
//         await sequelize.query("DELETE FROM role_permissions WHERE fk_role_id = ?",
//             {
//                 replacements: [data.role_id],  // Pass the parameters in order
//                 type: sequelize.QueryTypes.DELETE,
//             });
//         const permissionsData = data.permissions.permissions.map((Row) => [
//             data.role_id,
//             Row.page_id,
//             Row.view,
//             Row.edit,
//             Row.delete,
//             '1', // status
//             Row.add,
//             Row.download,
//             Row.p_id,
//             true, // is_list
//             data.created_by,
//             Row.approve,
//         ]);
//         await sequelize.query(`INSERT INTO role_permissions 
//             (fk_role_id,page_id,is_view,is_edit,is_delete,status,is_add,is_download,parent_page_id,is_list,created_by,is_approve) 
//             VALUES ${permissionsData.map(() => '(?)').join(',')}`,
//             {
//                 replacements: permissionsData,
//                 type: sequelize.QueryTypes.INSERT,
//             }
//         );
//         return res.status(200).json({ "status": true, "message": "Data inserted successfully" });
//     }
//     catch (err) {
//         res.status(200).json({ 'message': 'Error while getting Master Pages' });
//     }
// };

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

// exports.insertUser = async (req, res) => {
//   const data = req.body;
//   try {
//     if (Object.keys(data).length === 0) {
//       return res.status(400).json({ status: false, message: "Request body is empty" });
//     }

//     const {
//       emp_id,
//       first_name,
//       last_name,
//       email,
//       licence_type,
//       reporting_to = null,
//       roles: role_id,
//       done_by: created_by,
//       user_active,
//       region,
//       org_code
//     } = data;

//     const active_users = Boolean(user_active);

//     // 1️⃣ Check for existing user by email or emp_id
//     const existingUser = await sequelize.query(
//       `SELECT email, emp_id FROM users WHERE (email = ? OR emp_id = ?) AND status = ? AND org_code = ?`,
//       {
//         replacements: [email, emp_id, true, org_code],
//         type: sequelize.QueryTypes.SELECT
//       }
//     );

//     if (existingUser.length > 0) {
//       const emailExists = existingUser.some(u => u.email === email);
//       const empIdExists = existingUser.some(u => u.emp_id === emp_id);

//       if (emailExists && empIdExists) {
//         return res.status(409).json({ status: false, message: "Email and Employee ID already exist" });
//       } else if (emailExists) {
//         return res.status(409).json({ status: false, message: "Email already exists" });
//       } else if (empIdExists) {
//         return res.status(409).json({ status: false, message: "Employee ID already exists" });
//       }
//     }

//     // 2️⃣ Insert new user and RETURNING id
//     const [insertedRows] = await sequelize.query(
//       `INSERT INTO users
//          (emp_id, first_name, last_name, email, role, status,
//           org_code, reporting_to, created_by, user_active, region, licence_type,active_users)
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)
//        RETURNING id`,
//       {
//         replacements: [
//         emp_id,        // 0
//         first_name,    // 1
//         last_name,     // 2
//         email,         // 3
//         role_id,       // 4
//         true,          // 5 (status)
//         org_code,      // 6
//         reporting_to,  // 7
//         created_by,    // 8
//         active_users,  // 9
//         region,        // 10
//         licence_type,   // 11 <— this is undefined
//         active_users
//         ],
//         type: sequelize.QueryTypes.INSERT
//       }
//     );

//     // 3️⃣ On initial creation, send the password-setup link
//     if (insertedRows.length > 0 && active_users) {
//       setImmediate(() => sendEmails(first_name, email));
//     }

//     if (insertedRows.length > 0) {
//       return res.status(201).json({ status: true, message: "User created successfully" });
//     } else {
//       return res.status(500).json({ status: false, message: "Error while creating user" });
//     }

//   } catch (error) {
//     console.error("Error inserting user:", error);
//     return res.status(500).json({ status: false, message: "Internal server error" });
//   }
// };



exports.insertUser = async (req, res) => {
  const data = req.body;
  if (Object.keys(data).length === 0) {
    return res.status(400).json({ status: false, message: 'Request body is empty' });
  }

  const {
    emp_id,
    first_name,
    last_name,
    email,
    license_type = null,  // Frontend might use license_type
    licence_type = null,  // Database uses licence_type
    reporting_to = null,
    roles: role_id,
    done_by: created_by,
    user_active,
    region,
    sub_region = null,
    department = null,
    org_code
  } = data;
  
  // Use either license_type or licence_type, whichever is provided
  const finalLicenceType = licence_type || license_type;
  const active_users = Boolean(user_active);

  try {
    // Check for existing user
    const existing = await sequelize.query(
      `SELECT id, email, emp_id FROM users WHERE (email = ? OR emp_id = ?) AND status = ? AND org_code = ?`,
      { replacements: [email, emp_id, true, org_code], type: sequelize.QueryTypes.SELECT }
    );
    if (existing.length) {
      const emailExists = existing.some(u => u.email === email);
      const empExists = existing.some(u => u.emp_id === emp_id);
      const message = emailExists && empExists
        ? 'Email and Employee ID already exist'
        : emailExists
          ? 'Email already exists'
          : 'Employee ID already exists';
      return res.status(409).json({ status: false, message });
    }

    // Insert user
    const [newUser] = await sequelize.query(
      `INSERT INTO users
        (emp_id, first_name, last_name, email, role, status,
          org_code, reporting_to, created_by, user_active, region, sub_region, department, licence_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *`,
      {
        replacements: [
          emp_id, first_name, last_name, email, role_id,
          true, org_code, reporting_to, created_by,
          active_users, region, sub_region, department, finalLicenceType
        ],
        type: sequelize.QueryTypes.INSERT
      }
    );

    const [newUserHierarchy] = await sequelize.query(
      `INSERT INTO hierarchy
         (org_code, emp_id,reporting_to, effective_start_date)
       VALUES (?, ?, ?, ?)
       RETURNING *`,
      {
        replacements: [
          org_code, emp_id, reporting_to,  new Date()
        ],
        type: sequelize.QueryTypes.INSERT
      }
    ); 
    
    // Assign license if a license type is specified and user is active
    let licenceAssignmentResult = { success: true, message: "" };
    if (finalLicenceType && active_users) {
      try {
        const customerController = require('./customerController');
        licenceAssignmentResult = await customerController.assignLicenceToUser(org_code, emp_id, finalLicenceType, created_by);
        
        if (!licenceAssignmentResult.success) {
          console.warn(`Warning: Failed to assign ${finalLicenceType} license to user ${emp_id}: ${licenceAssignmentResult.message}`);
          
          // Update the user record to reflect the attempted license type
          // This allows admins to retry license assignment later
          await sequelize.query(
            `UPDATE users SET licence_type = ? WHERE emp_id = ? AND org_code = ?`,
            {
              replacements: [finalLicenceType, emp_id, org_code],
              type: sequelize.QueryTypes.UPDATE
            }
          );
        } else {
          // Update with the correctly cased license type from the database
          if (licenceAssignmentResult.licence_type && licenceAssignmentResult.licence_type !== finalLicenceType) {
            await sequelize.query(
              `UPDATE users SET licence_type = ? WHERE emp_id = ? AND org_code = ?`,
              {
                replacements: [licenceAssignmentResult.licence_type, emp_id, org_code],
                type: sequelize.QueryTypes.UPDATE
              }
            );
          }
          
          console.log(`Successfully assigned ${licenceAssignmentResult.licence_type || finalLicenceType} license ${licenceAssignmentResult.licence_no} to user ${emp_id}`);
        }
      } catch (licenseError) {
        console.error('Error assigning license:', licenseError);
        licenceAssignmentResult = { 
          success: false, 
          message: `Error during license assignment: ${licenseError.message}` 
        };
      }
    }

    if (newUser.length > 0 && active_users) {
      setImmediate(() => sendEmails(first_name, email));
    }

    // Return appropriate response with license assignment information
    if (finalLicenceType && active_users && !licenceAssignmentResult.success) {
      // User created successfully but license assignment failed
      res.status(201).json({ 
        status: true, 
        message: "User created successfully, but license assignment failed", 
        licence_status: false,
        licence_message: licenceAssignmentResult.message
      });
    } else {
      // Either no license needed, or license assignment was successful
      res.status(201).json({ 
        status: true, 
        message: "User created successfully",
        licence_status: finalLicenceType ? licenceAssignmentResult.success : null,
        licence_message: finalLicenceType ? licenceAssignmentResult.message : null
      });
    }
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ status: false, message: 'Internal server error' });
  }
};


exports.uploadUsers = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: false, message: "No file uploaded" });
    }

    // Read the uploaded Excel file
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = xlsx.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
      return res.status(200).json({ status: false, message: "Uploaded file is empty" });
    }

    const org_code = req.body.org_code;
    const done_by  = req.body.emp_id;   // who did the upload
    const usersToInsert = [];
    const usersToUpdate = [];

    // 1️⃣ Build insert/update lists
    for (const row of jsonData) {
      const {
        ["Employee ID *"]: emp_id,
        ["First Name*"]: first_name,
        ["Last Name *"]: last_name,
        ["Email *"]: email,
        ["Role Id*"]: roles,
        ["Role Name*"]: roleName,
        ["Reporting User"]: reporting_to,
        ["Active User"]: user_active,
        ["Region"]: region
      } = row;

      if (!emp_id || !first_name || !last_name || !email || !roles || !roleName) {
        return res.status(200).json({
          status: false,
          message: `Missing required fields in row: ${JSON.stringify(row)}`
        });
      }

      // Ensure role exists (insert/update as you already do)...
      const existingRole = await sequelize.query(
        `SELECT role_id FROM roles
         WHERE role_name = ? AND role_id = ? AND org_code = ? AND status = ?`,
        {
          replacements: [roleName, roles, org_code, true],
          type: sequelize.QueryTypes.SELECT
        }
      );
      if (existingRole.length === 0) {
        await sequelize.query(
          `INSERT INTO roles (role_id, role_name, org_code, status, created_by)
           VALUES (?, ?, ?, ?, ?)`,
          {
            replacements: [roles, roleName, org_code, true, done_by],
            type: sequelize.QueryTypes.INSERT
          }
        );
      } else {
        await sequelize.query(
          `UPDATE roles
              SET role_name  = ?,
                  updated_by = ?
            WHERE role_id   = ?`,
          {
            replacements: [roleName, done_by, roles],
            type: sequelize.QueryTypes.UPDATE
          }
        );
      }

      // Check if user exists
      const existingUser = await sequelize.query(
        `SELECT id, user_active FROM users
           WHERE (email = ? OR emp_id = ?)
             AND status = ?
             AND org_code = ?`,
        {
          replacements: [email, emp_id, true, org_code],
          type: sequelize.QueryTypes.SELECT
        }
      );

      if (existingUser.length > 0) {
        // prepare for update
        usersToUpdate.push({
          id:           existingUser[0].id,
          emp_id,
          first_name,
          last_name,
          email,
          roles,
          reporting_to: reporting_to || null,
          user_active:  Boolean(user_active),
          region:       region || null
        });
      } else {
        // prepare for insert
        usersToInsert.push({
          emp_id,
          first_name,
          last_name,
          email,
          roles,
          reporting_to: reporting_to || null,
          user_active:  Boolean(user_active),
          region:       region || null
        });
      }
    }

    // 2️⃣ INSERT new users (no auto-email here)
    for (const user of usersToInsert) {
      await sequelize.query(
        `INSERT INTO users
           (emp_id, first_name, last_name, email, role, status,
            org_code, reporting_to, user_active, region, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        {
          replacements: [
            user.emp_id,
            user.first_name,
            user.last_name,
            user.email,
            user.roles,
            true,          // status = active
            org_code,
            user.reporting_to,
            user.user_active,
            user.region,
            done_by
          ],
          type: sequelize.QueryTypes.INSERT
        }
      );
    }

    // 3️⃣ UPDATE existing users, and conditional email on false→true
    for (const user of usersToUpdate) {
      // fetch prior active state
      const [oldRec] = await sequelize.query(
        `SELECT user_active FROM users WHERE id = ?`,
        {
          replacements: [user.id],
          type: sequelize.QueryTypes.SELECT
        }
      );
      const wasActive  = Boolean(oldRec?.user_active);
      const isNowActive = user.user_active;

      // perform update
      await sequelize.query(
        `UPDATE users
            SET emp_id       = ?,
                first_name   = ?,
                last_name    = ?,
                email        = ?,
                role         = ?,
                status       = ?,
                org_code     = ?,
                reporting_to = ?,
                updated_by   = ?,
                user_active  = ?,
                region       = ?
          WHERE id = ?`,
        {
          replacements: [
            user.emp_id,
            user.first_name,
            user.last_name,
            user.email,
            user.roles,
            true,
            org_code,
            user.reporting_to,
            done_by,
            isNowActive,
            user.region,
            user.id
          ],
          type: sequelize.QueryTypes.UPDATE
        }
      );

      // send only if they flipped from inactive → active
      if (!wasActive && isNowActive) {
        setImmediate(() => sendEmails(user.first_name, user.email));
      }
    }

    return res.status(201).json({
      status:        true,
      message:       "Users processed successfully",
      insertedUsers: usersToInsert.length,
      updatedUsers:  usersToUpdate.length
    });

  } catch (error) {
    console.error("Error processing users:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

exports.getManagersList = async (req, res) => {
  try {
    const { org_code } = req.body;
    const results = await sequelize.query(
      `SELECT a.emp_id,a.first_name || ' ' || a.last_name AS emp_name 
      FROM users a LEFT JOIN roles b ON a.role = b.role_id and a.org_code= b.org_code
      WHERE a.user_active = 'true' AND b.role_name ilike '%Manager' AND a.org_code = :org_code`,
      {
          replacements: { org_code },
          type: sequelize.QueryTypes.SELECT,
      }
    );
    if (results.length !== 0) {
        res.status(200).json({ status: true, data: results });
    } else {
        res.status(200).json({ status: false, message: "No data found" });
    }
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: "failed", error: err.message });
    }
};

exports.getUsers = async (req, res) => {
    const data = req.body;
    try {
        if (Object.keys(data).length !== 0) {
            const search_key = data.search_key || '';
            const page_number = parseInt(data.page_number, 10) || 1;
            const page_size = parseInt(data.page_size, 10) || 20;
            const org_code = data.org_code;
            const excel = data.export;
            // Define the base query
            let baseQuery = ` FROM users u JOIN roles r ON u.role = r.role_id and u.org_code= r.org_code  
                LEFT JOIN users us ON us.emp_id = u.reporting_to and us.status=true
                left join cmn_org_licences_list liclist on u.emp_id = liclist.emp_id 
                WHERE u.status = true AND u.org_code = :org_code `;
            let replacements = { org_code };
            if (search_key) {
                baseQuery += ` AND (LOWER(CONCAT(u.first_name, ' ', u.last_name)) LIKE :search_key)`;
                replacements.search_key = `%${search_key.toLowerCase()}%`;
            }
            // Full query for data selection
            let dataQuery = `SELECT DISTINCT 
                u.id, u.first_name, u.last_name, u.role, r.role_name, u.emp_id, u.status, u.email,
                u.org_code, us.first_name AS reporting_to, u.user_active
             FROM users u 
             JOIN roles r ON u.role = r.role_id AND u.org_code = r.org_code
             LEFT JOIN users us ON us.emp_id = u.reporting_to AND us.status = true
             WHERE u.status = true AND u.org_code = :org_code 
             ${search_key ? ` AND (LOWER(CONCAT(u.first_name, ' ', u.last_name)) LIKE LOWER(:search_key))` : ''}
             ORDER BY u.id DESC`;
            if (excel === 1) {
                // Export full dataset (no pagination)
                const result = await sequelize.query(dataQuery, {
                    replacements,
                    type: sequelize.QueryTypes.SELECT,
                });
                return res.status(200).json({ status: true, data: result, });
            } else {
                // Count query
                const countQuery = `SELECT COUNT(*) AS total ${baseQuery}`;
                const countResult = await sequelize.query(countQuery, {
                    replacements,
                    type: sequelize.QueryTypes.SELECT,
                });
                // Add pagination to the data query
                dataQuery += ` LIMIT :limit OFFSET :offset`;
                replacements.limit = page_size;
                replacements.offset = (page_number - 1) * page_size;
                const result = await sequelize.query(dataQuery, {
                    replacements,
                    type: sequelize.QueryTypes.SELECT,
                });
                return res.status(200).json({status: true, count: countResult[0].total, data: result, });
            }
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
        return res.status(500).json({ status: false, message: "Error while getting users" });
    }
};



exports.getRolePermissions = async (req, res) => {
    try {
        const data = req.body;
        if (!R.isEmpty(data)) {
            var roleId = data.role_id;
            const results = await sequelize.query(
                `select mp.menu_order, mp.page_name, mp.route as slug, mp.icon,rp.fk_role_id, rp.page_id, rp.is_view, rp.is_edit, 
                rp.is_delete,rp.is_list, rp.is_add, rp.is_download,rp.is_approve, rp.parent_page_id 
                from role_permissions rp join master_pages mp ON mp.id = rp.page_id 
                where rp.fk_role_id = :roleId and mp.status = '1' and rp.status = '1' order by mp.menu_order`,
                {
                    replacements: { roleId }, 
                    type: sequelize.QueryTypes.SELECT,
                }
            );
            if (results.length != 0) {
                let mainPages = [];
                let processedPageIds = new Set(); // Track processed pages to avoid duplicates
                
                // First, identify all parent pages (pages with no parent_page_id)
                const parentPages = results.filter(row => row.parent_page_id == null);
                
                parentPages.forEach((parentRow) => {
                    // Skip if this page was already processed
                    if (processedPageIds.has(parentRow.page_id)) {
                        return;
                    }
                    
                    let page = {
                        'page_id': parentRow['page_id'],
                        'text': parentRow['page_name'],
                        'slug': parentRow['slug'],
                        'icon': parentRow['icon'],
                        'menu_order': parentRow['menu_order'],
                        'permissions': {
                            'view': parentRow['is_view'],
                            'edit': parentRow['is_edit'],
                            'add': parentRow['is_add'],
                            'delete': parentRow['is_delete'],
                            'download': parentRow['is_download'],
                            'approve': parentRow['is_approve'] || false
                        }
                    }
                    
                    // Find children for this parent
                    let subPages = [];
                    let viewStatusArr = [];
                    let processedChildIds = new Set(); // Track processed child pages
                    
                    results.forEach((childRow) => { 
                        if (parentRow['page_id'] == childRow['parent_page_id'] && !processedChildIds.has(childRow.page_id)) {
                            let submenu = {
                                'page_id': childRow['page_id'],
                                'text': childRow['page_name'],
                                'slug': childRow['slug'],
                                'icon': childRow['icon'],
                                'menu_order': childRow['menu_order'] || '',
                                'permissions': {
                                    'view': childRow['is_view'],
                                    'edit': childRow['is_edit'],
                                    'add': childRow['is_add'],
                                    'delete': childRow['is_delete'],
                                    'download': childRow['is_download'],
                                    'approve': childRow['is_approve'] || false
                                }
                            }
                            subPages.push(submenu);
                            processedChildIds.add(childRow.page_id);
                            viewStatusArr.push(childRow['is_view']);
                        }
                    });
                    
                    page['submenu'] = subPages;
                    
                    // Add parent page based on visibility logic
                    if (viewStatusArr.length > 0) {
                        // Has children - add if any child is viewable
                        var pageStatus = viewStatusArr.includes(true);
                        if (pageStatus) {
                            mainPages.push(page);
                        }
                    } else {
                        // No children - add the page as is
                        mainPages.push(page);
                    }
                    
                    processedPageIds.add(parentRow.page_id);
                });
                
                res.status(200).json({ "status": true, "data": mainPages })
            }
            else {
                res.status(200).json({ "status": false, "messsage": "No data found" })
            }
        } else {
            res.status(200).json({ "status": false, "messsage": "User not valid" })
        }
    }
    catch (err) {
        console.log(err);
        res.status(500).json({ 'status': "failed", 'data': [{ err }] });
    }
};


exports.getRoleBaseOnUsers = async (req, res) => {
    try {
        const data = req.body;
        if (R.isEmpty(data)) {
            return res.status(400).json({ "status": false, "message": "Invalid user data" });
        }
        const { role_id: roleId, org_code } = data;
        let results = [];
        if (roleId) {
            results = await sequelize.query(
                `SELECT emp_id as id,CONCAT(first_name, ' ', last_name) as name FROM users WHERE status IS true and  role = :roleId`,
                {
                    replacements: { roleId },
                    type: sequelize.QueryTypes.SELECT,
                }
            );
        } else if (org_code) {
            results = await sequelize.query(
                `SELECT emp_id as id,CONCAT(first_name, ' ', last_name) AS name FROM users WHERE status IS true and org_code = :org_code`,
                {
                    replacements: { org_code },
                    type: sequelize.QueryTypes.SELECT,
                }
            );
        }
        if (results.length > 0) {
            return res.status(200).json({ "status": true, "data": results });
        } else {
            return res.status(200).json({ "status": false, "message": "No data found" });
        }
    } catch (err) {
        console.error("Error in getRoleBaseOnUsers:", err);
        return res.status(500).json({ 'status': "failed", 'error': err.message });
    }
};

exports.getUserIdDetails = async (req, res) => {
  try {
    const data = req.body;
    if (!R.isEmpty(data)) {
      var id = data.id;
      const results = await sequelize.query(
        `SELECT id, first_name, last_name, email, role, org_code, emp_id, reporting_to, user_active, region, sub_region, department, licence_type
         FROM users WHERE id = :id`,
        {
          replacements: { id },
          type: sequelize.QueryTypes.SELECT,
        }
      );
      if (results.length !== 0) {
        res.status(200).json({ status: true, data: results });
      } else {
        res.status(200).json({ status: false, messsage: "No data found" });
      }
    } else {
      res.status(200).json({ status: false, messsage: "User not valid" });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ status: "failed", data: [{ err }] });
  }
};

exports.updateUser = async (req, res) => {
  const data = req.body;
  try {
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ status: false, message: "Request body is empty" });
    }

    const {
      emp_id,
      first_name,
      last_name,
      email,
      org_code,
      reporting_to,
      roles,
      done_by,
      id,
      user_active,
      region,
      sub_region,
      department,
      license_type = null, // Frontend might use license_type
      licence_type = null, // Database uses licence_type
    } = data;
    
    // Use either license_type or licence_type, whichever is provided
    const finalLicenceType = licence_type || license_type;
    const isNowActive = Boolean(user_active);

    // Fetch current user state
    const [existing] = await sequelize.query(
      `SELECT user_active, licence_type FROM users WHERE id = ?`,
      {
        replacements: [id],
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    if (!existing) {
      return res.status(404).json({ status: false, message: "User not found" });
    }
    
    const wasActive = Boolean(existing?.user_active);
    const previousLicenceType = existing.licence_type;
    const licenceTypeChanged = finalLicenceType !== previousLicenceType;

    // Update users table
    const [updatedUser] = await sequelize.query(
      `UPDATE users SET
        emp_id = ?,
        first_name = ?,
        last_name = ?,
        email = ?,
        role = ?,
        status = ?,
        org_code = ?,
        reporting_to = ?,
        updated_by = ?,
        user_active = ?,
        region = ?,
        sub_region = ?,
        department = ?,
        licence_type = ?
      WHERE id = ?
      RETURNING id, user_active, emp_id`,
      {
        replacements: [
          emp_id,
          first_name,
          last_name,
          email,
          roles,
          true,
          org_code,
          reporting_to || null,
          done_by,
          isNowActive,
          region,
          sub_region,
          department,
          finalLicenceType,
          id
        ],
        type: sequelize.QueryTypes.UPDATE
      }
    );

    // Update hierarchy table
    await sequelize.query(
      `UPDATE hierarchy SET reporting_to = ?, effective_start_date = now() WHERE org_code = ? and emp_id = ? RETURNING org_code, emp_id`,
      {
        replacements: [
          reporting_to, org_code, emp_id
        ],
        type: sequelize.QueryTypes.UPDATE
      }
    );

    if (!updatedUser || updatedUser.length === 0) {
      return res.status(500).json({ status: false, message: "Error while updating user" });
    }
    
    // Handle license changes if license type is provided and user is active
    let licenceResult = { success: true, message: "" };
    // Always try to assign a license when license type is provided and user is active
    if (isNowActive && finalLicenceType) {
      try {
        const customerController = require('./customerController');
        
        // Log detailed license assignment attempt
        console.log(`[MASTER] Attempting license assignment for user ${emp_id}, org ${org_code}, type ${finalLicenceType}`);
        console.log(`[MASTER] License type changed: ${licenceTypeChanged}, User activated: ${!wasActive && isNowActive}`);
        
        // Check if user already has the correct license type
        const existingLicense = await sequelize.query(
          `SELECT licence_no, licence_type FROM cmn_org_licences_list 
           WHERE org_code = ? AND emp_id = ? AND UPPER(licence_type) = ? AND status = true`,
          {
            replacements: [org_code, emp_id, finalLicenceType.toUpperCase()],
            type: sequelize.QueryTypes.SELECT
          }
        );
        
        if (existingLicense.length > 0) {
          // User already has the correct license type
          console.log(`[MASTER] User ${emp_id} already has ${finalLicenceType} license ${existingLicense[0].licence_no}`);
          licenceResult = { 
            success: true, 
            message: "License already assigned", 
            licence_no: existingLicense[0].licence_no,
            licence_type: existingLicense[0].licence_type 
          };
        } else {
          // Release any existing license if the user has a different license type
          await sequelize.query(
            `UPDATE cmn_org_licences_list 
             SET emp_id = NULL, from_date = NULL, status = false, created_by = ?
             WHERE org_code = ? AND emp_id = ? AND status = true`,
            {
              replacements: [done_by, org_code, emp_id],
              type: sequelize.QueryTypes.UPDATE
            }
          );
          
          // Assign new license
          licenceResult = await customerController.assignLicenceToUser(org_code, emp_id, finalLicenceType, done_by);
          
          console.log(`[MASTER] License assignment result: ${JSON.stringify(licenceResult)}`);
          
          if (!licenceResult.success) {
            console.warn(`Warning: Failed to assign ${finalLicenceType} license to user ${emp_id}: ${licenceResult.message}`);
            console.error(`[LICENSE ASSIGNMENT FAILED] Could not assign license to user ${emp_id}: ${licenceResult.message}`);
          } else {
            // If the license assignment returned a different case/format for the license type,
            // update the user record to match the correct database format
            if (licenceResult.licence_type && licenceResult.licence_type !== finalLicenceType) {
              const userUpdateResult = await sequelize.query(
                `UPDATE users SET licence_type = ? WHERE emp_id = ? AND org_code = ? RETURNING id, emp_id, licence_type`,
                {
                  replacements: [licenceResult.licence_type, emp_id, org_code],
                  type: sequelize.QueryTypes.UPDATE
                }
              );
              console.log(`[MASTER] User record updated with correct license type: ${JSON.stringify(userUpdateResult)}`);
            }
            console.log(`Successfully assigned ${licenceResult.licence_type || finalLicenceType} license ${licenceResult.licence_no} to user ${emp_id}`);
          }
        }
      } catch (licenseError) {
        console.error('Error handling license:', licenseError);
        licenceResult = { 
          success: false, 
          message: `Error during license assignment: ${licenseError.message}` 
        };
      }
    } 
    // If the user is deactivated but had an active license, we should release it
    else if (!isNowActive && wasActive && previousLicenceType) {
      try {
        // Release the license by setting emp_id to NULL
        await sequelize.query(
          `UPDATE cmn_org_licences_list 
           SET emp_id = NULL, from_date = NULL, status = false, created_by = ?
           WHERE org_code = ? AND emp_id = ? AND licence_type = ? AND status = true`,
          {
            replacements: [done_by, org_code, emp_id, previousLicenceType],
            type: sequelize.QueryTypes.UPDATE
          }
        );
        console.log(`Released license for deactivated user ${emp_id}`);
      } catch (releaseError) {
        console.error('Error releasing license:', releaseError);
      }
    }

    // Send email on activation
    if (!wasActive && isNowActive) {
      setImmediate(() => sendEmails(first_name, email));
    }

    // Return appropriate response with license assignment information
    if (isNowActive && finalLicenceType && !licenceResult.success) {
      // User updated successfully but license assignment failed
      return res.status(200).json({ 
        status: true, 
        message: "User updated successfully, but license assignment failed", 
        licence_status: false,
        licence_message: licenceResult.message
      });
    } else if (isNowActive && finalLicenceType) {
      // License was processed (either successfully or attempted)
      return res.status(200).json({ 
        status: true, 
        message: "User updated successfully",
        licence_status: licenceResult.success,
        licence_message: licenceResult.message
      });
    } else {
      // No license processing needed
      return res.status(200).json({ 
        status: true, 
        message: "User updated successfully"
      });
    }
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};


exports.getAllTemplates = async (req, res) => {
    try {
        const data = req.body;
        if (Object.keys(data).length !== 0) {
            const search_key = data.search_key || '';
            const page_number = parseInt(data.page_number, 10) || 1;
            const page_size = parseInt(data.page_size, 10) || 20;
            const offset = (page_number - 1) * page_size;
            const org_code = data.org_code;
            // Fetch templates with search and pagination
            const templates = await sequelize.query(
                `SELECT t.id,t.name,mtt.name AS template_name,wf.name AS work_flow_name 
                 FROM templates t LEFT JOIN master_template_types mtt ON mtt.id = t.template_type 
                 LEFT JOIN work_flows wf ON wf.id = t.work_flow_id 
                 WHERE t.org_code = :org_code AND t.name iLIKE :searchKey  order by mtt.name, t.name LIMIT :limit OFFSET :offset`, 
                {
                    type: sequelize.QueryTypes.SELECT,
                    replacements: {
                        org_code,
                        searchKey: `%${search_key}%`,
                        limit: page_size,
                        offset: offset
                    }
                }
            );
            // Get total count for pagination
            const totalCountResult = await sequelize.query(
                `SELECT COUNT(*) AS total FROM templates t WHERE t.org_code = :org_code AND t.name iLIKE :searchKey`, 
                {
                    type: sequelize.QueryTypes.SELECT,
                    replacements: {
                        org_code,
                        searchKey: `%${search_key}%`
                    }
                }
            );
            const totalCount = totalCountResult[0]?.total || 0;
            res.status(200).json({ status:true, data: templates, count: totalCount });
        } else {
            res.status(400).json({ status:false, message: "Invalid request data" });
        }
    } catch (error) {
        res.status(500).json({ message: "Error fetching templates", error: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.body;
        // Validate input
        if (!id) {
            return res.status(400).json({ status: false, message: "User ID is required" });
        }
        // Check if the user exists
        const user = await sequelize.query("SELECT id FROM users WHERE id = ?",
            {
                replacements: [id],
                type: sequelize.QueryTypes.SELECT,
            }
        );
        if (user.length === 0) {
            return res.status(404).json({ status: false, message: "User not found" });
        }
        // Soft delete (set status = false)
        await sequelize.query(`UPDATE users SET status = ? WHERE id = ?`,
            {
                replacements: [false, id],
                type: sequelize.QueryTypes.UPDATE,
            }
        );
        res.status(200).json({ status: true, message: "User deleted successfully" });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ status: false, message: "Error deleting user", error: error.message });
    }
};

// exports.deleteRole = async (req, res) => {
//     try {
//         const { id } = req.body; 
//         if (!id) {
//             return res.status(400).json({ status: false, message: "User ID is required" });
//         }
//         // Check if the user exists
//         const user = await sequelize.query("SELECT id FROM roles WHERE role_id = ?",
//             {
//                 replacements: [id],
//                 type: sequelize.QueryTypes.SELECT,
//             }
//         );
//         if (user.length === 0) {
//             return res.status(404).json({ status: false, message: "User not found" });
//         }
//         // Soft delete (set status = false)
//         await sequelize.query(`UPDATE roles SET status = ? WHERE role_id = ?`,
//             {
//                 replacements: [false, id],
//                 type: sequelize.QueryTypes.UPDATE,
//             }
//         );
//         res.status(200).json({ status: true, message: "Role deleted successfully" });
//     } catch (error) {
//         console.error("Error deleting user:", error);
//         res.status(500).json({ status: false, message: "Error deleting user", error: error.message });
//     }
// };
 
exports.getTemplateById = async (req, res) => {
    try {
        const data = req.body;
        if (!R.isEmpty(data)) {
            var id = data.id;
            const template = await Template.findByPk(id);
            if (!template) return res.status(404).json({ message: 'Template not found' });
            const dragData = await sequelize.query(
                `SELECT custom_field_id, template_id, order_id, created_by FROM template_custom_fields WHERE template_id = :id`,
                {
                    replacements: { id },
                    type: sequelize.QueryTypes.SELECT,
                }
            );
            const drag_data = dragData.map(drag => ({
                id: drag.order_id.toString(),
                value: drag.custom_field_id
            }));
            res.status(200).json({ status: true, data: template, drag_data });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error fetching template', error: error.message });
    }
};
 
exports.updateTemplate = async (req, res) => {
    try {
        const { name, template_type, work_flow_id, drag_data, created_by, reason_code, org_code, id } = req.body;
        // Check if the template exists
        const template = await Template.findByPk(id);
        if (!template) {
            return res.status(404).json({ status: false, message: "Template not found", });
        }
        // Check if another template with the same name exists in the same organization
        const existingTemplate = await Template.findOne({
            where: {
                name,
                org_code,
                id: { [Op.ne]: id } // Ensure we're not checking against the same template
            },
        });
        if (existingTemplate) {
            return res.status(200).json({
                status: false,message: "A Template with the same name already exists in this organization",
            });
        }
        // Update the template
        await Template.update(
            { name, template_type, work_flow_id, updated_by: created_by, reason_code },
            { where: { id } }
        );

        // Handle custom fields update
        if (drag_data && drag_data.length > 0) {
            // Delete existing custom fields for this template
            await sequelize.query( "DELETE FROM template_custom_fields WHERE template_id = ?",
                { replacements: [id], type: sequelize.QueryTypes.DELETE }
            );
            // Insert new custom fields
            for (const drag of drag_data) {
                const query = `INSERT INTO template_custom_fields (custom_field_id, template_id, order_id, created_by)
                    VALUES (?, ?, ?, ?) `;
                const values = [
                    drag.value || null,
                    id,
                    drag.id,
                    created_by
                ];
                await sequelize.query(query, { replacements: values, type: sequelize.QueryTypes.INSERT });
            }
        }  
        res.status(200).json({ status: true, message: "Template updated successfully", });

    } catch (error) {
        console.error("Error updating template:", error);
        res.status(500).json({ message: "Failed to update template", error: error.message, });
    }
};
 
exports.createTemplate = async (req, res) => {
    try {
        const { name, template_type, work_flow_id, drag_data, reason_code, created_by, org_code } = req.body;
        const status = 1;
        const category = 1
        // Check if template already exists for the given name and organization
        const existingTemplate = await Template.findOne({
            where: {
                name: name,
                org_code: org_code,
            },
        });
        console.log('existingTemplate', reason_code);

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
            category,
            reason_code,
        });
        // If drag_data exists, insert custom fields
        if (drag_data && drag_data.length > 0) {
            for (const drag of drag_data) {
                const query = `INSERT INTO template_custom_fields (custom_field_id, template_id, order_id, created_by)
            VALUES (?, ?, ?, ?) `;
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
            status: true,
            message: 'Template created successfully',
            data: template,
        });
    } catch (error) {
        // Log the error and send a response with a failure message
        console.error(error);
        res.status(500).json({message: 'Failed to create template',error: error.message,});
    }
};
 
exports.getUsersBaseOnRole = async (req, res) => {
    const data = req.body;
    try {
        let search_key = data.search_key || '';
        let whereConditions = [];
        let replacements = {};
        let role = data.role_id || '';
        // Add conditions dynamically if values are provided
        if (role) {
            whereConditions.push(`role = :role_id`);
            replacements.role_id = role;
        }
        if (search_key) {
            whereConditions.push(` (LOWER(first_name) LIKE LOWER(:search_key) OR LOWER(last_name) LIKE LOWER(:search_key)) `);
            replacements.search_key = `%${search_key}%`;
        }
        let query = `SELECT DISTINCT b.role_id, TRIM(b.role_name) as role_name FROM roles b`;
        // Apply WHERE only if conditions exist
        if (whereConditions.length > 0) {
            query += `  and ${whereConditions.join(' AND ')}`;
        }
        const result = await sequelize.query(query, {
            replacements,
            type: sequelize.QueryTypes.SELECT,
        });
        return res.status(200).json({
            status: true,
            data: result || [],
        });
    } catch (error) {
        console.error('Error fetching roles:', error);
        return res.status(500).json({ status: false, message: error.message });
    }
};

async function sendEmails(firstName, recipientEmail) {
  try {
    const url = `${URL}/auth/password?email=${encodeURIComponent(recipientEmail)}`;
    const subject = 'Set Your Password for DREAM Access';

    const emailBody = `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
        <tr>
          <td align="center">
            <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border: 1px solid #ddd; border-radius: 6px; padding: 30px;">
              <tr>
                <td style="text-align: left;">
                  <h2 style="color: #004aad; margin-top: 0;">Welcome to DREAM, ${firstName}!</h2>
                  <p style="margin: 0;">Your account has been created successfully with the email <strong>${recipientEmail}</strong>.</p>

                  <p style="margin: 20px 0 10px;">To activate your account, please set your password by clicking the button below:</p>

                  <table cellpadding="10" cellspacing="0" border="0" style="margin-top: 10px;">
                    <tr>
                      <td align="center" bgcolor="#004aad" style="border-radius: 5px;">
                        <a href="${url}" target="_blank" style="font-size: 16px; color: #fff; text-decoration: none; font-weight: bold;">
                          Create Your Password
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="margin-top: 30px; font-size: 14px; color: #666;">
                    If you did not request this account, please disregard this message.
                  </p>

                  <p style="margin-top: 20px;">
                    Best regards,<br/>
                    <strong>The DREAM Team</strong><br/>
                    <span style="font-size: 13px; color: #999;">notifications@vyva.ai</span>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;

    console.log("Sending password email to:", recipientEmail);
    await sendEmail(recipientEmail, subject, emailBody);
    console.log(`Email sent successfully to ${recipientEmail}`);
  } catch (error) {
    console.error(`Error sending email to ${recipientEmail}:`, error);
  }
}

 
exports.getUserReportingTree = async (req, res) => {
    const data = req.body; 
    try {
        if (Object.keys(data).length !== 0) { 
            const orgCode = data.orgCode; 
            const empId = data.empId;  
            let replacements = { orgCode,empId };  
            // let query = `with recursive employee_hierarchy AS 
            // (select distinct h.org_code,h.emp_id,h.reporting_to,u.first_name,u.last_name,u.email,u.role,rls.role_name,1 AS level
            // ,concat(rptuser.first_name,' ',rptuser.last_name) as reporting_emp_name,rptuser.email as reporting_emp_email
            // ,rptuser.role as reporting_emp_role ,rptrole.role_name as reporting_emp_rolename 
            // from hierarchy h left join users u on h.emp_id = u.emp_id and h.org_code= u.org_code  
            // left join roles rls on u.role = rls.role_id and u.org_code= rls.org_code  
            // left join users rptuser on h.reporting_to = rptuser.emp_id and h.org_code= rptuser.org_code 
            // left join roles rptrole on rptuser.role = rptrole.role_id and rptuser.org_code= rptrole.org_code     
            // where h.effective_end_date is null and h.emp_id = :empId and h.org_code = :orgCode
            // union all 
            // SELECT distinct h.org_code,h.emp_id,h.reporting_to, u.first_name, u.last_name,u.email,u.role,rls.role_name,eh.level + 1 
            // ,concat(rptuser1.first_name,' ',rptuser1.last_name) as reporting_emp_name,rptuser1.email as reporting_emp_email
            // ,rptuser1.role as reporting_emp_role,rptrole.role_name as reporting_emp_rolename  
            // from hierarchy h join  employee_hierarchy eh on h.emp_id = eh.reporting_to 
            // left join users u on h.emp_id = u.emp_id 
            // left join roles rls on u.role = rls.role_id 
            // left join users rptuser1 on h.reporting_to = rptuser1.emp_id 
            // left join roles rptrole on rptuser1.role = rptrole.role_id 
            // where h.reporting_to is not null and h.effective_end_date is null  
            // ) 
            // select level, emp_id, first_name,last_name,email,role,role_name, 
            // reporting_to,reporting_emp_name,reporting_emp_email,reporting_emp_role,reporting_emp_rolename
            // from employee_hierarchy order by level asc `;
            let query = `WITH RECURSIVE mgr_chain AS ( 
              SELECT h.emp_id, h.reporting_to, 1 AS level FROM hierarchy h
              WHERE h.org_code = :orgCode AND h.emp_id   = :empId AND h.effective_end_date IS NULL 
            UNION ALL 
              SELECT h2.emp_id, h2.reporting_to, mc.level + 1 FROM hierarchy h2
              JOIN mgr_chain mc ON mc.reporting_to = h2.emp_id
              WHERE h2.org_code = :orgCode AND h2.effective_end_date IS NULL
            )
            SELECT mc.level, mc.emp_id, u.first_name || ' ' || u.last_name as emp_name,u.email,u.role,a.role_name , mc.reporting_to
            FROM mgr_chain mc LEFT JOIN users u ON u.emp_id = mc.emp_id 
            left join roles a on u.role= a.role_id and u.org_code = a.org_code
            ORDER BY mc.level desc;`;
            const result = await sequelize.query(query, {
                replacements,
                type: sequelize.QueryTypes.SELECT,
            });
            return res.status(200).json({ 
                data: result,
            });
        }
    } catch (error) {
        console.error("Error fetching user reporting data:", error);
        return res.status(500).json({ status: false, message: "Error while getting users reporting data" });
    }
};


exports.getUserUpwardReportingTree = async (req, res) => {
    const data = req.body; 
    try {
        if (Object.keys(data).length !== 0) { 
            let orgCode = data.org_code; 
            let empId = data.empId;  
            let replacements = { orgCode,empId };  
            console.log("----- 1465 ---- "+replacements)
             let query = `WITH RECURSIVE downward_hierarchy AS (
            select distinct u.emp_id, u.first_name || ' ' || u.last_name AS emp_name,u.email,u.role,r.role_name, u.reporting_to,
            rptu.first_name || ' ' || rptu.last_name AS reporting_emp_name,rptu.email AS reporting_emp_email, 1 AS level 
            from users u left join hierarchy h on u.emp_id = h.emp_id 
            left join roles r on u.role = r.role_id and u.org_code = r.org_code 
            left join users rptu on u.reporting_to = rptu.emp_id 
            where h.effective_end_date is null and u.emp_id = :empId and u.org_code = :orgCode 
            union all  
            select distinct u.emp_id, u.first_name || ' ' || u.last_name AS emp_name,u.email,u.role,r.role_name, u.reporting_to,
            rptu.first_name || ' ' || rptu.last_name AS reporting_emp_name,rptu.email AS reporting_emp_email,dh.level + 1 
            from users u inner join downward_hierarchy dh on u.reporting_to = dh.emp_id 
            left join hierarchy h on u.emp_id = h.emp_id 
            left join roles r on u.role = r.role_id and u.org_code = r.org_code  
            left join users rptu on u.reporting_to = rptu.emp_id where h.effective_end_date is null ) 
            select emp_id,emp_name,email,role as role,role_name,reporting_to,reporting_emp_name,reporting_emp_email,level 
            from downward_hierarchy order by level `;
            const result = await sequelize.query(query, {
                replacements,
                type: sequelize.QueryTypes.SELECT,
            });
            return res.status(200).json({ 
                data: result,
            });
        }
    } catch (error) {
        console.error("Error fetching user reporting data:", error);
        return res.status(500).json({ status: false, message: "Error while getting users reporting data" });
    }
};

  