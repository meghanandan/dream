import axios from 'axios';

import { CONFIG } from 'src/config-global';
import Storage from "src/utils/local-store";

const axiosInstance = axios.create({ baseURL: CONFIG.site.serverUrl });

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject((error.response && error.response.data) || 'Something went wrong!')
);

export default axiosInstance;

export const fetcher = async (args) => {
  try {
    const [url, config] = Array.isArray(args) ? args : [args];

    const res = await axiosInstance.get(url, { ...config });

    return res.data;
  } catch (error) {
    console.error('Failed to fetch:', error);
    throw error;
  }
};

export const endpoints = {
  auth: {
    me: '/api/auth/me',
    signIn: '/api/auth/login',
    signUp: '/api/auth/sign-up',
    password: '/api/auth/createPassword',
    getMasterPages:'/api/auth/getMasterPages',
    // insertRoleName:'/api/auth/insertRoleName',
    createNewRole:'/api/auth/createNewRole', 
    getRolesList:'/api/auth/getRolesList',
    viewRolePermissions:'/api/auth/viewRolePermissions',
    updateRoleName:'/api/auth/updateRoleName',
    updateRole:'/api/auth/updateRole',
    changeStatus:'/api/auth/changeStatus',
    insertUser:'/api/auth/insertUser',
    getUsers:'/api/auth/getUsers',
    getUserUpwardReportingTree:'/api/auth/getUserUpwardReportingTree',
    getManagersList:'/api/auth/getManagersList', 
    getUserReportingTree:'/api/auth/getUserReportingTree',
    getRolePermissions:'/api/auth/getRolePermissions',
    getRoleBaseOnUsers:'/api/auth/getRoleBaseOnUsers',
    getUserIdDetails:'/api/auth/getUserIdDetails',
    updateUser:'api/auth/updateUser',
    getAll: '/api/auth/getAllTemplates',
    getById: '/api/auth/getTemplateById',
    update: '/api/auth/updateTemplate',
    create: '/api/auth/createTemplate',
    createWorkflow:'/api/auth/createWorkflow',
    getWorkFlowList:'/api/auth/getWorkFlowList',
    getWorkflowDetails:'/api/auth/getWorkflowDetails',
    updateWorkflow:'/api/auth/updateWorkflow',
    getUsersBaseOnRole:'/api/auth/getUsersBaseOnRole',
    getWorkStatus:'/api/auth/getWorkStatus',
    getAllCustomFields:'/api/auth/getAllCustomFields',
    getWorkDropDown:'/api/auth/getWorkDropDown',
    getTemplateTypeDropDown:'/api/auth/getTemplateTypeDropDown',
    getOrders:'/api/auth/getOrders',
    getDisputeorAdjustmentDropDown:'/api/auth/getDisputeorAdjustmentDropDown',
    getOrganizationWiseRemainingLicences:'/api/auth/getOrganizationWiseRemainingLicences',
    raiseDispute:'/api/auth/raiseDispute',
    createDispute:'/api/auth/createDispute',
    getDisputeList:'/api/auth/getDisputeList',
    getPendingDisputesList:'/api/auth/getPendingDisputesList',
    deleteTemplate:'/api/auth/deleteTemplate',
    updateDispute:'/api/auth/updateDispute',
    getDisputeHistory:'/api/auth/getDisputeHistory',
    performDelegation:'/api/auth/performDelegation',
    getCountForDashboardCount:'api/auth/getCountForDashboardCount',
    getCountForDashboardCurrentMonth:'api/auth/getCountForDashboardCurrentMonth',
    getCountForDashboardCurrentYear:'api/auth/getCountForDashboardCurrentYear',
    deleteUser:'api/auth/deleteUser',
    uploadUsers:'api/auth/uploadUsers',
    uploadUsersFiles:'api/auth/uploadUsersFiles',
    quotaVerifiedByAdmin:'api/auth/quotaVerifiedByAdmin',
    resubmitQuotaByUser:'api/auth/resubmitQuotaByUser',
    updateSelectedQuotaDtls:'api/auth/updateSelectedQuotaDtls',
    deleteRole:'api/auth/deleteRole',
    deleteWorkflow:'api/auth/deleteWorkflow',
    copyWorkflow:'api/auth/copyWorkflow',
    renameWorkflow:'api/auth/renameWorkflow',
    getTemplateList:'/api/auth/getTemplateList',
    createFromTemplate:'/api/auth/createFromTemplate',
    markAsTemplate:'/api/auth/markAsTemplate',
    getCustomersList: 'api/auth/getCustomersList',
    createNewCustomer: '/api/auth/createNewCustomer',  
    updateSelectedCustomerLicences: '/api/auth/updateSelectedCustomerLicences',
    getCountriesList: '/api/auth/getCountriesList',
    getLicenseUsageStats: '/api/auth/getLicenseUsageStats',
    getCustomersWithTrialStatus: '/api/auth/getCustomersWithTrialStatus',
    convertTrialToPaid: '/api/auth/convertTrialToPaid',
    getQuickCodeListForDisputes: '/api/auth/getQuickCodeListForDisputes',
    getDisputesByType: '/api/auth/getDisputesByType', 
    getDisputesByStatus: '/api/auth/getDisputesByStatus', 
    getDisputesByEscalation: '/api/auth/getDisputesByEscalation', 
    getDisputesByMonth: '/api/auth/getDisputesByMonth',
    getAvgResolutionTimeByMonth: '/api/auth/getAvgResolutionTimeByMonth', 
    getDisputesSummary: '/api/auth/getDisputesSummary',
    getDisputesByLicenceType: '/api/auth/getDisputesByLicenceType',
    getOrganizationSmartRoutingList: '/api/auth/getOrganizationSmartRoutingList',
    getOrganizationSubSmartRoutingList: '/api/auth/getOrganizationSubSmartRoutingList',
    getQuotaList: '/api/auth/getQuotaList',
    getQuotaColumns: '/api/auth/getQuotaColumns',
    getVerifiedQuotaList: '/api/auth/getVerifiedQuotaList',
    saveManualQuotaDetails: '/api/auth/saveManualQuotaDetails',
    editAndResubmitQuota: '/api/auth/editAndResubmitQuota',
    quotaApproveOrReturnByAdmin: '/api/auth/quotaApproveOrReturnByAdmin',
    updateSelectedManualQuotaDetails: '/api/auth/updateSelectedManualQuotaDetails',
    downloadQuotaTemplate: '/api/auth/downloadQuotaTemplate',
    getPendingQuotaList: '/api/auth/getPendingQuotaList',
    deleteQuotaRow: '/api/auth/deleteQuotaRow',
    updateQuotaRow: '/api/auth/updateQuotaRow',
    getQuickCodesList: '/api/auth/getQuickCodesList',
    getAuditLogs: '/api/auth/getAuditLogs',
    getLoginAudit: '/api/auth/getLoginAudit',
    getQuotaAnalytics: '/api/auth/getQuotaAnalytics',
    getQuotaTemplateFields: '/api/auth/getQuotaTemplateFields',
    getOrganizationHierarchyList: '/api/auth/getOrganizationHierarchyList',
    selectedRoleUpdatedDetails: '/api/auth/selectedRoleUpdatedDetails',
    
  },
  template: {
    getAll: '/api/templates', // Fetch all templates
    getById: '/api/templates', // Fetch template by ID
    create: '/api/templates/create', // Create a new template
    update: '/api/templates', // Update template by ID
    delete: '/api/templates', // Delete template by ID
  },
  settings_custom_fields: {
    getAll: '/api/settings/custom-fields',
    getById: '/api/settings/custom-fields',
    create: '/api/settings/custom-fields',
    update: '/api/settings/custom-fields',
    delete: '/api/settings/custom-fields',
  },
  settings_api: {
    getAll: '/api/settings/api-connection',
    getById: '/api/settings/api-connection',
    create: '/api/settings/api-connection',
    update: '/api/settings/api-connection',
    delete: '/api/settings/api-connection',
  },
  external_api:{
    api_form:'/api/external-api/api-form',
    captureCredentials:'/api/external-api/captureCredentials',
    collectionsKeysList:'/api/external-api/collectionsKeysList',
    storeUserSelections:'/api/external-api/storeUserSelections',
    getUserSelectionList:'/api/external-api/getUserSelectionList',
    dropDownApi:'/api/external-api/dropDownApi',
    addNewField:'/api/external-api/addNewField',
    showPreview:'/api/external-api/showPreview',
    buildJoinAndSyncData:'/api/external-api/buildJoinAndSyncData',
    getFieldsMappingInfoList:'/api/external-api/getFieldsMappingInfoList',
    updateFieldsMappingInfo:'/api/external-api/updateFieldsMappingInfo',
    getOrdersData:'/api/external-api/getOrdersData',
    getCustomFieldsList:'/api/external-api/getCustomFieldsList',
    updateNewFields:'/api/external-api/updateNewFields',
    deleteCustomFields:'api/external-api/deleteCustomFields'

  }
};
