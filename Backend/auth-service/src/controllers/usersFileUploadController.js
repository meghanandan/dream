const fs           = require('fs');
const { parse }    = require('csv-parse');
const sequelize    = require('../config/db');
const { sendEmail } = require("./customFieldsController");
const { QueryTypes } = require('sequelize');
const { getPresentDateAndTime } = require("../utils/dateHelper");

// for CSV download hidden column 
const IGNORED_COLUMNS = [
  'id',
  'org_code',	
  'quota_id',
  'created_at',
  'created_by',
  'updated_by', 
  'updated_at',
  'status',
  'work_flow_id',
  'last_node',
];

async function fetchRequiredColumns(org) {
  // 1) system columns
  const sysRows = await sequelize.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name   = 'prod_quota'
     ORDER BY ordinal_position`,
    { type: QueryTypes.SELECT }
  );

  // 2) custom fields, ordered by field_sequence
  const custRows = await sequelize.query(
    `SELECT field_name
     FROM prod_mapping_keys_info
     WHERE org_code   = :org
       AND field_type = 'Quota'
       AND active     = true
     ORDER BY field_sequence, field_name`,
    {
      replacements: { org },
      type: QueryTypes.SELECT
    }
  );

  const allCols = [
    ...sysRows.map(r => r.column_name),
    ...custRows.map(r => r.field_name)
  ];

  const filtered = allCols.filter(col => !IGNORED_COLUMNS.includes(col));
  return filtered;
}

// controllers/uploadController.js
exports.downloadQuotaTemplate = async (req, res, next) => {
  try {
    const org = req.body.org_code;
    if (!org) {
      return res.status(400).json({ message: 'Missing org_code in request body' });
    }
    const requiredColumns = await fetchRequiredColumns(org);
    res
      .setHeader('Content-Type', 'text/csv')
      .setHeader(
        'Content-Disposition',
        `attachment; filename="quota-template-${org}.csv"`
      )
      .send(requiredColumns.join(','));
  } catch (err) {
    next(err);
  }
};
async function getTableFieldTypes(table) {
  // This works for PostgreSQL
  const result = await sequelize.query(
    `SELECT column_name, data_type 
     FROM information_schema.columns 
     WHERE table_schema = 'public' AND table_name = ?`,
    { replacements: [table], type: sequelize.QueryTypes.SELECT }
  );
  const map = {};
  for (const row of result) {
    map[row.column_name] = row.data_type;
  }
  return map;
}
// // Re-use your fetchRequiredColumns helper
exports.getQuotaColumns = async (req, res, next) => {
  try {
    const org = req.body.org_code;
    if (!org) return res.status(400).json({ message: 'org_code required' });

    // 1) Get system columns (with data type and filtering)
    const sysRows = await sequelize.query(
      `SELECT column_name, data_type
         FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'prod_quota'
        ORDER BY ordinal_position`,
      { type: QueryTypes.SELECT }
    );
    // Filter and map as object
    const systemColumns = sysRows
      .filter(r => !IGNORED_COLUMNS.includes(r.column_name))
      .map(r => ({
        column: r.column_name,
        data_type: r.data_type
      }));

    // 2) Get custom/user columns with data_type if present in mapping table
    const custRows = await sequelize.query(
      `SELECT field_name, data_type
         FROM prod_mapping_keys_info
        WHERE org_code   = :org
          AND field_type = 'Quota'
          AND active     = true
        ORDER BY field_sequence, field_name`,
      {
        replacements: { org },
        type: QueryTypes.SELECT
      }
    );
    // Map as object (default data_type to string if not present)
    const customColumns = custRows.map(r => ({
      column: r.field_name,
      data_type: r.data_type || 'string'
    }));

    return res.json({
      prod_quota: systemColumns,        // [{column, data_type}]
      prod_quota_cust: customColumns    // [{column, data_type}]
    });
  } catch (err) {
    next(err);
  }
};

exports.getQuotaTemplateFields = async (req, res, next) => {
  try {
    const org = req.body.org_code;
    if (!org) return res.status(400).json({ message: 'org_code required' });

    // 1) Fetch system fields dynamically from DB
    const sysRows = await sequelize.query(
      `SELECT column_name, data_type
         FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'prod_quota_templates'
        ORDER BY ordinal_position`,
      { type: QueryTypes.SELECT }
    );
    const systemFields = sysRows
      .filter(r => !IGNORED_COLUMNS.includes(r.column_name))
      .map(r => ({
        field_name: r.column_name,
        field_label: r.column_name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        data_type: r.data_type,
        is_system: true,
        is_editable: false,
        is_visible: true,
      }));

    // 2) Fetch custom fields for this org from mapping table
    const customRows = await sequelize.query(
      `SELECT field_name, data_type, field_label
         FROM prod_mapping_keys_info
        WHERE org_code   = :org
          AND field_type = 'QuotaTemplate'
          AND active     = true
        ORDER BY field_sequence, field_name`,
      {
        replacements: { org },
        type: QueryTypes.SELECT
      }
    );
    const customFields = customRows.map(r => ({
      field_name: r.field_name,
      field_label: r.field_label || r.field_name,
      data_type: r.data_type || 'string',
      is_system: false,
      is_editable: true,
      is_visible: true,
    }));

    // Combine and return
    const allFields = [...systemFields, ...customFields];
    return res.json({ status: true, data: allFields });
  } catch (err) {
    next(err);
  }
};

async function getSplitColumns(org) {
  // System fields
  const sysRows = await sequelize.query(
    `SELECT column_name FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'prod_quota' ORDER BY ordinal_position`,
    { type: QueryTypes.SELECT }
  );
  const systemFields = sysRows.map(r => r.column_name).filter(col => !IGNORED_COLUMNS.includes(col));
  // Custom fields
  const custRows = await sequelize.query(
    `SELECT field_name FROM prod_mapping_keys_info 
      WHERE org_code = :org AND field_type = 'Quota' AND active = true ORDER BY field_sequence, field_name`,
    { replacements: { org }, type: QueryTypes.SELECT }
  );
  const customFields = custRows.map(r => r.field_name);
  return { systemFields, customFields };
}
   

 

function sanitizeNumber(val) {
  return val === undefined || val === null || val === "" || isNaN(Number(val)) || Number(val) < 0 ? 0 : Number(val);
}

function sanitizeString(val) {
  return val === undefined || val === null ? '' : String(val);
}

function sanitizeDate(val, type) {
  if (type === 'from') return (!val || !val.toString().trim()) ? '01/01/1900' : val;
  if (type === 'to')   return (!val || !val.toString().trim()) ? '12/31/2999' : val;
  return val;
}

function normalizeField(val, dbType, field) {
  if (field === 'effective_from_date') return (!val || !val.toString().trim()) ? '01/01/1900' : val;
  if (field === 'effective_to_date')   return (!val || !val.toString().trim()) ? '12/31/2999' : val;
  const numericTypes = [
    "integer", "numeric", "bigint", "smallint", "decimal", "real", "double precision"
  ];
  if (numericTypes.includes((dbType || '').toLowerCase())) {
    // Always set 0 for undefined, null, blank, or not a number
    if (val === undefined || val === null || val === '' || isNaN(Number(val))) return 0;
    return Number(val);
  }
  // Strings: if undefined/null, return empty string
  if (["character varying", "varchar", "text"].includes((dbType || '').toLowerCase())) {
    return (val === undefined || val === null) ? '' : String(val);
  }
  // Fallback: use '' for missing
  return val === undefined || val === null ? '' : val;
}

function validateType(val, dbType) {
  if (["integer", "numeric", "bigint", "smallint", "decimal", "real", "double precision"].includes((dbType || '').toLowerCase())) {
    return val === undefined || val === null || val === "" || !isNaN(Number(val));
  }
  if (["character varying", "varchar", "text"].includes((dbType || '').toLowerCase())) {
    return true;
  }
  if (["date", "timestamp", "timestamp without time zone"].includes((dbType || '').toLowerCase())) {
    return !val || !isNaN(Date.parse(val));
  }
  return true;
}

exports.uploadUsersFiles = async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ message: 'No file uploaded under field "file"' });
  }
  const filePath = file.path;
  let t;
  try {
    const org_code = req.body.org_code;
    const created_by = req.body.created_by || 'system';
    const empName = req.body.emp_name;

    // 1. Fetch field definitions/types
    const { systemFields, customFields } = await getSplitColumns(org_code);
    const sysFieldTypes = await getTableFieldTypes('prod_quota');
    const custFieldTypes = await getTableFieldTypes(`${org_code}_prod_orders`);

    // 2. Parse CSV
    let headers;
    const rows = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(parse({ columns: true, trim: true, skip_empty_lines: true, bom: true }))
        .on('error', reject)
        .on('data', row => {
          if (!headers) headers = Object.keys(row).map(h => h.trim());
          rows.push(row);
        })
        .on('end', resolve);
    });

    // 3. Header check
    const allRequiredCols = [...systemFields, ...customFields];
    if (!headers || headers.length === 0 || rows.length === 0) {
      return res.status(400).json({ message: 'CSV must have headers and at least one row.' });
    }
    if (
      headers.length !== allRequiredCols.length ||
      !allRequiredCols.every((col, idx) => col === headers[idx])
    ) {
      return res.status(400).json({ message: 'CSV headers mismatch.', expected: allRequiredCols, found: headers });
    }

    // 4. Duplicate check (in CSV, by emp_id + quota_period + department + quota_name)
    const seen = new Set();
    const duplicates = [];
    for (const r of rows) {
      const key = [
        (r.emp_id || '').trim().toLowerCase(),
        (r.quota_period || '').trim().toLowerCase(),
        (r.department || '').trim().toLowerCase(),
        (r.quota_name || '').trim().toLowerCase(),
      ].join('|');
      if (seen.has(key)) duplicates.push(r);
      else seen.add(key);
    }
    if (duplicates.length) {
      return res.status(409).json({ message: 'Duplicates found in file', duplicates });
    }

    // 5. Validation sets
    let typeErrors = [];
    let empIdNotFound = [];
    let alreadyExist = [];

    // Valid emp_ids
    const users = await sequelize.query(
      `SELECT emp_id FROM users WHERE org_code = ? AND user_active = true`,
      { replacements: [org_code], type: QueryTypes.SELECT }
    );
    const validEmpIds = new Set(users.map(u => (u.emp_id || '').toLowerCase()));

    // DB duplicates (emp_id + quota_period + department + quota_name)
    const uniqueKeys = rows.map(r => ({
      emp_id: (r.emp_id || '').trim(),
      quota_period: (r.quota_period || '').trim(),
      department: (r.department || '').trim(),
      quota_name: (r.quota_name || '').trim(),
    })).filter(u => u.emp_id && u.quota_period && u.department && u.quota_name);

    let existRows = [];
    if (uniqueKeys.length) {
      existRows = await sequelize.query(
        `SELECT emp_id, quota_period, department, quota_name FROM prod_quota
         WHERE org_code = ? AND (${uniqueKeys.map(() =>
          `(emp_id = ? AND quota_period = ? AND department = ? AND quota_name = ?)`
        ).join(' OR ')})`,
        {
          replacements: [
            org_code,
            ...uniqueKeys.flatMap(u => [u.emp_id, u.quota_period, u.department, u.quota_name]),
          ],
          type: QueryTypes.SELECT,
        }
      );
    }
    const existKeySet = new Set((existRows || []).map(r =>
      [
        (r.emp_id || '').toLowerCase(),
        (r.quota_period || '').toLowerCase(),
        (r.department || '').toLowerCase(),
        (r.quota_name || '').toLowerCase()
      ].join('|')
    ));

    // 6. Row-by-row validation
    for (const [idx, r] of rows.entries()) {
      // Type check for system fields
      for (const field of systemFields) {
        const val = r[field];
        if (!validateType(val, sysFieldTypes[field])) {
          typeErrors.push({ row: idx + 2, field, value: val, expected: sysFieldTypes[field] });
        }
      }
      // Type check for custom fields
      for (const field of customFields) {
        const val = r[field];
        if (!validateType(val, custFieldTypes[field])) {
          typeErrors.push({ row: idx + 2, field, value: val, expected: custFieldTypes[field] });
        }
      }
      // emp_id check
      if (!validEmpIds.has((r.emp_id || '').toLowerCase())) {
        empIdNotFound.push({ row: idx + 2, emp_id: r.emp_id });
      }
      // DB duplicate check
      const key = [
        (r.emp_id || '').trim().toLowerCase(),
        (r.quota_period || '').trim().toLowerCase(),
        (r.department || '').trim().toLowerCase(),
        (r.quota_name || '').trim().toLowerCase(),
      ].join('|');
      if (existKeySet.has(key)) {
        alreadyExist.push({
          row: idx + 2,
          emp_id: r.emp_id,
          quota_name: r.quota_name,
          quota_period: r.quota_period,
          department: r.department,
        });
      }
    }

    if (typeErrors.length || empIdNotFound.length || alreadyExist.length) {
      return res.status(422).json({
        message: 'Validation failed',
        typeErrors,
        empIdNotFound,
        alreadyExist
      });
    }

    // 7. Normalize & prepare insert objects
    const processedRows = rows.map(r => {
      const prod_quota = {};
      for (const f of systemFields) {
        prod_quota[f] = normalizeField(r[f], sysFieldTypes[f], f);
      }
      const prod_quota_cust = {};
      for (const f of customFields) {
        const colType = custFieldTypes[f];
        let val = r.hasOwnProperty(f) ? r[f] : undefined;
        prod_quota_cust[f] = normalizeField(val, colType, f);
      }
      return { prod_quota, prod_quota_cust };
    });

    // 8. Transactional insert
    t = await sequelize.transaction();
    const presentDateAndTime = getPresentDateAndTime();
    for (const { prod_quota, prod_quota_cust } of processedRows) {
      const qid = `${prod_quota.quota_name}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const now = new Date();

      // Insert into prod_quota
      const [quotaRecord] = await sequelize.query(
        `INSERT INTO prod_quota (
          org_code, quota_id, created_by, created_at, status, ${systemFields.join(',')}
        ) VALUES (
          ?, ?, ?, ?, ?, ${systemFields.map(() => '?').join(',')}
        ) RETURNING id, quota_id`,
        {
          replacements: [
            org_code,
            qid,
            created_by,
            presentDateAndTime,
            'New',
            ...systemFields.map(f => prod_quota[f])
          ],
          transaction: t,
          type: QueryTypes.INSERT
        }
      );
      const prod_orders_row_id = quotaRecord[0].id;
      // Insert into custom table if any custom fields
      if (customFields.length && Object.keys(prod_quota_cust).some(k => prod_quota_cust[k] !== undefined)) {
        await sequelize.query(
          `INSERT INTO ${org_code}_prod_orders (prod_orders_row_id, ${customFields.join(',')})
           VALUES (?, ${customFields.map(() => '?').join(',')})`,
          {
            replacements: [prod_orders_row_id, ...customFields.map(f => prod_quota_cust[f])],
            transaction: t
          }
        );
      }

      // Insert into prod_quota_history for all RL_NyAd admins
      const nextAdmiEmpId = await sequelize.query(
        `SELECT emp_id FROM users WHERE role='RL_NyAd' AND user_active=true AND org_code=?`,
        { replacements: [org_code], type: QueryTypes.SELECT, transaction: t }
      );
      for (const { emp_id } of nextAdmiEmpId) { 
        await sequelize.query(
          `INSERT INTO prod_quota_history (status, assigned_to, created_by, created_at, quota_id,node_id,quota_action,temp_node_id)
           VALUES (?, ?, ?, ?, ?,?,?,?)`,
          {
            replacements: [
              'New',
              emp_id,
              created_by,
              presentDateAndTime,
              prod_orders_row_id,
              0,
              'Data uploaded by : ' +empName,
              0,
            ],
            transaction: t,
          }
        );
      }
    }

    // 9. Notification emails (if needed)
    // const emails = await sequelize.query(
    //   `SELECT DISTINCT u.email, u.first_name || ' ' || u.last_name AS name
    //    FROM users u WHERE u.user_active=true AND u.role='RL_NyAd' and u.org_code=?`,
    //   { replacements: [org_code], type: QueryTypes.SELECT, transaction: t }
    // );
    // for (const { email, name } of emails) {
    //   if (email) {
    //     await sendEmail(
    //       email,
    //       "New Quota Awaiting Your Action",
    //       `<div style="font-family:Helvetica,sans-serif;color:#333;padding:20px;">
    //          <h2 style="color:#007BFF;">DReaM Notification</h2>
    //          <p>Dear ${name},</p>
    //          <p>Quota uploaded, awaiting approval.</p>
    //          <a href="https://vyva.ai" style="background-color:#007BFF;color:#fff; padding:10px 20px;text-decoration:none;border-radius:5px;">View Quota Details</a>
    //        </div>`
    //     );
    //   }
    // }

    await t.commit();
    res.json({ message: `Inserted ${processedRows.length} rows.` });

  } catch (err) {
    if (t) await t.rollback();
    console.error(err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  } finally {
    fs.unlink(filePath, () => {});
  }
};
