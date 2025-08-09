/**
 * 深入分析同步失敗原因
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

async function getCRMCount(corpId, accessToken, currentOpenUserId) {
  const response = await axios.post(`${FX_CONFIG.baseUrl}/cgi/crm/custom/v2/data/query`, {
    corpId,
    corpAccessToken: accessToken,
    currentOpenUserId,
    data: {
      dataObjectApiName: 'object_8W9cb__c',
      search_query_info: {
        offset: 0,
        limit: 1,
        filters: [
          {
            field_name: 'life_status',
            operator: 'NEQ',
            field_values: ['作废']
          }
        ]
      }
    }
  });

  if (response.data.errorCode !== 0) {
    throw new Error(`查詢失敗: ${response.data.errorMessage}`);
  }

  return response.data.data.total;
}

async function getD1Count() {
  const response = await axios.get(`${WORKER_URL}/api/sync/database-stats`);
  const siteTable = response.data.data.tables.find(t => t.apiName === 'object_8W9cb__c');
  return siteTable.recordCount;
}

async function getSyncHistory() {
  const response = await axios.get(`${WORKER_URL}/api/sync/status`);
  return response.data.data.recentSyncs.filter(s => s.entity_type === 'object_8W9cb__c');
}

async function checkRandomRecords(corpId, accessToken, currentOpenUserId, count = 10) {
  const missing = [];
  const existing = [];
  
  // 從不同位置取樣
  const offsets = [
    3500, // 第7批
    3600, // 第8批
    3700, // 第8批
    3800, // 第8批
    3900, // 第8批
    4000, // 第9批
    4100  // 第9批
  ];
  
  for (const offset of offsets) {
    const response = await axios.post(`${FX_CONFIG.baseUrl}/cgi/crm/custom/v2/data/query`, {
      corpId,
      corpAccessToken: accessToken,
      currentOpenUserId,
      data: {
        dataObjectApiName: 'object_8W9cb__c',
        search_query_info: {
          offset: offset,
          limit: 5,
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
    
    const records = response.data.data?.dataList || [];
    
    for (const record of records) {
      try {
        const d1Response = await axios.get(
          `${WORKER_URL}/api/crud/object_8W9cb__c/${record._id}`,
          { timeout: 5000 }
        );
        
        if (d1Response.data.success) {
          existing.push({
            id: record._id,
            name: record.name,
            offset: offset
          });
        } else {
          missing.push({
            id: record._id,
            name: record.name,
            offset: offset,
            createTime: record.create_time,
            modifyTime: record.last_modified_time
          });
        }
      } catch (error) {
        if (error.response?.status === 404) {
          missing.push({
            id: record._id,
            name: record.name,
            offset: offset,
            createTime: record.create_time,
            modifyTime: record.last_modified_time
          });
        }
      }
    }
    
    process.stdout.write(`\r檢查偏移量 ${offset}: 已找到 ${missing.length} 條缺失記錄`);
  }
  
  console.log('\n');
  return { missing, existing };
}

async function testDirectSync(corpId, accessToken, currentOpenUserId, recordId) {
  // 獲取單條記錄詳情
  const response = await axios.post(`${FX_CONFIG.baseUrl}/cgi/crm/custom/v2/data/get`, {
    corpId,
    corpAccessToken: accessToken,
    currentOpenUserId,
    data: {
      dataObjectApiName: 'object_8W9cb__c',
      objectDataId: recordId
    }
  });
  
  if (response.data.errorCode !== 0) {
    return { error: response.data.errorMessage };
  }
  
  const record = response.data.data?.data;
  
  // 檢查記錄結構
  const analysis = {
    id: record._id,
    name: record.name,
    fieldCount: Object.keys(record).length,
    hasArrayFields: false,
    arrayFields: [],
    longTextFields: [],
    specialCharacters: false
  };
  
  // 檢查數組欄位
  for (const [key, value] of Object.entries(record)) {
    if (Array.isArray(value)) {
      analysis.hasArrayFields = true;
      analysis.arrayFields.push({
        field: key,
        length: value.length,
        sample: value[0]
      });
    }
    
    if (typeof value === 'string' && value.length > 1000) {
      analysis.longTextFields.push({
        field: key,
        length: value.length
      });
    }
  }
  
  // 檢查特殊字符
  const jsonString = JSON.stringify(record);
  if (jsonString.match(/[\x00-\x1F\x7F]/)) {
    analysis.specialCharacters = true;
  }
  
  return { record: analysis, rawData: record };
}

async function main() {
  try {
    console.log('=== 深入分析同步失敗原因 ===\n');
    
    // 獲取認證
    const { accessToken, corpId } = await getAccessToken();
    const currentOpenUserId = await getCurrentUserId(corpId, accessToken);
    
    // 1. 統計對比
    console.log('📊 統計對比:');
    const crmCount = await getCRMCount(corpId, accessToken, currentOpenUserId);
    const d1Count = await getD1Count();
    const difference = crmCount - d1Count;
    
    console.log(`  CRM 記錄數: ${crmCount}`);
    console.log(`  D1 記錄數: ${d1Count}`);
    console.log(`  差異: ${difference} 條 (${(difference / crmCount * 100).toFixed(1)}%)\n`);
    
    // 2. 同步歷史
    console.log('📜 最近同步歷史:');
    const syncHistory = await getSyncHistory();
    
    for (const sync of syncHistory.slice(0, 3)) {
      console.log(`  ${sync.sync_time}:`);
      console.log(`    狀態: ${sync.status}`);
      console.log(`    記錄數: ${sync.records_count}`);
      
      if (sync.details) {
        try {
          const details = JSON.parse(sync.details);
          console.log(`    成功: ${details.success_count || details.records_count || 0}`);
          console.log(`    失敗: ${details.error_count || 0}`);
          
          if (details.errors && details.errors.length > 0) {
            console.log(`    錯誤訊息: ${details.errors[0]}`);
          }
        } catch (e) {
          // 忽略解析錯誤
        }
      }
      console.log('');
    }
    
    // 3. 抽樣檢查
    console.log('🔍 抽樣檢查記錄 (從後部分開始):');
    const { missing, existing } = await checkRandomRecords(corpId, accessToken, currentOpenUserId);
    
    console.log(`  檢查記錄數: ${missing.length + existing.length}`);
    console.log(`  存在於 D1: ${existing.length}`);
    console.log(`  缺失於 D1: ${missing.length}\n`);
    
    if (missing.length > 0) {
      console.log('❌ 缺失記錄詳情:');
      for (const record of missing.slice(0, 5)) {
        console.log(`\n  ID: ${record.id}`);
        console.log(`  名稱: ${record.name}`);
        console.log(`  偏移量: ${record.offset} (第 ${Math.floor(record.offset / 500) + 1} 批)`);
        console.log(`  創建時間: ${new Date(record.createTime).toISOString()}`);
        console.log(`  修改時間: ${new Date(record.modifyTime).toISOString()}`);
        
        // 分析單條記錄
        const analysis = await testDirectSync(corpId, accessToken, currentOpenUserId, record.id);
        if (analysis.record) {
          console.log(`  欄位數量: ${analysis.record.fieldCount}`);
          if (analysis.record.hasArrayFields) {
            console.log(`  數組欄位: ${analysis.record.arrayFields.map(f => f.field).join(', ')}`);
          }
          if (analysis.record.longTextFields.length > 0) {
            console.log(`  超長文本: ${analysis.record.longTextFields.map(f => `${f.field}(${f.length})`).join(', ')}`);
          }
          if (analysis.record.specialCharacters) {
            console.log(`  ⚠️ 包含特殊字符`);
          }
        }
      }
      
      // 4. 問題分析
      console.log('\n\n💡 問題分析:');
      console.log(`  1. 缺失記錄主要集中在偏移量 ${Math.min(...missing.map(m => m.offset))} 之後`);
      console.log(`  2. 這對應第 ${Math.floor(Math.min(...missing.map(m => m.offset)) / 500) + 1} 批次之後`);
      console.log(`  3. 可能原因:`);
      console.log(`     - Worker 執行時間限制導致後續批次未執行`);
      console.log(`     - 批次同步過程中的錯誤導致中斷`);
      console.log(`     - D1 資料庫寫入限制`);
      
      // 5. 建議
      console.log('\n🔧 建議解決方案:');
      console.log(`  1. 執行多次同步以處理剩餘記錄`);
      console.log(`  2. 減小批次大小（從 500 改為 200）`);
      console.log(`  3. 增加批次間延遲時間`);
      console.log(`  4. 實現斷點續傳功能`);
    } else {
      console.log('✅ 抽樣檢查未發現缺失記錄，可能是統計誤差');
    }
    
  } catch (error) {
    console.error('\n❌ 分析失敗:', error.message);
    if (error.response?.data) {
      console.error('錯誤詳情:', error.response.data);
    }
  }
}

main();