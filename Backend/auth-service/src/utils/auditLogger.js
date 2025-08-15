// utils/auditLogger.js
const sequelize = require("../config/db");
const { QueryTypes } = require("sequelize");

// Audit action types
const AUDIT_ACTIONS = {
  // Data Access
  READ: 'READ',
  READ_LIST: 'READ_LIST',
  READ_PENDING_LIST: 'READ_PENDING_LIST',
  READ_VERIFIED_LIST: 'READ_VERIFIED_LIST',
  EXPORT: 'EXPORT',
  
  // Data Modifications
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  BULK_CREATE: 'BULK_CREATE',
  BULK_UPDATE: 'BULK_UPDATE',
  BULK_DELETE: 'BULK_DELETE',
  
  // Status Changes
  STATUS_UPDATE: 'STATUS_UPDATE',
  STATE_CHANGE: 'STATE_CHANGE',
  WORKFLOW_ACTION: 'WORKFLOW_ACTION',
  
  // File Operations
  FILE_UPLOAD: 'FILE_UPLOAD',
  FILE_DOWNLOAD: 'FILE_DOWNLOAD',
  FILE_DELETE: 'FILE_DELETE',
  FILE_PROCESS: 'FILE_PROCESS',
  
  // User Actions
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  ACCESS_DENIED: 'ACCESS_DENIED',
  
  // System Events
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  API_ERROR: 'API_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR'
};

exports.AUDIT_ACTIONS = AUDIT_ACTIONS;

exports.logAudit = async ({
  org_code,
  object_type,
  object_id = null,
  action,
  changed_by,
  old_values = null,
  new_values = null,
  remarks = null
}) => {
  if (!org_code || !object_type || !action || !changed_by) {
    console.error("[AUDIT] Missing required fields:", {
      org_code, object_type, action, changed_by
    });
    return;
  }
  console.log("[AUDIT] logAudit called with:", {
    org_code,
    object_type,
    object_id,
    action,
    changed_by,
    remarks,
  });

  const sql = `
    INSERT INTO public.audit_log
      (org_code, object_type, object_id, action, changed_by, changed_at,
       old_values, new_values, remarks)
    VALUES
      (:org_code, :object_type, :object_id, :action, :changed_by, now(),
       :old_values, :new_values, :remarks)
    RETURNING id
  `;

  try {
    // Serialize objects/arrays to JSON strings
    const serializedOldValues = old_values ? JSON.stringify(old_values) : null;
    const serializedNewValues = new_values ? JSON.stringify(new_values) : null;

    const [result] = await sequelize.query(sql, {
      replacements: {
        org_code,
        object_type,
        object_id,
        action,
        changed_by,
        old_values: serializedOldValues,
        new_values: serializedNewValues,
        remarks
      },
      type: QueryTypes.INSERT
    });

    return result;
  } catch (err) {
    console.error("[AUDIT LOG ERROR]", {
      error: err,
      context: {
        org_code,
        object_type,
        object_id,
        action,
        remarks
      }
    });
  }
};

// Helper to measure and log API duration
exports.withAuditLog = async (params, apiFunc) => {
  const startTime = Date.now();
  let status_code = 200;
  
  try {
    const result = await apiFunc();
    return result;
  } catch (error) {
    status_code = error.status || 500;
    throw error;
  } finally {
    const duration_ms = Date.now() - startTime;
    await exports.logAudit({
      ...params,
      status_code,
      duration_ms
    });
  }
};

// Helper for bulk operations
exports.logBulkAudit = async (params, items) => {
  return Promise.all(
    items.map(item =>
      exports.logAudit({
        ...params,
        object_id: item.id,
        old_values: item.old,
        new_values: item.new,
        remarks: item.remarks
      })
    )
  );
};
