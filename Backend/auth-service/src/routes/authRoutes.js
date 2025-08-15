const express = require('express');
const multer = require("multer");
const path = require("path");
const fs = require("fs");
// === Ensure 'uploads' directory exists ===
const uploadDir = path.join(__dirname, '../uploads'); 
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
const { login, me ,password } = require('../controllers/authController');
const {getMasterPages, changeStatus 
  ,getUserReportingTree,getUsers,getManagersList,insertUser,getRolePermissions,getRoleBaseOnUsers,getUserUpwardReportingTree,
    getUserIdDetails,updateUser,getAllTemplates,getTemplateById,updateTemplate,createTemplate,getUsersBaseOnRole,deleteUser,
    uploadUsers } = require('../controllers/masterController')

  //   const {getMasterPages,insertRoleName,createRole,createRoleTemplateMappring,getRolesList,viewRolePermissions,updateRoleName,updateRole,changeStatus
  // ,getUserReportingTree,getUsers,insertUser,getRolePermissions,getRoleBaseOnUsers,getUserUpwardReportingTree,
  //   getUserIdDetails,updateUser,getAllTemplates,getTemplateById,updateTemplate,createTemplate,getUsersBaseOnRole,deleteUser,uploadUsers,
  //   deleteRole,getOrganizationWiseRemainingLicences } = require('../controllers/masterController')

const {createWorkflow,getWorkFlowList,getWorkflowDetails,updateWorkflow,getWorkStatus,deleteWorkflow,copyWorkflow,renameWorkflow,getOrganizationHierarchyList, 
  getOrganizationSmartRoutingList,getOrganizationSubSmartRoutingList, executeWorkflow }=require('./../controllers/workflowController');
const {createCustomField,getAllCustomFields,sendEmail}=require('./../controllers/customFieldsController');
const {getWorkDropDown,getTemplateTypeDropDown,deleteTemplate}=require('./../controllers/templateController');
// const {getOrders,getDisputeorAdjustmentDropDown,raiseDispute,createDispute,getDisputeList,updateDispute,getDisputeHistory,performDelegation}=require('./../controllers/orderController');
const {getCountForDashboardCount,getCountForDashboardCurrentMonth,getCountForDashboardCurrentYear}=require('./../controllers/dashboardController');
const {getCustomersList,createNewCustomer,updateSelectedCustomerLicences, getCountriesList,
    getOrganizationWiseRemainingLicences,getLicenseUsageStats,convertTrialToPaid,getCustomersWithTrialStatus}=require('./../controllers/customerController');

const {getOrders,getDisputeorAdjustmentDropDown,performDelegation}=require('./../controllers/orderController');


const {raiseDispute,getDisputeList,createDispute,updateDispute,getPendingDreamLTEDisputesList,
    createDreamLiteDispute,getDreamLiteDisputeList,getPendingDisputesList ,getDisputePendingCountForLTE, actOnDispute }=require('../controllers/disputeController');

const {getQuickCodesList,createNewQuickCode,updateSelectedQuickCode,getQuickCodeListForDisputes}=require('./../controllers/commonController');
const {getDisputesByType, getDisputesByStatus, getDisputesByEscalation, getDisputesByMonth,getAvgResolutionTimeByMonth, getDisputesSummary, getDisputesByLicenceType } = require('../controllers/analyticsController');


const { uploadUsersFiles,downloadQuotaTemplate,getQuotaColumns, getQuotaTemplateFields } = require('../controllers/usersFileUploadController');
const {getQuotaList,getPendingQuotaList, updateQuotaRow, deleteQuotaRow,
  saveManualQuotaDetails,updateSelectedManualQuotaDetails ,resubmitQuotaByUser,
  // editAndResubmitQuota,quotaVerifiedByAdmin ,updateSelectedQuotaDtls, quotaApproveOrReturnByAdmin,
getVerifiedQuotaList, getQuotaAnalytics  } = require('../controllers/quotaController'); 
  
  const {getRolesList,deleteRole, viewRolePermissions, createNewRole, selectedRoleUpdatedDetails}=require('./../controllers/roleMappingController');
  
  const { getAuditLogs,getLoginAudit } = require('../controllers/auditsController');

  // const {quotaVerifiedByAdmin , updateSelectedQuotaDtls  } 
  // = require('../controllers/tempQuotaController');
  const {editAndResubmitQuota,quotaVerifiedByAdmin ,updateSelectedQuotaDtls, quotaApproveOrReturnByAdmin  } 
  = require('../controllers/tempQuotaController');

