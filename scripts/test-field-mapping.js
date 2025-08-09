#!/usr/bin/env node

/**
 * 測試從 API 獲取欄位對應關係
 */

const fetch = require('node-fetch');

const API_BASE_URL = 'https://open.fxiaoke.com';
const APP_ID = 'FSAID_1320691';
const APP_SECRET = 'ec63ff237c5c4a759be36d3a8fb7a3b4';
const PERMANENT_CODE = '899433A4A04A3B8CB1CC2183DA4B5B48';

async function testFieldMapping() {
  try {
    // 1. 獲取認證
    console.log('🔐 獲取認證信息...');
    const tokenResponse = await fetch(`${API_BASE_URL}/cgi/corpAccessToken/get/V2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appId: APP_ID,
        appSecret: APP_SECRET,
        permanentCode: PERMANENT_CODE
      })
    });

    const tokenData = await tokenResponse.json();
    const corpAccessToken = tokenData.corpAccessToken;
    const corpId = tokenData.corpId;

    const userResponse = await fetch(`${API_BASE_URL}/cgi/user/getByMobile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        corpId: corpId,
        corpAccessToken: corpAccessToken,
        mobile: "17675662629"
      })
    });

    const userData = await userResponse.json();
    const currentOpenUserId = userData.empList?.[0]?.openUserId;
    console.log('✅ 認證成功\n');

    // 2. 測試獲取案場(SPC)的欄位
    console.log('📋 嘗試獲取案場(SPC) object_8W9cb__c 的欄位描述...');
    
    // 方法1: 使用 describe API
    try {
      const describeResponse = await fetch(`${API_BASE_URL}/cgi/crm/custom/v2/object/describe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          corpId: corpId,
          corpAccessToken: corpAccessToken,
          currentOpenUserId: currentOpenUserId,
          apiName: 'object_8W9cb__c'
        })
      });

      const describeData = await describeResponse.json();
      
      if (describeData.errorCode === 0 && describeData.data) {
        console.log('✅ 成功獲取對象描述！');
        console.log('對象名稱:', describeData.data.label);
        console.log('API 名稱:', describeData.data.apiName);
        
        if (describeData.data.fields && describeData.data.fields.length > 0) {
          console.log(`\n找到 ${describeData.data.fields.length} 個欄位:\n`);
          
          // 顯示前10個欄位
          describeData.data.fields.slice(0, 10).forEach(field => {
            console.log(`欄位: ${field.label || field.apiName}`);
            console.log(`  - API名稱: ${field.apiName}`);
            console.log(`  - 類型: ${field.dataType}`);
            console.log(`  - 必填: ${field.required ? '是' : '否'}`);
            if (field.description) {
              console.log(`  - 描述: ${field.description}`);
            }
            console.log('');
          });
        }
      } else {
        console.log('❌ describe API 失敗:', describeData.errorMessage);
      }
    } catch (error) {
      console.log('❌ describe API 錯誤:', error.message);
    }

    // 3. 測試獲取案場(浴櫃)的欄位
    console.log('\n📋 嘗試獲取案場(浴櫃) site_cabinet__c 的欄位描述...');
    
    try {
      const describeResponse = await fetch(`${API_BASE_URL}/cgi/crm/custom/v2/object/describe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          corpId: corpId,
          corpAccessToken: corpAccessToken,
          currentOpenUserId: currentOpenUserId,
          apiName: 'site_cabinet__c'
        })
      });

      const describeData = await describeResponse.json();
      
      if (describeData.errorCode === 0 && describeData.data) {
        console.log('✅ 成功獲取對象描述！');
        console.log('對象名稱:', describeData.data.label);
        console.log('API 名稱:', describeData.data.apiName);
        
        if (describeData.data.fields && describeData.data.fields.length > 0) {
          console.log(`\n找到 ${describeData.data.fields.length} 個欄位:\n`);
          
          // 顯示前10個欄位
          describeData.data.fields.slice(0, 10).forEach(field => {
            console.log(`欄位: ${field.label || field.apiName}`);
            console.log(`  - API名稱: ${field.apiName}`);
            console.log(`  - 類型: ${field.dataType}`);
            console.log(`  - 必填: ${field.required ? '是' : '否'}`);
            if (field.description) {
              console.log(`  - 描述: ${field.description}`);
            }
            console.log('');
          });
        }
      } else {
        console.log('❌ describe API 失敗:', describeData.errorMessage);
      }
    } catch (error) {
      console.log('❌ describe API 錯誤:', error.message);
    }

    // 4. 嘗試列出所有自定義對象
    console.log('\n📋 嘗試列出所有自定義對象...');
    
    try {
      const listResponse = await fetch(`${API_BASE_URL}/cgi/crm/custom/v2/object/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          corpId: corpId,
          corpAccessToken: corpAccessToken,
          currentOpenUserId: currentOpenUserId,
          data: {
            pageSize: 100,
            pageNumber: 1
          }
        })
      });

      const listData = await listResponse.json();
      
      if (listData.errorCode === 0 && listData.data) {
        console.log(`✅ 找到 ${listData.data.total || 0} 個自定義對象:\n`);
        
        if (listData.data.objects && listData.data.objects.length > 0) {
          listData.data.objects.forEach(obj => {
            console.log(`- ${obj.label} (${obj.apiName})`);
          });
        }
      } else {
        console.log('❌ 列出對象失敗:', listData.errorMessage);
      }
    } catch (error) {
      console.log('❌ 列出對象錯誤:', error.message);
    }

  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    console.error(error.stack);
  }
}

testFieldMapping();