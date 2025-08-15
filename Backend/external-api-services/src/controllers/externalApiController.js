const { getAccessToken } = require('../middlewares/authDataSyncMiddleware');
const { ExternalApiEndpoint, ExternalApiKey, ExternalApiKeyValue,ApiKeyValues } = require('../models/dataSyncModal');
const {sequelize,pool} = require('../config/db');
const {APP_CONSTANTS} = require('../utils/constants')
const {TABLE_ORDER,FOREIGNKEYS,USER_QUERY} = APP_CONSTANTS
const moment = require('moment');
const Papa = require("papaparse");
const axios = require("axios");
// Sync Data

async function fetchData(request,tableName) {
  console.log(tableName,"request.url")
  const url = (tableName === 'user' || tableName === 'userrole')? request.specialCase : request.url;
  console.log(url,"url")
  try {
    const response = await fetch(url, {
      method: request.method,
      headers: request.headers,
      body: request.body ? request.body : null,
    });

    
    if (!response.ok) {
      console.log(response.data,"data")
      console.error(`Failed to fetch data for table: ${tableName}}`);
      return null;
    }

    const data = await response.json();
    if (!data) {
      console.log(`No data received for table ${request.tableName}`);
      return null;
    }
    
    return {
      columns: request.extractColumns(data),
      rows: request.extractRows(data),
    };
  } catch (error) {
    console.error(`Error fetching data for table ${request.tableName}:`, error);
    return null;
  }
}

