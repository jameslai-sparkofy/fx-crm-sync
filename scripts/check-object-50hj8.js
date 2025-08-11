const axios = require('axios');

async function checkObject50hj8InCRM() {
  const baseUrl = 'https://open.fxiaoke.com';
  
  try {
    // Get token
    console.log('獲取 Access Token...');
    const tokenResp = await axios.post(`${baseUrl}/cgi/corpAccessToken/get/V2`, {
      appId: 'FSAID_1320691',
      appSecret: 'ec63ff237c5c4a759be36d3a8fb7a3b4',
      permanentCode: '899433A4A04A3B8CB1CC2183DA4B5B48'
    });
    
    const accessToken = tokenResp.data.corpAccessToken;
    const corpId = tokenResp.data.corpId;
    
    // Get user ID
    const userResp = await axios.post(`${baseUrl}/cgi/user/getByMobile`, {
      corpId,
      corpAccessToken: accessToken,
      mobile: '17675662629'
    });
    
    const userId = userResp.data.empList[0].openUserId;
    
    // Query object_50hj8__c records
    console.log('查詢工地師父 (object_50hj8__c) 記錄...');
    const queryResp = await axios.post(`${baseUrl}/cgi/crm/custom/v2/data/query`, {
      corpId,
      corpAccessToken: accessToken,
      currentOpenUserId: userId,
      data: {
        dataObjectApiName: 'object_50HJ8__c',
        search_query_info: {
          limit: 1000,
          offset: 0,
          filters: []
        }
      }
    });
    
    const dataList = queryResp.data.data?.dataList || [];
    console.log(`\n總共查詢到 ${dataList.length} 條記錄`);
    
    if (dataList.length > 0) {
      console.log('\n前 3 條記錄範例:');
      dataList.slice(0, 3).forEach((record, index) => {
        console.log(`\n記錄 ${index + 1}:`);
        console.log(`  _id: ${record._id}`);
        console.log(`  name: ${record.name}`);
        console.log(`  life_status: ${record.life_status}`);
        console.log(`  created_time: ${record.created_time}`);
      });
      
      // 統計生命狀態
      const statusStats = {};
      dataList.forEach(record => {
        const status = record.life_status || 'null';
        statusStats[status] = (statusStats[status] || 0) + 1;
      });
      
      console.log('\n生命狀態統計:');
      Object.entries(statusStats).forEach(([status, count]) => {
        console.log(`  ${status}: ${count} 條`);
      });
    } else {
      console.log('確認：CRM 中工地師父已清空（0條記錄）');
    }
    
  } catch (error) {
    console.error('錯誤:', error.response?.data || error.message);
  }
}

checkObject50hj8InCRM();