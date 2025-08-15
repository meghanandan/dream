const Pages = require("../models/Pages"); // Adjust the path to your Sequelize model
const Template = require("./../models/Template");
const sequelize = require("../config/db");
const utils = require("../utils/utils");
const R = require("ramda");
const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const moment = require("moment");
const { sendEmail } = require("./customFieldsController");
const ADMIN_ROLE = process.env.ADMIN_ROLE;
 
exports.getOrders = async (req, res) => {
  const data = req.body;
  try {
    const searchKey = data.search_key || "";
    const pageNumber = parseInt(data.page_number, 10) || 1;
    const pageSize = parseInt(data.page_size, 10) || 20;
    // Fetch all records from the Pages table

    let query = `SELECT * FROM orders`;

    let queryCount = `SELECT COUNT(*) AS total_count FROM orders`;

    const countResult = await sequelize.query(queryCount, {
      type: sequelize.QueryTypes.SELECT,
    });

    const totalOrders = countResult[0]?.total_count || 0;
    query += ` ORDER BY id LIMIT :limit OFFSET :offset `;
    const orders = await sequelize.query(query, {
      replacements: {
        limit: pageSize,
        offset: (pageNumber - 1) * pageSize,
      },
      type: sequelize.QueryTypes.SELECT,
    });
  
    // Check if no pages were found
    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: "No master orders found" });
    } 

    // Respond with the fetched orders
    if (orders.length != 0) { 
      res.status(200).json({ status: true, data: orders, totalOrders });
    } else {
      res.status(200).json({ status: true, messsage: "No data found" });
    }
  } catch (error) { 
    res.status(500).json({ message: error.message });
  }
};

exports.getDisputeorAdjustmentDropDown = async (req, res) => {
  try {
    const { search_key, type, org_code,template_ids } = req.body; 
    // console.log("--- template_ids ---- "+ typeof template_ids)
    //  if (!Array.isArray(template_ids) || template_ids.length === 0) {
    //   return res.status(400).json({ message: "template name is required ." });
    // }
    let query = `SELECT id, work_flow_id, template_type, name FROM templates WHERE status=true AND org_code = ? `;
    let replacements = [org_code,template_ids];

    if (search_key) {
      query += " AND name LIKE ?";
      replacements.push(`%${search_key}%`);
    }

    if (type) {
      query += " AND template_type = ?";
      replacements.push(type);
    }

    const getDropDown = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT,
      replacements,
    });

    res.status(200).json({ data: getDropDown });
  } catch (error) {
    res.status(500).json({ message: "Error fetching templates", error: error.message });
  }
};
 
async function sendEmails(assigned_from, emailData) {
  // Fetch sender details
  const [{ email: fromEmail, first_name: fromName }] = await sequelize.query(
    `SELECT email, first_name FROM users WHERE emp_id = ?`,
    { type: sequelize.QueryTypes.SELECT, replacements: [assigned_from] }
  );

  for (const { assigned_to, work_flow_type } of emailData) {
    let recipients = [];

    if (work_flow_type === "role") {
      // assigned_to is an array of emp_ids
      const query = `SELECT email, first_name FROM users WHERE emp_id IN (${assigned_to.map(() => "?").join(",")})`;
      recipients = await sequelize.query(query, {
        type: sequelize.QueryTypes.SELECT,
        replacements: assigned_to,
      });
    } else {
      // assigned_to is a single emp_id
      const [user] = await sequelize.query(`SELECT email, first_name FROM users WHERE emp_id = ?`,
        { type: sequelize.QueryTypes.SELECT, replacements: [assigned_to] }
      );
      if (user) recipients.push(user);
    }

    // Send email to all recipients
    for (const { email: toEmail, first_name: toName } of recipients) {
      const emailBody = `
        <p>Hi ${toName} !</p>
        <p>Dispute has been assigned to you, Please take action</p>
        <p><strong>Assigned From:</strong></p>
        <p>Name: <strong>${fromName}</strong></p>
        <p>Email: <strong>${fromEmail}</strong></p>
      `;
      const subject = "Dispute Update";
      // Call sendEmail function
      await sendEmail(toEmail, subject, emailBody);
    }
  }
}
 
