// E:\Mocroservices\dispute-microservice\frontend\src\actions\SettingApiAction.js
import axios from 'axios';
import { API_BASE_URL } from '../config/config'; // Import the API_BASE_URL

// Function to create a new SettingApi
export const createSettingApi = async (SettingApiData) => {
    try {
        // Make the POST request using Axios
        const response = await axios.post(`${API_BASE_URL}/connections/create`, SettingApiData);

        return response.data; // Return the data from the response
    } catch (error) {
        console.error('Error creating SettingApi:', error);
        
        // Check if the error is due to a response error and extract useful info
        if (error.response) {
            throw new Error(`Failed to create SettingApi: ${error.response.status} - ${error.response.data}`);
        }
        
        // If no response, throw a generic error
        throw new Error('Failed to create SettingApi: No response from server');
    }  
};

export const updateSettingApi = async (id,SettingApiData) => {
    try {
        // Make the POST request using Axios
        const response = await axios.put(`${API_BASE_URL}/connections/update/${id}`, SettingApiData);
        return response.data; // Return the data from the response
    } catch (error) {
        console.error('Error creating SettingApi:', error);   
        // Check if the error is due to a response error and extract useful info
        if (error.response) {
            throw new Error(`Failed to create SettingApi: ${error.response.status} - ${error.response.data}`);
        }   
        // If no response, throw a generic error
        throw new Error('Failed to create SettingApi: No response from server');
    }  
};

export const getThirdPartySetting = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/connections/get-all`); // Fetch the templates
         return response.data; // Return the response data if needed
    } catch (error) {
        console.error('Error fetching templates:', error);
        throw error; // Or handle the error as needed
    }
};

