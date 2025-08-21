/**
 * 定時同步調度器 - 使用優化後的動態同步服務
 */
import { FxClient } from '../utils/fx-client.js';
import { DynamicSyncService } from './dynamic-sync-service.js';
import { D1ChangeProcessor } from '../services/d1-change-processor.js';

export async function handleScheduled(event, env, ctx) {
  const startTime = Date.now();
  console.log('🕐 開始執行每小時定時同步任務...');
  
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
  
  try {
    // 初始化服務
    const fxClient = new FxClient(env);
    await fxClient.init();
    
    const dynamicSyncService = new DynamicSyncService(fxClient, env.DB);
    
    // 定義所有需要同步的對象（使用我們成功的案場同步方式）
    const objectsToSync = [
      { apiName: 'object_8W9cb__c', label: '案場', isCustom: true },
      { apiName: 'NewOpportunityObj', label: '商機', isCustom: false },
      { apiName: 'object_k1XqG__c', label: 'SPC維修單', isCustom: true },
      { apiName: 'object_50HJ8__c', label: '工地師父', isCustom: true },
      { apiName: 'SupplierObj', label: '供應商', isCustom: false },
      { apiName: 'site_cabinet__c', label: '案場(浴櫃)', isCustom: true },
      { apiName: 'progress_management_announ__c', label: '進度管理公告', isCustom: true }
    ];
    
    const results = {
      totalObjects: objectsToSync.length,
      successful: 0,
      failed: 0,
      details: {}
    };
    
    console.log(`📊 開始同步 ${objectsToSync.length} 個對象...`);
    
    // 循環同步每個對象
    for (const obj of objectsToSync) {
      try {
        console.log(`\n🔄 正在同步 ${obj.label} (${obj.apiName})...`);
        
        // 使用與案場相同的成功同步方式
        const syncResult = await dynamicSyncService.syncDynamicObject(
          obj.apiName, 
          obj.isCustom,
          { 
            fullSync: false, // 使用增量同步
            maxRecords: 1000 // 每小時最多處理1000條記錄
          }
        );
        
        results.details[obj.apiName] = {
          label: obj.label,
          success: syncResult.success,
          errors: syncResult.errors,
          status: 'completed'
        };
        
        results.successful++;
        console.log(`✅ ${obj.label} 同步完成: 成功 ${syncResult.success}, 失敗 ${syncResult.errors}`);
        
      } catch (error) {
        console.error(`❌ ${obj.label} 同步失敗:`, error);
        results.details[obj.apiName] = {
          label: obj.label,
          success: 0,
          errors: 1,
          status: 'failed',
          error: error.message
        };
        results.failed++;
      }
    }
    
    // 3. 記錄同步結果
    const duration = (Date.now() - startTime) / 1000;
    console.log(`\n✅ 每小時定時同步任務完成，耗時 ${duration.toFixed(2)} 秒`);
    console.log(`📊 同步統計: 成功 ${results.successful}, 失敗 ${results.failed}, 總計 ${results.totalObjects} 個對象`);
    console.log('詳細結果:', JSON.stringify(results, null, 2));
    
    // 計算總同步記錄數
    const totalSyncedRecords = Object.values(results.details)
      .reduce((sum, detail) => sum + (detail.success || 0), 0);
    
    const totalErrors = Object.values(results.details)
      .reduce((sum, detail) => sum + (detail.errors || 0), 0);
    
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
    
    // 儲存同步結果到 KV
    await env.KV.put('LAST_SYNC_RESULTS', JSON.stringify({
      timestamp: new Date().toISOString(),
      duration: duration,
      results: results,
      totalRecords: totalSyncedRecords,
      totalErrors: totalErrors
    }));
    
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