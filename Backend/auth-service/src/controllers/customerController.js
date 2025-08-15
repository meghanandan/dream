const { INTEGER } = require("sequelize");
const sequelize = require("../config/db");
const { sendEmail } = require("./customFieldsController");

exports.getCountriesList = async (req, res) => {
  try {
    let query = `SELECT country_code, country_name, region FROM cmn_country_mst ORDER BY country_name`;
    const result = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT,
    });
    return res.status(200).json({ data: result });
  } catch (error) {
    return res.status(500).json({ status: false, message: "Error while getting countries list" });
  }
};

exports.getCustomersList = async (req, res) => { 
  const data = req.body; 
  try { 
    const org_code = data.org_code || null; 
    let whereCondi = '';
    let replacements = [];
    if (org_code) {
      whereCondi = ' WHERE cmst.org_code = ?';
      replacements.push(org_code);
    }
    const results = await sequelize.query(
      `SELECT cmst.id, cmst.org_code, cmst.org_name, cmst.industry, cmst.address, cmst.city, cmst.state_name, cmst.country, cmst.zipcode,
              cmst.region, cmst.support_mail, cmst.contact_no, cmst.status, cmst.customer_type, cmst.trial_converted_date,
              lmst.sl_no, lmst.licence_type, lmst.licence_from_date, lmst.licence_to_date, lmst.no_of_licences, lmst.grace_period 
       FROM cmn_org_mst cmst LEFT JOIN cmn_org_licences_mst lmst ON cmst.org_code = lmst.org_code 
       ${whereCondi} ORDER BY cmst.org_name, lmst.sl_no`,
      {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      }
    );
    const organizations = {};
    results.forEach((row) => {
      const orgId = row.id;
      if (!organizations[orgId]) {
        organizations[orgId] = {
          org_code: row.org_code,
          org_name: row.org_name,
          industry: row.industry,
          address: row.address,
          city: row.city,
          state_name: row.state_name,
          country: row.country,
          zipcode: row.zipcode,
          region: row.region,
          support_mail: row.support_mail,
          contact_no: row.contact_no,
          status: row.status,
          customer_type: row.customer_type,
          trial_converted_date: row.trial_converted_date,
          licences: [],
        };
      }
      if (row.sl_no) {
        organizations[orgId].licences.push({
          sl_no: row.sl_no,
          licence_type: row.licence_type,
          licence_from_date: row.licence_from_date,
          licence_to_date: row.licence_to_date,
          no_of_licences: row.no_of_licences,
          grace_period: row.grace_period,
        });
      }
    });
    const orgList = Object.values(organizations);
    res.status(200).json({ status: true, data: orgList });
  } catch (error) {
    console.error("Error Fetching Dream Customers List.", error);
    res.status(500).json({
      status: false,
      message: "Failed to Fetch Dream Customers List.",
      error: error.message,
    });
  }
};

