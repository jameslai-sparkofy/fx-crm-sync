#!/usr/bin/env node

/**
 * 最終測試 - 確認更新功能完全正常
 */

const fetch = require('node-fetch');

const baseUrl = 'https://open.fxiaoke.com';
const credentials = {
  appId: 'FSAID_1320691',
  appSecret: 'ec63ff237c5c4a759be36d3a8fb7a3b4',
  permanentCode: '899433A4A04A3B8CB1CC2183DA4B5B48'
};

async function getAccessToken() {
  const response = await fetch(`${baseUrl}/cgi/corpAccessToken/get/V2`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });

  const data = await response.json();
  if (data.errorCode !== 0) {
    throw new Error(`獲取token失敗: ${data.errorMessage}`);
  }

  return {
    token: data.corpAccessToken,
    corpId: data.corpId
  };
}

async function getUserId(corpId, token) {
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

  return data.empList[0].openUserId;
}

async function testUpdate(corpId, token, userId) {
  // 測試更新兩個記錄
  const testRecords = [
    {
      id: "689dfa99060d650001d50fda",
      name: "大蜜桃",
      newName: "更新成功-大蜜桃-" + new Date().toLocaleTimeString('zh-TW')
    },
    {
      id: "689ddc0eb6bc8800010f053f",
      name: "測試師父2025",
      newName: "更新成功-測試師父-" + new Date().toLocaleTimeString('zh-TW')
    }
  ];

  for (const record of testRecords) {
    console.log(`\n測試更新: ${record.name} (ID: ${record.id})`);
    
    const requestBody = {
      corpAccessToken: token,
      corpId: corpId,
      currentOpenUserId: userId,
      data: {
        object_data: {
          _id: record.id,
          dataObjectApiName: "object_50HJ8__c",
          name: record.newName
        }
      }
    };

    try {
      const response = await fetch(`${baseUrl}/cgi/crm/custom/v2/data/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      
      if (data.errorCode === 0) {
        console.log(`✅ 更新成功！新名稱: ${record.newName}`);
      } else {
        console.log(`❌ 更新失敗: ${data.errorMessage}`);
      }
      
    } catch (error) {
      console.error(`❌ 請求錯誤: ${error.message}`);
    }
  }
}

async function main() {
  try {
    console.log('========== 最終測試更新功能 ==========\n');
    const { token, corpId } = await getAccessToken();
    const userId = await getUserId(corpId, token);
    await testUpdate(corpId, token, userId);
    console.log('\n========== 測試完成 ==========');
  } catch (error) {
    console.error('錯誤:', error);
  }
}

main();