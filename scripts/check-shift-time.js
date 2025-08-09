const axios = require('axios');

async function checkShiftTimeInCRM() {
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
    
    // Query ALL records to check shift_time
    console.log('查詢所有記錄檢查 shift_time...');
    const queryResp = await axios.post(`${baseUrl}/cgi/crm/custom/v2/data/query`, {
      corpId,
      corpAccessToken: accessToken,
      currentOpenUserId: userId,
      data: {
        dataObjectApiName: 'object_8W9cb__c',
        search_query_info: {
          limit: 5000,  // 增加到 5000 以獲取所有記錄
          offset: 0,
          filters: []  // 不過濾，查詢所有記錄
        }
      }
    });
    
    const dataList = queryResp.data.data?.dataList || [];
    console.log(`\n總共查詢到 ${dataList.length} 條記錄`);
    
    // 過濾有 shift_time 的記錄
    const withShiftTime = dataList.filter(r => r.shift_time__c);
    console.log(`其中有 shift_time__c 的: ${withShiftTime.length} 條`);
    
    // 統計 shift_time__c__v 的情況
    let withV = 0;
    let withoutV = 0;
    const shiftTimeValues = new Set();
    
    withShiftTime.forEach(record => {
      if (record.shift_time__c__v) {
        withV++;
      } else {
        withoutV++;
      }
      shiftTimeValues.add(record.shift_time__c);
    });
    
    console.log(`- 有 shift_time__c__v: ${withV} 條`);
    console.log(`- 沒有 shift_time__c__v: ${withoutV} 條`);
    console.log(`\n不同的 shift_time 值 (${shiftTimeValues.size} 個):`);
    
    Array.from(shiftTimeValues).slice(0, 10).forEach(value => {
      console.log(`  - ${value}`);
    });
    
    // 顯示幾個範例
    console.log('\n前 3 條有 shift_time 的記錄範例:');
    withShiftTime.slice(0, 3).forEach((record, index) => {
      console.log(`\n記錄 ${index + 1}:`);
      console.log(`  _id: ${record._id}`);
      console.log(`  name: ${record.name}`);
      console.log(`  shift_time__c: ${record.shift_time__c}`);
      console.log(`  shift_time__c__v: ${record.shift_time__c__v}`);
    });
    
  } catch (error) {
    console.error('錯誤:', error.response?.data || error.message);
  }
}

checkShiftTimeInCRM();