exports.performDelegation = async (req, res) => {
  const { dispute_ids, done_by, assigned_from, assigned_to } = req.body;

  if (
    !Array.isArray(dispute_ids) ||
    !done_by ||
    !assigned_from ||
    !assigned_to
  ) {
    return res
      .status(400)
      .json({ status: false, message: "Missing required fields" });
  }

  const transaction = await sequelize.transaction();

  try {
    // Fetch assigned_to from dispute_flow for given dispute_ids
    const [prmResult] = await sequelize.query(
      `select role from users where emp_id=? and role=?`,
      {
        type: sequelize.QueryTypes.SELECT,
        replacements: [done_by, ADMIN_ROLE], // Correctly mapped replacements
        transaction,
      }
    );
 
    if (!prmResult) {
      return res.status(404).json({status: false,message: "You Do Not Have Permission to execute this activity",});
    }
    const results = await sequelize.query(
      `SELECT dispute_id, assigned_to from dispute_flow 
        WHERE dispute_id IN (:dispute_ids) AND dispute_stage IN (:dispute_stages) AND assigned_to = :assigned_from `,
      {
        type: sequelize.QueryTypes.SELECT,
        replacements: {
          dispute_ids,
          dispute_stages: ["raised", "in_progress"],
          assigned_from,
        },
        transaction,
      }
    );
    // Check if results are empty
    if (!results || results.length === 0) {
      return res.status(404).json({status: false,message: "No active disputes found for selected ID(s) and employee(s).",});
    }

    // Extract unique assigned_to values from results

    // Condition 1: Ensure all disputes belong to a single assigned_to employee
    if (dispute_ids.length != results.length) {
      await transaction.rollback();
      return res.status(400).json({
        status: false,
        message: "Please select disputes of a single employee.",
      });
    }

    // If both conditions pass, update assigned_to in dispute_flow table
    await sequelize.query(
      `UPDATE dispute_flow SET assigned_to = :assigned_to WHERE dispute_id IN (:dispute_ids) AND assigned_to = :assigned_from`,
      {
        type: sequelize.QueryTypes.UPDATE,
        replacements: { assigned_to, dispute_ids, assigned_from },
        transaction,
      }
    );

    // Commit transaction
    await transaction.commit();
    res.status(200).json({
      status: true,
      message: "Disputes Reassigned successfully.",
    });
    // Log email data before sending
    const emailData = [{ assigned_to, work_flow_type: "user" }];
    console.log(emailData, "maildata");

    // Send emails in the background without waiting
    sendEmails(assigned_from, emailData).catch(console.error);
  } catch (error) {
    await transaction.rollback();
    console.error("API Error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

exports.compareProducts = async (req, res) => {
  try {
    const { org_code, product_ids } = req.body; 

    if (!Array.isArray(product_ids) || product_ids.length === 0) {
      return res.status(400).json({ message: 'product_ids is required' });
    }
    const inConditionJoin = product_ids.map(() => '?').join(', '); 

    const query = ` SELECT 
        prod_orders.id AS prod_orders_row_id,
        prod_orders.org_code,prod_orders.user_id,
        AQUA_prod_orders.category,
        AQUA_prod_orders.amount,
        AQUA_prod_orders.product_id,
        AQUA_prod_orders.brand,
        AQUA_prod_orders.model,
        AQUA_prod_orders.processor,
        AQUA_prod_orders.ram,
        AQUA_prod_orders.storage,
        AQUA_prod_orders.display,
        AQUA_prod_orders.os,
        AQUA_prod_orders.stock_quantity,
        AQUA_prod_orders.warehouse_location,
        COUNT(*) OVER() AS total_count
      FROM prod_orders LEFT JOIN AQUA_prod_orders  ON AQUA_prod_orders.prod_orders_row_id = prod_orders.id
      WHERE prod_orders.org_code = ? AND AQUA_prod_orders.product_id IN (${inConditionJoin})
      ORDER BY AQUA_prod_orders.product_id `;

    const replacements = [org_code, ...product_ids];

    const result = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT,
      replacements
    });

    return res.status(200).json({ data: result });

  } catch (error) {
    console.error('Comparison Query Error:', error);
    return res.status(500).json({ message: 'Error comparing products' });
  }
};