// const {getUserReportingTree}=require('../controllers/usersController');
// const {
//     createTemplate,
//     getTemplateById,
//     updateTemplate,
//     deleteTemplate,
//     getAllTemplates,
//   } = require('./../controllers/templateController');
const authenticateToken = require('../middlewares/authMiddleware'); 
const router = express.Router();
// const upload = multer({ storage: multer.memoryStorage() });
// === Configure Multer to use disk storage ===
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '_' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

router.post('/login', login);
router.post('/createPassword',password)
router.get('/me', authenticateToken, me);
router.get('/getMasterPages', authenticateToken, getMasterPages);
// router.post('/insertRoleName',authenticateToken,insertRoleName);
router.post('/changeStatus',authenticateToken,changeStatus);
router.post('/insertUser',authenticateToken,insertUser);
router.post('/getUsers',authenticateToken,getUsers);
router.post('/getManagersList',authenticateToken,getManagersList);
router.post('/getOrganizationHierarchyList', authenticateToken, getOrganizationHierarchyList);
router.post('/getOrganizationSmartRoutingList', authenticateToken, getOrganizationSmartRoutingList);
router.post('/getOrganizationSubSmartRoutingList', authenticateToken, getOrganizationSubSmartRoutingList);
router.post('/getRolePermissions',authenticateToken,getRolePermissions);
router.post('/getOrganizationWiseRemainingLicences',authenticateToken,getOrganizationWiseRemainingLicences);
router.post('/getRoleBaseOnUsers',authenticateToken,getRoleBaseOnUsers);
router.post('/getUserIdDetails',authenticateToken,getUserIdDetails);
router.post('/updateUser',authenticateToken,updateUser);
router.post('/getTemplateById',authenticateToken,getTemplateById);
router.post('/updateTemplate',authenticateToken,updateTemplate);
router.post('/createTemplate',authenticateToken,createTemplate);
router.post('/createWorkflow',authenticateToken,createWorkflow);
router.post('/getWorkFlowList',authenticateToken,getWorkFlowList);
router.post('/getWorkflowDetails',authenticateToken,getWorkflowDetails);
router.post('/updateWorkflow',authenticateToken,updateWorkflow);
router.post('/executeWorkflow', authenticateToken, executeWorkflow);
router.post('/getUsersBaseOnRole',authenticateToken,getUsersBaseOnRole);
router.post('/getWorkStatus',authenticateToken,getWorkStatus);
router.post('/createCustomField',authenticateToken,createCustomField);
router.post('/getAllCustomFields',authenticateToken,getAllCustomFields);
router.post('/getWorkDropDown',authenticateToken,getWorkDropDown);
router.post('/getTemplateTypeDropDown',authenticateToken,getTemplateTypeDropDown);
router.post('/getOrders',authenticateToken,getOrders);
router.post('/getDisputeorAdjustmentDropDown',authenticateToken,getDisputeorAdjustmentDropDown);
router.post('/raiseDispute',authenticateToken,raiseDispute);
router.post('/createDispute',authenticateToken,createDispute);
router.post('/getDisputeList',authenticateToken,getDisputeList);
router.post('/deleteTemplate',authenticateToken,deleteTemplate);
router.post('/updateDispute',authenticateToken,updateDispute);
// router.get('/getDisputeHistory',authenticateToken,getDisputeHistory);
router.post('/getPendingDreamLTEDisputesList',authenticateToken,getPendingDreamLTEDisputesList);

