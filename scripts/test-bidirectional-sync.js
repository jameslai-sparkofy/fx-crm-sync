#!/usr/bin/env node

/**
 * 測試雙向同步功能
 */

const fetch = require('node-fetch');

const BASE_URL = 'https://fx-crm-sync-dev.lai-jameslai.workers.dev';

// 測試案例
const tests = {
  // 測試 1: D1 到 CRM 的同步
  async testD1ToCRM() {
    console.log('\n📝 測試 1: D1 → CRM 同步');
    
    try {
      // 手動觸發一個 D1 變更同步到 CRM
      const response = await fetch(`${BASE_URL}/api/d1-sync/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objectApiName: 'object_8W9cb__c',
          recordId: 'test_d1_' + Date.now(),
          operation: 'update',
          data: {
            name: 'D1 測試案場 - ' + new Date().toLocaleString(),
            field_TJ18I__c: '測試地址'
          }
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('   ✅ D1 → CRM 同步成功');
      } else {
        console.log('   ❌ D1 → CRM 同步失敗:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('   ❌ 請求失敗:', error.message);
      return null;
    }
  },
  
  // 測試 2: CRM 到 D1 的同步（透過 Webhook）
  async testCRMToD1() {
    console.log('\n📝 測試 2: CRM → D1 同步（Webhook）');
    
    try {
      const response = await fetch(`${BASE_URL}/api/webhook/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'object.updated',
          objectApiName: 'object_8W9cb__c',
          objectId: 'test_crm_' + Date.now(),
          timestamp: Date.now(),
          data: {
            name: 'CRM 測試案場 - ' + new Date().toLocaleString(),
            contact__c: '測試聯絡人'
          }
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('   ✅ CRM → D1 同步成功');
      } else {
        console.log('   ❌ CRM → D1 同步失敗:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('   ❌ 請求失敗:', error.message);
      return null;
    }
  },
  
  // 測試 3: 處理待同步的 D1 變更
  async testProcessPendingChanges() {
    console.log('\n📝 測試 3: 處理待同步的 D1 變更');
    
    try {
      const response = await fetch(`${BASE_URL}/api/d1-sync/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('   ✅ 處理完成');
        console.log(`   📊 處理 ${result.data.processed} 個變更`);
        console.log(`      成功: ${result.data.success}`);
        console.log(`      失敗: ${result.data.failed}`);
        if (result.data.errors.length > 0) {
          console.log('   錯誤詳情:', result.data.errors);
        }
      } else {
        console.log('   ❌ 處理失敗:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('   ❌ 請求失敗:', error.message);
      return null;
    }
  },
  
  // 測試 4: 查看 D1 變更日誌
  async testViewD1Changes() {
    console.log('\n📝 測試 4: 查看 D1 變更日誌');
    
    try {
      const response = await fetch(`${BASE_URL}/api/d1-sync/changes?limit=10`);
      const result = await response.json();
      
      if (result.success) {
        console.log(`   ✅ 獲取 ${result.count} 條變更記錄`);
        
        result.data.forEach((change, index) => {
          console.log(`\n   ${index + 1}. ${change.change_time}`);
          console.log(`      表: ${change.table_name}`);
          console.log(`      對象: ${change.object_api_name}`);
          console.log(`      記錄: ${change.record_id}`);
          console.log(`      操作: ${change.operation}`);
          console.log(`      狀態: ${change.sync_status}`);
          if (change.sync_error) {
            console.log(`      錯誤: ${change.sync_error}`);
          }
        });
      } else {
        console.log('   ❌ 獲取失敗:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('   ❌ 請求失敗:', error.message);
      return null;
    }
  },
  
  // 測試 5: 查看雙向同步配置
  async testViewConfig() {
    console.log('\n📝 測試 5: 查看雙向同步配置');
    
    try {
      const response = await fetch(`${BASE_URL}/api/d1-sync/config`);
      const result = await response.json();
      
      if (result.success) {
        console.log('   ✅ 當前配置:');
        console.log(`      啟用: ${result.data.enabled}`);
        console.log(`      自動同步: ${result.data.autoSync}`);
        console.log(`      同步間隔: ${result.data.syncInterval}ms`);
        console.log(`      衝突解決: ${result.data.conflictResolution}`);
        console.log(`      啟用的對象:`);
        Object.entries(result.data.enabledObjects).forEach(([obj, enabled]) => {
          console.log(`        - ${obj}: ${enabled ? '✅' : '❌'}`);
        });
      } else {
        console.log('   ❌ 獲取配置失敗:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('   ❌ 請求失敗:', error.message);
      return null;
    }
  },
  
  // 測試 6: 查看所有同步日誌（包含雙向）
  async testViewAllSyncLogs() {
    console.log('\n📝 測試 6: 查看所有同步日誌');
    
    try {
      const response = await fetch(`${BASE_URL}/api/sync-logs/recent?limit=10`);
      const result = await response.json();
      
      if (result.success) {
        console.log(`   ✅ 最近 ${result.count} 條同步日誌:`);
        
        result.data.forEach((log, index) => {
          console.log(`\n   ${index + 1}. ${log.syncTime}`);
          console.log(`      方向: ${log.triggerDetails}`);
          console.log(`      對象: ${log.object.label} (${log.object.apiName})`);
          console.log(`      操作: ${log.operation}`);
          console.log(`      觸發源: ${log.triggerSource}`);
          console.log(`      狀態: ${log.status}`);
          if (log.fieldsChanged && log.fieldsChanged.length > 0) {
            console.log(`      變更欄位: ${log.fieldsChanged.join(', ')}`);
          }
        });
      } else {
        console.log('   ❌ 獲取日誌失敗:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('   ❌ 請求失敗:', error.message);
      return null;
    }
  }
};

// 主測試函數
async function main() {
  console.log('========================================');
  console.log('雙向同步測試');
  console.log('========================================');
  console.log(`API Base URL: ${BASE_URL}`);
  
  // 執行所有測試
  await tests.testD1ToCRM();
  await tests.testCRMToD1();
  await tests.testProcessPendingChanges();
  await tests.testViewD1Changes();
  await tests.testViewConfig();
  await tests.testViewAllSyncLogs();
  
  console.log('\n========================================');
  console.log('測試完成！');
  console.log('========================================');
  console.log('\n💡 提示：');
  console.log('1. D1 → CRM: 當 D1 資料變更時，會記錄到 d1_change_log 表');
  console.log('2. CRM → D1: 透過 Webhook 即時同步');
  console.log('3. 避免循環: 系統會檢查 30 秒內的重複同步');
  console.log('4. 衝突處理: 預設使用 last_write_wins 策略');
}

// 執行測試
main().catch(console.error);