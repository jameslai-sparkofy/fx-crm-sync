/**
 * 定時同步調度器
 */
import { FxClient } from '../utils/fx-client.js';
import { DataSyncService } from './data-sync-service.js';
import { SchemaSyncService } from './schema-sync.js';
import { SchemaManager } from './schema-manager.js';
import { ObjectDiscoveryService } from './object-discovery.js';
import { D1ChangeProcessor } from '../services/d1-change-processor.js';

export async function handleScheduled(event, env, ctx) {
  const startTime = Date.now();
  console.log('🕐 開始執行定時任務...');
  
  // 記錄執行時間到 KV
  await env.KV.put('LAST_CRON_RUN', new Date().toISOString());
  
  // 處理 D1 變更同步到 CRM
  try {
    console.log('🔄 處理 D1 變更同步到 CRM...');
    const d1Processor = new D1ChangeProcessor(env);
    await d1Processor.start();
  } catch (error) {
    console.error('D1 變更處理失敗:', error);
  }
  
  // 獲取對象啟用狀態
  const objectStatus = await env.KV.get('SYNC_OBJECTS_STATUS', 'json') || {};
  
  try {
    // 初始化服務
    const fxClient = new FxClient(env);
    await fxClient.init();
    
    const dataSyncService = new DataSyncService(fxClient, env.DB);
    const objectDiscovery = new ObjectDiscoveryService(fxClient, env.DB);
    const schemaManager = new SchemaManager(env.DB);
    const schemaSyncService = new SchemaSyncService(objectDiscovery, schemaManager, env.DB);
    
    const results = {
      schemaSync: { success: 0, errors: 0 },
      dataSync: { 
        opportunities: null, 
        sites: null,
        repairOrders: null,
        workers: null,
        suppliers: null,
        siteCabinet: null,
        progressAnnouncement: null
      }
    };
    
    // 1. 檢查並同步 Schema 變更
    console.log('📋 檢查 Schema 變更...');
    
    // Schema 同步列表
    const schemasToSync = [
      { name: 'NewOpportunityObj', label: '商機' },
      { name: 'object_8W9cb__c', label: '案場' },
      { name: 'object_k1XqG__c', label: '維修單' },
      { name: 'object_50HJ8__c', label: '工地師父' },
      { name: 'SupplierObj', label: '供應商' },
      { name: 'site_cabinet__c', label: '案場(浴櫃)' },
      { name: 'progress_management_announ__c', label: '進度管理公告' }
    ];
    
    for (const schema of schemasToSync) {
      try {
        await schemaSyncService.syncObjectSchema(schema.name);
        results.schemaSync.success++;
      } catch (error) {
        console.error(`${schema.label} Schema 同步失敗:`, error);
        results.schemaSync.errors++;
      }
    }
    
    // 2. 同步資料
    console.log('📊 同步資料...');
    
    // 同步商機
    if (objectStatus['NewOpportunityObj']?.enabled !== false) {
      try {
        results.dataSync.opportunities = await dataSyncService.syncOpportunities();
        console.log(`商機同步: 成功 ${results.dataSync.opportunities.success}, 失敗 ${results.dataSync.opportunities.errors}`);
      } catch (error) {
        console.error('商機同步失敗:', error);
        results.dataSync.opportunities = { success: 0, errors: 1, error: error.message };
      }
    } else {
      console.log('商機同步已停用，跳過');
    }
    
    // 同步案場
    if (objectStatus['object_8W9cb__c']?.enabled !== false) {
      try {
      results.dataSync.sites = await dataSyncService.syncSites();
      console.log(`案場同步: 成功 ${results.dataSync.sites.success}, 失敗 ${results.dataSync.sites.errors}`);
    } catch (error) {
      console.error('案場同步失敗:', error);
      results.dataSync.sites = { success: 0, errors: 1, error: error.message };
    }
    } else {
      console.log('案場同步已停用，跳過');
    }
    
    // 同步維修單
    if (objectStatus['object_k1XqG__c']?.enabled !== false) {
      try {
      results.dataSync.repairOrders = await dataSyncService.syncRepairOrders();
      console.log(`維修單同步: 成功 ${results.dataSync.repairOrders.success}, 失敗 ${results.dataSync.repairOrders.errors}`);
    } catch (error) {
      console.error('維修單同步失敗:', error);
      results.dataSync.repairOrders = { success: 0, errors: 1, error: error.message };
    }
    } else {
      console.log('維修單同步已停用，跳過');
    }
    
    // 同步工地師父
    if (objectStatus['object_50HJ8__c']?.enabled !== false) {
      try {
      results.dataSync.workers = await dataSyncService.syncWorkers();
      console.log(`工地師父同步: 成功 ${results.dataSync.workers.success}, 失敗 ${results.dataSync.workers.errors}`);
    } catch (error) {
      console.error('工地師父同步失敗:', error);
      results.dataSync.workers = { success: 0, errors: 1, error: error.message };
    }
    } else {
      console.log('工地師父同步已停用，跳過');
    }
    
    // 同步供應商
    if (objectStatus['SupplierObj']?.enabled !== false) {
      try {
      results.dataSync.suppliers = await dataSyncService.syncSuppliers();
      console.log(`供應商同步: 成功 ${results.dataSync.suppliers.success}, 失敗 ${results.dataSync.suppliers.errors}`);
    } catch (error) {
      console.error('供應商同步失敗:', error);
      results.dataSync.suppliers = { success: 0, errors: 1, error: error.message };
    }
    } else {
      console.log('供應商同步已停用，跳過');
    }
    
    // 同步案場(浴櫃)
    if (objectStatus['site_cabinet__c']?.enabled !== false) {
      try {
      results.dataSync.siteCabinet = await dataSyncService.syncSiteCabinet();
      console.log(`案場(浴櫃)同步: 成功 ${results.dataSync.siteCabinet.success}, 失敗 ${results.dataSync.siteCabinet.errors}`);
    } catch (error) {
      console.error('案場(浴櫃)同步失敗:', error);
      results.dataSync.siteCabinet = { success: 0, errors: 1, error: error.message };
    }
    } else {
      console.log('案場(浴櫃)同步已停用，跳過');
    }
    
    // 同步進度管理公告
    if (objectStatus['progress_management_announ__c']?.enabled !== false) {
      try {
      results.dataSync.progressAnnouncement = await dataSyncService.syncProgressAnnouncement();
      console.log(`進度管理公告同步: 成功 ${results.dataSync.progressAnnouncement.success}, 失敗 ${results.dataSync.progressAnnouncement.errors}`);
    } catch (error) {
      console.error('進度管理公告同步失敗:', error);
      results.dataSync.progressAnnouncement = { success: 0, errors: 1, error: error.message };
    }
    } else {
      console.log('進度管理公告同步已停用，跳過');
    }
    
    // 3. 記錄同步結果
    const duration = (Date.now() - startTime) / 1000;
    console.log(`✅ 定時同步任務完成，耗時 ${duration.toFixed(2)} 秒`);
    console.log('同步結果:', JSON.stringify(results, null, 2));
    
    // 發送告警（如果有錯誤）
    const totalErrors = results.schemaSync.errors + 
                       (results.dataSync.opportunities?.errors || 0) + 
                       (results.dataSync.sites?.errors || 0) +
                       (results.dataSync.repairOrders?.errors || 0) +
                       (results.dataSync.workers?.errors || 0) +
                       (results.dataSync.suppliers?.errors || 0) +
                       (results.dataSync.siteCabinet?.errors || 0) +
                       (results.dataSync.progressAnnouncement?.errors || 0);
    
    // 檢查同步效率問題：連續多次零記錄同步
    const totalSyncedRecords = (results.dataSync.opportunities?.success || 0) + 
                               (results.dataSync.sites?.success || 0) +
                               (results.dataSync.repairOrders?.success || 0) +
                               (results.dataSync.workers?.success || 0) +
                               (results.dataSync.suppliers?.success || 0) +
                               (results.dataSync.siteCabinet?.success || 0) +
                               (results.dataSync.progressAnnouncement?.success || 0);
    
    // 記錄零同步次數到 KV
    if (totalSyncedRecords === 0) {
      const zeroSyncCount = parseInt(await env.KV.get('ZERO_SYNC_COUNT') || '0') + 1;
      await env.KV.put('ZERO_SYNC_COUNT', zeroSyncCount.toString());
      console.log(`⚠️ 連續 ${zeroSyncCount} 次零記錄同步`);
      
      // 連續 5 次零同步發送告警
      if (zeroSyncCount >= 5 && env.ALERT_WEBHOOK_URL) {
        await sendAlert(env.ALERT_WEBHOOK_URL, {
          type: 'SYNC_EFFICIENCY_WARNING',
          message: `同步效率異常：連續 ${zeroSyncCount} 次同步未獲取到新記錄`,
          details: {
            zeroSyncCount,
            lastSyncResults: results,
            suggestion: '建議檢查增量同步邏輯或執行完整同步'
          }
        });
      }
    } else {
      // 有新記錄時重置計數器
      await env.KV.put('ZERO_SYNC_COUNT', '0');
      console.log(`✅ 本次同步獲取 ${totalSyncedRecords} 條新記錄`);
    }
    
    if (totalErrors > 0 && env.ALERT_WEBHOOK_URL) {
      await sendAlert(env.ALERT_WEBHOOK_URL, {
        type: 'SYNC_ERROR',
        message: `定時同步發生 ${totalErrors} 個錯誤`,
        details: results
      });
    }
    
  } catch (error) {
    console.error('❌ 定時同步任務失敗:', error);
    
    // 發送告警
    if (env.ALERT_WEBHOOK_URL) {
      await sendAlert(env.ALERT_WEBHOOK_URL, {
        type: 'SYNC_FATAL_ERROR',
        message: '定時同步任務崩潰',
        error: error.message,
        stack: error.stack
      });
    }
  }
}

/**
 * 發送告警通知
 */
async function sendAlert(webhookUrl, data) {
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        ...data
      })
    });
  } catch (error) {
    console.error('發送告警失敗:', error);
  }
}