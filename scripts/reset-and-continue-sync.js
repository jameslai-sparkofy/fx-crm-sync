/**
 * 重置同步進度並繼續同步剩餘的 558 條記錄
 */

const axios = require('axios');
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

async function findMissingRecordOffsets(corpId, accessToken, currentOpenUserId) {
  console.log('尋找缺失記錄的位置...');
  
  const missingOffsets = [];
  let offset = 0;
  const limit = 200;
  
  // 檢查每個批次
  while (offset < 4136) {
    const response = await axios.post(`${FX_CONFIG.baseUrl}/cgi/crm/custom/v2/data/query`, {
      corpId,
      corpAccessToken: accessToken,
      currentOpenUserId,
      data: {
        dataObjectApiName: 'object_8W9cb__c',
        search_query_info: {
          offset: offset,
          limit: 10, // 只檢查每批的前10條
          filters: [
            {
              field_name: 'life_status',
              operator: 'NEQ',
              field_values: ['作废']
            }
          ],
          orders: [{ fieldName: '_id', isAsc: true }]
        }
      }
    });

    if (response.data.errorCode !== 0) {
      throw new Error(`查詢失敗: ${response.data.errorMessage}`);
    }

    const records = response.data.data?.dataList || [];
    
    if (records.length > 0) {
      // 檢查這批的第一條記錄是否在 D1 中
      const firstRecord = records[0];
      
      try {
        const d1Response = await axios.get(
          `${WORKER_URL}/api/crud/object_8W9cb__c/${firstRecord._id}`,
          { timeout: 5000 }
        );
        
        if (!d1Response.data.success) {
          // 這批數據缺失
          missingOffsets.push({
            offset: offset,
            name: firstRecord.name,
            id: firstRecord._id
          });
        }
      } catch (error) {
        if (error.response?.status === 404) {
          // 記錄不存在，這批需要同步
          missingOffsets.push({
            offset: offset,
            name: firstRecord.name,
            id: firstRecord._id
          });
        }
      }
    }
    
    process.stdout.write(`\r檢查進度: ${offset} / 4136`);
    offset += 200; // 按照新的批次大小跳躍
  }
  
  console.log('\n');
  return missingOffsets;
}

async function clearSyncProgress() {
  console.log('清除同步進度...');
  try {
    await axios.post(`${WORKER_URL}/api/database/execute`, {
      sql: "DELETE FROM sync_progress WHERE entity_type = 'object_8W9cb__c'"
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('✅ 進度已清除');
  } catch (error) {
    console.log('⚠️ 無法清除進度（可能表不存在）');
  }
}

async function manualSync(corpId, accessToken, currentOpenUserId, offset, limit) {
  console.log(`手動同步 offset: ${offset}, limit: ${limit}`);
  
  // 獲取數據
  const response = await axios.post(`${FX_CONFIG.baseUrl}/cgi/crm/custom/v2/data/query`, {
    corpId,
    corpAccessToken: accessToken,
    currentOpenUserId,
    data: {
      dataObjectApiName: 'object_8W9cb__c',
      search_query_info: {
        offset: offset,
        limit: limit,
        filters: [
          {
            field_name: 'life_status',
            operator: 'NEQ',
            field_values: ['作废']
          }
        ],
        orders: [{ fieldName: '_id', isAsc: true }]
      }
    }
  });

  if (response.data.errorCode !== 0) {
    throw new Error(`查詢失敗: ${response.data.errorMessage}`);
  }

  const records = response.data.data?.dataList || [];
  console.log(`獲取到 ${records.length} 條記錄`);
  
  // 逐條插入到 D1
  let success = 0;
  let failed = 0;
  
  for (const record of records) {
    try {
      // 使用 CRUD API 創建或更新記錄
      const result = await axios.post(
        `${WORKER_URL}/api/crud/object_8W9cb__c`,
        record,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000
        }
      );
      
      if (result.data.success) {
        success++;
      } else {
        failed++;
      }
    } catch (error) {
      failed++;
      if (failed <= 3) {
        console.log(`\n  ❌ 同步失敗: ${record.name} - ${error.message}`);
      }
    }
    
    if ((success + failed) % 10 === 0) {
      process.stdout.write(`\r  進度: ${success + failed}/${records.length} (成功: ${success}, 失敗: ${failed})`);
    }
  }
  
  console.log(`\n  完成: 成功 ${success}, 失敗 ${failed}`);
  return { success, failed };
}

async function main() {
  try {
    console.log('=== 重置並繼續同步 ===\n');
    
    // 獲取認證
    const { accessToken, corpId } = await getAccessToken();
    const currentOpenUserId = await getCurrentUserId(corpId, accessToken);
    
    // 找出缺失記錄的位置
    const missingOffsets = await findMissingRecordOffsets(corpId, accessToken, currentOpenUserId);
    
    if (missingOffsets.length === 0) {
      console.log('✅ 沒有發現缺失的記錄！');
      return;
    }
    
    console.log(`\n發現 ${missingOffsets.length} 個批次有缺失記錄:`);
    for (const batch of missingOffsets.slice(0, 5)) {
      console.log(`  - Offset ${batch.offset}: ${batch.name}`);
    }
    if (missingOffsets.length > 5) {
      console.log(`  ... 還有 ${missingOffsets.length - 5} 個批次`);
    }
    
    // 清除同步進度
    await clearSyncProgress();
    
    // 選擇同步策略
    console.log('\n選擇同步策略:');
    console.log('1. 使用 Worker API 同步（可能會遇到限制）');
    console.log('2. 手動同步（直接寫入 D1，較慢但穩定）');
    
    // 默認使用手動同步
    console.log('\n使用手動同步模式...\n');
    
    let totalSuccess = 0;
    let totalFailed = 0;
    
    for (const batch of missingOffsets) {
      console.log(`\n同步批次 offset: ${batch.offset}`);
      const result = await manualSync(corpId, accessToken, currentOpenUserId, batch.offset, 200);
      totalSuccess += result.success;
      totalFailed += result.failed;
      
      // 批次間延遲
      if (missingOffsets.indexOf(batch) < missingOffsets.length - 1) {
        console.log('等待 2 秒...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log('\n=== 同步完成 ===');
    console.log(`總成功: ${totalSuccess}`);
    console.log(`總失敗: ${totalFailed}`);
    
    // 檢查最終狀態
    const statsResponse = await axios.get(`${WORKER_URL}/api/sync/database-stats`);
    const siteTable = statsResponse.data.data.tables.find(t => t.apiName === 'object_8W9cb__c');
    console.log(`\nD1 最終記錄數: ${siteTable.recordCount} / 4136`);
    
    if (siteTable.recordCount >= 4136) {
      console.log('✅ 同步成功完成！');
    } else {
      console.log(`⚠️ 還差 ${4136 - siteTable.recordCount} 條記錄`);
    }
    
  } catch (error) {
    console.error('\n❌ 執行失敗:', error.message);
    if (error.response?.data) {
      console.error('錯誤詳情:', error.response.data);
    }
  }
}

main();