/**
 * 分析同步錯誤 - 找出哪些記錄同步失敗
 */

const axios = require('axios');
require('dotenv').config();

const FX_CONFIG = {
  baseUrl: process.env.FX_API_BASE_URL || 'https://open.fxiaoke.com',
  appId: process.env.FXIAOKE_APP_ID || 'FSAID_1320691',
  appSecret: process.env.FXIAOKE_APP_SECRET || 'ec63ff237c5c4a759be36d3a8fb7a3b4',
  permanentCode: process.env.FXIAOKE_PERMANENT_CODE || '899433A4A04A3B8CB1CC2183DA4B5B48'
};

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

async function fetchBatch(corpId, accessToken, currentOpenUserId, offset, limit) {
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

  return response.data.data;
}

async function getD1Records() {
  const response = await axios.get('https://fx-crm-sync.lai-jameslai.workers.dev/api/sync/database-stats');
  const siteTable = response.data.data.tables.find(t => t.apiName === 'object_8W9cb__c');
  return siteTable.recordCount;
}

async function analyzeRecord(record) {
  const problems = [];
  
  // 檢查 ID
  if (!record._id) {
    problems.push('缺少 _id');
  }
  
  // 檢查必要欄位
  if (!record.name) {
    problems.push('缺少 name');
  }
  
  // 檢查可能導致錯誤的特殊字符
  const jsonString = JSON.stringify(record);
  if (jsonString.includes('\u0000')) {
    problems.push('包含 NULL 字符');
  }
  
  // 檢查數組欄位
  const arrayFields = ['owner', 'created_by', 'field_23Z5i__c'];
  for (const field of arrayFields) {
    if (record[field] && !Array.isArray(record[field])) {
      problems.push(`${field} 不是數組`);
    }
  }
  
  // 檢查超長文本
  if (record.name && record.name.length > 1000) {
    problems.push(`name 過長: ${record.name.length} 字符`);
  }
  
  // 檢查欄位數量
  const fieldCount = Object.keys(record).length;
  if (fieldCount > 100) {
    problems.push(`欄位過多: ${fieldCount} 個`);
  }
  
  return problems;
}

async function main() {
  try {
    console.log('=== 分析同步錯誤 ===\n');
    
    // 獲取認證
    const { accessToken, corpId } = await getAccessToken();
    const currentOpenUserId = await getCurrentUserId(corpId, accessToken);
    
    // 獲取 D1 記錄數
    const d1Count = await getD1Records();
    console.log(`D1 資料庫記錄數: ${d1Count}`);
    
    // 分析失敗的批次（第2批和第3批）
    console.log('\n分析可能失敗的記錄...\n');
    
    const problemRecords = [];
    const batchesToCheck = [
      { offset: 500, limit: 500, batch: '第2批' },
      { offset: 1000, limit: 500, batch: '第3批' },
      { offset: 1500, limit: 500, batch: '第4批' }
    ];
    
    for (const { offset, limit, batch } of batchesToCheck) {
      console.log(`檢查 ${batch} (offset: ${offset})...`);
      const data = await fetchBatch(corpId, accessToken, currentOpenUserId, offset, limit);
      const records = data.dataList || [];
      
      console.log(`- 獲取到 ${records.length} 條記錄`);
      
      let problemCount = 0;
      for (const record of records) {
        const problems = await analyzeRecord(record);
        if (problems.length > 0) {
          problemCount++;
          problemRecords.push({
            id: record._id,
            name: record.name || 'N/A',
            problems: problems,
            batch: batch
          });
        }
      }
      
      console.log(`- 發現 ${problemCount} 條問題記錄\n`);
    }
    
    // 顯示問題記錄
    if (problemRecords.length > 0) {
      console.log('=== 問題記錄詳情 ===\n');
      
      // 統計問題類型
      const problemStats = {};
      for (const record of problemRecords) {
        for (const problem of record.problems) {
          problemStats[problem] = (problemStats[problem] || 0) + 1;
        }
      }
      
      console.log('問題類型統計:');
      for (const [problem, count] of Object.entries(problemStats)) {
        console.log(`- ${problem}: ${count} 條`);
      }
      
      // 顯示前10條問題記錄
      console.log('\n前10條問題記錄:');
      for (let i = 0; i < Math.min(10, problemRecords.length); i++) {
        const record = problemRecords[i];
        console.log(`\n${i + 1}. ID: ${record.id}`);
        console.log(`   名稱: ${record.name}`);
        console.log(`   批次: ${record.batch}`);
        console.log(`   問題: ${record.problems.join(', ')}`);
      }
      
      console.log(`\n總共發現 ${problemRecords.length} 條問題記錄`);
    } else {
      console.log('未發現明顯的數據問題');
    }
    
    // 檢查特定範圍的記錄
    console.log('\n=== 檢查特定記錄範例 ===\n');
    const sampleData = await fetchBatch(corpId, accessToken, currentOpenUserId, 1000, 5);
    const sampleRecords = sampleData.dataList || [];
    
    for (const record of sampleRecords.slice(0, 2)) {
      console.log(`\nID: ${record._id}`);
      console.log(`名稱: ${record.name}`);
      console.log(`欄位數量: ${Object.keys(record).length}`);
      console.log(`Owner 類型: ${typeof record.owner} (是否數組: ${Array.isArray(record.owner)})`);
      
      // 檢查特殊欄位
      if (record.field_23Z5i__c) {
        console.log(`field_23Z5i__c 類型: ${typeof record.field_23Z5i__c}`);
        if (Array.isArray(record.field_23Z5i__c)) {
          console.log(`  - 數組長度: ${record.field_23Z5i__c.length}`);
        }
      }
    }
    
  } catch (error) {
    console.error('\n❌ 分析失敗:', error.message);
    if (error.response?.data) {
      console.error('API 錯誤詳情:', error.response.data);
    }
  }
}

main();