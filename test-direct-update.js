#!/usr/bin/env node

/**
 * 直接測試 CRM 更新 API
 * 排除 Worker 層級的問題
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

async function testUpdate(corpId, token, userId) {
  console.log('\n========== 測試更新 API ==========\n');
  
  // 測試不同的請求格式
  const testCases = [
    {
      name: '格式1: 標準格式 (data內嵌)',
      body: {
        corpId: corpId,
        corpAccessToken: token,
        currentOpenUserId: userId,
        data: {
          dataObjectApiName: "object_50HJ8__c",
          data: {
            _id: "689dfa99060d650001d50fda",  // 大蜜桃的ID
            name: "直接API測試更新"
          }
        }
      }
    },
    {
      name: '格式2: 無認證包裝',
      body: {
        data: {
          dataObjectApiName: "object_50HJ8__c",
          data: {
            _id: "689dfa99060d650001d50fda",
            name: "直接API測試更新2"
          }
        }
      }
    },
    {
      name: '格式3: objectDataId格式',
      body: {
        corpId: corpId,
        corpAccessToken: token,
        currentOpenUserId: userId,
        data: {
          dataObjectApiName: "object_50HJ8__c",
          objectDataId: "689dfa99060d650001d50fda",
          data: {
            name: "直接API測試更新3"
          }
        }
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n測試: ${testCase.name}`);
    console.log('請求體:', JSON.stringify(testCase.body, null, 2));
    
    try {
      const response = await fetch(`${baseUrl}/cgi/crm/custom/v2/data/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testCase.body)
      });

      const data = await response.json();
      
      if (data.errorCode === 0) {
        console.log('✅ 更新成功！');
      } else {
        console.log('❌ 更新失敗:', data.errorMessage);
      }
      
      console.log('完整響應:', JSON.stringify(data, null, 2));
      
    } catch (error) {
      console.error('❌ 請求錯誤:', error.message);
    }
    
    // 等待一下避免太快
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

async function main() {
  try {
    const { token, corpId } = await getAccessToken();
    const userId = await getUserId(corpId, token);
    await testUpdate(corpId, token, userId);
  } catch (error) {
    console.error('錯誤:', error);
  }
}

main();