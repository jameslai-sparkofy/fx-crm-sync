/**
 * 測試直接插入單條記錄到 D1
 * 找出為什麼前 600 條記錄有 558 個失敗
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

async function getFirstRecord(corpId, accessToken, currentOpenUserId) {
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
        ],
        orders: [{ fieldName: '_id', isAsc: true }]
      }
    }
  });

  if (response.data.errorCode !== 0) {
    throw new Error(`查詢失敗: ${response.data.errorMessage}`);
  }

  return response.data.data?.dataList?.[0];
}

async function testDirectSQL(record) {
  console.log('\n🧪 測試直接 SQL 插入...');
  
  // 準備 SQL 值
  const values = [
    record._id,
    record.name,
    JSON.stringify(record.owner || []),
    JSON.stringify(record.owner__r || {}),
    record.owner_department_id || null,
    JSON.stringify(record.owner_department || []),
    record.create_time || null,
    JSON.stringify(record.created_by || []),
    JSON.stringify(record.created_by__r || {}),
    record.last_modified_time || null,
    JSON.stringify(record.last_modified_by || []),
    JSON.stringify(record.last_modified_by__r || {}),
    record.life_status || null,
    JSON.stringify(record.life_status__r || {}),
    record.lock_status || null,
    JSON.stringify(record.lock_status__r || {}),
    record.is_deleted || false,
    record.record_type || null,
    record.version || null,
    JSON.stringify(record.data_own_department || []),
    JSON.stringify(record.data_own_department__r || {}),
    JSON.stringify(record.relevant_team || []),
    record.total_num || null,
    JSON.stringify(record.field_k7e6q__c || []),
    JSON.stringify(record.field_k7e6q__c__r || {}),
    JSON.stringify(record.field_k7e6q__c__relation_ids || []),
    JSON.stringify(record.field_1P96q__c || []),
    JSON.stringify(record.field_1P96q__c__r || {}),
    JSON.stringify(record.field_1P96q__c__relation_ids || []),
    JSON.stringify(record.field_npLvn__c || []),
    JSON.stringify(record.field_npLvn__c__r || {}),
    JSON.stringify(record.field_npLvn__c__relation_ids || []),
    record.field_WD7k1__c || null,
    record.field_XuJP2__c || null,
    record.field_i2Q1g__c || null,
    record.field_tXAko__c || null,
    record.field_Q6Svh__c || null,
    JSON.stringify(record.field_23Z5i__c || []),
    JSON.stringify(record.field_23Z5i__c__r || {}),
    JSON.stringify(record.field_dxr31__c || []),
    JSON.stringify(record.field_dxr31__c__r || {}),
    record.create_time || null,
    record.last_modified_time || null,
    1
  ];
  
  // 構建 SQL（簡化版，只插入必要欄位）
  const simplifiedSQL = `
    INSERT INTO object_8w9cb__c (
      _id, name, life_status, create_time, last_modified_time, 
      owner, created_by, last_modified_by, is_deleted, sync_version
    ) VALUES (
      '${record._id}',
      '${record.name.replace(/'/g, "''")}',
      '${record.life_status || 'normal'}',
      ${record.create_time},
      ${record.last_modified_time},
      '${JSON.stringify(record.owner || [])}',
      '${JSON.stringify(record.created_by || [])}',
      '${JSON.stringify(record.last_modified_by || [])}',
      ${record.is_deleted || false},
      1
    )
    ON CONFLICT(_id) DO UPDATE SET
      name = excluded.name,
      last_modified_time = excluded.last_modified_time,
      sync_version = sync_version + 1,
      sync_time = CURRENT_TIMESTAMP
  `;
  
  try {
    const response = await axios.post(`${WORKER_URL}/api/database/execute`, {
      sql: simplifiedSQL
    }, {
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-123'
      },
      timeout: 10000
    });
    
    if (response.data.success) {
      console.log('✅ SQL 插入成功！');
      return true;
    } else {
      console.log('❌ SQL 插入失敗:', response.data.error);
      return false;
    }
  } catch (error) {
    console.log('❌ SQL 執行錯誤:', error.response?.data?.error || error.message);
    return false;
  }
}

async function testCRUDAPI(record) {
  console.log('\n🧪 測試 CRUD API 插入...');
  
  try {
    const response = await axios.post(
      `${WORKER_URL}/api/crud/object_8W9cb__c`,
      record,
      {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token-123'
        },
        timeout: 10000
      }
    );
    
    if (response.data.success) {
      console.log('✅ CRUD API 插入成功！');
      return true;
    } else {
      console.log('❌ CRUD API 插入失敗:', response.data.error);
      return false;
    }
  } catch (error) {
    console.log('❌ CRUD API 錯誤:', error.response?.data?.error || error.message);
    return false;
  }
}

async function main() {
  try {
    console.log('=== 測試直接插入記錄 ===\n');
    
    // 獲取認證
    const { accessToken, corpId } = await getAccessToken();
    const currentOpenUserId = await getCurrentUserId(corpId, accessToken);
    
    // 獲取第一條記錄
    console.log('📊 獲取第一條 CRM 記錄...');
    const record = await getFirstRecord(corpId, accessToken, currentOpenUserId);
    
    if (!record) {
      console.log('❌ 沒有找到記錄');
      return;
    }
    
    console.log(`\n記錄資訊:`);
    console.log(`  ID: ${record._id}`);
    console.log(`  名稱: ${record.name}`);
    console.log(`  生命狀態: ${record.life_status}`);
    console.log(`  創建時間: ${new Date(record.create_time).toISOString()}`);
    console.log(`  欄位數量: ${Object.keys(record).length}`);
    
    // 分析記錄結構
    console.log('\n📋 記錄結構分析:');
    const arrayFields = [];
    const objectFields = [];
    const nullFields = [];
    const longTextFields = [];
    
    for (const [key, value] of Object.entries(record)) {
      if (value === null || value === undefined) {
        nullFields.push(key);
      } else if (Array.isArray(value)) {
        arrayFields.push(`${key} (${value.length})`);
      } else if (typeof value === 'object') {
        objectFields.push(key);
      } else if (typeof value === 'string' && value.length > 1000) {
        longTextFields.push(`${key} (${value.length})`);
      }
    }
    
    console.log(`  數組欄位: ${arrayFields.length} 個`);
    if (arrayFields.length > 0) {
      console.log(`    ${arrayFields.slice(0, 5).join(', ')}`);
    }
    console.log(`  物件欄位: ${objectFields.length} 個`);
    console.log(`  空值欄位: ${nullFields.length} 個`);
    console.log(`  超長文本: ${longTextFields.length} 個`);
    
    // 測試直接 SQL
    const sqlSuccess = await testDirectSQL(record);
    
    // 測試 CRUD API
    const crudSuccess = await testCRUDAPI(record);
    
    // 總結
    console.log('\n📊 測試結果總結:');
    console.log(`  直接 SQL: ${sqlSuccess ? '✅ 成功' : '❌ 失敗'}`);
    console.log(`  CRUD API: ${crudSuccess ? '✅ 成功' : '❌ 失敗'}`);
    
    if (!sqlSuccess && !crudSuccess) {
      console.log('\n💡 可能的問題:');
      console.log('  1. D1 表結構與數據不匹配');
      console.log('  2. 某些欄位有特殊字符或格式問題');
      console.log('  3. 權限或配置問題');
      console.log('  4. 建議檢查 Worker 日誌獲取詳細錯誤信息');
    }
    
  } catch (error) {
    console.error('\n❌ 測試失敗:', error.message);
    if (error.response?.data) {
      console.error('錯誤詳情:', error.response.data);
    }
  }
}

main();