async function getTotalCount(tableName, accessToken,baseUrl) {
  console.log(tableName, accessToken,baseUrl,"tableName, accessToken,baseUrl")
  const url = `${baseUrl}?q=SELECT COUNT() FROM ${tableName}`;
   console.log(url,"url")
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();
  console.log(data,"data")
  return data.totalSize; // This gives the total record count
}
async function getFieldsForCollection(collectionCode) {
  const query = `SELECT key_name FROM external_api_collection_fields WHERE collection_code = $1`;
  const { rows } = await pool.query(query, [collectionCode]);
  
  if (rows.length === 0) {
    throw new Error(`No fields found for collection: ${collectionCode}`);
  }
  
  return rows
    .map(row => row.key_name)
    .filter(field => field.toLowerCase() !== "billingaddress" && field.toLowerCase() !== "shippingaddress" && field.toLowerCase() !== "address");
}
const syncData = async (req, res) => {
  try {
    const { from, to, org_code, user_id, external_api_code } = req.body;
    const toDate = to || moment().format("YYYY-MM-DD"); // Default to today's date
    const fromDate = from || moment().startOf("month").format("YYYY-MM-DD"); // 1st of the current month
    const formattedTo = moment(toDate).utc().format("YYYY-MM-DDTHH:mm:ss[Z]");
    const formattedFrom = moment(fromDate).utc().format("YYYY-MM-DDTHH:mm:ss[Z]");
    
    if (!external_api_code || !org_code || !user_id) {
      return res.status(400).json({ status:false,message: "Invalid request data" });
    }

    const data = await ExternalApiEndpoint.findAll({
      attributes: ["purpose", "method", "url", "params", "body"],
      include: [
        {
          model: ExternalApiKey,
          attributes: ["api_key", "key_type"],
          where: { external_api_code },
          include: [
            {
              model: ExternalApiKeyValue,
              attributes: ["value", "org_code", "user_id"],
              where: { org_code ,external_api_code},
            },
          ],
        },
      ],
    });

    const groupedData = data.map(endpoint => ({
      purpose: endpoint.purpose,
      method: endpoint.method,
      url: endpoint.url,
      params: endpoint.params,
      body: endpoint.body,
      org_code: endpoint.ExternalApiKeys?.[0]?.ExternalApiKeyValues?.[0]?.org_code,
      ExternalApiKeys: endpoint.ExternalApiKeys.map(key => ({
        api_key: key.api_key,
        key_type: key.key_type,
        value: key.ExternalApiKeyValues?.[0]?.value,
      })),
    }));


    // console.log(groupedData,"groupedData")
    const tokenEndpoint = groupedData.find((item) => item.purpose === 'token');
    if (!tokenEndpoint) {
      return res.status(400).json({ status:false,error: 'Token endpoint not found' });
    }

    const credentials = {};
    tokenEndpoint.ExternalApiKeys.forEach((key) => {
      credentials[key.api_key] = key.value;
    });

    // console.log(tokenEndpoint,"tokenEndpoint")

    const tokenResponse = await getAccessToken(
      {
        json: async () => ({
          url: tokenEndpoint.url,
          method: tokenEndpoint.method,
          params: tokenEndpoint.params,
          body: tokenEndpoint.body,
          credentials,
        }),
      },
      { json: (data) => data }
    );

    const accessToken = tokenResponse.accessToken;
   
    if (!accessToken) {
      return res.status(404).json({ status: false, message: "Failed to get Access Token" });
    }

    const [collections] = await sequelize.query(`SELECT id, collection_key FROM external_api_collections where external_api_code='${external_api_code}'`);
    // console.log(collections,"collections")
    const dataPayload = groupedData.find(item => item.purpose === 'data');

    // console.log(dataPayload,"dataPayload")
    // const collections=[
    //   // {id:1,collection_key:"xc_credit"}
    //   {id:1,collection_key:"user"},
    //   // {id:2,collection_key:"order"}
    // ]
    // const accessToken='00Dau000001FXHd!AQEAQOGB.09UPBAXWe24RFtlhb2TUZzpV3hleg6YJmRi.CM_8bTrZXD6WoDH0Np29fEt5u2bZybFvYt5_al5cCM5_b_WbT6o';

    for (const row of collections) {
      const tableName = row.collection_key;
      // console.log(tableName,"tableName in for")
      const fields = await getFieldsForCollection(tableName);
      const fieldList = fields.join(", "); 
      // console.log(fieldList,"fieldList")
      if (dataPayload) { 
        const requestBody = {
          command: `SELECT ${fieldList} FROM xactly.${tableName} WHERE created_date >= '${fromDate}' AND created_date<='${toDate}'`
        };
        const dataRequest = {
          xc: {
            url: dataPayload.url,
            method: dataPayload.method,
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
            extractColumns: (dataResult) => dataResult.data?.schema?.columns || [],
            extractRows: (dataResult) => dataResult.data?.rows || [],
            valueKey: 'index', 
          },
          sf: {
            url: `${dataPayload.url}?q=SELECT ${fieldList} FROM ${tableName} WHERE CreatedDate >=${formattedFrom} AND CreatedDate <=${formattedTo} LIMIT 200`,
            method: dataPayload.method,
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: null, // No body needed for Salesforce API request
            // extractColumns: (dataResult) => (dataResult.records?.length > 0 ? Object.keys(dataResult.records[0]) : []),
            extractColumns: (dataResult) =>
              dataResult.records?.length > 0
                ? Object.keys(dataResult.records[0])
                    .filter((key) => !["attributes", "BillingAddress", "ShippingAddress","Address"].includes(key)) // Filter out unwanted fields
                    .map((key) => ({ name: key})) // Keep only valid keys
                : [],
            extractRows: (dataResult) => dataResult.records || [],
            valueKey: 'name', 
            specialCase:`${dataPayload.url}?q=SELECT FIELDS(All) FROM ${tableName} LIMIT 200`,
          },
        };

        const selectedRequest = dataRequest[external_api_code];
        let rows,columns;
        if(external_api_code == 'sf'){
          const totalRecords = await getTotalCount(tableName, accessToken,dataPayload.url);
          console.log(`Total Records: ${totalRecords}`);
          if(totalRecords <= 200){
            console.log("200 if")
            // console.log(selectedRequest,"selectedRequest")
            const result = await fetchData(selectedRequest,tableName);
            if (!result) return;
            columns = result.columns;
            rows = result.rows;
          }
          else{
          // Convert array to comma-separated string
            const createJobResponse = await fetch(`https://vyvaconsultinginc2.my.salesforce.com/services/data/v62.0/jobs/query`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
                "Accept": "application/json",
              },
              body: JSON.stringify({
                operation: "query",
                query: `SELECT ${fieldList} FROM ${tableName}  WHERE CreatedDate >=${formattedFrom} AND CreatedDate <=${formattedTo}`,
                contentType: "CSV",
              }),
            });
            // console.log(createJobResponse,"createJobResponse")
            const createJobData = await createJobResponse.json();
            // console.log(createJobData,"createJobData")
            if (!createJobData.id) {
              console.error(`Failed to create Bulk Query Job for table: ${tableName}`);
              continue;
            }
            
            const jobId = createJobData.id;
            console.log(`Created Bulk API Job ID: ${jobId} for table ${tableName}`);
            
            // Poll the job status
            let jobStatus = "InProgress";
            while (jobStatus === "InProgress" || jobStatus === "Open") {
              await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds before checking again
              const jobStatusResponse = await fetch(`https://vyvaconsultinginc2.my.salesforce.com/services/data/v62.0/jobs/query/${jobId}`, {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Accept": "application/json",
                },
              });
            
              const jobStatusData = await jobStatusResponse.json();
              jobStatus = jobStatusData.state;
              console.log(`Job Status: ${jobStatus}`);
            }
            
            if (jobStatus !== "JobComplete") {
              console.error(`Bulk Query Job ${jobId} failed for table ${tableName}`);
              continue;
            }
            
            // Fetch results
            const resultResponse = await fetch(`https://vyvaconsultinginc2.my.salesforce.com/services/data/v62.0/jobs/query/${jobId}/results`, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Accept": "text/csv",
              },
            });
            // console.log(resultResponse.data,"resultResponse daata")
            const csvData = await resultResponse.text();
            // console.log(csvData,"csvData")
            const parsedData = Papa.parse(csvData, {
              header: true, // Use first row as column headers
              skipEmptyLines: true, // Ignore empty rows
              dynamicTyping: false, // Keep values as strings
            });
            
            // console.log(parsedData.data, "parsedData");
            
            // Extract columns
            columns = parsedData.meta.fields.map(col => ({ name: col }));
            
            // Extract rows
            rows = parsedData.data.map(row => 
              Object.fromEntries(columns.map(col => [col.name, row[col.name] || null])) // Ensure correct mapping
            );
            
            // console.log(columns, "columns");
            // console.log(rows, "rows");

          }
        }
        else{
          const result = await fetchData(selectedRequest,tableName);
          if (!result) return;
          columns = result.columns;
          rows = result.rows;
        }
        // console.log("Columns:", columns);
        // console.log("Rows:", rows);
        // console.log(accessToken,"accessToken")
        // console.log(selectedRequest,"selectedRequest")
        if (!rows || !columns || rows.length === 0 || columns.length === 0) {
          console.log(`No rows or columns received for table ${tableName}`);
          continue;
        }

        if(rows.length > 0){
        // **Delete existing records before inserting new ones**
        const deleteQuery = `DELETE FROM staging.${tableName} WHERE org_code = ? AND dream_user_id = ? AND created_at >= ? AND created_at<=?`;
        await sequelize.query(deleteQuery, { replacements: [org_code, user_id,fromDate,toDate] });
         
        // **Prepare bulk insert values**
        const columnNames = ["org_code", "dream_user_id","created_by", ...columns.map(col => col.name)].join(", ");
        const valuesArray = rows.map(rowData => {
          const values = columns.map(col => {
            let value = rowData[col[selectedRequest.valueKey]];
            
            if (value === null) {
              return 'NULL';
            } else if (typeof value === 'string') {
              value = value.replace(/'/g, "''"); // Escape single quotes
              return `'${value}'`;
            }
            return value; // Keep numbers and other types as is
          }).join(', ');
        
          return `('${org_code}', '${user_id}','${user_id}', ${values})`;
        });
        // console.log(valuesArray,"valuesArray")

        // **Perform bulk insert**
        if (valuesArray.length > 0) {
          const insertQuery = `INSERT INTO staging.${tableName} (${columnNames}) VALUES ${valuesArray.join(", ")};`;
          try {
            await sequelize.query(insertQuery);
            console.log(`Bulk inserted ${rows.length} records into ${tableName}`);
          } catch (insertError) {
            console.error(`Failed to bulk insert into ${tableName}:`, insertError);
          }
        }
         }
       }
    }

    return res.status(200).json({ status: true, message: "Data synchronized successfully" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};

// credentials Form Fields
const getApiFormFields = async(req,res) =>{
try{
const {org_code} = req.body;
if(!org_code){
  res.status(400).json({status:false,message:"Organization Code is Missing"})
}
// console.log(org_code,"org_code")
const {rows} = await pool.query(
  `SELECT 
      ak.id, 
      ak.api_key, 
      kv.value, 
      ak.api_key_label, 
      ak.field_type, 
      ak.external_api_code, 
      ma.api_name 
   FROM external_api_keys ak 
   JOIN master_external_apis ma 
     ON ak.external_api_code = ma.external_api_code 
   LEFT JOIN external_api_key_values kv 
     ON ak.api_key = kv.api_key 
    AND ak.external_api_code = kv.external_api_code 
    AND kv.org_code = $1 WHERE ak.flag=1 order by ak.id`, [org_code]);

// console.log(rows,"rows-->")
const groupedData = Object.values(
  rows.reduce((acc, { 
    external_api_code, 
    api_name, id, 
    api_key,value,
     api_key_label, 
     field_type
    }) => {
    // Check if the group exists, if not create one
    if (!acc[external_api_code]) {
      acc[external_api_code] = {
        external_api_code,
        api_name,
        keys: []
      };
    }

    // Add the current row's key details to the group
    acc[external_api_code].keys.push({ 
      id, 
      api_key, 
      value: api_key === 'api' ? "connect" : value,  // ✅ If api_key is "api", set value to "connect"
      api_key_label, 
      field_type,
      disable: api_key === 'api'  // ✅ If api_key is "api", set disable to true
    });
    return acc;
  }, {})
);

res.status(200).json({ status:true, data: groupedData });

}
catch(error){
  console.error("Error:", error);
  res.status(500).json({ status:false,message: 'Failed to get Form Fields', error: error.message });

}

}
// Capture Credentials
const captureCredentials = async (req, res) => {
  try {
    const { external_api_code, org_code, user_id, created_by, keys } = req.body;

    if (!external_api_code || !org_code || !user_id || !created_by || !Array.isArray(keys)) {
      return res.status(400).json({ status:false,message: "Invalid request data" });
    }

    const processedRecords = [];

    for (const keyData of keys) {
      const { api_key, value } = keyData;

      if (!api_key || !value) {
        return res.status(400).json({ status:false,message: "api_key and value are required for each entry" });
      }

      // Check if the record already exists
      const existingRecord = await ApiKeyValues.findOne({
        where: { external_api_code, org_code, api_key },
      });

      if (existingRecord) {
        // Update the existing record instead of skipping
        await existingRecord.update({ value ,updated_by: created_by, // Use `created_by` as `updated_by`
          updated_at: new Date(), });

        // console.log(`Updated record with api_key "${api_key}".`);
        processedRecords.push({ ...existingRecord.toJSON(), value, updated_by: created_by, updated_at: new Date() });
      } else {
        // Insert new record
        const credential = await ApiKeyValues.create({
          external_api_code,
          api_key,
          value,
          org_code,
          user_id,
          created_by,
        });

        // console.log(`Inserted new record with api_key "${api_key}".`);
        processedRecords.push(credential);
      }
    }

    res.status(200).json({
      status:true,
      message: "Credentials Captured successfully",
      data: processedRecords,
    });
  } catch (error) {
    console.error("Error processing credentials:", error);
    res.status(500).json({ status:false,message: "Failed to process credentials", error: error.message });
  }
};

// Delete Credentials
const removeCredentials = async (req, res) => {
  try {
    const { external_api_code, org_code } = req.body;

    if (!external_api_code || !org_code) {
      return res.status(400).json({status:true, message: "Invalid request data" });
    }

    // Delete all matching records
    const deletedCount = await ApiKeyValues.destroy({
      where: { external_api_code, org_code },
    });

    if (deletedCount === 0) {
      return res.status(404).json({status:true, message: "No credentials found to delete" });
    }

    res.status(200).json({ status:true,message: "Credentials deleted successfully" });
  } catch (error) {
    res.status(500).json({ status:false,message: "Error deleting credentials", error: error.message });
  }
};

const CollectionsKeysList = async(req,res) =>{
  try{
  const {org_code} = req.body
  if(!org_code){
    res.status(400).json({status:false,message:"Organization Code is Missing"})
  }
  // console.log(org_code,"org_code")
  const {rows} = await pool.query(
    ` SELECT 
          col.external_api_code,
          ma.api_name,
          col.collection_code,
          col.collection_label,
          fld.id as key_id,
          fld.key_code,
          fld.key_label,
          fld.data_type,
          fld.icon
        FROM external_api_collections col
        JOIN master_external_apis ma ON col.external_api_code = ma.external_api_code 
        JOIN external_api_collection_fields fld ON col.collection_code = fld.collection_code 
        WHERE col.flag = 1 AND fld.flag = 1;
      `);
  
  // console.log(rows,"rows-->")
  const groupedData = Object.values(
      rows.reduce((acc, { external_api_code, api_name, collection_code, collection_label, key_code, key_label,icon,data_type,key_id}) => {
        // Initialize external_api_code if not exists
        if (!acc[external_api_code]) {
          acc[external_api_code] = {
            external_api_code,
            api_name,
            collections: {}
          };
        }
  
        // Initialize collection_code if not exists
        if (!acc[external_api_code].collections[collection_code]) {
          acc[external_api_code].collections[collection_code] = {
            collection_code,
            collection_label,
            keys: []
          };
        }
  
        // Push key details into the keys array
        acc[external_api_code].collections[collection_code].keys.push({ key_id,key_code, key_label,icon,data_type});
  
        return acc;
      }, {})
    ).map(api => ({
      external_api_code: api.external_api_code,
      api_name: api.api_name,
      collections: Object.values(api.collections) // Convert collections object to an array
    }));
    
  res.status(200).json({ status:true, data: groupedData });
  
  }
  catch(error){
    console.error("Error:", error);
    res.status(500).json({ status:false,message: 'Failed to get Collections & Keys List', error: error.message });
  
  }
  
  }

const  storeUserSelections = async (req, res) => {
    const { org_code, user_id, data } = req.body;
  
    // Validate input
    if (!org_code || !user_id || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ status:false,message: "Invalid request data" });
    }
  
    const transaction = await sequelize.transaction();
    try {
      // Step 1: Delete existing records for org_code and user_id
      await sequelize.query(
        `DELETE FROM user_selected_collections_keys WHERE org_code = ? AND user_id = ?`,
        {
          type: sequelize.QueryTypes.DELETE,
          replacements: [org_code, user_id],
          transaction,
        }
      );
  
      // Step 2: Insert new records
      const insertValues = [];
      for (const apiData of data) {
        if (!apiData.external_api_code || !Array.isArray(apiData.collections)) continue;
  
        for (const collection of apiData.collections) {
          if (!collection.collection_code || !Array.isArray(collection.keys)) continue;
  
          for (const key of collection.keys) {
            if (!key.key_code) continue; // Ensure key_code exists
  
            insertValues.push([
              `${collection.collection_code}_${key.key_code}_${org_code}_${user_id}`, // selection_code_pk
              collection.collection_code,
              collection.collection_label,
              key.key_code,
              key.key_label,
              key.icon,
              key.data_type,
              apiData.external_api_code,
              org_code,
              user_id,
              user_id, // created_by (same as user_id)
            ]);
          }
        }
      }
  
      if (insertValues.length > 0) {
        await sequelize.query(
          `INSERT INTO user_selected_collections_keys (
            selection_code_pk, collection_code, collection_label, key_code, key_label,icon,data_type,
            external_api_code, org_code, user_id, created_by
          ) VALUES ${insertValues.map(() => "(?, ?, ?, ?,?,?, ?, ?, ?, ?, ?)").join(", ")}`,
          {
            type: sequelize.QueryTypes.INSERT,
            replacements: insertValues.flat(),
            transaction,
          }
        );
      }
  
      await transaction.commit();
      return res.status(200).json({ status: true, message: "Data stored successfully" });
    } catch (error) {
      await transaction.rollback();
      console.error("Error storing data:", error);
      return res.status(500).json({ status: false, message: "Internal Server Error" });
    }
  };

