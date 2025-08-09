const axios = require('axios');
const fs = require('fs');

async function getCRMRecordAsCSV() {
  const baseUrl = 'https://open.fxiaoke.com';
  
  try {
    // Step 1: Get token
    console.log('Getting access token...');
    const tokenResp = await axios.post(`${baseUrl}/cgi/corpAccessToken/get/V2`, {
      appId: 'FSAID_1320691',
      appSecret: 'ec63ff237c5c4a759be36d3a8fb7a3b4',
      permanentCode: '899433A4A04A3B8CB1CC2183DA4B5B48'
    });
    
    const accessToken = tokenResp.data.corpAccessToken;
    const corpId = tokenResp.data.corpId;
    console.log('Token obtained');
    
    // Step 2: Get user ID
    console.log('Getting user ID...');
    const userResp = await axios.post(`${baseUrl}/cgi/user/getByMobile`, {
      corpId,
      corpAccessToken: accessToken,
      mobile: '17675662629'
    });
    
    // Check the actual response structure
    console.log('User response structure:', Object.keys(userResp.data));
    
    // Try different possible paths
    const userId = userResp.data.empList?.[0]?.openUserId || 
                   userResp.data.employee?.[0]?.openUserId || 
                   userResp.data.employees?.[0]?.openUserId ||
                   userResp.data.openUserId;
    
    if (!userId) {
      console.log('Full user response:', JSON.stringify(userResp.data, null, 2));
      throw new Error('Could not find user ID in response');
    }
    
    console.log('User ID obtained:', userId);
    
    // Step 3: Query one record (any record) - using correct API structure
    console.log('Querying CRM for any record...');
    const queryResp = await axios.post(`${baseUrl}/cgi/crm/custom/v2/data/query`, {
      corpId,
      corpAccessToken: accessToken,
      currentOpenUserId: userId,
      data: {
        dataObjectApiName: 'object_8W9cb__c',  // Changed from object_api_name
        search_query_info: {  // Wrapped in search_query_info
          limit: 1,
          offset: 0,
          filters: []  // No filters, get any record
        }
      }
    });
    
    // Debug: Check the response structure
    console.log('Query response keys:', Object.keys(queryResp.data));
    if (queryResp.data.errorCode !== 0) {
      console.log('Error:', queryResp.data.errorMessage);
      console.log('Full response:', JSON.stringify(queryResp.data, null, 2));
    }
    if (queryResp.data.data) {
      console.log('Data keys:', Object.keys(queryResp.data.data));
    }
    
    // Try different possible paths
    const dataList = queryResp.data.data?.dataList || 
                     queryResp.data.dataList || 
                     queryResp.data.data?.data ||
                     [];
    
    console.log('Found', dataList.length, 'records');
    
    if (dataList.length > 0) {
      const record = dataList[0];
      
      // Convert to CSV
      const headers = Object.keys(record);
      const values = headers.map(key => {
        const value = record[key];
        // Handle different types of values
        if (value === null || value === undefined) {
          return '';
        } else if (typeof value === 'object') {
          return JSON.stringify(value).replace(/"/g, '""'); // Escape quotes for CSV
        } else {
          return String(value).replace(/"/g, '""');
        }
      });
      
      // Create CSV content
      const csvContent = [
        headers.map(h => `"${h}"`).join(','),
        values.map(v => `"${v}"`).join(',')
      ].join('\n');
      
      // Save to file
      const filename = 'crm-record-sample.csv';
      fs.writeFileSync(filename, csvContent, 'utf-8');
      console.log(`\nCSV file saved as: ${filename}`);
      
      // Also print shift_time related fields
      console.log('\n=== shift_time 相關欄位 ===');
      headers.filter(h => h.includes('shift_time')).forEach(key => {
        console.log(`${key}: ${JSON.stringify(record[key], null, 2)}`);
      });
      
      // Print all field names for analysis
      console.log('\n=== 所有欄位名稱 (共 ' + headers.length + ' 個) ===');
      headers.forEach((h, i) => {
        console.log(`${i+1}. ${h}`);
      });
      
    } else {
      console.log('No records found with shift_time value');
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

getCRMRecordAsCSV();