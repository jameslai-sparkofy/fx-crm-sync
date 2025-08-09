#!/usr/bin/env node
/**
 * 測試欄位同步API
 */

const axios = require('axios');

const WORKER_URL = 'https://fx-crm-sync.lai-jameslai.workers.dev';

async function testFieldSyncAPI() {
  console.log('='.repeat(60));
  console.log('測試欄位同步API');
  console.log('='.repeat(60));

  try {
    // 1. 測試單一對象欄位同步
    console.log('\n1. 測試案場(SPC)欄位同步...');
    const spcResponse = await axios.post(`${WORKER_URL}/api/field-sync/object_8W9cb__c`);
    
    if (spcResponse.data.success) {
      console.log('✅ 案場欄位同步成功');
      console.log(`  - CRM欄位: ${spcResponse.data.data.comparison.crmFields}`);
      console.log(`  - D1欄位: ${spcResponse.data.data.comparison.d1Fields}`);
      console.log(`  - 新增欄位: ${spcResponse.data.data.comparison.fieldsToAdd}`);
      console.log(`  - 變更數: ${spcResponse.data.data.changes.length}`);
    } else {
      console.error('❌ 案場欄位同步失敗:', spcResponse.data.error);
    }

    // 2. 測試獲取欄位定義
    console.log('\n2. 測試獲取案場欄位定義...');
    const fieldsResponse = await axios.get(`${WORKER_URL}/api/field-sync/object_8W9cb__c/fields`);
    
    if (fieldsResponse.data.success) {
      console.log('✅ 獲取欄位定義成功');
      console.log(`  - 欄位數量: ${fieldsResponse.data.data.fieldCount}`);
      console.log(`  - 數據來源: ${fieldsResponse.data.data.source}`);
    } else {
      console.error('❌ 獲取欄位定義失敗:', fieldsResponse.data.error);
    }

    // 3. 測試所有對象欄位同步
    console.log('\n3. 測試所有對象欄位同步...');
    const allResponse = await axios.post(`${WORKER_URL}/api/field-sync/all`);
    
    if (allResponse.data.success) {
      console.log('✅ 所有對象欄位同步成功');
      const summary = allResponse.data.data.summary;
      console.log(`  - 總對象數: ${summary.total}`);
      console.log(`  - 成功: ${summary.success}`);
      console.log(`  - 失敗: ${summary.failed}`);
      console.log(`  - 總變更: ${summary.totalChanges}`);
    } else {
      console.error('❌ 所有對象欄位同步失敗:', allResponse.data.error);
    }

  } catch (error) {
    console.error('❌ API測試失敗:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('測試完成');
  console.log('='.repeat(60));
}

// 執行測試
testFieldSyncAPI();