const fetch = require('node-fetch');

const baseUrl = 'https://open.fxiaoke.com';
const credentials = {
  appId: 'FSAID_1320691',
  appSecret: 'ec63ff237c5c4a759be36d3a8fb7a3b4',
  permanentCode: '899433A4A04A3B8CB1CC2183DA4B5B48'
};

async function checkCRMCount() {
  try {
    // 1. 獲取 Access Token
    console.log('獲取 Access Token...');
    const tokenResponse = await fetch(`${baseUrl}/cgi/corpAccessToken/get/V2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    
    const tokenData = await tokenResponse.json();
    if (tokenData.errorCode !== 0) {
      throw new Error(`獲取 Token 失敗: ${tokenData.errorMessage}`);
    }
    
    const corpId = tokenData.corpId;
    const accessToken = tokenData.corpAccessToken;
    
    // 2. 獲取用戶 ID
    console.log('獲取用戶 ID...');
    const userResponse = await fetch(`${baseUrl}/cgi/user/getByMobile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        corpId: corpId,
        corpAccessToken: accessToken,
        mobile: "17675662629"
      })
    });
    
    const userData = await userResponse.json();
    // console.log('用戶數據:', JSON.stringify(userData, null, 2));
    if (userData.errorCode !== 0) {
      throw new Error(`獲取用戶 ID 失敗: ${userData.errorMessage}`);
    }
    
    const currentOpenUserId = userData.empList?.[0]?.openUserId;
    console.log(`用戶 ID: ${currentOpenUserId}`);
    
    // 3. 查詢案場數據（只獲取計數）
    console.log('查詢案場數據...');
    const queryResponse = await fetch(`${baseUrl}/cgi/crm/custom/v2/data/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        corpId: corpId,
        corpAccessToken: accessToken,
        currentOpenUserId: currentOpenUserId,
        data: {
          dataObjectApiName: 'object_8W9cb__c',
          search_query_info: {
            offset: 0,
            limit: 1,
            filters: [
              {
                field_name: 'life_status',
                operator: 'NEQ',
                field_values: ['作废']
              }
            ]
          }
        }
      })
    });
    
    const queryData = await queryResponse.json();
    if (queryData.errorCode !== 0) {
      throw new Error(`查詢數據失敗: ${queryData.errorMessage}`);
    }
    
    console.log('\n===== CRM 案場數據統計 =====');
    console.log(`總記錄數（不含作廢）: ${queryData.data?.total || 0}`);
    
    // 4. 查詢包含作廢的總數
    console.log('\n查詢包含作廢的總數...');
    const allResponse = await fetch(`${baseUrl}/cgi/crm/custom/v2/data/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        corpId: corpId,
        corpAccessToken: accessToken,
        currentOpenUserId: currentOpenUserId,
        data: {
          dataObjectApiName: 'object_8W9cb__c',
          search_query_info: {
            offset: 0,
            limit: 1,
            filters: []
          }
        }
      })
    });
    
    const allData = await allResponse.json();
    console.log(`總記錄數（含作廢）: ${allData.data?.total || 0}`);
    console.log(`作廢記錄數: ${(allData.data?.total || 0) - (queryData.data?.total || 0)}`);
    
    // 5. 獲取最近修改的記錄
    console.log('\n查詢最近修改的5條記錄...');
    const recentResponse = await fetch(`${baseUrl}/cgi/crm/custom/v2/data/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        corpId: corpId,
        corpAccessToken: accessToken,
        currentOpenUserId: currentOpenUserId,
        data: {
          dataObjectApiName: 'object_8W9cb__c',
          search_query_info: {
            offset: 0,
            limit: 5,
            filters: [],
            orders: [{ fieldName: 'last_modified_time', isAsc: false }]
          }
        }
      })
    });
    
    const recentData = await recentResponse.json();
    if (recentData.data?.dataList) {
      console.log('\n最近修改的記錄:');
      recentData.data.dataList.forEach(item => {
        const modTime = new Date(item.last_modified_time);
        console.log(`- ${item.name} | 狀態: ${item.life_status} | 修改時間: ${modTime.toLocaleString('zh-TW')}`);
      });
    }
    
  } catch (error) {
    console.error('錯誤:', error.message);
  }
}

checkCRMCount();