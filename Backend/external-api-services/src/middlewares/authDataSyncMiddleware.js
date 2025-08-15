const axios = require('axios');

const getAccessToken = async(req,res)=>{
try {
    const request = await req.json();
    const { url, method, body, params, credentials } = request;

    // Prepare query parameters
    const queryParams = new URLSearchParams();
    params.forEach((param) => {
      if (credentials[param]) {
        queryParams.append(param, credentials[param]);
      }
    });
    // console.log(queryParams,"queryParams")
    // Prepare body data
    const bodyData = {};
    if (Array.isArray(body)) {
      body.forEach((field) => {
        if (credentials[field]) {
          bodyData[field] = credentials[field];
        }
      });
    }
    // console.log(bodyData, "bodyData");

    const response = await axios({
      method,
      url: `${url}?${queryParams.toString()}`,
      data: bodyData,
    });

    const accessToken = response.data.access_token;
    // const accessToken ='b33cb323fd99b891ed3f0e77438e2806'

    console.log(accessToken,"accessToken in middleware")
    return res.json({ accessToken });
    
  } catch (error) {
    console.error('Error getting access token:', error);
    res.status(500).json({ error: 'Failed to get access token' });
  }    

}

module.exports={
    getAccessToken  
}




