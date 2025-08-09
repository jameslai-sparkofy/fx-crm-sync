/**
 * 分析失敗記錄的特徵
 * 第 1 批 (offset 0-600): 146 個失敗
 * 第 2 批 (offset 600-1200): 412 個失敗
 * 總計: 558 個失敗（正好等於缺失的記錄數）
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

async function getRecordsFromBatch(corpId, accessToken, currentOpenUserId, offset, limit) {
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

  return response.data.data?.dataList || [];
}

async function checkRecordInD1(recordId) {
  try {
    const response = await axios.get(
      `${WORKER_URL}/api/crud/object_8W9cb__c/${recordId}`,
      { 
        headers: {
          'Authorization': 'Bearer test-token-123'
        },
        timeout: 5000 
      }
    );
    return response.data.success;
  } catch (error) {
    if (error.response?.status === 404) {
      return false;
    }
    return null; // 不確定
  }
}

async function tryInsertRecord(record) {
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
    return {
      success: response.data.success,
      error: response.data.error || null
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.error || error.message
    };
  }
}

async function analyzeRecord(record) {
  const issues = [];
  
  // 檢查基本欄位
  if (!record._id) issues.push('缺少 _id');
  if (!record.name) issues.push('缺少 name');
  
  // 檢查特殊字符
  const jsonString = JSON.stringify(record);
  if (jsonString.includes('\u0000')) issues.push('包含 NULL 字符');
  if (jsonString.includes('\\')) issues.push('包含反斜線');
  
  // 檢查超長欄位
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'string' && value.length > 5000) {
      issues.push(`${key} 過長: ${value.length} 字符`);
    }
  }
  
  // 檢查數組欄位格式
  const arrayFields = ['owner', 'created_by', 'field_23Z5i__c'];
  for (const field of arrayFields) {
    if (record[field]) {
      if (!Array.isArray(record[field])) {
        issues.push(`${field} 不是數組`);
      } else if (record[field].length === 0) {
        issues.push(`${field} 是空數組`);
      }
    }
  }
  
  // 檢查時間欄位
  const timeFields = ['create_time', 'last_modified_time'];
  for (const field of timeFields) {
    if (record[field]) {
      const time = new Date(record[field]);
      if (isNaN(time.getTime())) {
        issues.push(`${field} 時間格式錯誤`);
      }
    }
  }
  
  return issues;
}

async function main() {
  try {
    console.log('=== 分析失敗記錄特徵 ===\n');
    
    // 獲取認證
    const { accessToken, corpId } = await getAccessToken();
    const currentOpenUserId = await getCurrentUserId(corpId, accessToken);
    
    // 分析第 1 批 (offset 0-600)
    console.log('📊 分析第 1 批 (offset 0-600，預期 146 個失敗)...\n');
    const batch1 = await getRecordsFromBatch(corpId, accessToken, currentOpenUserId, 0, 600);
    
    let failedInBatch1 = [];
    let successInBatch1 = [];
    
    for (let i = 0; i < batch1.length; i++) {
      const record = batch1[i];
      const existsInD1 = await checkRecordInD1(record._id);
      
      if (existsInD1 === false) {
        failedInBatch1.push(record);
      } else if (existsInD1 === true) {
        successInBatch1.push(record);
      }
      
      if ((i + 1) % 50 === 0) {
        process.stdout.write(`\r檢查進度: ${i + 1}/${batch1.length}`);
      }
    }
    
    console.log(`\r檢查完成: ${batch1.length} 條記錄`);
    console.log(`  ✅ 已在 D1: ${successInBatch1.length} 條`);
    console.log(`  ❌ 不在 D1: ${failedInBatch1.length} 條\n`);
    
    // 分析第 2 批 (offset 600-1200)
    console.log('📊 分析第 2 批 (offset 600-1200，預期 412 個失敗)...\n');
    const batch2 = await getRecordsFromBatch(corpId, accessToken, currentOpenUserId, 600, 600);
    
    let failedInBatch2 = [];
    let successInBatch2 = [];
    
    for (let i = 0; i < batch2.length; i++) {
      const record = batch2[i];
      const existsInD1 = await checkRecordInD1(record._id);
      
      if (existsInD1 === false) {
        failedInBatch2.push(record);
      } else if (existsInD1 === true) {
        successInBatch2.push(record);
      }
      
      if ((i + 1) % 50 === 0) {
        process.stdout.write(`\r檢查進度: ${i + 1}/${batch2.length}`);
      }
    }
    
    console.log(`\r檢查完成: ${batch2.length} 條記錄`);
    console.log(`  ✅ 已在 D1: ${successInBatch2.length} 條`);
    console.log(`  ❌ 不在 D1: ${failedInBatch2.length} 條\n`);
    
    // 合併失敗記錄
    const allFailed = [...failedInBatch1, ...failedInBatch2];
    console.log(`\n📈 總計失敗記錄: ${allFailed.length} 條`);
    
    if (allFailed.length > 0) {
      // 分析失敗記錄的共同特徵
      console.log('\n🔍 分析失敗記錄的共同特徵...\n');
      
      const issueStats = {};
      const sampleIssues = [];
      
      for (let i = 0; i < Math.min(20, allFailed.length); i++) {
        const record = allFailed[i];
        const issues = await analyzeRecord(record);
        
        // 統計問題類型
        for (const issue of issues) {
          issueStats[issue] = (issueStats[issue] || 0) + 1;
        }
        
        if (issues.length > 0) {
          sampleIssues.push({
            id: record._id,
            name: record.name,
            issues: issues
          });
        }
      }
      
      // 顯示問題統計
      if (Object.keys(issueStats).length > 0) {
        console.log('❌ 發現的問題類型:');
        for (const [issue, count] of Object.entries(issueStats)) {
          console.log(`  - ${issue}: ${count} 條`);
        }
        
        console.log('\n📝 問題記錄樣本:');
        for (const sample of sampleIssues.slice(0, 5)) {
          console.log(`\n  ${sample.name} (${sample.id})`);
          for (const issue of sample.issues) {
            console.log(`    ⚠️ ${issue}`);
          }
        }
      } else {
        console.log('✅ 記錄格式看起來正常');
      }
      
      // 嘗試手動插入一條失敗記錄
      console.log('\n🧪 嘗試手動插入一條失敗記錄...');
      const testRecord = allFailed[0];
      console.log(`  測試記錄: ${testRecord.name} (${testRecord._id})`);
      
      const insertResult = await tryInsertRecord(testRecord);
      if (insertResult.success) {
        console.log('  ✅ 插入成功！');
      } else {
        console.log(`  ❌ 插入失敗: ${insertResult.error}`);
        
        // 分析錯誤信息
        if (insertResult.error) {
          console.log('\n💡 錯誤分析:');
          if (insertResult.error.includes('UNIQUE')) {
            console.log('  - 記錄已存在（UNIQUE 約束）');
          } else if (insertResult.error.includes('NULL')) {
            console.log('  - 必填欄位為空');
          } else if (insertResult.error.includes('type')) {
            console.log('  - 數據類型不匹配');
          } else {
            console.log(`  - 其他錯誤: ${insertResult.error}`);
          }
        }
      }
      
      // 檢查生命狀態分佈
      console.log('\n📊 失敗記錄的生命狀態分佈:');
      const statusCount = {};
      for (const record of allFailed) {
        const status = record.life_status || '未知';
        statusCount[status] = (statusCount[status] || 0) + 1;
      }
      for (const [status, count] of Object.entries(statusCount)) {
        console.log(`  ${status}: ${count} 條`);
      }
      
      // 檢查創建時間分佈
      console.log('\n📅 失敗記錄的創建時間分佈:');
      const timeRanges = {
        '2024年及之前': 0,
        '2025年1-3月': 0,
        '2025年4-6月': 0,
        '2025年7-8月': 0
      };
      
      for (const record of allFailed) {
        const createTime = new Date(record.create_time);
        if (createTime < new Date('2025-01-01')) {
          timeRanges['2024年及之前']++;
        } else if (createTime < new Date('2025-04-01')) {
          timeRanges['2025年1-3月']++;
        } else if (createTime < new Date('2025-07-01')) {
          timeRanges['2025年4-6月']++;
        } else {
          timeRanges['2025年7-8月']++;
        }
      }
      
      for (const [range, count] of Object.entries(timeRanges)) {
        if (count > 0) {
          console.log(`  ${range}: ${count} 條`);
        }
      }
    }
    
    // 最終建議
    console.log('\n💡 建議解決方案:');
    if (allFailed.length === 558) {
      console.log('  ✅ 找到了所有 558 條缺失記錄！');
    }
    console.log('  1. 檢查 D1 表結構是否有約束限制');
    console.log('  2. 考慮批量清理並重新創建這些記錄');
    console.log('  3. 實施更詳細的錯誤日誌記錄');
    console.log('  4. 考慮使用事務處理確保數據一致性');
    
  } catch (error) {
    console.error('\n❌ 分析失敗:', error.message);
    if (error.response?.data) {
      console.error('錯誤詳情:', error.response.data);
    }
  }
}

main();