const getUserSelectionList = async(req,res) =>{
    try{
    const {org_code,user_id} = req.body
    if(!org_code || !user_id){
      res.status(400).json({status:false,message:"Organization Code or User Id is Missing"})
    }
    const {rows} = await pool.query(
      ` SELECT 
            usk.external_api_code,
            ma.api_name,
            usk.collection_code,
            usk.collection_label,
            usk.id as key_id,
            usk.key_code,
            usk.key_label,
            usk.icon,
            usk.data_type
          FROM user_selected_collections_keys usk
          JOIN master_external_apis ma ON usk.external_api_code = ma.external_api_code 
          WHERE usk.org_code = $1 AND usk.created_by = $2;
        `,[org_code,user_id]);
    
    // console.log(rows,"usk rows-->")
    const groupedData = Object.values(
        rows.reduce((acc, { external_api_code, api_name, collection_code, collection_label, key_code, key_label,icon,data_type ,key_id}) => {
          // Initialize external_api_code if not exists
          if (!acc[external_api_code]) {
            acc[external_api_code] = {
              external_api_code,
              api_name,
              collections: {}
            };
          }
    
          // Initialize collection_code if not exists
          if (!acc[external_api_code].collections[collection_code]) {
            acc[external_api_code].collections[collection_code] = {
              collection_code,
              collection_label,
              keys: []
            };
          }
    
          // Push key details into the keys array
          acc[external_api_code].collections[collection_code].keys.push({ external_api_code,collection_code,key_id,key_code, key_label,icon ,data_type});
    
          return acc;
        }, {})
      ).map(api => ({
        external_api_code: api.external_api_code,
        api_name: api.api_name,
        collections: Object.values(api.collections) // Convert collections object to an array
      }));


      const { rows:columns } = await pool.query(
        `select table_name,field_name,data_type,field_label from prod_mapping_keys_info where org_code=$1 and created_by=$2 and active=$3`,[org_code,user_id,true]
      );

      // Transform column data into required format
      const Dreamrows = columns.map(({ field_name, data_type,field_label,table_name },index) => ({
        external_api_code:'dm',
        collection_code:table_name,
        key_id:index+1,
        key_code: field_name,
        key_label: field_label,
        icon: null,
        data_type
      }));

    // Append newObject dynamically
    groupedData.push({
      external_api_code: "dm",
      api_name: "DReaM",
      collections:[
        {collection_code: 'prod_orders',
        collection_label: 'Orders',
        keys:[],
        rows:Dreamrows,
        }
      ]
    });
      
    res.status(200).json({ status:true, data: groupedData });
    
    }
    catch(error){
      console.error("Error:", error);
      res.status(500).json({ status:false,message: 'Failed to get User Selected Collections & Keys List', error: error.message });
    
    }
    
    }

// const addNewFields = async (req, res) => {
//       const { org_code, user_id, field_name, data_type,element = null, description = null,
//          options = null, placeholder = null,field_type=null} = req.body;
       
//       if (!org_code || !user_id || !field_name || !data_type || !field_type) {
//         return res.status(400).json({ status:false,message: "Invalid request data" });
//       }
    
//       // Generate the dynamic table name
//       const table = `${org_code}_prod_orders`;
    
//       // Sanitize field_name: lowercase, replace spaces, remove invalid characters
//       const sanitizedFieldName = field_name
//         .toLowerCase()
//         .replace(/\s+/g, "_") // Replace spaces with underscore
//         .replace(/[^a-z0-9_]/g, ""); // Remove all special characters except letters, numbers, and _
    
//       const sanitizedDataType = data_type.replace(/_/g, " ");
//       const field_label=field_name.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
    
//       if (!sanitizedFieldName) {
//         return res.status(400).json({ status:false,message: "Invalid field name, field name should only have a-z,0-9,_ and space Only" });
//       }
    
//       const transaction = await sequelize.transaction();
//       try {
//         // Step 1: Check if table exists
//         const tableCheckQuery = `
//           SELECT EXISTS (
//             SELECT FROM information_schema.tables 
//             WHERE table_name = ?
//           ) AS table_exists;
//         `;
//         const [{ table_exists }] = await sequelize.query(tableCheckQuery, {
//           replacements: [table ],
//           type: sequelize.QueryTypes.SELECT,
//           transaction,
//         });
//         console.log(table_exists,"table_exists")
    
//         if (table_exists) {
//           // Step 2: Add column if table exists
//           //Column Name Validation
//           const columnCheckQuery = `
//           SELECT EXISTS (
//             SELECT FROM information_schema.columns 
//             WHERE table_name = :table AND column_name = :column
//           ) AS column_exists;
//         `;
//         const [{ column_exists }] = await sequelize.query(columnCheckQuery, {
//           replacements: { table, column: sanitizedFieldName },
//           type: sequelize.QueryTypes.SELECT,
//           transaction,
//         });
      
//         if (column_exists) {
//           console.log("--- if cond---")
//           return res.status(400).json({ status: false, message: `Column already exists with this name : ${sanitizedFieldName}`});
//         }
//         else{
//           console.log("--- else cond---")
//           const alterQuery = `ALTER TABLE ${table} ADD COLUMN ${sanitizedFieldName} ${sanitizedDataType};`;
//           await sequelize.query(alterQuery, {
//             type: sequelize.QueryTypes.RAW,
//             transaction,
//           });
//         }
//         } else {
//           // Step 3: Create table if it doesn't exist
//           const createTableQuery = `
//             CREATE TABLE IF NOT EXISTS  ${table} (
//               id SERIAL PRIMARY KEY,
//               prod_orders_row_id INTEGER,
//               ${sanitizedFieldName} ${sanitizedDataType}
//             );
//           `;
//           await sequelize.query(createTableQuery, {
//             type: sequelize.QueryTypes.RAW,
//             transaction,
//           });
//         }
     
