/**
 * 手動同步缺失的記錄到 D1
 * 讀取 missing-ids.txt 文件，批量同步缺失的記錄
 */

const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const FX_CONFIG = {
  baseUrl: process.env.FX_API_BASE_URL || 'https://open.fxiaoke.com',
  appId: process.env.FXIAOKE_APP_ID || 'FSAID_1320691',
  appSecret: process.env.FXIAOKE_APP_SECRET || 'ec63ff237c5c4a759be36d3a8fb7a3b4',
  permanentCode: process.env.FXIAOKE_PERMANENT_CODE || '899433A4A04A3B8CB1CC2183DA4B5B48'
};

const WORKER_URL = 'https://fx-crm-sync.lai-jameslai.workers.dev';

async function getAccessToken() {
  const response = await axios.post(`${FX_CONFIG.baseUrl}/cgi/corpAccessToken/get/V2`, {
    appId: FX_CONFIG.appId,
    appSecret: FX_CONFIG.appSecret,
    permanentCode: FX_CONFIG.permanentCode
  });

  if (response.data.errorCode !== 0) {
    throw new Error(`獲取 token 失敗: ${response.data.errorMessage}`);
  }

  return {
    accessToken: response.data.corpAccessToken,
    corpId: response.data.corpId
  };
}

async function getCurrentUserId(corpId, accessToken) {
  const response = await axios.post(`${FX_CONFIG.baseUrl}/cgi/user/getByMobile`, {
    corpId: corpId,
    corpAccessToken: accessToken,
    mobile: "17675662629"
  });

  if (response.data.errorCode !== 0) {
    throw new Error(`獲取用戶失敗: ${response.data.errorMessage}`);
  }

  return response.data.empList?.[0]?.openUserId;
}

async function getRecordsByIds(corpId, accessToken, currentOpenUserId, ids) {
  const records = [];
  
  // 分批獲取（每批 100 個 ID）
  const batchSize = 100;
  for (let i = 0; i < ids.length; i += batchSize) {
    const batchIds = ids.slice(i, i + batchSize);
    
    const response = await axios.post(`${FX_CONFIG.baseUrl}/cgi/crm/custom/v2/data/query`, {
      corpId,
      corpAccessToken: accessToken,
      currentOpenUserId,
      data: {
        dataObjectApiName: 'object_8W9cb__c',
        search_query_info: {
          offset: 0,
          limit: batchSize,
          filters: [
            {
              field_name: '_id',
              operator: 'IN',
              field_values: batchIds
            }
          ]
        }
      }
    });

    if (response.data.errorCode !== 0) {
      console.error(`查詢批次失敗: ${response.data.errorMessage}`);
      continue;
    }

    const batchRecords = response.data.data?.dataList || [];
    records.push(...batchRecords);
    
    process.stdout.write(`\r從 CRM 獲取記錄: ${records.length}/${ids.length}`);
  }
  
  console.log(''); // 換行
  return records;
}

async function syncByOffsets(totalRecords) {
  const results = {
    totalSynced: 0,
    batches: []
  };
  
  // 使用分頁同步 API，每批 200 條
  const batchSize = 200;
  const totalBatches = Math.ceil(totalRecords / batchSize);
  
  for (let i = 0; i < totalBatches; i++) {
    const offset = i * batchSize;
    
    try {
      // 調用分頁同步 API
      const response = await axios.post(
        `${WORKER_URL}/api/sync/object_8W9cb__c/page`,
        {
          offset: offset,
          limit: batchSize
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
      
      if (response.data.success) {
        const result = response.data.data.result;
        results.totalSynced += result.success || 0;
        results.batches.push({
          batch: i + 1,
          offset: offset,
          success: result.success || 0,
          errors: result.errors || 0
        });
        
        console.log(`\n批次 ${i + 1}/${totalBatches}: 成功 ${result.success || 0} 條, 失敗 ${result.errors || 0} 條`);
      } else {
        console.error(`\n批次 ${i + 1} 失敗: ${response.data.error}`);
        results.batches.push({
          batch: i + 1,
          offset: offset,
          error: response.data.error
        });
      }
    } catch (error) {
      console.error(`\n批次 ${i + 1} 錯誤: ${error.message}`);
      results.batches.push({
        batch: i + 1,
        offset: offset,
        error: error.message
      });
    }
    
    // 每批之間暫停 2 秒
    if (i < totalBatches - 1) {
      console.log('等待 2 秒...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return results;
}

async function main() {
  try {
    console.log('=== 同步缺失的記錄 ===\n');
    
    // 讀取缺失的 ID 列表
    if (!fs.existsSync('missing-ids.txt')) {
      console.error('❌ 找不到 missing-ids.txt 文件');
      console.log('請先運行 node compare-ids.js 生成缺失記錄列表');
      return;
    }
    
    const missingIds = fs.readFileSync('missing-ids.txt', 'utf-8')
      .split('\n')
      .filter(id => id.trim());
    
    console.log(`📊 找到 ${missingIds.length} 條缺失記錄\n`);
    
    if (missingIds.length === 0) {
      console.log('✅ 沒有缺失的記錄需要同步');
      return;
    }
    
    // 獲取認證
    console.log('🔐 獲取 API 認證...');
    const { accessToken, corpId } = await getAccessToken();
    const currentOpenUserId = await getCurrentUserId(corpId, accessToken);
    
    // 使用分頁同步 API 重新同步所有記錄
    console.log('🔄 開始執行完整同步（從 offset 0 開始）...\n');
    console.log('說明: 將從頭開始同步所有 4136 條記錄，確保缺失的 558 條記錄被包含在內\n');
    
    const results = await syncByOffsets(4136);
    
    // 顯示結果
    console.log('\n\n📊 同步結果:');
    console.log(`  總共同步: ${results.totalSynced} 條記錄`);
    console.log(`  處理批次: ${results.batches.length} 批`);
    
    // 顯示每批結果
    console.log('\n批次詳情:');
    for (const batch of results.batches) {
      if (batch.error) {
        console.log(`  批次 ${batch.batch}: ❌ 錯誤 - ${batch.error}`);
      } else {
        console.log(`  批次 ${batch.batch}: ✅ 成功 ${batch.success} 條, 失敗 ${batch.errors} 條`);
      }
    }
    
    // 驗證最終狀態
    console.log('\n🔍 驗證最終同步狀態...');
    const checkResponse = await axios.get(`${WORKER_URL}/api/sync/database-stats`);
    const siteTable = checkResponse.data.data.tables.find(t => t.apiName === 'object_8W9cb__c');
    
    console.log(`\n📈 最終統計:`)
    console.log(`  D1 記錄數: ${siteTable?.recordCount || 0} / 4136`);
    console.log(`  同步率: ${((siteTable?.recordCount || 0) / 4136 * 100).toFixed(2)}%`);
    
    if (siteTable?.recordCount === 4136) {
      console.log('\n🎉 恭喜！所有記錄已完全同步！');
    } else {
      const remaining = 4136 - (siteTable?.recordCount || 0);
      console.log(`\n⚠️ 還有 ${remaining} 條記錄未同步`);
      console.log('建議:');
      console.log('  1. 檢查 failed-sync-ids.txt 中的失敗記錄');
      console.log('  2. 查看 Worker 日誌瞭解失敗原因');
      console.log('  3. 重新運行此腳本嘗試同步');
    }
    
  } catch (error) {
    console.error('\n❌ 同步失敗:', error.message);
    if (error.response?.data) {
      console.error('錯誤詳情:', error.response.data);
    }
  }
}

main();