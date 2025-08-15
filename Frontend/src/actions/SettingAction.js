// E:\Mocroservices\dispute-microservice\frontend\src\actions\SettingAction.js
import axios from 'axios';
import { API_BASE_URL } from '../config/config'; // Import the API_BASE_URL

// Function to create a new Setting
export const createSetting = async (SettingData) => {

    try {
        // Make the POST request using Axios
        const response = await axios.post(`${API_BASE_URL}/setting/custom-fields/create`, SettingData);

        return response.data; // Return the data from the response
    } catch (error) {
        console.error('Error creating Setting:', error);
        
        // Check if the error is due to a response error and extract useful info
        if (error.response) {
            throw new Error(`Failed to create Setting: ${error.response.status} - ${error.response.data}`);
        }
        
        // If no response, throw a generic error
        throw new Error('Failed to create Setting: No response from server');
    }
};


export const updateSetting = async (id,SettingData) => {

    try {
        // Make the POST request using Axios
        const response = await axios.put(`${API_BASE_URL}/setting/custom-fields/update/${id}`, SettingData);

        return response.data; // Return the data from the response
    } catch (error) {
        console.error('Error creating Setting:', error);
        
        // Check if the error is due to a response error and extract useful info
        if (error.response) {
            throw new Error(`Failed to create Setting: ${error.response.status} - ${error.response.data}`);
        }
        
        // If no response, throw a generic error
        throw new Error('Failed to create Setting: No response from server');
    }
};


export const getFieldTemplates = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/setting/custom-fields/get-all`); // Fetch the templates
         return response.data; // Return the response data if needed
    } catch (error) {
        console.error('Error fetching templates:', error);
        throw error; // Or handle the error as needed
    }
};



export const deleteFieldTemplates = async (id) => {
    try {
        const response = await axios.delete(`${API_BASE_URL}/setting/custom-fields/delete/${id}`); // Fetch the templates
         return response.data; // Return the response data if needed
    } catch (error) {
        console.error('Error fetching templates:', error);
        throw error; // Or handle the error as needed
    }
};