//         // Step 4: Insert field
//         const InsertfieldQuery = `
//           INSERT INTO prod_mapping_keys_info (org_code, table_name, field_name, data_type, field_label, 
//           created_by,field_element,field_description,field_option,field_placeholder,field_type)
//           VALUES (?, ?, ?, ?, ?, ?,?,?,?,?,?) RETURNING id
//         `;
//         const [insertedRow] =  await sequelize.query(InsertfieldQuery, {
//           type: sequelize.QueryTypes.INSERT,
//           replacements: [org_code, table, sanitizedFieldName, sanitizedDataType,field_label,
//             user_id,element,description,options ? JSON.stringify(options) : null,placeholder,field_type],
//           transaction,
//         });

//         const insertedId = insertedRow?.[0]?.id;
//         // Step 5: Insert log entry
//         const logQuery = `
//           INSERT INTO prod_orders_log 
//           (user_id, org_code, table_name, field_name, data_type, action, created_by,field_element,
//           field_description,field_option,prod_mapping_keys_info_id)
//           VALUES (?, ?, ?, ?, ?, 'alter', ?,?,?,?,?);
//         `;
//         await sequelize.query(logQuery, {
//           type: sequelize.QueryTypes.INSERT,
//           replacements: [user_id, org_code, table, field_name, data_type, user_id,element,description,JSON.stringify(options),insertedId,field_type],
//           transaction,
//         });
    
//         await transaction.commit();
//         return res.status(200).json({ status: true, message: "Field Addded Successfully" });
    
//       } catch (error) {
//         await transaction.rollback();
//         console.error("Internal Server Error:", error);
//         return res.status(500).json({ status: false, message: "Error Adding Field" ,error:error.message});
//       }
//     };
    

