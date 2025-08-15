/* eslint-disable no-unused-vars */
/* eslint-disable no-console */
// import netWorkList from '../utils/netWorkList';
import axios from 'axios';
import { STORAGE_KEY } from 'src/utils/constant';
import { getCookie, deleteCookie } from 'src/utils/cookie';
import { CONFIG } from 'src/config-global';
import Storage from "src/utils/local-store";

const accessToken = sessionStorage.getItem(STORAGE_KEY) || getCookie(STORAGE_KEY);
const HttpClient = axios.create({
    baseURL: CONFIG.site.serverUrl,
    headers: {
        "Content-Type": "multipart/form-data",
    },
});

export default async function postuploadService(url, method, data) {
    try {
        const token = JSON.parse(Storage.get('token'));
        const response = await HttpClient({
            method,
            url,
            data,
            headers: {
                Authorization: token ? `Bearer ${token}` : '',
            },
        });

        // Destructure and handle response
        const { data: responseData, status } = response;
        if (status === 200) {
            if (responseData.status) {
                return responseData;
            }
            if (responseData.message === 'Token is not valid') {
                Storage.clearAll();
                return false;
            }
            return responseData;
        }
        if (status === 201) {
            if (responseData.status) {
                return responseData;
            }
            return responseData;
        }
        return false;
    } catch (error) {
        console.error('HTTP Error:', error.message);
        return false;
    }
}
