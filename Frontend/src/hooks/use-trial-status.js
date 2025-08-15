import { useState, useEffect } from 'react';

export function useTrialStatus() {
  const [trialData, setTrialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // Function to get trial info from userData or localStorage
    const getTrialInfo = () => {
      try {
        setLoading(true);
        
        // Get user data from localStorage
        const userDataStr = localStorage.getItem('userData');
        if (!userDataStr) {
          setTrialData(null);
          setLoading(false);
          return;
        }
        
        const userData = JSON.parse(userDataStr);
        
        // First try to get trialInfo from userData (embedded during login)
        let trialInfo = userData?.trialInfo;
        
        // If not found in userData, try separate trialInfo in localStorage
        if (!trialInfo) {
          const trialInfoStr = localStorage.getItem('trialInfo');
          if (trialInfoStr) {
            trialInfo = JSON.parse(trialInfoStr);
          }
        }
        
        if (!trialInfo) {
          console.log('No trial info found');
          setTrialData(null);
          setLoading(false);
          return;
        }
        
        // Calculate days remaining
        let daysRemaining = trialInfo.days_remaining || 0;
        let isExpired = false;
        let isExpiringSoon = false;
        
        if (trialInfo.trial_end_date) {
          const trialEndDate = new Date(trialInfo.trial_end_date);
          const currentDate = new Date();
          const timeDiff = trialEndDate.getTime() - currentDate.getTime();
          daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
          
          isExpired = daysRemaining <= 0;
          isExpiringSoon = daysRemaining <= 7 && daysRemaining > 0;
        }
        
        // Prepare complete trial data
        const processedData = {
          isTrialUser: trialInfo.is_trial || trialInfo.trial_status === 'TRIAL',
          isPaidCustomer: trialInfo.is_paid === true,
          daysRemaining: Math.max(0, daysRemaining),
          trialEndDate: trialInfo.trial_end_date ? new Date(trialInfo.trial_end_date) : null,
          trialStartDate: trialInfo.trial_start_date ? new Date(trialInfo.trial_start_date) : null,
          companyName: trialInfo.company_name || userData?.organization || 'Unknown',
          trialStatus: trialInfo.trial_status || 'UNKNOWN',
          customerStatus: trialInfo.customer_status,
          isExpired,
          isExpiringSoon,
          customerType: trialInfo.is_trial ? 'TRIAL' : (trialInfo.is_paid ? 'PAID' : 'UNKNOWN'),
          trialConvertedDate: trialInfo.trial_converted_date ? new Date(trialInfo.trial_converted_date) : null
        };
        
        console.log('Trial data processed:', processedData);
        setTrialData(processedData);
      } catch (err) {
        console.error('Error getting trial status:', err);
        setError(err.message || 'Failed to get trial status');
      } finally {
        setLoading(false);
      }
    };
    
    // Run once on mount
    getTrialInfo();
    
    // Setup storage event listener
    const handleStorageChange = (e) => {
      if (e.key === 'userData' || e.key === 'trialInfo') {
        getTrialInfo();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  const refreshTrialStatus = () => {
    // Actually fetch fresh data - could be implemented later
    console.log('Refresh requested but not implemented');
  };
  
  return {
    trialData,
    loading,
    error,
    refreshTrialStatus,
    isTrialUser: trialData?.isTrialUser || false,
    daysRemaining: trialData?.daysRemaining || 0,
    isExpired: trialData?.isExpired || false,
    isExpiringSoon: trialData?.isExpiringSoon || false,
    isPaidCustomer: trialData?.isPaidCustomer || false
  };
}
