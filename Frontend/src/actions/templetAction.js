// E:\Mocroservices\dispute-microservice\frontend\src\actions\templetAction.js
import axios from 'axios';
import { API_BASE_URL } from '../config/config'; // Import the API_BASE_URL

// Function to create a new template
export const createTemplate = async (templateData) => {
    if (!templateData.type) {
        throw new Error('Template type is missing!');
    }
    try {
        // Make the POST request using Axios
        const response = await axios.post(`${API_BASE_URL}/templates/disputeTemplate/create`, templateData);
        return response.data; // Return the data from the response
    } catch (error) {
        console.error('Error creating template:', error);

        // Check if the error is due to a response error and extract useful info
        if (error.response) {
            throw new Error(`Failed to create template: ${error.response.status} - ${error.response.data}`);
        }

        // If no response, throw a generic error
        throw new Error('Failed to create template: No response from server');
    }
};

// Function to get all templates
export const getTemplates = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/templates/disputeTemplates/get`); // Fetch the templates
        return response.data; // Return the response data if needed
    } catch (error) {
        console.error('Error fetching templates:', error);
        throw error; // Or handle the error as needed
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
