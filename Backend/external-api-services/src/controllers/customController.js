const {APP_CONSTANTS} = require('../utils/constants')
const {DATA_TYPES,TABLE_TYPES,FOREIGN_TABLE_TYPES}=APP_CONSTANTS
const {sequelize,pool} = require('../config/db');


const dropDownApi=async(req,res)=>{
const {name}=req.body
if(!name){
    return res.status(400).json({ message: "Plase Send Name of Dropdown Api" });
  }
let names = {
    data_types: DATA_TYPES,
    table_types:TABLE_TYPES,
    foreign_key_data_types:FOREIGN_TABLE_TYPES
  };

  let obj = names[name];
  if(!obj){
    return res.status(400).json({ message: "Plase Send Valid Dropdown Api Name" });
  }

  return res.status(200).json({
    status: true,
    data: [...Object.keys(obj).map((e) => ({ id: e, name: obj[e] }))],
  });


}


const insertCommonStandardFields = async (req, res) => {
  try {
    const { org_code, user_id } = req.body;

    if (!org_code || !user_id) {
      return res.status(400).json({
        status: false,
        message: "Organization Code or User ID is Missing",
      });
    }

    const excludedColumns = [
      "id", "user_id", "org_code", "created_by", "updated_by",
      "created_at", "updated_at", "active"
    ];

    // Fetch columns excluding unwanted ones
    const { rows: columns } = await pool.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'prod_orders'
       AND column_name <> ALL ($1)`, 
      [excludedColumns]
    );

    if (columns.length === 0) {
      return res.status(400).json({ status: false, message: "No valid columns found" });
    }

    // Prepare bulk insert values as a single array
    const values = [];
    columns.forEach(({ column_name, data_type }) => {
      values.push(
        org_code,
        "prod_orders",
        column_name,
        data_type,
        column_name.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
        user_id
      );
    });

    // Construct the bulk insert query dynamically
    const placeholders = columns
      .map((_, i) => `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`)
      .join(", ");

    const query = `
      INSERT INTO prod_mapping_keys_info (org_code, table_name, field_name, data_type, field_label, created_by)
      VALUES ${placeholders}
    `;

    // Execute bulk insert
    await pool.query(query, values);

    res.status(200).json({ success: true, message: "Bulk data inserted successfully" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      message: "Failed to insert data into prod_mapping_keys_info",
      error: error.message,
    });
  }
};

const getUsersDataSource = async (req, res) => {
  const { org_code, external_api_code, user_id } = req.body;

  if (!org_code || !external_api_code || !user_id) {
    return res.status(400).json({ status: false, message: "Invalid Request, please fill required information" });
  }

  try {
    // Check if the data source already exists
    const { rows } = await pool.query('SELECT COUNT(*) AS count FROM users_data_source WHERE org_code = $1', [org_code]);
    
    if (parseInt(rows[0].count) > 0) {
      return res.status(400).json({
        status: false,
        message: "You have already configured the data source for this table. You can't do it again."
      });
    }

    // Insert the new data source configuration
    const result = await pool.query(
      'INSERT INTO users_data_source (org_code, user_id, external_api_code) VALUES ($1, $2, $3) RETURNING id',
      [org_code, user_id, external_api_code]
    );

    return res.status(200).json({
      status: true,
      message: "Configuration Done Successfully",
      inserted_id: result.rows[0].id
    });

  } catch (error) {
    console.error("Internal Server Error:", error);
    return res.status(500).json({
      status: false,
      message: "Something went wrong",
      error: error.message
    });
  }
};


const getHierarchyLevels = async (req, res) => {
  try {
      // Recursive CTE Query
      const query = `
          WITH RECURSIVE employee_hierarchy AS (
    SELECT emp_id, first_name, reporting_to, 1 AS level
    FROM users
    WHERE reporting_to IS NULL
    UNION ALL
    SELECT u.emp_id, u.first_name, u.reporting_to, eh.level + 1 AS level
    FROM users u
    INNER JOIN employee_hierarchy eh ON u.reporting_to = eh.emp_id
)
SELECT emp_id, reporting_to,first_name, level FROM employee_hierarchy ORDER BY level;
      `;

      // Execute the Query
      const result = await sequelize.query(query, { type: sequelize.QueryTypes.SELECT });
      console.log(result,"result")

      // Return response
      return res.status(200).json({ 
          status: true, 
          data: result
      });

  } catch (error) {
      console.error("Error fetching hierarchy levels:", error);
      return res.status(500).json({ 
          status: false, 
          message: "Error retrieving hierarchy levels" 
      });
  }
};

module.exports={
    dropDownApi,
    insertCommonStandardFields,
    getHierarchyLevels,
    getUsersDataSource


}

