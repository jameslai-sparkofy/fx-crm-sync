#!/usr/bin/env node

/**
 * 測試官方文檔的正確格式
 * 使用 object_data 包裝
 */

const fetch = require('node-fetch');

const baseUrl = 'https://open.fxiaoke.com';
const credentials = {
  appId: 'FSAID_1320691',
  appSecret: 'ec63ff237c5c4a759be36d3a8fb7a3b4',
  permanentCode: '899433A4A04A3B8CB1CC2183DA4B5B48'
};

async function getAccessToken() {
  console.log('獲取 Access Token...');
  const response = await fetch(`${baseUrl}/cgi/corpAccessToken/get/V2`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });

  const data = await response.json();
  if (data.errorCode !== 0) {
    throw new Error(`獲取token失敗: ${data.errorMessage}`);
  }

  console.log('✅ Token 獲取成功');
  return {
    token: data.corpAccessToken,
    corpId: data.corpId
  };
}

async function getUserId(corpId, token) {
  console.log('獲取用戶 ID...');
  const response = await fetch(`${baseUrl}/cgi/user/getByMobile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      corpId: corpId,
      corpAccessToken: token,
      mobile: "17675662629"
    })
  });

  const data = await response.json();
  if (data.errorCode !== 0) {
    throw new Error(`獲取用戶失敗: ${data.errorMessage}`);
  }

  const userId = data.empList[0].openUserId;
  console.log('✅ 用戶 ID:', userId);
  return userId;
}

async function testUpdateWithObjectData(corpId, token, userId) {
  console.log('\n========== 測試官方文檔格式（object_data） ==========\n');
  
  const requestBody = {
    corpAccessToken: token,
    corpId: corpId,
    currentOpenUserId: userId,
    data: {
      object_data: {  // 關鍵：使用 object_data 而不是 data
        _id: "689dfa99060d650001d50fda",  // 大蜜桃的ID
        dataObjectApiName: "object_50HJ8__c",
        name: "官方格式測試成功！"
      }
    }
  };

  console.log('請求體:', JSON.stringify(requestBody, null, 2));
  
  try {
    const response = await fetch(`${baseUrl}/cgi/crm/custom/v2/data/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    
    if (data.errorCode === 0) {
      console.log('✅ 更新成功！！！');
    } else {
      console.log('❌ 更新失敗:', data.errorMessage);
    }
    
    console.log('完整響應:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('❌ 請求錯誤:', error.message);
  }
}

async function main() {
  try {
    const { token, corpId } = await getAccessToken();
    const userId = await getUserId(corpId, token);
    await testUpdateWithObjectData(corpId, token, userId);
  } catch (error) {
    console.error('錯誤:', error);
  }
}

main();