const addNewFields = async (req, res) => {
  // 1. Destructure & validate input
  const {
    org_code,
    user_id,
    field_name,
    data_type,
    element = null,
    description = null,
    options = null,
    placeholder = null,
    field_type = null
  } = req.body;

  if (!org_code || !user_id || !field_name || !data_type || !field_type) {
    return res.status(400).json({
      status: false,
      message: "Missing required fields: org_code, user_id, field_name, data_type, field_type"
    });
  }

  // 2. Build dynamic names, sanitize inputs 
  const table = `${org_code}_prod_orders`.toLowerCase();
  console.log("--- rrr - table-"+table)
  const sanitizedFieldName = field_name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
  const sanitizedDataType = data_type.replace(/_/g, " ");
  const field_label = field_name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  if (!sanitizedFieldName) {
    return res.status(400).json({
      status: false,
      message: "Invalid field_name. Use only a-z, 0-9, and underscores."
    });
  }

  const transaction = await sequelize.transaction();
  try {
    // 3. Check if the target table exists
    const tableExistsSql = `
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = :table
      ) AS table_exists;
    `;
    const [tableExistsRes] = await sequelize.query(tableExistsSql, {
      replacements: { table },
      type: sequelize.QueryTypes.SELECT,
      transaction,
    });

    const table_exists = tableExistsRes.table_exists || tableExistsRes.table_exists === true;

    if (table_exists) {
      // 4. Check if column already exists
      const colExistsSql = `
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = :table AND column_name = :column
        ) AS column_exists;
      `;
      const [colExistsRes] = await sequelize.query(colExistsSql, {
        replacements: { table, column: sanitizedFieldName },
        type: sequelize.QueryTypes.SELECT,
        transaction,
      });

      if (colExistsRes.column_exists) {
        await transaction.rollback();
        return res.status(400).json({
          status: false,
          message: `Column already exists: ${sanitizedFieldName}`
        });
      }

      // 5. Add the new column
      await sequelize.query(
        `ALTER TABLE "${table}" ADD COLUMN "${sanitizedFieldName}" ${sanitizedDataType};`,
        { type: sequelize.QueryTypes.RAW, transaction }
      );
    } else {
      // 6. Create table with the new column
      await sequelize.query(
        `
        CREATE TABLE IF NOT EXISTS ${table} (
          id SERIAL PRIMARY KEY,
          prod_orders_row_id INTEGER,
          "${sanitizedFieldName}" ${sanitizedDataType}
        );
        `,
        { type: sequelize.QueryTypes.RAW, transaction }
      );
    }

    // 7. Insert field metadata
    const [insertedFieldRes] = await sequelize.query(
      `
      INSERT INTO prod_mapping_keys_info (
        org_code, table_name, field_name, data_type, field_label,
        created_by, field_element, field_description, field_option, field_placeholder, field_type
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id;
      `,
      {
        replacements: [
          org_code,
          table,
          sanitizedFieldName,
          sanitizedDataType,
          field_label,
          user_id,
          element,
          description,
          options ? JSON.stringify(options) : null,
          placeholder,
          field_type
        ],
        type: sequelize.QueryTypes.INSERT,
        transaction,
      }
    );
    const insertedId = insertedFieldRes?.[0]?.id || insertedFieldRes?.id;

    // 8. Insert into log table
    await sequelize.query(
      `
      INSERT INTO prod_orders_log (
        user_id, org_code, table_name, field_name, data_type, action,
        created_by, field_element, field_description, field_option, prod_mapping_keys_info_id
      )
      VALUES (?, ?, ?, ?, ?, 'alter', ?, ?, ?, ?, ?)
      `,
      {
        replacements: [
          user_id, org_code, table, sanitizedFieldName, sanitizedDataType,
          user_id, element, description, options ? JSON.stringify(options) : null, insertedId
        ],
        type: sequelize.QueryTypes.INSERT,
        transaction,
      }
    );

    await transaction.commit();
    return res.status(200).json({
      status: true,
      message: "Field added successfully"
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Internal Server Error:", error);
    return res.status(500).json({
      status: false,
      message: "Error adding field",
      error: error.message,
    });
  }
};


const showPreview = async (req, res) => {
      const { org_code, user_id, keys } = req.body;
    console.log(keys)
      // Validate input
      if (!org_code || !user_id || !Array.isArray(keys) || keys.length === 0) {
        return res.status(400).json({ status:false,message: "Invalid request data" });
      }
      const invalidKey = keys.find(({ collection_code, key_code, key_label }) =>
        !collection_code || !key_code || !key_label
      );
    
      if (invalidKey) {
        return res.status(400).json({ status:false,message: "Key code, collection code, or label is missing" });
      }
    
      // Group keys by collection_code (table name)
      const groupedKeys = keys.reduce((acc, { collection_code, key_code, key_label }) => {
        if (!acc[collection_code]) {
          acc[collection_code] = { columns: [], labels: {} };
        }
        acc[collection_code].columns.push(key_code);
        acc[collection_code].labels[key_code] = key_label; // Store label mapping
        return acc;
      }, {});
    
      const transaction = await sequelize.transaction();
    
      try {
        let headers = [];
        let mergedRows = [];
    
        for (const [table, { columns, labels }] of Object.entries(groupedKeys)) {
          const columnList = columns.map(col => `"${col}"`).join(", ");
          const query = `SELECT ${columnList} FROM staging.${table} LIMIT 10`;
          console.log(query,"query-->")
          const result = await sequelize.query(query, {
            type: sequelize.QueryTypes.SELECT,
            transaction
          });
    
          // Add headers dynamically based on fetched columns and map them to key_label
          columns.forEach((col) => {
            if (!headers.some(h => h.key === col)) {
              headers.push({ key: col, label: labels[col] || col });
            }
          });
    
          // Merge rows into one final object (last row should contain all columns)
          result.forEach((row, index) => {
            if (!mergedRows[index]) mergedRows[index] = {};
            Object.assign(mergedRows[index], row);
          });
        }
    
        await transaction.commit();
    
        return res.status(200).json({ status: true, headers, data: mergedRows });
    
      } catch (error) {
        await transaction.rollback();
        console.error("Internal Server Error:", error);
        return res.status(500).json({ status: false, message: "Error showing preview",error:error.message});
      }
    };


const buildJoinAndSyncData = async (req, res) => {
  const { org_code, user_id,foreign_keys, data } = req.body;

  if (!org_code || !user_id || !Array.isArray(data) || data.length === 0) {
    return res.status(400).json({ status: false, message: "Invalid request data" });
  }

  // Function to validate required fields in an array of objects
const validateFields = (arr, requiredFields) => {
  return arr.every(obj => requiredFields.every(field => obj.hasOwnProperty(field) && obj[field] !== ""));
};

    // Required fields for keys
    const keyFields = ["field_name", "table_name", "key_code", "key_label", "data_type"];

    // Validate keys inside data -> collections -> keys
    const isValidKeys = data.every(({ collections }) =>
      collections.every(({ keys }) => validateFields(keys, keyFields))
    );

    if (!isValidKeys) {
      return res.status(400).json({ status: false, message: "Invalid keys data" });
    }


     
  const queries = data.map(item => {
    const { external_api_code, collections } = item;
    return {
      external_api_code,
      query: generateSelectQuery(external_api_code, collections)
    };
  });
  console.log(queries,"queries")
  let finalQuery = "";

  if (queries.length === 1) {
    // Single query case
    const baseTableMatch = queries[0].query.match(/FROM\s+([^\s]+)/i);
    const baseTable = baseTableMatch ? baseTableMatch[1] : null;
    
    // Check if the query includes JOIN
    const hasJoin = queries[0].query.includes("JOIN");
  
    finalQuery = hasJoin
      ? `${queries[0].query} WHERE ${baseTable}.org_code = ? AND ${baseTable}.dream_user_id = ?;`
      : `${queries[0].query} WHERE org_code = ? AND dream_user_id = ?;`;
  } else {
      if (foreign_keys && foreign_keys.length > 0) {
        const foreignKeyFields = ["collection_code", "key_code", "data_type", "external_api_code"];
        if (!validateFields(foreign_keys, foreignKeyFields)) {
          return res.status(400).json({ status: false, message: "Invalid foreign_keys data" });
        }
      
        // Validate that all foreign keys have the same data type
        const uniqueDataTypes = new Set(foreign_keys.map(fk => fk.data_type));
        if (uniqueDataTypes.size > 1) {
          return res.status(400).json({
            status: false,
            message: "Foreign key columns have mismatched data types, JOIN not possible.",
            details: foreign_keys
          });
        }
      
        let baseTables = {}; // To store base tables per external_api_code
        let selectFields = [];
        let joinClausesFirstQuery = [];
        let joinClausesSecondQuery = [];
      
        // Extract base table and SELECT fields from queries
        queries.forEach((q, index) => {
          const baseTableMatch = q.query.match(/FROM\s+([^\s]+)/i);
          if (baseTableMatch) {
            baseTables[q.external_api_code] = baseTableMatch[1]; // Store base table per API code
          }
      
          const selectMatch = q.query.match(/SELECT\s+(.+)\s+FROM/i);
          if (selectMatch) {
            selectFields.push(selectMatch[1]); // Collect all SELECT fields
          }
      
          // Extract JOIN clauses from each query
          const joinMatches = q.query.match(/INNER JOIN\s+.+/gi);
          if (joinMatches) {
            if (index === 0) {
              joinClausesFirstQuery.push(...joinMatches);
            } else {
              joinClausesSecondQuery.push(...joinMatches);
            }
          }
        });
      
        // Extract required tables from foreign_keys
        const xcForeignKey = foreign_keys.find(fk => fk.external_api_code === "xc");
        const sfForeignKey = foreign_keys.find(fk => fk.external_api_code === "sf");
      
        if (!xcForeignKey || !sfForeignKey) {
          return res.status(400).json({ status: false, message: "Missing required foreign keys for external API codes" });
        }
      
        // Ensure base tables exist
        if (!baseTables["xc"] || !baseTables["sf"]) {
          return res.status(500).json({ status: false, message: "Base tables could not be extracted for both external API codes" });
        }
      
        // Build the cross-platform JOIN (xc -> sf)
        const crossApiJoin = `INNER JOIN ${baseTables["sf"]} ON ${baseTables["xc"]}.${xcForeignKey.key_code} = ${baseTables["sf"]}.${sfForeignKey.key_code}`;
      
        // Construct final query
        finalQuery = `
          SELECT ${selectFields.join(", ")} 
          FROM ${baseTables["xc"]} 
          ${joinClausesFirstQuery.join(" ")} 
          ${crossApiJoin} 
          ${joinClausesSecondQuery.join(" ")}
          WHERE ${baseTables["xc"]}.org_code = ? AND ${baseTables["xc"]}.dream_user_id = ?;
        `;
      

      }
      
      
      
      else {
          console.log("else")
          let baseTables = {}; // Store base tables for each platform
          let selectFields = [];
          let joinClauses = {};
          let finalJoins = [];
          
          queries.forEach(q => {
            const baseTableMatch = q.query.match(/FROM\s+([^\s]+)/i);
            if (baseTableMatch) {
              const table = baseTableMatch[1];
              baseTables[q.external_api_code] = table;
            }
          
            const selectMatch = q.query.match(/SELECT\s+(.+)\s+FROM/i);
            if (selectMatch) {
              selectFields.push(selectMatch[1]);
            }
          });
          
          // Build joins separately for each platform
          data.forEach(({ external_api_code, collections }) => {
            const tableOrder = TABLE_ORDER[external_api_code] || [];
            const foreignKey = FOREIGNKEYS[external_api_code];
          
            const sortedCollections = collections.sort((a, b) => {
              return tableOrder.indexOf(a.collection_code) - tableOrder.indexOf(b.collection_code);
            });
          
            joinClauses[external_api_code] = [];
          
            sortedCollections.forEach((collection, index) => {
              if (index > 0) {
                const sourceTable = `staging.${sortedCollections[index - 1].collection_code}`;
                const targetTable = `staging.${collection.collection_code}`;
                joinClauses[external_api_code].push(
                  `INNER JOIN ${targetTable} ON ${sourceTable}.${foreignKey} = ${targetTable}.${foreignKey}`
                );
              }
            });
          });
          
          // Add cross-platform join between `xc` and `sf` base tables
          let crossPlatformJoin = "";
          if (baseTables["xc"] && baseTables["sf"]) {
            crossPlatformJoin = `INNER JOIN ${baseTables["sf"]} ON ${baseTables["xc"]}.${FOREIGNKEYS["xc"]} = ${baseTables["sf"]}.${FOREIGNKEYS["sf"]}`;
          }
          
          // Construct final query
          finalJoins = [
            ...joinClauses["xc"] || [],
            crossPlatformJoin,
            ...joinClauses["sf"] || [],
          ].filter(Boolean);
          
          if (baseTables["xc"]) {
            finalQuery = `SELECT ${selectFields.join(", ")} FROM ${baseTables["xc"]} ${finalJoins.join(" ")} WHERE ${baseTables["xc"]}.org_code = ? AND ${baseTables["xc"]}.dream_user_id = ?;`;
          } else {
            return res.status(500).json({ status: false, message: "Unable to extract base table from queries" });
          }
          
        // console.log("else")
        // // Use predefined FOREIGNKEYS and TABLE_ORDER if no foreign_keys are provided
        // let baseTable = null;
        // let lastJoinedTable = null;
  
        // queries.forEach(q => {
        //   const baseTableMatch = q.query.match(/FROM\s+([^\s]+)/i);
        //   if (baseTableMatch) {
        //     const table = baseTableMatch[1];
        //     if (!baseTable) baseTable = table;
        //     if (!lastJoinedTable) lastJoinedTable = table;
        //   }
  
        //   const matches = q.query.match(/SELECT\s+(.+)\s+FROM/i);
        //   if (matches) {
        //     selectFields.push(matches[1]);
        //   }
        // });
  
        // data.forEach(({ external_api_code, collections }) => {
        //   const tableOrder = TABLE_ORDER[external_api_code] || [];
        //   const foreignKey = FOREIGNKEYS[external_api_code];
  
        //   const sortedCollections = collections.sort((a, b) => {
        //     return tableOrder.indexOf(a.collection_code) - tableOrder.indexOf(b.collection_code);
        //   });
  
        //   sortedCollections.forEach((collection, index) => {
        //     if (index > 0) {
        //       const sourceTable = `staging.${sortedCollections[index - 1].collection_code}`;
        //       const targetTable = `staging.${collection.collection_code}`;
        //       joinClauses.push(`INNER JOIN ${targetTable} ON ${sourceTable}.${foreignKey} = ${targetTable}.${foreignKey}`);
        //     }
        //   });
        // });
  
        // if (baseTable) {
        //   finalQuery = `SELECT ${selectFields.join(", ")} FROM ${baseTable} ${joinClauses.join(" ")} WHERE ${baseTable}.org_code = ? AND ${baseTable}.dream_user_id = ?;`;
        // } else {
        //   return res.status(500).json({ status: false, message: "Unable to extract base table from queries" });
        // }
      }

  }
  finalQuery = finalQuery.replace(/staging\.opportunity\.opportunityid/g, "staging.opportunity.id");
  // console.log(finalQuery,"finalQuery")
    
    
      const transaction = await sequelize.transaction();
      try {
    //  console.log(finalQuery,"finalQuery")
      const results = await sequelize.query(finalQuery, {
        replacements: [org_code, user_id], // Pass values safely
        transaction,
        type: sequelize.QueryTypes.SELECT, // Ensures a SELECT query
      });
    
        if (!results.length) {
          await transaction.rollback();
          return res.status(200).json({ status: false, message: "No data found for selected collections & Keys" });
        }
    
        let tableData = {};
        results.forEach(row => {
          data.forEach(({ collections }) => {
            collections.forEach(({ keys }) => {
              keys.forEach(({ field_name, table_name }) => {
                if (!tableData[table_name]) {
                  tableData[table_name] = { columns: [], values: [] };
                }
        
                if (!tableData[table_name].columns.includes(field_name)) {
                  tableData[table_name].columns.push(field_name);
                }
        
                if (
                  !tableData[table_name].values.length || 
                  tableData[table_name].values[tableData[table_name].values.length - 1].length === tableData[table_name].columns.length
                ) {
                  tableData[table_name].values.push([]);
                }
        
                tableData[table_name].values[tableData[table_name].values.length - 1].push(row[field_name] ?? null);
              });
            });
          });
        });
    
        const prodOrdersTable = "prod_orders";
        const prodOrdersColumns = [...(tableData[prodOrdersTable]?.columns || []), "org_code", "user_id", "created_by"];
        const prodOrdersValues = (tableData[prodOrdersTable]?.values || []).map(row => [...row, org_code, user_id, user_id]);
    
        let insertedIds = [];
        if (prodOrdersValues.length) {
          const prodOrdersInsertQuery = `
            INSERT INTO ${prodOrdersTable} (${prodOrdersColumns.join(", ")})
            VALUES ${prodOrdersValues.map(row => `(${row.map(() => "?").join(", ")})`).join(", ")}
            RETURNING id;
          `;
    
          const [insertedProdOrders] = await sequelize.query(prodOrdersInsertQuery, {
            replacements: prodOrdersValues.flat(),
            transaction,
          });
    
          insertedIds = insertedProdOrders.map((row, index) => ({
            id: row.id,
            rowData: prodOrdersValues[index],
          }));
        }
    
        const secondTable = `${org_code}_prod_orders`;
        if (tableData[secondTable] && insertedIds.length) {
          const tableExistsQuery = `SELECT to_regclass('${secondTable}') IS NOT NULL AS exists;`;
          const [tableExists] = await sequelize.query(tableExistsQuery, { transaction });
    
          if (tableExists[0]?.exists) {
            const secondTableColumns = [...tableData[secondTable].columns];
            let secondTableValues = tableData[secondTable].values;
    
            secondTableValues = secondTableValues.map((row, index) => [insertedIds[index]?.id, ...row]);
    
            secondTableColumns.unshift("prod_orders_row_id");
    
            const secondTableInsertQuery = `
              INSERT INTO ${secondTable} (${secondTableColumns.join(", ")})
              VALUES ${secondTableValues.map(row => `(${row.map(() => "?").join(", ")})`).join(", ")};
            `;
    
            await sequelize.query(secondTableInsertQuery, {
              replacements: secondTableValues.flat(),
              transaction,
            });
          }
        }
    
        // **Update `prod_mapping_keys_info`**
        const updateQueries = data.flatMap(({ external_api_code, collections }) =>
          collections.flatMap(({ collection_code, keys }) =>
            keys.map(({ key_code, field_name, table_name }) => `
              UPDATE prod_mapping_keys_info
              SET 
                mapping_key = '${key_code}', 
                mapping_key_collection = '${collection_code}', 
                mapping_key_source = '${external_api_code}',
                updated_by = '${user_id}', 
                updated_at = NOW()
              WHERE 
                field_name = '${field_name}' 
                AND table_name = '${table_name}' 
                AND org_code = '${org_code}'
                AND created_by = '${user_id}';
            `)
          )
        );
    
        if (updateQueries.length) {
          await Promise.all(updateQueries.map(query => sequelize.query(query, { transaction })));
        }
    
        await transaction.commit();
        return res.status(200).json({ status: true, message: "Data Sync Successfull" });
    
      } catch (error) {
        await transaction.rollback();
        console.error("Internal Server Error:", error);
        return res.status(400).json({ status: false, message: "Error inserting data", error: error.message });
      }
    };


  // Function to generate query
  const generateSelectQuery = (externalApiCode, collections) => {
    if (!collections || collections.length === 0) return null;

    const foreignKey = FOREIGNKEYS[externalApiCode];
    const tableOrder = TABLE_ORDER[externalApiCode] || [];
    
    // Sort collections based on TABLE_ORDER priority
    const sortedCollections = collections.sort((a, b) => {
      return tableOrder.indexOf(a.collection_code) - tableOrder.indexOf(b.collection_code);
    });

    let selectFields = [];
    let joinClauses = [];
    let baseTable = `staging.${sortedCollections[0].collection_code}`;
    let lastJoinedTable = baseTable;

    // Extract fields
    sortedCollections.forEach(collection => {
      const tableAlias = `staging.${collection.collection_code}`;
      collection.keys.forEach(key => {
        selectFields.push(`${tableAlias}.${key.key_code} AS ${key.field_name}`);
      });
    });

    // Create joins based on TABLE_ORDER
    if (sortedCollections.length > 1) {
      for (let i = 1; i < sortedCollections.length; i++) {
        const nextTable = `staging.${sortedCollections[i].collection_code}`;
        joinClauses.push(`INNER JOIN ${nextTable} ON ${lastJoinedTable}.${foreignKey} = ${nextTable}.${foreignKey}`);
        lastJoinedTable = nextTable;
      }
    }

    return `SELECT ${selectFields.join(", ")} FROM ${baseTable} ${joinClauses.join(" ")}`;
  };

const getOrdersData = async (req, res) => {
      const { org_code, type, search_key, page_number, page_size , from,to,to2,from2 } = req.body;
      const pageNumber = parseInt(page_number, 10) || 1;
      const pageSize = parseInt(page_size, 10) || 20;
      const offset = (pageNumber - 1) * pageSize;
      const toDate = to || moment().format("YYYY-MM-DD"); // Default to today's date
      const fromDate = from || moment().startOf("month").format("YYYY-MM-DD");
      // console.log(Date,"Date")
    
      if (!org_code || !type) {
        return res.status(400).json({ status: false, message: "Invalid request data" });
      }

      try {
        // Step 1: Get field_name, table_name, field_label from prod_mapping_keys_info
        const mappingQuery = `
          SELECT field_name, table_name, field_label,field_sequence,data_type
          FROM prod_mapping_keys_info
          WHERE org_code = ? AND ( destination_type = 0 OR destination_type = ?) AND is_visible = true
        `;
    
        const mappingResults = await sequelize.query(mappingQuery, {
          replacements: [org_code,type],
          type: sequelize.QueryTypes.SELECT,
        });
    
        if (!mappingResults) {
          await transaction.rollback();
          return res.status(404).json({ status: false, message: "No data found" });
        }
    
        // Step 2: Group fields by table names and store field labels
        const fieldGroups = {};
        const fieldLabels = {}; // Stores field_name -> field_label mapping
        const fieldSequences = {}; // Stores field_name -> field_sequence mapping
        const fieldDataTypes = {}; 
        let secondTable = null;
    
        mappingResults.forEach(({ field_name, table_name, field_label,field_sequence ,data_type}) => {
          if (!fieldGroups[table_name]) {
            fieldGroups[table_name] = [];
          }
          fieldGroups[table_name].push(field_name);
          fieldLabels[field_name] = field_label; // Store field labels
          fieldSequences[field_name] = field_sequence; // Store field sequence
          fieldDataTypes[field_name] = data_type
          if (table_name !== "prod_orders") {
            secondTable = table_name; // Assign first non-prod_orders table as second table
          }
        });
    
        // Step 3: Build SELECT and JOIN queries dynamically
        const baseTable = "prod_orders";
        const selectClauses = [];
        // const selectClauses = [`${baseTable}.id AS prod_orders_row_id`, `${baseTable}.org_code`, `${baseTable}.user_id`];
        const joinClauses = [];
        const columns = []; // Track fetched columns
        let groupByClauses = [];
        if (type == 2) {
          selectClauses.push(
            `ARRAY_AGG(${baseTable}.id) AS prod_orders_row_ids`,
            `MIN(${baseTable}.id) AS prod_orders_row_id`
          );
        } else {
          selectClauses.push(
            `${baseTable}.id AS prod_orders_row_id`,
            `${baseTable}.org_code`,
            `${baseTable}.user_id`
          );
        }
    
        Object.entries(fieldGroups).forEach(([table, fields]) => {
          fields.forEach((field) => {
            const columnAlias = `${table}.${field}`;
            columns.push(field);
            if (type == 2 && fieldDataTypes[field] === "double precision") {
              selectClauses.push(`SUM(${columnAlias}) AS ${field}`);
            } else {
              selectClauses.push(columnAlias);
              groupByClauses.push(columnAlias);
            }
          });
    
          if (table !== baseTable) {
            joinClauses.push(`left JOIN ${table} ON ${table}.prod_orders_row_id = ${baseTable}.id`);
          }
        });
    
          // Determine column prefixes based on second table existence
          const orgCodeColumn = secondTable ? `${baseTable}.org_code` : "org_code";
          const dateColumn = secondTable ? `${baseTable}.created_at` : "created_at"; // Change date_column as per actual column
          const searchKeyColumn = secondTable ? `${baseTable}.order_id` : "order_id"; // Change search_key as per actual column
          const  orderByColumn= secondTable ? `${baseTable}.created_at` : "created_at";
          const  dateColumn2= secondTable ? `${baseTable}.date` : "date";
          let whereConditions = [`${orgCodeColumn} = ?`];
          let replacements = [org_code];

          if (fromDate && toDate) {
            whereConditions.push(`${dateColumn} >= ?::timestamp AND ${dateColumn} < (?::date + 1)::timestamp`);
            replacements.push(fromDate, toDate);
          }
          
          if (from2 && to2) {
            whereConditions.push(`${dateColumn2} >= ?::timestamp AND ${dateColumn2} < (?::date + 1)::timestamp`);
            replacements.push(from2, to2);
          }

          if (search_key) {
            whereConditions.push(`CAST(${searchKeyColumn} AS TEXT) ILIKE ?`);
            replacements.push(`%${search_key}%`);
          }
       

          let sqlQuery;
          if (type == 2) {
            // GROUP BY Query with SUM() for double precision columns
            sqlQuery = `
              SELECT ${selectClauses.join(", ")}, COUNT(*) OVER() AS total_count
              FROM ${baseTable}
              ${joinClauses.join(" ")}
              WHERE ${whereConditions.join(" AND ")}
              GROUP BY ${groupByClauses.join(", ")}
              LIMIT ? OFFSET ?
            `;
          } else {
            // Standard Query
            sqlQuery = `
              SELECT ${selectClauses.join(", ")}, COUNT(*) OVER() AS total_count
              FROM ${baseTable}
              ${joinClauses.join(" ")}
              WHERE ${whereConditions.join(" AND ")}
              ORDER BY ${orderByColumn}
              LIMIT ? OFFSET ?
            `;
          }
          // Execute the query
          // console.log(sqlQuery,"sqlQuery")
          const results = await sequelize.query(sqlQuery, {
            replacements: [...replacements, pageSize, offset],
            type: sequelize.QueryTypes.SELECT,
          });
          // console.log(results[0].total_count,"total count")
          const count=results && results.length >0?results[0].total_count:0;
              
          // Step 6: Construct headers dynamically with correct field_label mapping and sorting
        let headers = [];
        columns.forEach((col) => {
          if (!headers.some((h) => h.key === col)) {
            headers.push({
              key: col,
              label: fieldLabels[col] || col, // Use field_label if available, else fallback to field_name
              sequence: fieldSequences[col] || 0, // Default sequence is 0
            });
          }
        });

        // Step 7: Sort headers (ignore 0, sort others)
        const sortedHeaders = [
          ...headers.filter((h) => h.sequence > 0).sort((a, b) => a.sequence - b.sequence), // Sort others
          ...headers.filter((h) => h.sequence === 0), // Keep 0-sequence fields as-is
        ].map(({ key, label }) => ({ key, label })); // Remove sequence before sending

        // Step 8: Merge rows into final format
        let mergedRows = [];
        results.forEach((row, index) => {
          if (!mergedRows[index]) mergedRows[index] = {};
          Object.assign(mergedRows[index], row);
          if (mergedRows[index].date && typeof mergedRows[index].date === "string") {
            mergedRows[index].date = moment(mergedRows[index].date).format("YYYY-MM-DD");
          }


        });

        return res.status(200).json({ status: true, headers:sortedHeaders, rows: mergedRows,count });
      } catch (error) {
        console.error("Error fetching orders data:", error);
        return res.status(500).json({ status: false, message: "Internal server error", error: error.message });
      }
    };


const getFieldsMappingInfoList = async(req,res)=>{
  const { org_code, user_id} = req.body;
    
  if (!org_code || !user_id) {
    return res.status(400).json({ status: false, message: "Invalid request data" });
  }

  const transaction = await sequelize.transaction();
  try {
    // Step 1: Get field_name, table_name, field_label from prod_mapping_keys_info
    const mappingQuery = `
      SELECT id,field_name,field_label,is_editable,is_visible,destination_type,field_sequence
      FROM prod_mapping_keys_info
      WHERE org_code = ? AND created_by = ?  order by field_name 
    `;
    const mappingResults = await sequelize.query(mappingQuery, {
      replacements: [org_code, user_id],
      type: sequelize.QueryTypes.SELECT,
      transaction,
    });
    await transaction.commit();
    return res.status(200).json({status:true,data:mappingResults})

    }
    catch (error) {
      await transaction.rollback();
      console.error("Error fetching orders data:", error);
      return res.status(500).json({ status: false, message: "Internal server error", error: error.message });
    }
}
const updateFieldsMappingInfo = async (req, res) => {
  const { org_code, user_id, fields } = req.body;

  // Validate request payload
  if (!org_code || !user_id || !fields || !Array.isArray(fields) || fields.length === 0) {
    return res.status(400).json({ status: false, message: "Invalid request data" });
  }

  const transaction = await sequelize.transaction();
  try {
    // Update each field in prod_mapping_keys_info
    await Promise.all(fields.map(async (field) => {
      const { id, field_name, field_label, is_editable, is_visible,destination_type, field_sequence } = field;

      if (!id) {
        throw new Error(`Field ID is missing for one of the records.`);
      }

      await sequelize.query(
        `UPDATE prod_mapping_keys_info 
         SET field_label = ?, is_editable = ?, is_visible = ?, destination_type = ?, field_sequence = ?
         WHERE id = ? AND field_name = ? AND org_code = ? AND created_by = ?`,
        {
          replacements: [field_label, is_editable, is_visible,destination_type, field_sequence, id,field_name, org_code, user_id],
          transaction,
        }
      );
    }));

    await transaction.commit();
    return res.status(200).json({ status: true, message: "Fields updated successfully" });

  } catch (error) {
    await transaction.rollback();
    console.error("Error updating fields:", error);
    return res.status(500).json({ status: false, message: "Internal server error", error: error.message });
  }
};


const getCustomFieldsList = async (req, res) => {
  const data = req.body;
  const { org_code, user_id, search_key , page_number , page_size , action } = data;

  if (!org_code || !user_id) {
    return res.status(400).json({ status: false, message: "Invalid request data" });
  }

  const transaction = await sequelize.transaction(); // Transaction created
  try {
    // Step 1: Get field_name, table_name, field_label from prod_mapping_keys_info
    let mappingQuery = `
      SELECT id, field_name, field_label, field_element, field_description, field_option,field_placeholder
      FROM prod_mapping_keys_info
      WHERE org_code = :org_code AND created_by = :user_id and active=:active and table_name=:table_name
    `;

    if (search_key) {
      mappingQuery += `
      AND (
          LOWER(field_name) LIKE LOWER(:search_key) 
          OR LOWER(field_label) LIKE LOWER(:search_key)
      )
      `;
    }

    mappingQuery += ` ORDER BY field_name`;

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM (${mappingQuery}) as subquery`;
    const countResult = await sequelize.query(countQuery, {
      replacements: { org_code, user_id,active:true,table_name:org_code+'_prod_orders', search_key: `%${search_key}%` },
      type: sequelize.QueryTypes.SELECT,
    });

    const totalCount = countResult[0].total || 0;

      mappingQuery += ` LIMIT :limit OFFSET :offset`;
    

    // Execute the main query
    const result = await sequelize.query(mappingQuery, {
      replacements: {
        org_code,
        user_id,
        active:true,
        table_name:org_code+'_prod_orders',
        search_key: `%${search_key}%`,
        limit: page_size,
        offset: (page_number - 1) *page_size,
      },
      type: sequelize.QueryTypes.SELECT,
    });

    await transaction.commit(); // Commit the transaction

    return res.status(200).json({
      status: true,
      total: totalCount,
      data: result,
    });
  } catch (error) {
    await transaction.rollback(); // Rollback on error
    console.error("Error fetching data:", error);
    return res.status(500).json({ status: false, message: "Internal server error", error: error.message });
  }
};

const updateNewFields = async (req, res) => {
  const { id,org_code, user_id, field_name, data_type,element,description,options,placeholder } = req.body;

  if (!org_code || !user_id || !field_name || !data_type) {
    return res.status(400).json({ status:false,message: "Invalid request data" });
  }

  // Generate the dynamic table name
  const table = `${org_code}_prod_orders`;

  // Sanitize field_name: lowercase, replace spaces, remove invalid characters
  const sanitizedFieldName = field_name
    .toLowerCase()
    .replace(/\s+/g, "_") // Replace spaces with underscore
    .replace(/[^a-z0-9_]/g, ""); // Remove all special characters except letters, numbers, and _

  const sanitizedDataType = data_type.replace(/_/g, " ");
  const field_label=field_name.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

  if (!sanitizedFieldName) {
    return res.status(400).json({ status:false,message: "Invalid field name, field name should only have a-z,0-9,_ and space Only" });
  }

  const transaction = await sequelize.transaction();
  try {
    // Step 1: Check if table exists
    const tableCheckQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = ?
      ) AS table_exists;
    `;
    const [{ table_exists }] = await sequelize.query(tableCheckQuery, {
      replacements: [table ],
      type: sequelize.QueryTypes.SELECT,
      transaction,
    });
    console.log(table_exists,"table_exists")

    if (table_exists) {
      // Step 2: Add column if table exists
      //Column Name Validation
      const columnCheckQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = :table AND column_name = :column
      ) AS column_exists;
    `;
    const [{ column_exists }] = await sequelize.query(columnCheckQuery, {
      replacements: { table, column: sanitizedFieldName },
      type: sequelize.QueryTypes.SELECT,
      transaction,
    });
  
    if (column_exists) {
      return res.status(400).json({ status: false, message: `Column already exists with this name : ${sanitizedFieldName}`});
    }
      const alterQuery = `ALTER TABLE ${table} ADD COLUMN ${sanitizedFieldName} ${sanitizedDataType};`;
      await sequelize.query(alterQuery, {
        type: sequelize.QueryTypes.RAW,
        transaction,
      });
    } else {
      // Step 3: Create table if it doesn't exist
      const createTableQuery = `
        CREATE TABLE ${table} (
          id SERIAL PRIMARY KEY,
          prod_orders_row_id INTEGER,
          ${sanitizedFieldName} ${sanitizedDataType}
        );
      `;
      await sequelize.query(createTableQuery, {
        type: sequelize.QueryTypes.RAW,
        transaction,
      });
    }
 
    // Step 4: Insert field
   

   const UpdateFieldQuery = `UPDATE prod_mapping_keys_info 
  SET field_name=?,field_label = ?,updated_by=?,field_element=?, field_description = ?, field_option = ?,field_placeholder=?
  WHERE id = ?`
    const [insertedRow] = await sequelize.query(UpdateFieldQuery, {
      type: sequelize.QueryTypes.UPDATE,
      replacements: [sanitizedFieldName, field_label,user_id,element,description,JSON.stringify(options),placeholder,id],
      transaction,
    });

    // Step 5: Insert log entry
    const logQuery = `
      INSERT INTO prod_orders_log 
      (user_id, org_code, table_name, field_name, data_type, action, created_by,field_element,field_description,field_option,prod_mapping_keys_info_id)
      VALUES (?, ?, ?, ?, ?, 'update', ?,?,?,?,?);
    `;
    await sequelize.query(logQuery, {
      type: sequelize.QueryTypes.INSERT,
      replacements: [user_id, org_code, table, field_name, data_type, user_id,element,description,JSON.stringify(options),id],
      transaction,
    });

    await transaction.commit();
    return res.status(200).json({ status: true, message: "Field Addded Successfully" });

  } catch (error) {
    await transaction.rollback();
    console.error("Internal Server Error:", error);
    return res.status(500).json({ status: false, message: "Error Adding Field" });
  }
};

const deleteCustomFields = async (req, res) => {
  try {
    const data=req.body;
    var id = data.id;
    query = `UPDATE prod_mapping_keys_info SET active  = :active WHERE  id = :id`;

    let result = await sequelize.query(
      query, {
      replacements: {
        active:false,
          id
      },
      type: sequelize.QueryTypes.UPDATE,
  }
  );
  // Return the generated role_id
  if (result) {
      return res.status(200).json({ "status": true, "message": "Deleted Custome Fileds" })
  }
  else {
      return res.status(200).json({ status: false, "message": "Error while creating role" })
  }
  } catch (error) {
    res.status(500).json({status:false, message: 'Error deleting Custome', error: error.message });
  }
};

const getAccountFields = async(req,res)=>{
  const {tableName,accessToken} =req.body
  try {
    const response = await axios.get(
      `https://vyvaconsultinginc2.my.salesforce.com/services/data/v62.0/sobjects/${tableName}/describe`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    // Extract only required fields
    const filteredFields = response.data.fields.map(({ name, type, length, byteLength }) => ({
      name,
      type,
      length, // Use `length` for strings, `byteLength` for ID fields
      byteLength
    }));

    return res.status(200).json({status:false,data:filteredFields,count:filteredFields.length})
  } catch (error) {
    console.error("Error fetching fields:", error.response?.data || error.message);
  }
}


const syncUserData = async (req, res) => {
  const { external_api_code, org_code } = req.body;

  if (!external_api_code) {
    return res.status(400).json({ status: false, message: "Invalid Request, Missing External API Code" });
  }

  try {
    // Fetch data using external API query
    let query = USER_QUERY[external_api_code];
    const { rows } = await pool.query(query, [org_code]);

    for (const row of rows) {
      const { role_id, role_name, employee_id, name, email, reporting_to, data_source_id } = row;
      const [first_name, ...last_name] = name.split(" ");

      // **1. Insert Role if Not Exists (Manual Check)**
      const roleExists = await pool.query(
        `SELECT 1 FROM roles WHERE role_id = $1 AND org_code = $2`,
        [role_id, org_code]
      );

      if (roleExists.rowCount === 0) {
        await pool.query(
          `INSERT INTO roles (role_id, role_name, org_code,status) VALUES ($1, $2, $3,$4)`,
          [role_id, role_name, org_code,false]
        );
      }

      // **2. Insert or Update User (Manual Check)**
      const userExists = await pool.query(
        `SELECT 1 FROM users WHERE emp_id = $1 AND email = $2 AND org_code = $3`,
        [employee_id, email, org_code]
      );

      if (userExists.rowCount === 0) {
        // User does not exist, insert new record
        await pool.query(
          `INSERT INTO users (emp_id, first_name, last_name, email, role, reporting_to, org_code,status) 
           VALUES ($1, $2, $3, $4, $5, $6, $7,$8)`,
          [employee_id, first_name, last_name.join(" "), email, role_id, reporting_to, org_code,false]
        );
      } else {
        // User exists, update existing record
        await pool.query(
          `UPDATE users SET first_name = $1, last_name = $2, role = $3, reporting_to = $4 
           WHERE emp_id = $5 AND email = $6 AND org_code = $7`,
          [first_name, last_name.join(" "), role_id, reporting_to, employee_id, email, org_code]
        );
      }

      // **3. Maintain Versioning in Hierarchy Table**
      const DEFAULT_START_DATE = "1997-01-01 00:00:00";
      const FUTURE_END_DATE = "2035-12-31 00:00:00";
      const today = moment().format("YYYY-MM-DD 00:00:00");
        const { rows: latestHierarchy } = await pool.query(
          `SELECT id, reporting_to FROM hierarchy 
           WHERE emp_id = $1 AND data_source_id = $2 
           AND org_code= $3
           ORDER BY effective_end_date DESC 
           LIMIT 1`,
          [employee_id, data_source_id,org_code]
        );

        if (!latestHierarchy.length) {
          // No previous record: Insert a new entry with default dates
          await pool.query(
            `INSERT INTO hierarchy (emp_id, reporting_to, effective_start_date, effective_end_date, data_source_id,org_code) 
             VALUES ($1, $2, $3, $4, $5,$6)`,
            [employee_id, reporting_to, DEFAULT_START_DATE, FUTURE_END_DATE, data_source_id,org_code]
          );
        } else if (latestHierarchy[0].reporting_to !== reporting_to) {
          // Reporting To Changed: Close previous record and insert new version
          await pool.query(
            `UPDATE hierarchy SET effective_end_date = $1 WHERE id = $2`,
            [today, latestHierarchy[0].id]
          );

          await pool.query(
            `INSERT INTO hierarchy (emp_id, reporting_to, effective_start_date, effective_end_date, data_source_id,org_code) 
             VALUES ($1, $2, $3, $4, $5,$6)`,
            [employee_id, reporting_to, today, FUTURE_END_DATE, data_source_id,org_code]
          );
        }
    }

    return res.status(200).json({ status: true, message: "User Data synced successfully", data: rows });
  } catch (error) {
    console.error("Error syncing data:", error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};



    


module.exports ={
  syncData,
  getApiFormFields,
  captureCredentials,
  removeCredentials,
  CollectionsKeysList,
  storeUserSelections,
  getUserSelectionList,
  addNewFields,
  showPreview,
  buildJoinAndSyncData,
  getOrdersData,
  getFieldsMappingInfoList,
  updateFieldsMappingInfo,
  getCustomFieldsList,
  updateNewFields,
  deleteCustomFields,
  getAccountFields,
  syncUserData
}





