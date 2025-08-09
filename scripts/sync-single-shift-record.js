#!/usr/bin/env node
/**
 * 同步單筆有 shift_time 的記錄到 D1
 */

require('dotenv').config();
const axios = require('axios');

const baseUrl = 'https://open.fxiaoke.com';
const credentials = {
  appId: process.env.FX_APP_ID || 'FSAID_1320691',
  appSecret: process.env.FX_APP_SECRET || 'ec63ff237c5c4a759be36d3a8fb7a3b4',
  permanentCode: process.env.FX_PERMANENT_CODE || '899433A4A04A3B8CB1CC2183DA4B5B48'
};

const WORKER_URL = 'https://fx-crm-sync.lai-jameslai.workers.dev';

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

async function syncSingleRecord() {
  console.log('='.repeat(80));
  console.log('同步單筆有 shift_time 的記錄');
  console.log('='.repeat(80));

  try {
    // 1. 獲取 CRM 認證
    console.log('\n1. 獲取 CRM 認證...');
    const { corpId, corpAccessToken } = await getAccessToken();
    const currentOpenUserId = await getCurrentUserId(corpId, corpAccessToken);
    console.log('✅ CRM 認證成功');

    // 2. 獲取記錄 25-07-14-3556 (確定有 shift_time)
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
      console.log('❌ 找不到記錄');
      return;
    }

    const site = sites[0];
    console.log('✅ 找到記錄:');
    console.log(`  _id: ${site._id}`);
    console.log(`  name: ${site.name}`);
    console.log(`  shift_time__c: ${site.shift_time__c}`);
    console.log(`  shift_time__c__v: ${site.shift_time__c__v}`);

    // 3. 使用動態處理器的邏輯準備 SQL
    console.log('\n3. 準備 SQL 語句...');
    const DynamicFieldHandler = require('../workers/src/sync/dynamic-field-handler');
    const handler = new DynamicFieldHandler();
    
    // 提取欄位（排除 shift_time__c__v）
    const fields = handler.extractFieldsFromData([site]);
    
    // 添加 D1 特有的欄位
    if (!fields.includes('shift_time__c__r')) {
      fields.push('shift_time__c__r');
    }
    if (!fields.includes('shift_time__c__relation_ids')) {
      fields.push('shift_time__c__relation_ids');
    }
    
    // 生成 SQL
    const sql = handler.generateInsertSQL('object_8w9cb__c', fields);
    
    // 準備值
    const values = [];
    fields.forEach(field => {
      const value = handler.processFieldValue(field, site[field], site);
      values.push(value);
      
      // 顯示 shift_time 相關的值
      if (field.includes('shift')) {
        console.log(`  ${field}: ${value}`);
      }
    });
    
    // 添加時間戳
    values.push(site.create_time || new Date().toISOString());
    values.push(site.last_modified_time || new Date().toISOString());
    values.push(0); // sync_version

    // 4. 執行 SQL
    console.log('\n4. 執行 SQL 插入/更新...');
    const fs = require('fs');
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    // 構建參數化的 SQL
    let paramSQL = sql;
    values.forEach((value, index) => {
      const placeholder = `?${index + 1}`;
      // 轉義單引號
      const safeValue = value !== null ? String(value).replace(/'/g, "''") : 'NULL';
      paramSQL = paramSQL.replace(placeholder, value !== null ? `'${safeValue}'` : 'NULL');
    });
    
    // 寫入 SQL 檔案
    const sqlFile = '../workers/sql/sync-single-record.sql';
    fs.writeFileSync(sqlFile, paramSQL);
    
    console.log('  SQL 檔案已創建: sync-single-record.sql');
    console.log('  執行 SQL...');
    
    const command = `cd ../workers && npx wrangler d1 execute fx-crm-database --file=sql/sync-single-record.sql --remote 2>&1`;
    
    try {
      const { stdout, stderr } = await execPromise(command);
      
      console.log('\n執行結果:');
      if (stdout) {
        console.log('標準輸出:', stdout);
      }
      if (stderr) {
        console.log('錯誤輸出:', stderr);
      }
    } catch (error) {
      console.log('\n❌ SQL 執行失敗:');
      console.log('錯誤訊息:', error.message);
      if (error.stdout) {
        console.log('標準輸出:', error.stdout);
      }
      if (error.stderr) {
        console.log('錯誤輸出:', error.stderr);
      }
    }
    
    // 清理 SQL 檔案
    // fs.unlinkSync(sqlFile);

    // 5. 驗證結果
    console.log('\n5. 驗證結果...');
    const verifySQL = `SELECT _id, name, shift_time__c FROM object_8w9cb__c WHERE _id = '${site._id}'`;
    fs.writeFileSync('../workers/sql/verify-single.sql', verifySQL);
    
    const verifyCommand = `cd ../workers && npx wrangler d1 execute fx-crm-database --file=sql/verify-single.sql --remote 2>&1`;
    
    try {
      const { stdout } = await execPromise(verifyCommand);
      console.log('查詢結果:', stdout);
    } catch (error) {
      console.log('查詢失敗:', error.message);
    }
    
    // fs.unlinkSync('../workers/sql/verify-single.sql');

  } catch (error) {
    console.error('❌ 同步失敗:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    console.error('完整錯誤:', error);
  }

  console.log('\n' + '='.repeat(80));
  console.log('測試完成');
  console.log('='.repeat(80));
}

// 執行同步
syncSingleRecord();