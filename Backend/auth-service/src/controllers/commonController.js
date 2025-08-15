const { INTEGER } = require("sequelize");
const sequelize = require("../config/db");

exports.getQuickCodesList = async (req, res) => {
    const data = req.body; 
    try { 
        const quick_code = data.quick_code.toUpperCase() || null; 
        let whereCondition = '';
        let replacements = [];
         console.log("am in if cond--10----"+data)
        if (quick_code) {
            console.log("am in if cond--")
            console.log("am in if cond--1000----"+quick_code)
            whereCondition = ' where quick_code = ?';
            replacements.push(quick_code);
        }
        let query = `select quick_code,quick_code_type,quick_code_desc from cmn_quick_code_mst ${whereCondition} 
        order by quick_code_type,quick_code_desc`;
        const result = await sequelize.query(query, {
            replacements,
            type: sequelize.QueryTypes.SELECT,
        });
        return res.status(200).json({ data: result });
    } catch (error) {
        return res.status(500).json({ status: false, message: "Error while getting quick code list" });
    }
};

exports.createNewQuickCode = async (req, res) => {
    const t = await sequelize.transaction(); 
    try {
        const {quick_code,quick_code_type,quick_code_desc,created_by,created_date } = req.body;
        
        if (!quick_code || !quick_code_type || !quick_code_desc || !created_by || !created_date) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const insertQuickCodeQuery = `insert into cmn_quick_code_mst 
            (quick_code, quick_code_type, quick_code_desc, created_by, created_date)
            VALUES (?, ?, ?, ?, ?)`;
        await sequelize.query(insertQuickCodeQuery, {
            transaction: t,
            replacements: [quick_code,quick_code_type,quick_code_desc,created_by,created_date ]
        });
        await t.commit();
        res.status(200).json({ message: 'Quick code created successfully' });
    } catch (err) {
        await t.rollback();
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.updateSelectedQuickCode = async (req, res) => {
    const t = await sequelize.transaction(); 
    const data = req.body; 
    const { quick_code} = data;
    try {
        if (!data || Object.keys(data).length === 0) {
            return res.status(400).json({ status: false, message: "Request body is empty" });
        }    
        const {quick_code,quick_code_type,quick_code_desc,created_by,created_date } = req.body;
                  
        await sequelize.query(`update cmn_quick_code_mst set quick_code_type=?,quick_code_desc=? where quick_code =? 
            RETURNING quick_code`,
        {
            transaction: t,
            replacements: [
            quick_code_type,
            quick_code_desc,
            quick_code
            ],
            type: sequelize.QueryTypes.UPDATE
        }
        );
        await t.commit();
        res.status(200).json({ message: 'Quick code updated successfully' });
    } catch (err) {
        await t.rollback();
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.getQuickCodeListForDisputes = async (req, res) => { 
    const { QueryTypes } = require('sequelize');
    try { 
        const [disputeTypeRows,disputeReasonRows,priorityRows,severityRows] = await Promise.all([
            sequelize.query(`select quick_code_type, quick_code_desc from cmn_quick_code_mst where quick_code ='DISP_TYPE' ` ,
                { type: QueryTypes.SELECT } 
            ), 
            sequelize.query(`select quick_code_type, quick_code_desc from cmn_quick_code_mst where quick_code ='DISP_REASON' `,
                { type: QueryTypes.SELECT } ), 
            sequelize.query(`select quick_code_type, quick_code_desc from cmn_quick_code_mst where quick_code ='PRIORITY' `,
                { type: QueryTypes.SELECT } ), 
            sequelize.query(`select quick_code_type, quick_code_desc from cmn_quick_code_mst where quick_code ='SEVERITY' `,
                { type: QueryTypes.SELECT } ), 
        ]);
        res.json({
            disputeType: disputeTypeRows,
            disputeReason: disputeReasonRows,
            priority: priorityRows,
            severity: severityRows,
        });
    } catch (error) {
        return res.status(500).json({ status: false, message: "Error while getting quick code list" });
    }
};