#!/usr/bin/env node

/**
 * 通過 Worker API 檢查表格欄位
 */

const fetch = require('node-fetch');

async function checkColumns() {
  console.log('====================================');
  console.log('通過 API 檢查 D1 表格欄位');
  console.log('====================================\n');
  
  try {
    // 1. 檢查表格統計
    console.log('1. 獲取資料庫統計...');
    const statsResponse = await fetch('https://fx-crm-sync.lai-jameslai.workers.dev/api/sync/database-stats');
    
    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      console.log('資料庫統計:');
      console.log(JSON.stringify(stats, null, 2));
    }
    
    // 2. 嘗試創建 shift_time 映射表
    console.log('\n2. 創建工班映射表...');
    const createResponse = await fetch('https://fx-crm-sync.lai-jameslai.workers.dev/api/sync/shift-time/create-table', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (createResponse.ok) {
      const result = await createResponse.json();
      console.log('創建結果:', result);
    } else {
      console.log('創建失敗:', createResponse.status);
    }
    
    // 3. 執行工班同步
    console.log('\n3. 同步工班資料...');
    const syncResponse = await fetch('https://fx-crm-sync.lai-jameslai.workers.dev/api/sync/shift-time', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (syncResponse.ok) {
      const syncResult = await syncResponse.json();
      console.log('同步結果:', JSON.stringify(syncResult, null, 2));
    } else {
      console.log('同步失敗:', syncResponse.status);
    }
    
    // 4. 查詢特定記錄
    console.log('\n4. 查詢 24-12-11-2895 的工班...');
    const queryResponse = await fetch('https://fx-crm-sync.lai-jameslai.workers.dev/api/sync/shift-time/24-12-11-2895');
    
    if (queryResponse.ok) {
      const queryResult = await queryResponse.json();
      console.log('查詢結果:', queryResult);
    } else {
      console.log('查詢失敗:', queryResponse.status);
    }
    
    // 5. 獲取表格結構資訊
    console.log('\n5. 獲取表格結構資訊...');
    const schemaResponse = await fetch('https://fx-crm-sync.lai-jameslai.workers.dev/api/sync/table-schema/object_8W9cb__c');
    
    if (schemaResponse.ok) {
      const schema = await schemaResponse.json();
      console.log('表格結構:');
      console.log(`- 欄位總數: ${schema.columns?.length || 0}`);
      
      // 檢查是否有 shift_time__c
      const hasShiftTime = schema.columns?.some(col => col.name === 'shift_time__c');
      if (hasShiftTime) {
        console.log('✅ 表格包含 shift_time__c 欄位');
      } else {
        console.log('❌ 表格不包含 shift_time__c 欄位');
      }
      
      // 列出所有欄位
      if (schema.columns) {
        console.log('\n所有欄位:');
        schema.columns.forEach((col, index) => {
          if (col.name.includes('shift') || col.name.includes('time')) {
            console.log(`  ${index + 1}. ✅ ${col.name} (${col.type})`);
          } else {
            console.log(`  ${index + 1}. ${col.name} (${col.type})`);
          }
        });
      }
    } else {
      console.log('獲取表格結構失敗:', schemaResponse.status);
    }
    
  } catch (error) {
    console.error('執行失敗:', error.message);
  }
  
  console.log('\n====================================');
  console.log('檢查完成');
  console.log('====================================');
}

// 執行檢查
checkColumns();