// router.get('/getDisputeHistory',authenticateToken,getDisputeHistory);
router.post('/sendEmail',authenticateToken, sendEmail);
router.post('/performDelegation',authenticateToken, performDelegation);
router.post('/getCountForDashboardCount',authenticateToken,getCountForDashboardCount);
router.post('/getCountForDashboardCurrentMonth',authenticateToken,getCountForDashboardCurrentMonth);
router.post('/getCountForDashboardCurrentYear',authenticateToken,getCountForDashboardCurrentYear);
router.post('/performDelegation',authenticateToken, performDelegation);
router.post('/getCustomersList',authenticateToken,getCustomersList);
router.post('/createNewCustomer',authenticateToken,createNewCustomer);
router.post('/updateSelectedCustomerLicences',authenticateToken,updateSelectedCustomerLicences);
router.post('/getCountriesList',authenticateToken,getCountriesList);
router.post('/getLicenseUsageStats',authenticateToken,getLicenseUsageStats);
router.post('/convertTrialToPaid',authenticateToken,convertTrialToPaid);
router.post('/getCustomersWithTrialStatus',authenticateToken,getCustomersWithTrialStatus);
router.post('/deleteUser',authenticateToken,deleteUser);
router.post("/uploadUsers",authenticateToken, upload.single("file"), uploadUsers);
router.post('/deleteWorkflow',authenticateToken,deleteWorkflow);
router.post('/copyWorkflow',authenticateToken,copyWorkflow);
router.post('/renameWorkflow',authenticateToken,renameWorkflow);
// router.post('/createDreamLiteDispute',authenticateToken,createDreamLiteDispute);
router.post(
  '/createDreamLiteDispute',
  authenticateToken,
  upload.fields([
    { name: 'capture_image', maxCount: 1 },
    { name: 'attachment', maxCount: 1 }
  ]),
  createDreamLiteDispute
);
// router.post('/create', authenticateToken, createTemplate);
// router.get('/:id', authenticateToken, getTemplateById);
// router.put('/:id', authenticateToken, updateTemplate);
// router.delete('/:id', authenticateToken, deleteTemplate);
router.post('/getAllTemplates', authenticateToken, getAllTemplates);
router.post('/getDreamLiteDisputeList', authenticateToken, getDreamLiteDisputeList);
router.post('/getPendingDisputesList', authenticateToken, getPendingDisputesList); 
router.get('/getDisputePendingCountForLTE', authenticateToken, getDisputePendingCountForLTE);
router.get('/actOnDispute', authenticateToken, actOnDispute);
router.post('/getUserReportingTree', authenticateToken, getUserReportingTree);
router.post('/getUserUpwardReportingTree', authenticateToken, getUserUpwardReportingTree);

router.get('/getQuickCodesList',authenticateToken,getQuickCodesList);
router.post('/createNewQuickCode',authenticateToken,createNewQuickCode);
router.post('/updateSelectedQuickCode',authenticateToken,updateSelectedQuickCode);
router.get('/getQuickCodeListForDisputes',authenticateToken,getQuickCodeListForDisputes);


const upload1 = multer({ dest: 'uploads/' });
router.post(
  '/uploadUsersFiles',
  upload1.single('file'),
  uploadUsersFiles
);
// router.post('/uploadUsersFiles', upload.any(),authenticateToken,uploadUsersFiles);

router.post('/downloadQuotaTemplate', authenticateToken,downloadQuotaTemplate);
router.post('/getQuotaColumns', authenticateToken,getQuotaColumns);
router.post('/getQuotaList', authenticateToken,getQuotaList);
router.post('/getPendingQuotaList', authenticateToken,getPendingQuotaList);
router.post('/quotaApproveOrReturnByAdmin', authenticateToken,quotaApproveOrReturnByAdmin);
router.post('/updateQuotaRow', authenticateToken, updateQuotaRow);
router.post('/deleteQuotaRow', authenticateToken, deleteQuotaRow);
router.post('/saveManualQuotaDetails', authenticateToken,saveManualQuotaDetails);
router.post('/updateSelectedManualQuotaDetails', authenticateToken,updateSelectedManualQuotaDetails);
router.post('/quotaVerifiedByAdmin', authenticateToken,quotaVerifiedByAdmin);
router.post('/resubmitQuotaByUser', authenticateToken,resubmitQuotaByUser);
router.post('/updateSelectedQuotaDtls', authenticateToken,updateSelectedQuotaDtls);
router.post('/getVerifiedQuotaList', authenticateToken,getVerifiedQuotaList);


router.post('/getDisputesByType', authenticateToken,getDisputesByType);
router.post('/getDisputesByStatus', authenticateToken,getDisputesByStatus);
router.post('/getDisputesByMonth', authenticateToken,getDisputesByMonth);
router.post('/getDisputesByEscalation', authenticateToken,getDisputesByEscalation);
router.post('/getAvgResolutionTimeByMonth', authenticateToken,getAvgResolutionTimeByMonth);
router.post('/getDisputesSummary',authenticateToken, getDisputesSummary);
router.post('/getDisputesByLicenceType',authenticateToken, getDisputesByLicenceType );

// Role Mapping Screen
router.post('/getRolesList',authenticateToken,getRolesList);
router.post('/deleteRole',authenticateToken,deleteRole);
router.post('/createNewRole',authenticateToken, createNewRole ); 
router.post('/selectedRoleUpdatedDetails',authenticateToken, selectedRoleUpdatedDetails ); 
router.post('/viewRolePermissions',authenticateToken,viewRolePermissions); 

router.post('/getAuditLogs',authenticateToken,getAuditLogs); 
router.post('/getLoginAudit',authenticateToken,getLoginAudit); 
router.post('/getQuotaAnalytics',authenticateToken,getQuotaAnalytics); 
router.post('/editAndResubmitQuota',authenticateToken,editAndResubmitQuota); 
router.post('/getQuotaTemplateFields',authenticateToken,getQuotaTemplateFields); 

module.exports = router;