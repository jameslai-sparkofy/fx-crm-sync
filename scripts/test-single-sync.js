const axios = require('axios');

async function testSingleRecordSync() {
  const baseUrl = 'https://open.fxiaoke.com';
  
  try {
    // Step 1: Get token
    console.log('1. 獲取 Access Token...');
    const tokenResp = await axios.post(`${baseUrl}/cgi/corpAccessToken/get/V2`, {
      appId: 'FSAID_1320691',
      appSecret: 'ec63ff237c5c4a759be36d3a8fb7a3b4',
      permanentCode: '899433A4A04A3B8CB1CC2183DA4B5B48'
    });
    
    const accessToken = tokenResp.data.corpAccessToken;
    const corpId = tokenResp.data.corpId;
    console.log('   Token 獲取成功');
    
    // Step 2: Get user ID
    console.log('2. 獲取用戶 ID...');
    const userResp = await axios.post(`${baseUrl}/cgi/user/getByMobile`, {
      corpId,
      corpAccessToken: accessToken,
      mobile: '17675662629'
    });
    
    const userId = userResp.data.empList[0].openUserId;
    console.log('   用戶 ID:', userId);
    
    // Step 3: Get one record with shift_time
    console.log('3. 查詢有 shift_time 的記錄...');
    const queryResp = await axios.post(`${baseUrl}/cgi/crm/custom/v2/data/query`, {
      corpId,
      corpAccessToken: accessToken,
      currentOpenUserId: userId,
      data: {
        dataObjectApiName: 'object_8W9cb__c',
        search_query_info: {
          limit: 1,
          offset: 0,
          filters: [
            {
              field_name: 'shift_time__c',
              operator: 'IS_NOT_NULL',
              field_values: []
            }
          ]
        }
      }
    });
    
    if (queryResp.data.data?.dataList?.length > 0) {
      const record = queryResp.data.data.dataList[0];
      
      console.log('\n=== CRM 記錄找到 ===');
      console.log('ID:', record._id);
      console.log('Name:', record.name);
      console.log('shift_time__c:', record.shift_time__c);
      console.log('shift_time__c__v:', record.shift_time__c__v);
      
      // Step 4: 嘗試同步到 Worker
      console.log('\n4. 測試同步單條記錄到 Worker...');
      const syncResp = await axios.post('https://fx-crm-sync.lai-jameslai.workers.dev/api/debug/sync-single', {
        record: record,
        tableName: 'object_8w9cb__c'
      });
      
      console.log('同步結果:', syncResp.data);
      
    } else {
      console.log('沒有找到有 shift_time 的記錄');
      
      // 查詢任意一條記錄
      console.log('\n3b. 查詢任意記錄...');
      const anyResp = await axios.post(`${baseUrl}/cgi/crm/custom/v2/data/query`, {
        corpId,
        corpAccessToken: accessToken,
        currentOpenUserId: userId,
        data: {
          dataObjectApiName: 'object_8W9cb__c',
          search_query_info: {
            limit: 1,
            offset: 0,
            filters: []
          }
        }
      });
      
      if (anyResp.data.data?.dataList?.length > 0) {
        const record = anyResp.data.data.dataList[0];
        console.log('\n=== 找到記錄 ===');
        console.log('ID:', record._id);
        console.log('Name:', record.name);
        console.log('欄位數量:', Object.keys(record).length);
        
        // 列出所有欄位
        console.log('\n所有欄位:');
        Object.keys(record).forEach(key => {
          const value = record[key];
          if (value === null || value === undefined || value === '') {
            // 跳過空值
          } else if (typeof value === 'object') {
            console.log(`  ${key}: [Object]`);
          } else {
            console.log(`  ${key}: ${value}`);
          }
        });
      }
    }
    
  } catch (error) {
    console.error('錯誤:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('詳細錯誤:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testSingleRecordSync();