exports.createNewCustomer = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const {org_code,org_name,industry,address,city,state_name,country,zipcode,region,support_mail,contact_no, status = 1, licenses = [], customer_type = 'PAID', trial_duration_days = 30 } = req.body;
        const insertOrgQuery = `
            INSERT INTO cmn_org_mst (org_code,org_name,industry,address,city,state_name,country,zipcode,region,support_mail,contact_no,status,customer_type)
            VALUES (?, ?, ?, ?, ?,?,?,?,?,?,?,true,?) `;
        await sequelize.query(insertOrgQuery, {
            transaction: t,
            replacements: [org_code,org_name,industry,address,city,state_name,country,zipcode,region,support_mail,contact_no,customer_type]
        });
        // Insert licences
        const insertLicenceQuery = `
            INSERT INTO cmn_org_licences_mst (org_code,licence_type,licence_from_date,licence_to_date,no_of_licences,grace_period)
            VALUES (?, ?, ?, ?, ?, ?) `;
        for (let i = 0; i < licenses.length; i++) {
          const licence = licenses[i];
            await sequelize.query(insertLicenceQuery, {
                transaction: t,
                replacements: [
                    org_code,
                    licence.licence_type,
                    licence.from_date, 
                    licence.to_date,
                    licence.no_of_licences,
                    licence.grace_period
                ]
            });
        }
         // Insert licence list
        const insertLicenceListQuery = `
            INSERT INTO cmn_org_licences_list( org_code, licence_type, licence_no) VALUES (?, ?, ?) `;
      let licenceCounter = 1;        
      let licenceCounterMap = {};
      for (const licence of licenses) {
        const type = licence.licence_type;
        const totalLicences = licence.no_of_licences;
        // Initialize counter if not exist
        if (!licenceCounterMap[type]) {
          licenceCounterMap[type] = 1;
        }
        for (let i = 0; i < totalLicences; i++) {
          const counter = licenceCounterMap[type]++;
          // Generate a licence number like: LIC-LTE-0001, LIC-PRO-0002
          const licenceNo = `LIC-${type}-${String(counter).padStart(4, '0')}`;
          await sequelize.query(insertLicenceListQuery, {
            transaction: t,
            replacements: [
              org_code,
              type,
              licenceNo
            ]
          });
        } 
      }
        await t.commit();
        // send customer onboard email
        console.log("Sending onboarding email to:", support_mail);
        const isTrialCustomer = customer_type === 'TRIAL';
        const emailSubject = isTrialCustomer ? `Welcome to your DREAM Trial, ${org_name}!` : `Welcome to DREAM, ${org_name}`;
        const welcomeMessage = isTrialCustomer ? 
            `<p>Your organization has been successfully onboarded with a <strong>${trial_duration_days}-day trial period</strong>. Below are your trial details:</p>` :
            `<p>Your organization has been successfully onboarded. Below are your registration details:</p>`;
            
        await sendEmail(
          support_mail,
          emailSubject,
          `
          <div style="font-family: Arial, sans-serif; font-size: 15px; color: #333;">
            <h2 style="color: #004aad;">${isTrialCustomer ? '🎯 Welcome to your DREAM Trial' : '🎉 Welcome to DREAM'}, ${org_name}!</h2>

            ${welcomeMessage}
            ${isTrialCustomer ? `<div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 12px; border-radius: 6px; margin: 16px 0;">
                <h4 style="color: #856404; margin: 0 0 8px 0;">⏰ Trial Information</h4>
                <p style="margin: 0; color: #856404;">
                  <strong>Trial Duration:</strong> ${trial_duration_days} days<br/>
                  <strong>Trial Expires:</strong> ${new Date(Date.now() + trial_duration_days * 24 * 60 * 60 * 1000).toLocaleDateString()}<br/>
                  <strong>Note:</strong> Contact your administrator before expiry to convert to a paid license.
                </p>
              </div>` : ''}

            <h3 style="margin-top: 20px;">🔑 License Details</h3>
            <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
              <thead style="background-color: #f0f4ff;">
                <tr>
                  <th>License Type</th>
                  <th>No. of Licenses</th>
                  <th>From Date</th>
                  <th>To Date</th>
                  <th>Grace Period</th>
                </tr>
              </thead>
              <tbody>
                ${licenses.map(lic => `
                  <tr>
                    <td>${lic.licence_type}</td>
                    <td align="center">${lic.no_of_licences}</td>
                    <td align="center">${lic.from_date}</td>
                    <td align="center">${lic.to_date}</td>
                    <td align="center">${lic.grace_period} days</td>
                  </tr>`).join('')}
              </tbody>
            </table>

            <p style="margin-top: 30px; font-size: 14px; color: #555;">
              Please retain this information for your records.<br/>
              For any questions, feel free to reach us at support@vyva.ai.
            </p>

            <p style="margin-top: 20px;">
              Regards,<br/>
              <strong>The DREAM Team</strong>
            </p>
          </div>
          `
        );

        res.status(200).json({ 
            message: 'Organization and licences created successfully',
            customer_type: customer_type,
            is_trial: customer_type === 'TRIAL',
            trial_duration_days: customer_type === 'TRIAL' ? trial_duration_days : null
        });
    } catch (err) {
        await t.rollback();
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};
  
