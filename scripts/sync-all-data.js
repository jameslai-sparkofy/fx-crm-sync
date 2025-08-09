#!/usr/bin/env node
/**
 * 同步所有對象的數據
 */

const axios = require('axios');

const WORKER_URL = 'https://fx-crm-sync.lai-jameslai.workers.dev';

const objects = [
  'object_8W9cb__c',      // 案場(SPC)
  'object_k1XqG__c',      // SPC維修單
  'site_cabinet__c',      // 案場(浴櫃)  
  'progress_management_announ__c', // 進度管理公告
  'NewOpportunityObj',    // 商機
  'SupplierObj'           // 供應商
  // 'object_50HJ8__c'    // 工地師父 - 跳過，因為CRM中無數據
];

async function syncAllData() {
  console.log('='.repeat(60));
  console.log('開始同步所有對象數據');
  console.log('='.repeat(60));
  
  const results = [];
  
  for (const objectApiName of objects) {
    console.log(`\n🔄 同步 ${objectApiName}...`);
    
    try {
      const response = await axios.post(`${WORKER_URL}/api/sync/${objectApiName}/start`, {
        fullSync: true,
        batchSize: 200
      });
      
      if (response.data.success) {
        const result = response.data.data.result;
        console.log(`✅ ${objectApiName}: 成功=${result.success}, 錯誤=${result.errors}, 總計=${result.total}`);
        
        results.push({
          objectApiName,
          success: true,
          syncResult: result
        });
      } else {
        console.log(`❌ ${objectApiName}: ${response.data.error}`);
        results.push({
          objectApiName,
          success: false,
          error: response.data.error
        });
      }
      
      // 等待2秒再處理下一個對象
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.log(`❌ ${objectApiName}: ${error.message}`);
      results.push({
        objectApiName,
        success: false,
        error: error.message
      });
    }
  }
  
  // 輸出摘要
  console.log('\n' + '='.repeat(60));
  console.log('數據同步結果摘要');
  console.log('='.repeat(60));
  
  const successCount = results.filter(r => r.success).length;
  const totalSuccess = results.reduce((sum, r) => sum + (r.syncResult?.success || 0), 0);
  const totalErrors = results.reduce((sum, r) => sum + (r.syncResult?.errors || 0), 0);
  
  console.log(`處理對象數: ${results.length}`);
  console.log(`成功對象: ${successCount}`);
  console.log(`失敗對象: ${results.length - successCount}`);
  console.log(`總成功記錄: ${totalSuccess}`);
  console.log(`總錯誤記錄: ${totalErrors}`);
  
  console.log('\n詳細結果:');
  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    if (r.success && r.syncResult) {
      console.log(`${status} ${r.objectApiName}: ${r.syncResult.success}條記錄`);
    } else {
      console.log(`${status} ${r.objectApiName}: ${r.error}`);
    }
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('數據同步任務完成');
  console.log('='.repeat(60));
}

// 執行同步
syncAllData().catch(console.error);