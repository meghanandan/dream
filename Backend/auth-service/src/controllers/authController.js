// src/controllers/authController.js

const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const UAParser = require("ua-parser-js");
const axios = require("axios");
const User = require("../models/User");
const sequelize = require("../config/db");
const { generateAccessToken, generateRefreshToken } = require("../utils/jwtUtils");

/** Helper: Geo‑lookup by IP */
async function geoLookup(ip) {
  try {
    const res = await axios.get(`https://ipapi.co/${ip}/json/`);
    return {
      city: res.data.city || null,
      country: res.data.country_name || null,
    };
  } catch {
    return { city: null, country: null };
  }
}

/** Helper: Parse User‑Agent string */
function parseUserAgent(uaString) {
  const parser = new UAParser(uaString);
  const result = parser.getResult();
  return {
    browser: result.browser.name || null,
    browserVersion: result.browser.version || null,
    os: result.os.name || null,
    osVersion: result.os.version || null,
    deviceType: result.device.type || "desktop",
  };
}

/** Helper: Stub IP‑reputation check */
async function checkIpReputation(ip) {
  // replace with real API call if you have one
  return 0;
}

/** Core logger */
async function logLoginAttempt({
  user_id,
  email,
  action,
  ip_address,
  user_agent,
  licence_type,
  success,
  details,
  city,
  country,
  browser_name,
  browser_version,
  os_name,
  os_version,
  device_type,
  auth_method,
  mfa_used,
  session_id,
  ip_reputation,
  response_time_ms,
  correlation_id,
  org_code,
}) {
  try {
    await sequelize.query(
      `INSERT INTO user_login_audit (
         user_id, email, action, ip_address, user_agent, licence_type,
         success, details, city, country,
         browser_name, browser_version,
         os_name, os_version, device_type,
         auth_method, mfa_used, session_id,
         ip_reputation, response_time_ms, correlation_id, org_code
       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      {
        replacements: [
          user_id,
          email,
          action,
          ip_address,
          user_agent,
          licence_type,
          success,
          details,
          city,
          country,
          browser_name,
          browser_version,
          os_name,
          os_version,
          device_type,
          auth_method,
          mfa_used,
          session_id,
          ip_reputation,
          response_time_ms,
          correlation_id,
          org_code,
        ],
      }
    );
  } catch (err) {
    console.error("Failed to log login attempt:", err);
  }
}

/** POST /auth/login */
exports.login = async (req, res) => {
  const { email, password, licence_type = "DREAMLTE" } = req.body;
  const clientIp = req.ip;
  const allIps   = req.ips
  const ip = req.ip;
  const uaString = req.headers["user-agent"] || "";
  const startTime = Date.now();
  const geo    = await geoLookup(ip);
  const ua     = parseUserAgent(uaString);
  const sessionId     = uuidv4();
  const ipReputation  = await checkIpReputation(ip);

  let user;
  try {
    // 1) Find user
    user = await User.findOne({
      where: { email, status: true, user_active: true, licence_type },
    });
    if (!user) {
      // log & reject
      await logLoginAttempt({
        user_id: null,
        email,
        action: "FAILED_LOGIN",
        ip_address: ip,
        user_agent: uaString,
        licence_type,
        success: false,
        details: "User not found",
        city: geo.city,
        country: geo.country,
        browser_name: ua.browser,
        browser_version: ua.browserVersion,
        os_name: ua.os,
        os_version: ua.osVersion,
        device_type: ua.deviceType,
        auth_method: "password",
        mfa_used: false,
        session_id: sessionId,
        ip_reputation: ipReputation,
        response_time_ms: Date.now() - startTime,
        correlation_id: sessionId,
        org_code: req.body.org_code || null,
      });
      return res.status(404).json({ message: "User not found" });
    }

    // 2) Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      await logLoginAttempt({
        user_id: user.emp_id,
        email,
        action: "FAILED_LOGIN",
        ip_address: ip,
        user_agent: uaString,
        licence_type,
        success: false,
        details: "Invalid password",
        city: geo.city,
        country: geo.country,
        browser_name: ua.browser,
        browser_version: ua.browserVersion,
        os_name: ua.os,
        os_version: ua.osVersion,
        device_type: ua.deviceType,
        auth_method: "password",
        mfa_used: false,
        session_id: sessionId,
        ip_reputation: ipReputation,
        response_time_ms: Date.now() - startTime,
        correlation_id: sessionId,
        org_code: user.org_code,
      });
      return res.status(401).json({ message: "Invalid password" });
    }

    // 3) Success: log, issue tokens
    await logLoginAttempt({
      user_id: user.emp_id,
      email,
      action: "LOGIN",
      ip_address: ip,
      user_agent: uaString,
      licence_type: user.licence_type,
      success: true,
      details: "Login successful",
      city: geo.city,
      country: geo.country,
      browser_name: ua.browser,
      browser_version: ua.browserVersion,
      os_name: ua.os,
      os_version: ua.osVersion,
      device_type: ua.deviceType,
      auth_method: "password",
      mfa_used: false,
      session_id: sessionId,
      ip_reputation: ipReputation,
      response_time_ms: Date.now() - startTime,
      correlation_id: sessionId,
      org_code: user.org_code,
    });

    // Build userdata object as before
    const userdata = {
      role: user.role,
      name: user.first_name + " " + user.last_name,
      email: user.email,
      user_id: user.emp_id,
      organization: user.org_code,
      licenceType: user.licence_type,
    };

    // --- Templates/licence logic ---
    let replacements = [user.org_code, user.role, user.licence_type];

    let query = `select tmap.org_code, tmap.licence_type, tmap.template_id, tem.name as template_name, tmap.work_flow_id
from cmn_user_role_template_mappring tmap
left join templates tem on tmap.template_id= tem.id left join work_flows wf on tem.work_flow_id = wf.id
where tmap.org_code= ? and tmap.role_id= ? and tmap.licence_type =? and wf.status='false' order by tem.name`;

    const rows = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT,
      replacements,
    });

    const licenceLTEList = rows.filter(
      (row) => row.licence_type === "DREAMLTE"
    );
    const licencePROList = rows.filter(
      (row) => row.licence_type === "DREAMPRO"
    );

    // --- Get Trial Status Information ---
    let trialInfo = null;
    try {
      // First get organization info from cmn_org_mst
      const orgQuery = `
        SELECT 
          org_code,
          org_name,
          customer_type,
          trial_converted_date,
          status
        FROM cmn_org_mst
        WHERE org_code = ?
        AND status = true
      `;
      
      const orgResults = await sequelize.query(orgQuery, {
        type: sequelize.QueryTypes.SELECT,
        replacements: [user.org_code],
      });
      
      console.log('Organization query results:', orgResults);
      
      if (orgResults && orgResults.length > 0) {
        const org = orgResults[0];
        const isTrialType = org.customer_type === 'TRIAL';
        
        // Now get license details from cmn_org_licences_mst
        const licenseQuery = `
          SELECT 
            licence_from_date,
            licence_to_date,
            no_of_licences,
            grace_period,
            CURRENT_DATE as current_date,
            CASE 
              WHEN licence_to_date IS NULL THEN NULL
              WHEN licence_to_date < CURRENT_DATE THEN 0
              ELSE (DATE_PART('day', licence_to_date::timestamp - CURRENT_DATE::timestamp))::integer
            END as days_remaining
          FROM cmn_org_licences_mst
          WHERE org_code = ?
          AND licence_type = ?
          ORDER BY licence_to_date DESC
          LIMIT 1
        `;
        
        // Log the parameters we're using for the query
        console.log('Query parameters - org_code:', user.org_code, 'licence_type:', user.licence_type);
        
        const licenseResults = await sequelize.query(licenseQuery, {
          type: sequelize.QueryTypes.SELECT,
          replacements: [user.org_code, user.licence_type],
        });
        
        console.log('License query results:', JSON.stringify(licenseResults, null, 2));
        
        if (licenseResults && licenseResults.length > 0) {
          const license = licenseResults[0];
          
          trialInfo = {
            trial_status: isTrialType ? 'TRIAL' : 'PAID',
            trial_start_date: license.licence_from_date,
            trial_end_date: license.licence_to_date,
            days_remaining: license.days_remaining,
            is_trial: isTrialType,
            is_paid: !isTrialType,
            company_name: org.org_name || user.org_code,
            customer_status: org.status,
            trial_converted_date: org.trial_converted_date,
            total_licenses: license.no_of_licences,
            licence_type: user.licence_type,
            grace_period: license.grace_period
          };
        } else {
          // Organization exists but no license records found
          console.log('Organization found but no license records, using partial data');
          
          trialInfo = {
            trial_status: isTrialType ? 'TRIAL' : 'PAID',
            is_trial: isTrialType,
            is_paid: !isTrialType,
            company_name: org.org_name || user.org_code,
            customer_status: org.status,
            trial_converted_date: org.trial_converted_date
          };
        }
      } else {
        // No organization found, use fallback data
        console.log('No organization record found, using fallback data');
        const today = new Date();
        const trialEndDate = new Date(today);
        trialEndDate.setDate(today.getDate() + 30);
        
        trialInfo = {
          trial_status: 'TRIAL',
          trial_start_date: today.toISOString(),
          trial_end_date: trialEndDate.toISOString(),
          days_remaining: 30,
          is_trial: true,
          is_paid: false,
          company_name: user.org_code,
          customer_status: true
        };
      }
      
      console.log('Final trial info:', trialInfo);

      // === BLOCK LOGIN IF TRIAL EXPIRED ===
      if (trialInfo && trialInfo.is_trial && trialInfo.days_remaining <= 0) {
        console.log('Trial expired, blocking login for:', email);
        
        // Format the end date to be more readable
        const endDate = trialInfo.trial_end_date ? new Date(trialInfo.trial_end_date) : new Date();
        const formattedEndDate = endDate.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        // Get support information
        const orgName = trialInfo.company_name || user.org_code;
        const supportEmail = orgResults?.[0]?.support_mail || 'support@vyva.ai';
        
        // Log the login attempt as expired trial
        await logLoginAttempt({
          user_id: user.emp_id,
          email,
          action: "TRIAL_EXPIRED",
          ip_address: ip,
          user_agent: uaString,
          licence_type: user.licence_type,
          success: false,
          details: `Login rejected: Trial expired for ${orgName}`,
          city: geo.city,
          country: geo.country,
          browser_name: ua.browser,
          browser_version: ua.browserVersion,
          os_name: ua.os,
          os_version: ua.osVersion,
          device_type: ua.deviceType,
          auth_method: "password",
          mfa_used: false,
          session_id: sessionId,
          ip_reputation: ipReputation,
          response_time_ms: Date.now() - startTime,
          correlation_id: sessionId,
          org_code: user.org_code,
        });

        // Return detailed error response for the frontend to handle
        return res.status(403).json({
          status: false,
          code: 'TRIAL_EXPIRED',
          message: 'Your organization\'s trial period has expired. Please contact your administrator to upgrade your account.',
          organizationName: orgName,
          supportEmail: supportEmail,
          trialEndDate: formattedEndDate,
          daysExpired: Math.abs(trialInfo.days_remaining),
          userId: user.emp_id
        });
      }

    } catch (trialErr) {
      console.error('Failed to fetch trial info:', trialErr);
      // Continue login even if trial info fails
    }

    // Generate tokens
    const accessToken  = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
console.log('Real client IP:', clientIp);
    // Send response with trial information included
    // Format trial info with actual database values taking precedence over fallback values
    const formattedTrialInfo = {
      ...trialInfo,
      // Only use fallback values if the database values don't exist
      is_trial: trialInfo?.is_trial !== undefined ? trialInfo.is_trial : (trialInfo?.trial_status === 'TRIAL' || true),
      days_remaining: trialInfo?.days_remaining !== undefined && trialInfo?.days_remaining !== null ? 
                      parseInt(trialInfo.days_remaining, 10) : 30
    };
    
    console.log('Days remaining from DB:', trialInfo?.days_remaining);
    console.log('Final formatted days_remaining:', formattedTrialInfo.days_remaining);
    console.log('Type of days_remaining:', typeof formattedTrialInfo.days_remaining);
    
    // Trial info is only included within userdata object
    res.json({
      accessToken,
      refreshToken,
      userdata: { 
        ...userdata, 
        trialInfo: formattedTrialInfo
      },
      licenceLTEList,
      licencePROList
      // Root level trialInfo removed as requested
    });

  } catch (err) {
    // Log error as failed login (for auditing)
    await logLoginAttempt({
      user_id: user ? user.emp_id : null,
      email,
      action: "FAILED_LOGIN",
      ip_address: ip,
      user_agent: uaString,
      licence_type,
      success: false,
      details: "Server error: " + err.message,
      city: geo?.city,
      country: geo?.country,
      browser_name: ua?.browser,
      browser_version: ua?.browserVersion,
      os_name: ua?.os,
      os_version: ua?.osVersion,
      device_type: ua?.deviceType,
      auth_method: "password",
      mfa_used: false,
      session_id: sessionId,
      ip_reputation: ipReputation,
      response_time_ms: Date.now() - startTime,
      correlation_id: sessionId,
      org_code: user?.org_code || null,
    });
    res.status(500).json({ message: err.message });
  }
};

/** GET /auth/me */
exports.me = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ["password"] },
    });
    if (!user) return res.status(404).json({ message: "Not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/** POST /auth/password */
exports.password = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.password) return res.status(400).json({ message: "Already set" });
    const hash = await bcrypt.hash(password, 10);
    await User.update({ password: hash }, { where: { email } });
    res.json({ message: "Password created" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