exports.updateSelectedCustomerLicences = async (req, res) => {
  const t = await sequelize.transaction();
  const data = req.body; 
  const { org_code, licenses = [] } = data;
  try {
    if (!data || Object.keys(data).length === 0) {
      return res.status(400).json({ status: false, message: "Request body is empty" });
    }
    const {
      address,
      city,
      state_name,
      country,
      zipcode,
      region,
      support_mail,
      contact_no
    } = data;
    // Update organization details
    await sequelize.query(`update cmn_org_mst set address=?, city=?, state_name=?, country=?, 
        zipcode=?, region=?, support_mail=?, contact_no=? where org_code=? 
        RETURNING org_code`,
      {
        transaction: t,
        replacements: [
          address,
          city,
          state_name,
          country,
          zipcode,
          region,
          support_mail,
          contact_no,
          org_code
        ],
        type: sequelize.QueryTypes.UPDATE
      }
    );
    // Update customer license
    const updateLicenceQuery = `update cmn_org_licences_mst set  
      licence_from_date=?,licence_to_date=?,no_of_licences=?,grace_period=? where licence_type=? and org_code=?`;

    // Insert New licences
    const insertLicenceQuery = `insert into cmn_org_licences_mst (
            licence_from_date,licence_to_date,no_of_licences,grace_period,licence_type,org_code)
        values (?, ?, ?, ?, ?, ?) `;  
    let whereCondi ='';
    for (let i = 0; i < licenses.length; i++) {
      const licence = licenses[i];
      const ltype =licence.licence_type;
      let checkLicenceAvlOrNot = `select cast(count(*) as integer) as total from cmn_org_licences_mst 
        where licence_type= :ltype and org_code= :org_code `;
       let replacements = { ltype,org_code }
        const countResult = await sequelize.query(checkLicenceAvlOrNot, {
          replacements,
          type: sequelize.QueryTypes.SELECT,
        });         
        if(countResult[0].total==0){
          whereCondi = insertLicenceQuery 
        }else{
          whereCondi = updateLicenceQuery 
        } 
      await sequelize.query(whereCondi, {
        transaction: t,
        replacements: [
          licence.from_date,
          licence.to_date,
          licence.no_of_licences,
          licence.grace_period,
          licence.licence_type,
          org_code
        ]
      });
    }

    // Insert licences list - only add new licenses if needed
    const insertLicenceListQuery = `insert into cmn_org_licences_list(org_code,licence_type,licence_no) values (?,?,?) `;
      
      for (const licence of licenses) {
        const type = licence.licence_type;
        const totalLicences = licence.no_of_licences;
        
        // Check how many licenses already exist for this type
        let checkNoOfLicenceAvlOrNot = `select cast(count(licence_no) as integer) as total from cmn_org_licences_list 
          where licence_type= :type and org_code= :org_code`;
        let replacements = { type, org_code }
        const countNoOfRes = await sequelize.query(checkNoOfLicenceAvlOrNot, {
          replacements,
          type: sequelize.QueryTypes.SELECT,
        });    
        
        const existingLicences = countNoOfRes[0].total;
        
        // Only add licenses if we need more than what exists
        if (totalLicences > existingLicences) {
          const licensesToAdd = totalLicences - existingLicences;
          
          // Get the highest existing license number for this type to continue numbering
          let getMaxLicenceNoQuery = `
            SELECT licence_no FROM cmn_org_licences_list 
            WHERE licence_type = :type AND org_code = :org_code 
            AND licence_no ~ '^LIC-${type}-[0-9]+$'
            ORDER BY CAST(SUBSTRING(licence_no FROM 'LIC-${type}-(\\d+)') AS INTEGER) DESC 
            LIMIT 1`;
            
          const maxLicenceResult = await sequelize.query(getMaxLicenceNoQuery, {
            replacements,
            type: sequelize.QueryTypes.SELECT,
          });
          
          // Start counter from next number after highest existing
          let startCounter = 1;
          if (maxLicenceResult.length > 0) {
            const lastLicenceNo = maxLicenceResult[0].licence_no;
            const lastNumber = parseInt(lastLicenceNo.split('-').pop());
            startCounter = lastNumber + 1;
          }
          
          // Add only the additional licenses needed
          for (let i = 0; i < licensesToAdd; i++) {
            const counter = startCounter + i;
            const licenceNo = `LIC-${type}-${String(counter).padStart(4, '0')}`;
            await sequelize.query(insertLicenceListQuery, {
              transaction: t,
              replacements: [
                org_code,
                type,
                licenceNo
              ]
            });
          }
        } else if (totalLicences < existingLicences) {
          // If reducing licenses, remove excess unassigned licenses
          const licensesToRemove = existingLicences - totalLicences;
          await sequelize.query(
            `DELETE FROM cmn_org_licences_list 
             WHERE org_code = ? AND licence_type = ? 
             AND (emp_id IS NULL OR emp_id = '') 
             AND (status IS NULL OR status = false) 
             ORDER BY licence_no DESC 
             LIMIT ?`,
            {
              transaction: t,
              replacements: [org_code, type, licensesToRemove],
              type: sequelize.QueryTypes.DELETE
            }
          );
        }
      }
    await t.commit();
    res.status(200).json({ status: true, message: "Licence details updated successfully." });
  } catch (err) {
    await t.rollback();
    console.error(err);
    res.status(500).json({error: "Failed to update customer licences.",details: err.message,});
  }
};


