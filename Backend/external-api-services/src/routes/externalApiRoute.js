const express = require('express');
const {
  getApiFormFields,
  syncData,
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
} = require('../controllers/externalApiController');
const{dropDownApi,insertCommonStandardFields,getHierarchyLevels,getUsersDataSource}=require('../controllers/customController')
const { authenticateToken } = require('../middlewares/authMiddleware');
const router = express.Router();

router.post('/api-form',authenticateToken,getApiFormFields);
router.post('/captureCredentials',authenticateToken,captureCredentials);
router.delete('/removeCredentials',authenticateToken,removeCredentials);
router.post('/sync',authenticateToken,syncData);
router.post('/collectionsKeysList',authenticateToken,CollectionsKeysList);
router.post('/storeUserSelections',authenticateToken,storeUserSelections);
router.post('/getUserSelectionList',authenticateToken,getUserSelectionList);
router.post('/dropDownApi',authenticateToken,dropDownApi);
router.post('/addNewField',authenticateToken,addNewFields);
router.post('/insertCommonStandardFields',authenticateToken,insertCommonStandardFields);
router.post('/showPreview',authenticateToken,showPreview)
router.post('/buildJoinAndSyncData',authenticateToken,buildJoinAndSyncData)
router.post('/getOrdersData',authenticateToken,getOrdersData)
router.post('/getFieldsMappingInfoList',authenticateToken,getFieldsMappingInfoList)
router.post('/updateFieldsMappingInfo',authenticateToken,updateFieldsMappingInfo)
router.post('/getCustomFieldsList',authenticateToken,getCustomFieldsList)
router.post('/updateNewFields',authenticateToken,updateNewFields);
router.post('/deleteCustomFields',authenticateToken,deleteCustomFields);
router.post('/getAccountFields',getAccountFields);
router.post('/getHierarchyLevels',getHierarchyLevels)
router.post('/getUsersDataSource',getUsersDataSource)
router.post('/syncUserData',syncUserData)

module.exports = router;
