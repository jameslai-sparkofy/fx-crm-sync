const axios = require('axios');

async function checkLatestWorkers() {
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
    
    // Query object_50hj8__c records without any filter
    console.log('\n查詢工地師父 (object_50HJ8__c) 所有記錄（包括作廢）...');
    const queryResp = await axios.post(`${baseUrl}/cgi/crm/custom/v2/data/query`, {
      corpId,
      corpAccessToken: accessToken,
      currentOpenUserId: userId,
      data: {
        dataObjectApiName: 'object_50HJ8__c',
        search_query_info: {
          limit: 100,
          offset: 0,
          filters: []  // 不過濾，查詢所有記錄包括作廢
        }
      }
    });
    
    const dataList = queryResp.data.data?.dataList || [];
    console.log(`總共查詢到 ${dataList.length} 條記錄`);
    
    if (dataList.length > 0) {
      // 檢查第一條記錄的所有欄位
      console.log('\n第一條記錄的完整欄位結構:');
      const firstRecord = dataList[0];
      const fields = Object.keys(firstRecord).sort();
      console.log(`欄位數量: ${fields.length}`);
      console.log('\n欄位列表:');
      fields.forEach(field => {
        const value = firstRecord[field];
        const valueType = Array.isArray(value) ? 'array' : typeof value;
        console.log(`  ${field}: ${valueType}`);
      });
      
      console.log('\n所有記錄摘要:');
      dataList.forEach((record, index) => {
        console.log(`\n記錄 ${index + 1}:`);
        console.log(`  _id: ${record._id}`);
        console.log(`  name: ${record.name}`);
        console.log(`  life_status: ${record.life_status}`);
        console.log(`  created_time: ${record.created_time}`);
        console.log(`  last_modified_time: ${record.last_modified_time}`);
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
      console.log('\n確認：CRM 中工地師父已完全清空（0條記錄）');
    }
    
  } catch (error) {
    console.error('錯誤:', error.response?.data || error.message);
  }
}

checkLatestWorkers();