exports.assignLicenceToUser = async (org_code, emp_id, licence_type, created_by = null) => {
  const t = await sequelize.transaction();
  try {
    // Input validation
    if (!org_code || !emp_id || !licence_type) {
      console.error("Missing required parameters for license assignment");
      return { success: false, message: "Missing required parameters" };
    }
    
    // Use emp_id as fallback for created_by if not provided (maintain backward compatibility)
    const assignedBy = created_by || emp_id;
    
    console.log(`[LICENSE] Starting license assignment for org=${org_code}, emp_id=${emp_id}, type=${licence_type}`);
    
    console.log(`[LICENSE ASSIGNMENT] Starting license assignment for user ${emp_id}, license type ${licence_type}, organization ${org_code}`);

    // Normalize license type to uppercase to handle case-insensitive matching
    const normalizedLicenceType = licence_type.toUpperCase();
    
    // Verify the license type is valid in the organization's master list
    const validLicenseCheck = await sequelize.query(
      `SELECT licence_type, licence_from_date, licence_to_date 
       FROM cmn_org_licences_mst 
       WHERE org_code = ? AND UPPER(licence_type) = ? 
       AND CURRENT_DATE BETWEEN licence_from_date AND licence_to_date`,
      {
        replacements: [org_code, normalizedLicenceType],
        type: sequelize.QueryTypes.SELECT,
        transaction: t
      }
    );

    if (validLicenseCheck.length === 0) {
      await t.rollback();
      console.error(`Invalid or expired license type ${normalizedLicenceType} for organization ${org_code}`);
      return { 
        success: false, 
        message: `Invalid or expired license type: ${licence_type}. This license type is not available for your organization.`
      };
    }
    
    // The actual license type from the database (preserves case)
    const dbLicenceType = validLicenseCheck[0].licence_type;
    
    // First release any existing different type of license
    // This ensures users don't consume multiple licenses simultaneously
    await sequelize.query(
      `UPDATE cmn_org_licences_list 
       SET emp_id = NULL, from_date = NULL, status = false, created_by = ?
       WHERE org_code = ? AND emp_id = ? AND UPPER(licence_type) != ? AND status = true`,
      {
        replacements: [assignedBy, org_code, emp_id, normalizedLicenceType],
        type: sequelize.QueryTypes.UPDATE,
        transaction: t
      }
    );

    // Check if user already has a license of this type
    const existingLicence = await sequelize.query(
      `SELECT licence_no FROM cmn_org_licences_list 
       WHERE org_code = ? AND emp_id = ? AND UPPER(licence_type) = ? AND status = true`,
      {
        replacements: [org_code, emp_id, normalizedLicenceType],
        type: sequelize.QueryTypes.SELECT,
        transaction: t
      }
    );

    if (existingLicence.length > 0) {
      await t.commit();
      console.log(`User ${emp_id} already has ${dbLicenceType} license: ${existingLicence[0].licence_no}`);
      return { 
        success: true, 
        message: `User already has this license type: ${dbLicenceType}`, 
        licence_no: existingLicence[0].licence_no,
        licence_type: dbLicenceType
      };
    }

    // Find an available license of the requested type
    console.log(`[LICENSE ASSIGNMENT] Looking for an available ${normalizedLicenceType} license for organization ${org_code}`);
    
    const availableLicence = await sequelize.query(
      `SELECT licence_no FROM cmn_org_licences_list 
       WHERE org_code = ? AND UPPER(licence_type) = ? AND (emp_id IS NULL OR emp_id = '') AND (status IS NULL OR status = false)
       LIMIT 1`,
      {
        replacements: [org_code, normalizedLicenceType],
        type: sequelize.QueryTypes.SELECT,
        transaction: t
      }
    );

    console.log(`[LICENSE ASSIGNMENT] Available license search result: ${JSON.stringify(availableLicence)}`);

    if (availableLicence.length === 0) {
      await t.rollback();
      
      // Get count of total licenses of this type
      const licenseCount = await sequelize.query(
        `SELECT COUNT(*) as total FROM cmn_org_licences_list 
         WHERE org_code = ? AND UPPER(licence_type) = ?`,
        {
          replacements: [org_code, normalizedLicenceType],
          type: sequelize.QueryTypes.SELECT
        }
      );
      
      const total = parseInt(licenseCount[0]?.total || 0);
      
      if (total === 0) {
        console.error(`No ${dbLicenceType} licenses exist for organization ${org_code}`);
        return { 
          success: false, 
          message: `No ${dbLicenceType} licenses exist in your organization. Please contact your administrator to purchase licenses.` 
        };
      } else {
        console.error(`All ${dbLicenceType} licenses are already assigned for organization ${org_code}`);
        return { 
          success: false, 
          message: `All ${dbLicenceType} licenses are currently assigned. Please contact your administrator to purchase additional licenses.` 
        };
      }
    }

    const licenceNo = availableLicence[0].licence_no;
    console.log(`[LICENSE ASSIGNMENT] Found available license: ${licenceNo}`);
    
    // Assign the license to the user
    try {
      // Step 1: Update the license record without using RETURNING
      await sequelize.query(
        `UPDATE cmn_org_licences_list 
         SET emp_id = ?, from_date = CURRENT_DATE, status = true, created_by = ?
         WHERE org_code = ? AND licence_no = ?`,
        {
          replacements: [emp_id, assignedBy, org_code, licenceNo],
          type: sequelize.QueryTypes.UPDATE,
          transaction: t
        }
      );
      
      // Step 2: Verify the update was successful with a separate query
      const verifyUpdate = await sequelize.query(
        `SELECT sl_no, emp_id, status FROM cmn_org_licences_list
         WHERE org_code = ? AND licence_no = ?`,
        {
          replacements: [org_code, licenceNo],
          type: sequelize.QueryTypes.SELECT,
          transaction: t
        }
      );
      
      console.log(`[LICENSE ASSIGNMENT] License verification: ${JSON.stringify(verifyUpdate)}`);
      
      // Confirm the user ID is actually in the record
      if (!verifyUpdate || verifyUpdate.length === 0 || verifyUpdate[0].emp_id !== emp_id) {
        console.error(`[LICENSE ASSIGNMENT] Failed to update license ${licenceNo} for user ${emp_id}`);
        await t.rollback();
        return {
          success: false,
          message: `Failed to assign license. Database update error.`
        };
      }
    } catch (updateError) {
      console.error(`[LICENSE ASSIGNMENT] Error updating license: ${updateError.message}`);
      await t.rollback();
      return {
        success: false,
        message: `Error updating license: ${updateError.message}`
      };
    }

    // Update the user's record to reflect the assigned license type
    try {
      const userUpdateResult = await sequelize.query(
        `UPDATE users SET licence_type = ? WHERE emp_id = ? AND org_code = ? RETURNING emp_id, licence_type`,
        {
          replacements: [dbLicenceType, emp_id, org_code],
          type: sequelize.QueryTypes.UPDATE,
          transaction: t
        }
      );
      
      console.log(`[LICENSE ASSIGNMENT] User update result: ${JSON.stringify(userUpdateResult)}`);
    } catch (userUpdateError) {
      console.error(`[LICENSE ASSIGNMENT] Error updating user: ${userUpdateError.message}`);
      // Continue with commit even if user update fails
    }

    await t.commit();
    console.log(`[LICENSE ASSIGNMENT] Successfully assigned license ${licenceNo} (${dbLicenceType}) to user ${emp_id}`);
    
    // Verify the assignment was successful after commit
    const verificationCheck = await sequelize.query(
      `SELECT emp_id, licence_no, status FROM cmn_org_licences_list 
       WHERE org_code = ? AND licence_no = ?`,
      {
        replacements: [org_code, licenceNo],
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    console.log(`[LICENSE ASSIGNMENT] Verification after commit: ${JSON.stringify(verificationCheck)}`);
    
    return { 
      success: true, 
      message: "License assigned successfully", 
      licence_no: licenceNo,
      licence_type: dbLicenceType 
    };
  } catch (error) {
    await t.rollback();
    console.error(`[LICENSE ASSIGNMENT] Error assigning license to user ${emp_id}:`, error);
    return { 
      success: false, 
      message: `License assignment failed: ${error.message}`,
      error_details: error.stack 
    };
  }
};

exports.getOrganizationWiseRemainingLicences = async (req, res) => {
  try {
    const { org_code } = req.body;
    if (!org_code) {
      return res.status(400).json({ status: false, message: "org_code is required" });
    }

    // Find all license types for the org (active in the current period)
    const results = await sequelize.query(
      ` SELECT m.licence_type, m.no_of_licences AS total_licences, COALESCE(l.assigned_count, 0) AS used_licences,
        m.no_of_licences - COALESCE(l.assigned_count, 0) AS available_licences,
        m.licence_from_date, m.licence_to_date, m.grace_period
      FROM cmn_org_licences_mst m
      LEFT JOIN (
        SELECT  licence_type, COUNT(*) AS assigned_count FROM cmn_org_licences_list WHERE
          org_code = :org_code AND emp_id IS NOT NULL AND status = 'true' GROUP BY licence_type ) l
      ON m.licence_type = l.licence_type
      WHERE m.org_code = :org_code AND CURRENT_DATE BETWEEN m.licence_from_date AND m.licence_to_date
      ORDER BY m.licence_type  `,
      {
        replacements: { org_code },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    res.status(200).json({ status: true, data: results });
  } catch (error) {
    console.error("Error fetching remaining organization licences.", error);
    res.status(500).json({
      status: false,
      message: "Failed to fetch remaining organization licences",
      error: error.message,
    });
  }
};

// New function to check license availability for a specific type
exports.checkLicenceAvailability = async (req, res) => {
  try {
    const { org_code, licence_type } = req.body;
    
    if (!org_code || !licence_type) {
      return res.status(400).json({ 
        status: false, 
        message: "Both org_code and licence_type are required" 
      });
    }

    // Normalize license type to uppercase for case-insensitive comparison
    const normalizedLicenceType = licence_type.toUpperCase();

    // 1. Check if this license type exists and is active for the organization
    const validLicenseCheck = await sequelize.query(
      `SELECT licence_type, licence_from_date, licence_to_date, no_of_licences, grace_period
       FROM cmn_org_licences_mst 
       WHERE org_code = ? AND UPPER(licence_type) = ? 
       AND CURRENT_DATE BETWEEN licence_from_date AND licence_to_date`,
      {
        replacements: [org_code, normalizedLicenceType],
        type: sequelize.QueryTypes.SELECT
      }
    );

    if (validLicenseCheck.length === 0) {
      return res.status(200).json({ 
        status: false, 
        available: false,
        message: `Invalid or expired license type: ${licence_type}. Please verify this license is active for your organization.`
      });
    }

    const licenseInfo = validLicenseCheck[0];
    const dbLicenceType = licenseInfo.licence_type;

    // 2. Check if there are available licenses of this type
    const usedLicensesCount = await sequelize.query(
      `SELECT COUNT(*) AS used_count
       FROM cmn_org_licences_list 
       WHERE org_code = ? AND UPPER(licence_type) = ? AND emp_id IS NOT NULL AND status = true`,
      {
        replacements: [org_code, normalizedLicenceType],
        type: sequelize.QueryTypes.SELECT
      }
    );

    const usedLicences = parseInt(usedLicensesCount[0]?.used_count || 0);
    const totalLicences = parseInt(licenseInfo.no_of_licences || 0);
    const availableLicences = totalLicences - usedLicences;

    // 3. Check for available unassigned license entries
    const availableEntries = await sequelize.query(
      `SELECT COUNT(*) AS available_entries
       FROM cmn_org_licences_list 
       WHERE org_code = ? AND UPPER(licence_type) = ? AND (emp_id IS NULL OR emp_id = '') AND (status IS NULL OR status = false)`,
      {
        replacements: [org_code, normalizedLicenceType],
        type: sequelize.QueryTypes.SELECT
      }
    );

    const availableEntryCount = parseInt(availableEntries[0]?.available_entries || 0);

    return res.status(200).json({
      status: true,
      licence_type: dbLicenceType,
      from_date: licenseInfo.licence_from_date,
      to_date: licenseInfo.licence_to_date,
      grace_period: licenseInfo.grace_period,
      total_licences: totalLicences,
      used_licences: usedLicences,
      available_licences: availableLicences,
      available_entries: availableEntryCount,
      available: availableLicences > 0 && availableEntryCount > 0,
      message: availableLicences <= 0 
        ? "No available licenses. Maximum number of licenses already assigned."
        : availableEntryCount <= 0 
          ? "No available license entries. Please contact administrator."
          : `${availableLicences} licenses available`
    });
  } catch (error) {
    console.error("Error checking license availability:", error);
    return res.status(500).json({
      status: false,
      available: false,
      message: `Error checking license availability: ${error.message}`,
      error: error.message
    });
  }
};

// Get user's license information
exports.getUserLicenceInfo = async (req, res) => {
  try {
    const { org_code, emp_id } = req.body;
    
    if (!org_code || !emp_id) {
      return res.status(400).json({ 
        status: false, 
        message: "Both org_code and emp_id are required" 
      });
    }

    // Get user's assigned license information
    const licenceInfo = await sequelize.query(
      `SELECT l.licence_no, l.licence_type, l.from_date, l.status, 
              m.licence_from_date, m.licence_to_date, m.grace_period
       FROM cmn_org_licences_list l
       JOIN cmn_org_licences_mst m ON l.org_code = m.org_code AND l.licence_type = m.licence_type
       WHERE l.org_code = ? AND l.emp_id = ? AND l.status = true
       AND CURRENT_DATE BETWEEN m.licence_from_date AND m.licence_to_date`,
      {
        replacements: [org_code, emp_id],
        type: sequelize.QueryTypes.SELECT
      }
    );

    // Get user information from users table
    const userInfo = await sequelize.query(
      `SELECT first_name, last_name, email, licence_type, user_active, role
       FROM users 
       WHERE org_code = ? AND emp_id = ? AND status = true`,
      {
        replacements: [org_code, emp_id],
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    if (userInfo.length === 0) {
      return res.status(404).json({
        status: false,
        message: "User not found or inactive"
      });
    }
    
    const user = userInfo[0];
    
    if (licenceInfo.length === 0) {
      return res.status(200).json({
        status: true,
        user: user,
        has_licence: false,
        message: `User ${emp_id} does not have an active license`
      });
    }

    const licence = licenceInfo[0];
    
    // Calculate days remaining on license
    const today = new Date();
    const licenceEndDate = new Date(licence.licence_to_date);
    const daysRemaining = Math.ceil((licenceEndDate - today) / (1000 * 60 * 60 * 24));
    
    return res.status(200).json({
      status: true,
      user: user,
      has_licence: true,
      licence: {
        licence_no: licence.licence_no,
        licence_type: licence.licence_type,
        assignment_date: licence.from_date,
        valid_from: licence.licence_from_date,
        valid_to: licence.licence_to_date,
        grace_period: licence.grace_period,
        days_remaining: daysRemaining
      },
      message: `User has an active ${licence.licence_type} license (${daysRemaining} days remaining)`
    });
  } catch (error) {
    console.error("Error fetching user license information:", error);
    return res.status(500).json({
      status: false,
      message: `Error retrieving license information: ${error.message}`,
      error: error.message
    });
  }
};

// Get comprehensive license usage statistics for admin dashboard
exports.getLicenseUsageStats = async (req, res) => {
  try {
    // Get overall statistics
    const overallStats = await sequelize.query(`
      SELECT 
        COUNT(CASE WHEN customer_type = 'PAID' THEN 1 END) as paid_customers,
        COUNT(CASE WHEN customer_type = 'TRIAL' THEN 1 END) as trial_customers,
        COUNT(*) as total_customers
      FROM cmn_org_mst 
      WHERE status = true
    `, { type: sequelize.QueryTypes.SELECT });

    // Get license usage by organization
    const licenseUsage = await sequelize.query(`
      SELECT 
        o.org_code,
        o.org_name,
        o.support_mail,
        o.customer_type,
        o.trial_converted_date,
        lm.licence_type,
        lm.no_of_licences as total_licenses,
        COUNT(CASE WHEN ll.status = true THEN 1 END) as assigned_licenses,
        (lm.no_of_licences - COUNT(CASE WHEN ll.status = true THEN 1 END)) as available_licenses,
        lm.licence_from_date,
        lm.licence_to_date,
        CASE 
          WHEN lm.licence_to_date < CURRENT_DATE THEN true
          ELSE false
        END as is_expired,
        CASE 
          WHEN lm.licence_to_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days') THEN true
          ELSE false
        END as expires_soon
      FROM cmn_org_mst o
      LEFT JOIN cmn_org_licences_mst lm ON o.org_code = lm.org_code
      LEFT JOIN cmn_org_licences_list ll ON lm.org_code = ll.org_code AND lm.licence_type = ll.licence_type
      WHERE o.status = true
      GROUP BY o.org_code, o.org_name, o.support_mail, o.customer_type, o.trial_converted_date, 
               lm.licence_type, lm.no_of_licences, lm.licence_from_date, lm.licence_to_date
      ORDER BY o.org_name, lm.licence_type
    `, { type: sequelize.QueryTypes.SELECT });

    // Get trial customers specifically
    const trialCustomers = await sequelize.query(`
      SELECT 
        o.org_code,
        o.org_name,
        o.support_mail,
        o.created_date as trial_start_date,
        lm.licence_to_date as trial_end_date,
        (lm.licence_to_date - CURRENT_DATE) as days_remaining,
        CASE 
          WHEN lm.licence_to_date < CURRENT_DATE THEN 'EXPIRED'
          WHEN lm.licence_to_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '7 days') THEN 'EXPIRING_SOON'
          ELSE 'ACTIVE'
        END as trial_status
      FROM cmn_org_mst o
      JOIN cmn_org_licences_mst lm ON o.org_code = lm.org_code
      WHERE o.customer_type = 'TRIAL' AND o.status = true
      ORDER BY lm.licence_to_date ASC
    `, { type: sequelize.QueryTypes.SELECT });

    // Calculate summary metrics
    const totalLicenses = licenseUsage.reduce((sum, item) => sum + parseInt(item.total_licenses || 0), 0);
    const assignedLicenses = licenseUsage.reduce((sum, item) => sum + parseInt(item.assigned_licenses || 0), 0);
    const availableLicenses = totalLicenses - assignedLicenses;
    const expiringSoon = licenseUsage.filter(item => item.expires_soon).length;

    res.status(200).json({
      status: true,
      data: {
        summary: {
          total_customers: parseInt(overallStats[0].total_customers),
          paid_customers: parseInt(overallStats[0].paid_customers),
          trial_customers: parseInt(overallStats[0].trial_customers),
          total_licenses: totalLicenses,
          assigned_licenses: assignedLicenses,
          available_licenses: availableLicenses,
          expiring_soon: expiringSoon
        },
        license_usage: licenseUsage,
        trial_customers: trialCustomers
      }
    });
  } catch (error) {
    console.error('Error getting license usage stats:', error);
    res.status(500).json({
      status: false,
      message: `Error retrieving license statistics: ${error.message}`,
      error: error.message
    });
  }
};

// Convert trial customer to paid
exports.convertTrialToPaid = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { org_code, new_licenses = [] } = req.body;

    if (!org_code) {
      return res.status(400).json({
        status: false,
        message: 'Organization code is required'
      });
    }

    // Update organization to paid status
    await sequelize.query(
      `UPDATE cmn_org_mst 
       SET customer_type = 'PAID', trial_converted_date = CURRENT_DATE 
       WHERE org_code = ?`,
      {
        replacements: [org_code],
        transaction: t,
        type: sequelize.QueryTypes.UPDATE
      }
    );

    // If new licenses are provided, update the license master
    if (new_licenses.length > 0) {
      for (const license of new_licenses) {
        await sequelize.query(
          `UPDATE cmn_org_licences_mst 
           SET licence_from_date = ?, licence_to_date = ?, no_of_licences = ?, grace_period = ?
           WHERE org_code = ? AND licence_type = ?`,
          {
            replacements: [
              license.from_date,
              license.to_date,
              license.no_of_licences,
              license.grace_period,
              org_code,
              license.licence_type
            ],
            transaction: t,
            type: sequelize.QueryTypes.UPDATE
          }
        );
      }
    }

    await t.commit();

    res.status(200).json({
      status: true,
      message: 'Trial customer successfully converted to paid customer'
    });
  } catch (error) {
    await t.rollback();
    console.error('Error converting trial to paid:', error);
    res.status(500).json({
      status: false,
      message: `Error converting trial customer: ${error.message}`,
      error: error.message
    });
  }
};

// Get existing customers with their current status for admin review
exports.getCustomersWithTrialStatus = async (req, res) => {
  try {
    const customersStatus = await sequelize.query(`
      SELECT 
        o.org_code,
        o.org_name,
        o.support_mail,
        o.customer_type,
        o.created_date as customer_since,
        o.trial_converted_date,
        CASE 
          WHEN o.customer_type = 'PAID' AND o.trial_converted_date IS NULL THEN 'Original Paid Customer'
          WHEN o.customer_type = 'PAID' AND o.trial_converted_date IS NOT NULL THEN 'Converted from Trial'
          WHEN o.customer_type = 'TRIAL' THEN 'Active Trial Customer'
          ELSE 'Unknown Status'
        END as customer_status_description,
        COUNT(lm.licence_type) as license_types_count,
        SUM(lm.no_of_licences) as total_licenses
      FROM cmn_org_mst o
      LEFT JOIN cmn_org_licences_mst lm ON o.org_code = lm.org_code
      WHERE o.status = true
      GROUP BY o.org_code, o.org_name, o.support_mail, o.customer_type, o.created_date, o.trial_converted_date
      ORDER BY o.created_date DESC
    `, { type: sequelize.QueryTypes.SELECT });

    res.status(200).json({
      status: true,
      data: customersStatus,
      summary: {
        total_customers: customersStatus.length,
        original_paid: customersStatus.filter(c => c.customer_status_description === 'Original Paid Customer').length,
        converted_from_trial: customersStatus.filter(c => c.customer_status_description === 'Converted from Trial').length,
        active_trials: customersStatus.filter(c => c.customer_status_description === 'Active Trial Customer').length
      }
    });
  } catch (error) {
    console.error('Error getting customers with trial status:', error);
    res.status(500).json({
      status: false,
      message: `Error retrieving customer status: ${error.message}`,
      error: error.message
    });
  }
};