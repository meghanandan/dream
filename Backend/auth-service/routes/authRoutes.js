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
const {getMasterPages,insertRoleName,createRole,getRolesList,viewRolePermissions,updateRoleName,updateRole,changeStatus
  ,getUserReportingTree,getUsers,insertUser,getRolePermissions,getRoleBaseOnUsers,getUserUpwardReportingTree,getManagersList,
    getUserIdDetails,updateUser,getAllTemplates,getTemplateById,updateTemplate,createTemplate,getUsersBaseOnRole,deleteUser,uploadUsers,
    deleteRole,getOrganizationWiseRemainingLicences } = require('../controllers/masterController')

const {createWorkflow,getWorkFlowList,getWorkflowDetails,updateWorkflow,getWorkStatus,deleteWorkflow,copyWorkflow,renameWorkflow,getOrganizationHierarchyList,getTemplateList,createFromTemplate,markAsTemplate}=require('./../controllers/workflowController');
const {createCustomField,getAllCustomFields,sendEmail}=require('./../controllers/customFieldsController');
const {getWorkDropDown,getTemplateTypeDropDown,deleteTemplate}=require('./../controllers/templateController');
// const {getOrders,getDisputeorAdjustmentDropDown,raiseDispute,createDispute,getDisputeList,updateDispute,getDisputeHistory,performDelegation}=require('./../controllers/orderController');
const {getCountForDashboardCount,getCountForDashboardCurrentMonth,getCountForDashboardCurrentYear}=require('./../controllers/dashboardController');
const {getCustomersList,createNewCustomer,updateSelectedCustomerLicences, getCountriesList}=require('./../controllers/customerController');

const {getOrders,getDisputeorAdjustmentDropDown,performDelegation}=require('./../controllers/orderController');

const {raiseDispute,getDisputeList,createDispute,updateDispute,getDisputeHistory,
    createDreamLiteDispute,getDreamLiteDisputeList,getPendingDisputesList,getPendingDreamLTEDisputesList}=require('../controllers/disputeController');

const {getQuickCodesList,createNewQuickCode,updateSelectedQuickCode,getQuickCodeListForDisputes}=require('./../controllers/commonController');
const {getDisputesByType, getDisputesByStatus, getDisputesByEscalation, getDisputesByMonth,getAvgResolutionTimeByMonth, getDisputesSummary, getDisputesByLicenceType } = require('../controllers/analyticsController');



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
router.post('/insertRoleName',authenticateToken,insertRoleName);
router.post('/createRole',authenticateToken,createRole);
router.post('/getRolesList',authenticateToken,getRolesList);
router.post('/viewRolePermissions',authenticateToken,viewRolePermissions);
router.post('/updateRoleName',authenticateToken,updateRoleName);
router.post('/updateRole',authenticateToken,updateRole);
router.post('/changeStatus',authenticateToken,changeStatus);
router.post('/insertUser',authenticateToken,insertUser);
router.post('/getUsers',authenticateToken,getUsers);
router.post('/getManagersList',authenticateToken,getManagersList);
router.post('/getOrganizationHierarchyList', authenticateToken, getOrganizationHierarchyList);
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
router.post('/getUsersBaseOnRole',authenticateToken,getUsersBaseOnRole);
router.post('/getWorkStatus',authenticateToken,getWorkStatus);
router.post('/copyWorkflow',authenticateToken,copyWorkflow);
router.post('/renameWorkflow',authenticateToken,renameWorkflow);
router.post('/getTemplateList',authenticateToken,getTemplateList);
router.post('/createFromTemplate',authenticateToken,createFromTemplate);
router.post('/markAsTemplate',authenticateToken,markAsTemplate);
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
router.post('/getDisputeHistory',authenticateToken,getDisputeHistory);
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
router.post('/deleteUser',authenticateToken,deleteUser);
router.post("/uploadUsers",authenticateToken, upload.single("file"), uploadUsers);
router.post('/deleteRole',authenticateToken,deleteRole);
router.post('/deleteWorkflow',authenticateToken,deleteWorkflow);
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
router.post('/getPendingDreamLTEDisputesList', authenticateToken, getPendingDreamLTEDisputesList);
router.post('/getUserReportingTree', authenticateToken, getUserReportingTree);
router.post('/getUserUpwardReportingTree', authenticateToken, getUserUpwardReportingTree);

router.get('/getQuickCodesList',authenticateToken,getQuickCodesList);
router.post('/createNewQuickCode',authenticateToken,createNewQuickCode);
router.post('/updateSelectedQuickCode',authenticateToken,updateSelectedQuickCode);
router.get('/getQuickCodeListForDisputes',authenticateToken,getQuickCodeListForDisputes);

router.post('/getDisputesByType', authenticateToken,getDisputesByType);
router.post('/getDisputesByStatus', authenticateToken,getDisputesByStatus);
router.post('/getDisputesByMonth', authenticateToken,getDisputesByMonth);
router.post('/getDisputesByEscalation', authenticateToken,getDisputesByEscalation);
router.post('/getAvgResolutionTimeByMonth', authenticateToken,getAvgResolutionTimeByMonth);
router.post('/getDisputesSummary',authenticateToken, getDisputesSummary);
router.post('/getDisputesByLicenceType',authenticateToken, getDisputesByLicenceType );

module.exports = router;
