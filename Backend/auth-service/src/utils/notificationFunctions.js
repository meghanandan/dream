/**
 * notificationFunctions.js - Fixed version with correct endpoint
 */
const axios = require('axios');
const { sendEmail } = require("../controllers/customFieldsController");

// Get the Gateway Service URL from environment variables
// IMPORTANT FIX: Using the correct URL structure
const GATEWAY_SERVICE_URL = process.env.GATEWAY_SERVICE_URL || 'https://dream.uniflo.ai/api';
const SERVICE_TOKEN = process.env.SERVICE_TOKEN || 'Dream_notify_secret';

// Log configuration when module is loaded
console.log("[Notification] Module loaded with Gateway URL:", GATEWAY_SERVICE_URL);

/**
 * Send a notification through the Gateway Service API
 * @param {Object} notification - The notification payload
 * @returns {Promise<boolean>} Success indicator
 */
async function sendGatewayNotification(notification, retries = 1) {
  try {
    // Hardcode the URL that works
    const url = 'https://dream.uniflo.ai/api/api/notify';
    
    // Simplify the payload to match what works in Postman
    const simplePayload = {
      to: notification.to,
      type: "NOTIFICATION",
      title: notification.title,
      message: notification.message
    };
    
    // Add dispute_id if it exists
    if (notification.dispute_id) {
      simplePayload.dispute_id = notification.dispute_id;
    }
    
    const response = await axios.post(
      url,
      simplePayload,
      {
        headers: {
          'Authorization': `Bearer ${SERVICE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }
    );
    
    if (response.status === 200) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return sendGatewayNotification(notification, retries - 1);
    }
    return false;
  }
}

/**
 * Send both email and WebSocket notifications for disputes
 * @param {Object} options - Configuration options
 */
async function sendDisputeNotifications({
  type,
  dispute_id,
  org_code,
  assignees,
  created_by,
  disputeData,
  nextStage,
  sequelize
}) {
  console.log("?? Starting sendDisputeNotifications for dispute #" + dispute_id);
  console.log("?? Notification type:", type);
  console.log("?? Assignees:", assignees);
  console.log("?? Created by:", created_by);
  
  // Determine notification subject and title based on type
  let emailSubject, notificationTitle;
  if (type === 'CREATE') {
    emailSubject = `New Dispute Created - #${dispute_id}`;
    notificationTitle = 'New Dispute Assigned';
  } else if (type === 'UPDATE') {
    emailSubject = `Dispute Updated - #${dispute_id}`;
    notificationTitle = 'Dispute Status Updated';
  } else if (type === 'DREAMLITE_CREATE') {
    emailSubject = `New DreamLite Dispute Created - #${dispute_id}`;
    notificationTitle = 'New DreamLite Dispute Assigned';
  } else {
    emailSubject = `Dispute Notification - #${dispute_id}`;
    notificationTitle = 'Dispute Notification';
  }

  try {
    // 1. Send emails to all assignees
    const emailPromises = [];
    
    for (const assignee of assignees) {
      // Fetch assignee email
      const [userInfo] = await sequelize.query(
        `SELECT email, first_name, last_name FROM users WHERE emp_id = :emp_id AND org_code = :org_code`,
        { 
          replacements: { emp_id: assignee, org_code }, 
          type: sequelize.QueryTypes.SELECT
        }
      );
      
      console.log(`?? User info for ${assignee}:`, userInfo || "Not found");
      
      if (userInfo?.email) {
        // Format email content
        const emailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>${notificationTitle}</h2>
            <p>Hello ${userInfo.first_name || 'there'},</p>
            <p>${type === 'CREATE' || type === 'DREAMLITE_CREATE' 
                 ? 'A new dispute has been assigned to you for review.'
                 : 'A dispute assigned to you has been updated and requires your attention.'}</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <p><strong>Dispute ID:</strong> ${dispute_id}</p>
              <p><strong>Priority:</strong> ${disputeData.priority}</p>
              <p><strong>Severity:</strong> ${disputeData.severity}</p>
              ${disputeData.description ? `<p><strong>Description:</strong> ${disputeData.description}</p>` : ''}
              ${disputeData.comments ? `<p><strong>Comments:</strong> ${disputeData.comments}</p>` : ''}
              <p><strong>Stage:</strong> ${nextStage}</p>
            </div>
            <p>Please log in to the DREAM application to review this dispute.</p>
            <p>Thank you,<br>DREAM Notification System</p>
          </div>
        `;
        
        // Send email asynchronously (non-blocking)
        emailPromises.push(sendEmail(userInfo.email, emailSubject, emailBody));
      }
      
      // 2. Send WebSocket notifications to all assignees via Gateway Service
      console.log(`?? Sending WebSocket notification to ${assignee}`);
      
      // IMPORTANT FIX: Use the format that works from Postman
      const notificationPayload = {
        type: "NOTIFICATION", 
        to: assignee,
        title: notificationTitle,
        message: type === 'CREATE' || type === 'DREAMLITE_CREATE' ?
          `New dispute #${dispute_id} has been assigned to you.` :
          `Dispute #${dispute_id} has been updated and requires your attention.`,
        dispute_id,
        // Keep data object for backward compatibility
        data: {
          dispute_id,
          priority: disputeData.priority,
          severity: disputeData.severity,
          description: disputeData.description ? 
            (disputeData.description.substring(0, 100) + 
             (disputeData.description.length > 100 ? '...' : '')) : '',
          comments: disputeData.comments,
          stage: nextStage,
          created_at: new Date().toISOString()
        }
      };
      
      console.log("?? Notification payload:", JSON.stringify(notificationPayload));
      
      const result = await sendGatewayNotification(notificationPayload);
      console.log(`?? Notification send result for ${assignee}:`, result);
    }
    
    // 3. Also notify the creator about successful creation/update
    console.log(`?? Sending confirmation notification to creator: ${created_by}`);
    
    // IMPORTANT FIX: Use the format that works from Postman for creator notification too
    await sendGatewayNotification({
      type: "NOTIFICATION", // Use type that works from Postman
      to: created_by,
      title: type === 'CREATE' ? 'Dispute Created' : 
            type === 'DREAMLITE_CREATE' ? 'DreamLite Dispute Created' : 
            'Dispute Updated',
      message: type === 'CREATE' || type === 'DREAMLITE_CREATE' ?
        `Your dispute #${dispute_id} has been created successfully.` :
        `You have successfully updated dispute #${dispute_id}.`,
      dispute_id,
      data: {
        dispute_id,
        priority: disputeData.priority,
        severity: disputeData.severity,
        assignees: assignees.length,
        stage: nextStage,
        created_at: new Date().toISOString()
      }
    });
    
    // Process emails in background, don't wait for them to complete
    Promise.all(emailPromises).then(results => {
      console.log(`?? Email notifications sent for dispute #${dispute_id}:`, 
        results.filter(r => r.success).length, 'successful,',
        results.filter(r => !r.success).length, 'failed');
    });
    
    console.log(`?? Completed sendDisputeNotifications for dispute #${dispute_id}`);
    return true;
  } catch (err) {
    console.error(`Failed to send notifications for dispute #${dispute_id}:`, err);
    return false;
  }
}

module.exports = { 
  sendDisputeNotifications,
  sendGatewayNotification
};