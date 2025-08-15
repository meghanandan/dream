
const sequelize = require('../config/db');
const utils = require('../utils/utils');
const R = require('ramda');
const bcrypt = require('bcryptjs');
const { Op } = require("sequelize");
const moment = require('moment');

exports.getCountForDashboardCount = async (req, res) => {
    try {
        let { org_code } = req.body;

        if (!org_code) {
            return res.status(400).json({ status: false, message: "Organization code is required" });
        }

        // Query to get total dispute count
        let disputeCountQuery = `
            SELECT COUNT(*) AS count 
            FROM disputes d 
            JOIN dispute_flow df ON df.dispute_id = d.id 
            WHERE df.dispute_stage = 'raised' AND d.org_code = :org_code
        `;

        // Query to get month-wise dispute count
        const currentYear = moment().format('YYYY');
        let monthWiseCountQuery = `
           SELECT 
                TO_CHAR(d.created_at, 'Month') AS month_name, 
                COUNT(*) AS dispute_count
            FROM disputes d  
            JOIN dispute_flow df ON df.dispute_id = d.id 
            WHERE df.dispute_stage = 'raised' 
            AND d.org_code = :org_code
            AND EXTRACT(YEAR FROM d.created_at) = :currentYear
            GROUP BY TO_CHAR(d.created_at, 'Month')
            ORDER BY MIN(d.created_at)
        `;

        // Query to get active user count
        let usersCountQuery = `
            SELECT COUNT(*) AS count 
            FROM users 
            WHERE status = TRUE AND organization = :org_code
        `;

        // Query to get month-wise user count
        let userMonthWiseCountQuery = `
           SELECT 
                TO_CHAR(created_at, 'Month') AS month_name, 
                COUNT(*) AS user_count
            FROM users  
            WHERE organization = :org_code
            AND status = TRUE AND organization = :org_code and EXTRACT(YEAR FROM created_at) = :currentYear
            GROUP BY TO_CHAR(created_at, 'Month')
            ORDER BY MIN(created_at)
        `;

        // Execute queries
        const [dispute_count] = await sequelize.query(disputeCountQuery, {
            type: sequelize.QueryTypes.SELECT,
            replacements: { org_code }
        });

        const monthWiseCount = await sequelize.query(monthWiseCountQuery, {
            type: sequelize.QueryTypes.SELECT,
            replacements: { org_code,currentYear }
        });

        const [user_count] = await sequelize.query(usersCountQuery, {
            type: sequelize.QueryTypes.SELECT,
            replacements: { org_code }
        });

        const userMonthWiseCount = await sequelize.query(userMonthWiseCountQuery, {
            type: sequelize.QueryTypes.SELECT,
            replacements: { org_code,currentYear }
        });

        res.status(200).json({
            status: true,
            data:{
                dispute_count: dispute_count?.count || 0,
                dispute_month_wise_count: monthWiseCount || [],
                user_count: user_count?.count || 0,
                user_month_wise_count: userMonthWiseCount || [],
                adjustment_count: 0,
                adjustment_month_count:[]
            }
           

        });

    } catch (error) {
        console.error('Error fetching dashboard counts:', error);
        res.status(500).json({ status: false, message: error.message });
    }
};




exports.getCountForDashboardCurrentMonth = async (req, res) => {
    try {
        let { org_code } = req.body;

        if (!org_code) {
            return res.status(400).json({ status: false, message: "Organization code is required" });
        }

        const currentMonth = moment().format('YYYY-MM'); // Get current month in 'YYYY-MM' format

        // Query to get dispute count for the current month
        let disputeCountQuery = `
            SELECT COUNT(*) AS count 
            FROM disputes d 
            JOIN dispute_flow df ON df.dispute_id = d.id 
            WHERE df.dispute_stage = 'raised' 
            AND d.org_code = :org_code
            AND TO_CHAR(d.created_at, 'YYYY-MM') = :currentMonth
        `;

        const dispute_count = await sequelize.query(disputeCountQuery, {
            type: sequelize.QueryTypes.SELECT,
            replacements: { org_code, currentMonth }
        });

        // Query to get user count for the current month
        let usersCountQuery = `
            SELECT COUNT(*) AS count 
            FROM users 
            WHERE status = TRUE 
            AND organization = :org_code
            AND TO_CHAR(created_at, 'YYYY-MM') = :currentMonth
        `;

        const user_count = await sequelize.query(usersCountQuery, {
            type: sequelize.QueryTypes.SELECT,
            replacements: { org_code, currentMonth }
        });

        // Construct response
        res.status(200).json({
            status: true,
            data: [
                { id: "Disputes", value: dispute_count[0]?.count || 0, label: "Disputes", color: "#009B72" },
                { id: "Adjustment", value: 0, label: "Adjustment", color: "#FFD166" },
                { id: "Users", value: user_count[0]?.count || 0, label: "Users", color: "#005F9E" }
            ]
        });

    } catch (error) {
        console.error('Error fetching dashboard counts:', error);
        res.status(500).json({ status: false, message: error.message });
    }
};





exports.getCountForDashboardCurrentYear = async (req, res) => {
    try {
        let { org_code } = req.body;

        if (!org_code) {
            return res.status(400).json({ status: false, message: "Organization code is required" });
        }

        const currentYear = moment().format('YYYY'); // Get current year as 'YYYY'

        // Query to get disputes count for the current year
        let disputeCountQuery = `
            SELECT 
                TO_CHAR(d.created_at, 'Mon') AS month_name, 
                COUNT(*) AS dispute_count
            FROM disputes d  
            JOIN dispute_flow df ON df.dispute_id = d.id 
            WHERE df.dispute_stage = 'raised' 
            AND d.org_code = :org_code
            AND EXTRACT(YEAR FROM d.created_at) = :currentYear
            GROUP BY TO_CHAR(d.created_at, 'Mon')
        `;

        const dispute_count = await sequelize.query(disputeCountQuery, {
            type: sequelize.QueryTypes.SELECT,
            replacements: { org_code, currentYear }
        });

        // Query to get user count for the current year
        // let usersCountQuery = `
        //     SELECT 
        //         TO_CHAR(created_at, 'Mon') AS month_name, 
        //         COUNT(*) AS user_count
        //     FROM users  
        //     WHERE organization = :org_code
        //     AND EXTRACT(YEAR FROM created_at) = :currentYear
        //     GROUP BY TO_CHAR(created_at, 'Mon')
        // `;

        // const user_count = await sequelize.query(usersCountQuery, {
        //     type: sequelize.QueryTypes.SELECT,
        //     replacements: { org_code, currentYear }
        // });

        // Map data into the required format
        const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        // Initialize an empty object for months
        let dataMap = monthOrder.reduce((acc, month) => {
            acc[month] = { month, teamA: 0, teamB: 0 };
            return acc;
        }, {});

        // Fill in dispute counts
        dispute_count.forEach(item => {
            const month = item.month_name.trim();
            if (dataMap[month]) {
                dataMap[month].teamA = Number(item.dispute_count);
            }
        });

        // Fill in user counts
        // user_count.forEach(item => {
        //     const month = item.month_name.trim();
        //     if (dataMap[month]) {
        //         dataMap[month].teamB = Number(item.user_count);
        //     }
        // });

        // Convert object to array
        const formattedData = Object.values(dataMap);

        res.status(200).json({
            status: true,
            data: formattedData
        });

    } catch (error) {
        console.error('Error fetching dashboard counts:', error);
        res.status(500).json({ status: false, message: error.message });
    }
};





