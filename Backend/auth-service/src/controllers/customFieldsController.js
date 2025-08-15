const CustomFields = require('../models/CustomFields');
const sequelize = require('../config/db');
const nodemailer = require('nodemailer');
// const sgMail = require("@sendgrid/mail");
// const API_KEY=process.env.SEND_GRID_EMAIL_API_KEY
// const SENDGRID_EMAIL=process.env.SENDGRID_EMAIL
// Create a new custom field

// Create a transporter with Hostinger SMTP settings
const transporter = nodemailer.createTransport({
  host: 'email-smtp.us-east-1.amazonaws.com',
  port: 465,
  secure: true,
  auth: {
    user: "AKIATBRPP4HNP3XCWKKF",
    pass: "BEXb1EbnBwiLHcfHZl2G4vPGZWizIASQ2pb30US8g5eA",
  },
  logger: true,
  debug: true,
});


exports.createCustomField = async (req, res) => {
  const { name, label, field_type, placeholder, options, is_required } = req.body;
  const transaction = await CustomFields.sequelize.transaction();

  try {
    const totalFields = await CustomFields.count({ transaction });
    const nextOrder = totalFields + 1;

    const newField = await CustomFields.create(
      { name, label, field_type, placeholder,  is_required, order_id: nextOrder },
      { transaction }
    );

    await transaction.commit();
    return res.status(201).json({status:true,newField});
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating custom field:', error.message);
    return res.status(400).json({ error: 'Error creating custom field', details: error.message });
  }
};

exports.getAllCustomFields = async (req, res) => {
  try {
    // Extract search_key and org_code from query parameters
    const { search_key, org_code } = req.body;

    if (!org_code) {
      return res.status(400).json({ success: false, error: "Organization code is required" });
    }

    // Define the table name dynamically
    const table_name = `${org_code}_prod_orders`;

    let fields;

    if (search_key) {
      // Fetch fields with search filter
      fields = await sequelize.query(
        `SELECT id, field_label 
         FROM prod_mapping_keys_info  
         WHERE table_name = :table_name 
         AND LOWER(field_label) LIKE LOWER(:searchKey)`,
        {
          replacements: {
            table_name,
            searchKey: `%${search_key}%`
          },
          type: sequelize.QueryTypes.SELECT
        }
      );
    } else {
      // Fetch all fields without search filter
      fields = await sequelize.query(
        `SELECT id, field_label 
         FROM prod_mapping_keys_info 
         WHERE table_name = :table_name`,
        {
          replacements: { table_name },
          type: sequelize.QueryTypes.SELECT
        }
      );
    }

    // Return the response
    return res.status(200).json({ status: true, data: fields });

  } catch (error) {
    console.error("Error fetching custom fields:", error);
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};


// exports.sendEmail = async (to, subject, body) => {
//   try {
//     sgMail.setApiKey(API_KEY); 
//     const msg = {
//       to,
//       from:SENDGRID_EMAIL,
//       subject,
//       html: body, // Supports HTML content
//     };

//     await sgMail.send(msg);
//     console.log("Email sent successfully to", to);
//     return { success: true, message: "Email sent successfully" };
//   } catch (error) {
//     console.error("Error sending email:", error.response?.body || error.message);
//     return { success: false, message: "Failed to send email" };
//   }
// };

exports.sendEmail = async (to, subject, body) => {
  
  console.log(`Attempting to send email to ${to} with subject "${subject}"`);
  
  try {
      const info = await transporter.sendMail({
        from: '"DREAM Application" <notifications@vyva.ai>',
        to,
        subject,
        html: body, // Use the body as HTML content
        text: body.replace(/<[^>]+>/g, ''), // Strip HTML tags for text version
      });

      console.log(`? Email successfully sent to ${to}. SES Message ID: ${info.messageId}`);
      return { success: true, message: 'Email sent successfully' };
  }  catch (error) {
      console.error(`? Failed to send email to ${to}:`, error);
      if (error.response) {
        console.error('SES Response:', error.response);
      }
      return { success: false, message: 'Failed to send email', error: error.message };
    }
};