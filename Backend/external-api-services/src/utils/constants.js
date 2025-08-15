const APP_CONSTANTS = {
    DATA_TYPES: {
      bigint: "Integer",
      double_precision:"Floting Point",
      char:"Character",
      character_varying:"String",
      text:"Text",
      boolean:"Boolean",
      timestamp_without_time_zone:"Date"
   
    },
    FOREIGN_TABLE_TYPES:{
      bigint: "Integer",
      character_varying:"String"
    },
    TABLE_TYPES:{
      0:"Both",
      1:"Orders",
      2:"Payments"

    },
    TABLE_ORDER:{
      "xc":["xc_user", "xc_comp_order_item", "xc_credit", "xc_commission", "xc_payment"],
      "sf":["opportunity","opportunitylineitem"]

    },
    FOREIGNKEYS:{
      "xc":'order_code',
      "sf":'opportunityid'

    },
    USER_QUERY:{
      "sf":`select u.id as employee_id,u.id as data_source_id,u.managerid as reporting_to,u.name,u.email,u.userroleid as role_id,r.name as role_name 
            from staging.user u join staging.userrole r on u.userroleid = r.id where u.org_code = $1`,
      "xc":`WITH FilteredEmployees AS (
            SELECT DISTINCT ON (p.employee_id)
                u.name, 
                u.email, 
                p.employee_id, 
                ur.role_id, 
                r.name AS role_name,
              p.participant_id as data_source_id,
                pos.position_id,
                h.to_pos_id AS reporting_to_position_id,
                rp.employee_id AS reporting_to
            FROM staging.xc_user u
            LEFT JOIN staging.xc_part_user_assignment p ON u.user_id = p.user_id 
            LEFT JOIN staging.xc_user_role ur ON u.user_id = ur.user_id 
            LEFT JOIN staging.xc_role r ON ur.role_id = r.role_id 
            LEFT JOIN staging.xc_pos_part_assignment pos ON p.participant_id = pos.participant_id 
            LEFT JOIN staging.xc_pos_hierarchy h ON pos.position_id = h.from_pos_id
            -- Join again to get the employee_id of reporting_to (h.to_pos_id)
            LEFT JOIN staging.xc_pos_part_assignment pos_rep ON h.to_pos_id = pos_rep.position_id
            LEFT JOIN staging.xc_part_user_assignment rp ON pos_rep.participant_id = rp.participant_id
            WHERE p.employee_id IS NOT NULL AND u.org_code = $1
        )
        SELECT * FROM FilteredEmployees 
        WHERE reporting_to_position_id IS NOT NULL 
          OR position_id IN (SELECT DISTINCT reporting_to_position_id FROM FilteredEmployees)`

    },



}

module.exports={
    APP_CONSTANTS

}