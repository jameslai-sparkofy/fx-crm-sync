#!/usr/bin/env node
/**
 * 使用 API 直接檢查 shift_time 欄位
 */

const axios = require('axios');

const WORKER_URL = 'https://fx-crm-sync.lai-jameslai.workers.dev';

async function checkShiftTimeViaAPI() {
  console.log('='.repeat(80));
  console.log('透過 API 檢查 shift_time 欄位狀態');
  console.log('='.repeat(80));

  try {
    // 1. 檢查資料庫統計
    console.log('\n1. 獲取資料庫統計...');
    const statsResponse = await axios.get(`${WORKER_URL}/api/sync/database-stats`);
    
    if (statsResponse.data.success) {
      const tables = statsResponse.data.data.tables;
      const object8W9cb = tables.find(t => t.table_name === 'object_8W9cb__c');
      console.log(`  案場表記錄數: ${object8W9cb ? object8W9cb.count : '未找到'}`);
    }

    // 2. 獲取幾條案場記錄來檢查
    console.log('\n2. 透過 CRUD API 獲取案場記錄...');
    const crudResponse = await axios.post(`${WORKER_URL}/api/crud/query`, {
      table: 'object_8W9cb__c',
      columns: ['_id', 'name', 'shift_time__c', 'shift_time__c__r', 'shift_time__c__relation_ids'],
      limit: 10,
      orderBy: 'last_modified_time DESC'
    });

    if (crudResponse.data.success) {
      const records = crudResponse.data.data.results;
      console.log(`  獲取到 ${records.length} 條記錄`);
      
      // 分析 shift_time 欄位
      let hasShiftTime = 0;
      let hasShiftTimeR = 0;
      let hasShiftTimeIds = 0;
      
      records.forEach((record, index) => {
        console.log(`\n  記錄 ${index + 1}: ${record.name}`);
        console.log(`    shift_time__c: ${record.shift_time__c || 'null'}`);
        console.log(`    shift_time__c__r: ${record.shift_time__c__r || 'null'}`);
        console.log(`    shift_time__c__relation_ids: ${record.shift_time__c__relation_ids || 'null'}`);
        
        if (record.shift_time__c) hasShiftTime++;
        if (record.shift_time__c__r) hasShiftTimeR++;
        if (record.shift_time__c__relation_ids) hasShiftTimeIds++;
      });
      
      console.log('\n  統計:');
      console.log(`    有 shift_time__c: ${hasShiftTime}/${records.length}`);
      console.log(`    有 shift_time__c__r: ${hasShiftTimeR}/${records.length}`);
      console.log(`    有 shift_time__c__relation_ids: ${hasShiftTimeIds}/${records.length}`);
    } else {
      console.log('  ❌ CRUD API 失敗:', crudResponse.data.error);
    }

    // 3. 嘗試查詢特定的記錄
    console.log('\n3. 查詢特定記錄 (25-07-14-3556)...');
    const specificResponse = await axios.post(`${WORKER_URL}/api/crud/query`, {
      table: 'object_8W9cb__c',
      columns: ['_id', 'name', 'shift_time__c', 'shift_time__c__r', 'shift_time__c__relation_ids'],
      where: { name: '25-07-14-3556' },
      limit: 1
    });

    if (specificResponse.data.success && specificResponse.data.data.results.length > 0) {
      const record = specificResponse.data.data.results[0];
      console.log('  找到記錄:');
      console.log(`    name: ${record.name}`);
      console.log(`    shift_time__c: ${record.shift_time__c || 'null'}`);
      console.log(`    shift_time__c__r: ${record.shift_time__c__r || 'null'}`);
      console.log(`    shift_time__c__relation_ids: ${record.shift_time__c__relation_ids || 'null'}`);
    } else {
      console.log('  未找到記錄 25-07-14-3556');
    }

    // 4. 嘗試執行 SQL 查詢（如果有 debug API）
    console.log('\n4. 嘗試執行 SQL 查詢...');
    try {
      const sqlResponse = await axios.post(`${WORKER_URL}/api/debug/execute-sql`, {
        sql: "SELECT COUNT(*) as total, COUNT(shift_time__c) as with_shift FROM object_8W9cb__c"
      });
      
      if (sqlResponse.data.success) {
        console.log('  SQL 查詢結果:', sqlResponse.data.data);
      }
    } catch (error) {
      console.log('  Debug API 不可用');
    }

  } catch (error) {
    console.error('❌ API 調用失敗:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('API 檢查完成');
  console.log('='.repeat(80));
}

// 執行檢查
checkShiftTimeViaAPI();