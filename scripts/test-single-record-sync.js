#!/usr/bin/env node
/**
 * 測試單條記錄的同步
 */

require('dotenv').config();
const axios = require('axios');

const baseUrl = 'https://open.fxiaoke.com';
const credentials = {
  appId: process.env.FX_APP_ID || 'FSAID_1320691',
  appSecret: process.env.FX_APP_SECRET || 'ec63ff237c5c4a759be36d3a8fb7a3b4',
  permanentCode: process.env.FX_PERMANENT_CODE || '899433A4A04A3B8CB1CC2183DA4B5B48'
};

async function getAccessToken() {
  const response = await axios.post(`${baseUrl}/cgi/corpAccessToken/get/V2`, credentials);
  if (response.data.errorCode !== 0) {
    throw new Error(`獲取 token 失敗: ${response.data.errorMessage}`);
  }
  return {
    corpId: response.data.corpId,
    corpAccessToken: response.data.corpAccessToken
  };
}

async function getCurrentUserId(corpId, accessToken) {
  const response = await axios.post(`${baseUrl}/cgi/user/getByMobile`, {
    corpId,
    corpAccessToken: accessToken,
    mobile: "17675662629"
  });
  if (response.data.errorCode !== 0) {
    throw new Error(`獲取用戶 ID 失敗: ${response.data.errorMessage}`);
  }
  return response.data.empList[0].openUserId;
}

async function testSingleRecordSync() {
  console.log('='.repeat(80));
  console.log('測試單條記錄同步 (25-07-14-3556)');
  console.log('='.repeat(80));

  try {
    // 1. 獲取 CRM 認證
    console.log('\n1. 獲取 CRM 認證...');
    const { corpId, corpAccessToken } = await getAccessToken();
    const currentOpenUserId = await getCurrentUserId(corpId, corpAccessToken);
    console.log('✅ CRM 認證成功');

    // 2. 獲取特定記錄
    console.log('\n2. 從 CRM 獲取記錄 25-07-14-3556...');
    const response = await axios.post(`${baseUrl}/cgi/crm/custom/v2/data/query`, {
      corpId,
      corpAccessToken,
      currentOpenUserId,
      data: {
        dataObjectApiName: 'object_8W9cb__c',
        search_query_info: {
          limit: 1,
          offset: 0,
          filters: [
            {
              field_name: 'name',
              operator: 'EQ',
              field_values: ['25-07-14-3556']
            }
          ]
        }
      }
    });

    if (response.data.errorCode !== 0) {
      throw new Error(`查詢失敗: ${response.data.errorMessage}`);
    }

    const sites = response.data.data.dataList || [];
    if (sites.length === 0) {
      console.log('❌ 找不到記錄 25-07-14-3556');
      return;
    }

    const site = sites[0];
    console.log('✅ 找到記錄:');
    console.log(`  _id: ${site._id}`);
    console.log(`  name: ${site.name}`);
    console.log(`  shift_time__c: ${site.shift_time__c}`);
    console.log(`  shift_time__c__v: ${site.shift_time__c__v}`);

    // 3. 檢查動態處理器會如何處理
    console.log('\n3. 模擬動態處理器的處理...');
    
    // 模擬 shift_time_json 處理
    const shiftTimeJson = site.shift_time__c ? 
      JSON.stringify({
        name: site.shift_time__c,
        id: site.shift_time__c__v || null
      }) : null;
    
    console.log('  處理後的欄位值:');
    console.log(`    shift_time__c: ${site.shift_time__c}`);
    console.log(`    shift_time__c__r: ${shiftTimeJson}`);
    console.log(`    shift_time__c__relation_ids: ${site.shift_time__c__v || null}`);

    // 4. 手動執行 SQL 更新
    console.log('\n4. 手動執行 SQL 更新...');
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    const updateSQL = `
      UPDATE object_8W9cb__c 
      SET 
        shift_time__c = '${site.shift_time__c}',
        shift_time__c__r = '${shiftTimeJson.replace(/'/g, "''")}',
        shift_time__c__relation_ids = '${site.shift_time__c__v}'
      WHERE _id = '${site._id}'
    `.trim();
    
    console.log('  SQL 語句:');
    console.log('  ' + updateSQL);
    
    // 寫入 SQL 檔案
    const fs = require('fs');
    const sqlFile = '../workers/sql/test-single-update.sql';
    fs.writeFileSync(sqlFile, updateSQL);
    
    // 執行 SQL
    const command = `cd ../workers && npx wrangler d1 execute fx-crm-database --file=sql/test-single-update.sql --remote`;
    const { stdout, stderr } = await execPromise(command);
    
    if (stdout) {
      console.log('\n  執行結果:');
      console.log(stdout);
    }
    
    if (stderr) {
      console.log('\n  錯誤:');
      console.log(stderr);
    }
    
    // 清理 SQL 檔案
    fs.unlinkSync(sqlFile);

    // 5. 驗證更新結果
    console.log('\n5. 驗證更新結果...');
    const verifyCommand = `cd ../workers && npx wrangler d1 execute fx-crm-database --remote --command="SELECT _id, name, shift_time__c, shift_time__c__r, shift_time__c__relation_ids FROM object_8W9cb__c WHERE _id = '${site._id}'"`;
    const { stdout: verifyOut } = await execPromise(verifyCommand);
    
    if (verifyOut) {
      console.log('  查詢結果:');
      console.log(verifyOut);
    }

  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('測試完成');
  console.log('='.repeat(80));
}

// 執行測試
testSingleRecordSync();