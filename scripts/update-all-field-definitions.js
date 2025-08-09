#!/usr/bin/env node
/**
 * 更新所有對象的欄位定義為實際 CRM 數據
 */

require('dotenv').config();
const axios = require('axios');

const baseUrl = 'https://open.fxiaoke.com';
const credentials = {
  appId: process.env.FX_APP_ID || 'FSAID_1320691',
  appSecret: process.env.FX_APP_SECRET || 'ec63ff237c5c4a759be36d3a8fb7a3b4',
  permanentCode: process.env.FX_PERMANENT_CODE || '899433A4A04A3B8CB1CC2183DA4B5B48'
};

// 所有對象的配置
const objects = [
  { apiName: 'NewOpportunityObj', displayName: '商機', isCustom: false },
  { apiName: 'SupplierObj', displayName: '供應商', isCustom: false },
  { apiName: 'object_8W9cb__c', displayName: '案場(SPC)', isCustom: true },
  { apiName: 'object_k1XqG__c', displayName: 'SPC維修單', isCustom: true },
  { apiName: 'site_cabinet__c', displayName: '案場(浴櫃)', isCustom: true },
  { apiName: 'progress_management_announ__c', displayName: '進度管理公告', isCustom: true }
];

async function getAccessToken() {
  const response = await axios.post(`${baseUrl}/cgi/corpAccessToken/get/V2`, credentials);
  if (response.data.errorCode !== 0) {
    throw new Error(`獲取 token 失敗: ${response.data.errorMessage}`);
  }
  return {
    corpId: response.data.corpId,
    corpAccessToken: response.data.corpAccessToken
  };
}

async function getCurrentUserId(corpId, accessToken) {
  const response = await axios.post(`${baseUrl}/cgi/user/getByMobile`, {
    corpId,
    corpAccessToken: accessToken,
    mobile: "17675662629"
  });
  if (response.data.errorCode !== 0) {
    throw new Error(`獲取用戶 ID 失敗: ${response.data.errorMessage}`);
  }
  return response.data.empList[0].openUserId;
}

// 從數據樣本推斷欄位類型
function inferFieldType(sampleValue) {
  if (sampleValue === null || sampleValue === undefined) {
    return 'TEXT';
  }
  
  if (typeof sampleValue === 'boolean') {
    return 'INTEGER'; // 布爾值存為整數 0/1
  }
  
  if (typeof sampleValue === 'number') {
    if (Number.isInteger(sampleValue)) {
      return 'INTEGER';
    } else {
      return 'REAL';
    }
  }
  
  if (typeof sampleValue === 'string') {
    // 檢查是否為日期時間格式
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
    const timestampRegex = /^\d{13}$/; // 13位毫秒時間戳
    
    if (isoDateRegex.test(sampleValue) || timestampRegex.test(sampleValue)) {
      return 'TEXT'; // 日期時間存為文本
    }
    
    return 'TEXT';
  }
  
  if (Array.isArray(sampleValue)) {
    return 'TEXT'; // 陣列序列化為 JSON 字符串
  }
  
  if (typeof sampleValue === 'object') {
    return 'TEXT'; // 對象序列化為 JSON 字符串
  }
  
  return 'TEXT'; // 預設為文本
}

async function analyzeObjectFields(corpId, corpAccessToken, currentOpenUserId, objectConfig) {
  console.log(`\n📋 分析 ${objectConfig.displayName} (${objectConfig.apiName})...`);

  try {
    // 根據對象類型選擇 API 端點
    const apiEndpoint = objectConfig.isCustom ? 
      '/cgi/crm/custom/v2/data/query' : 
      '/cgi/crm/v2/data/query';

    const queryResponse = await axios.post(`${baseUrl}${apiEndpoint}`, {
      corpId,
      corpAccessToken,
      currentOpenUserId,
      data: {
        dataObjectApiName: objectConfig.apiName,
        search_query_info: {
          limit: 50, // 獲取足夠的樣本
          offset: 0,
          filters: [{
            field_name: 'life_status',
            operator: 'NEQ',
            field_values: ['作废']
          }]
        }
      }
    });

    if (queryResponse.data.errorCode !== 0) {
      throw new Error(`查詢失敗: ${queryResponse.data.errorMessage}`);
    }

    const records = queryResponse.data.data.dataList || [];
    console.log(`  ✅ 獲取到 ${records.length} 條記錄`);

    if (records.length === 0) {
      console.log('  ⚠️ 沒有數據，跳過此對象');
      return null;
    }

    // 分析欄位
    const fieldDefinitions = new Map();
    
    records.forEach(record => {
      Object.entries(record).forEach(([fieldName, value]) => {
        if (fieldName !== 'searchAfterId' && fieldName !== 'total_num') {
          if (!fieldDefinitions.has(fieldName)) {
            const fieldType = inferFieldType(value);
            fieldDefinitions.set(fieldName, {
              apiName: fieldName,
              label: fieldName,
              dataType: fieldType,
              description: `Auto-generated from CRM data for ${objectConfig.displayName}`,
              isRequired: false,
              sampleValue: value
            });
          } else if (value != null) {
            // 更新樣本值（如果當前值更有意義）
            const existing = fieldDefinitions.get(fieldName);
            if (existing.sampleValue == null) {
              existing.sampleValue = value;
            }
          }
        }
      });
    });

    const fieldArray = Array.from(fieldDefinitions.values());
    console.log(`  ✅ 分析得到 ${fieldArray.length} 個欄位`);

    return {
      objectApiName: objectConfig.apiName,
      displayName: objectConfig.displayName,
      fields: fieldArray
    };

  } catch (error) {
    console.log(`  ❌ 分析失敗: ${error.message}`);
    return null;
  }
}

async function generateSQL(objectResults) {
  console.log('\n🔧 生成 SQL 更新語句...');
  
  const sqlStatements = [];
  
  objectResults.forEach(result => {
    if (!result || !result.fields || result.fields.length === 0) {
      return;
    }

    // 刪除舊記錄的 SQL
    const deleteSQL = `DELETE FROM fx_field_definitions WHERE object_api_name = '${result.objectApiName}';`;
    sqlStatements.push(deleteSQL);

    // 插入新記錄的 SQL
    const insertValues = result.fields.map(field => {
      const escapedLabel = field.label.replace(/'/g, "''");
      const escapedDesc = field.description.replace(/'/g, "''");
      return `('${result.objectApiName}', '${field.apiName}', '${escapedLabel}', '${field.dataType}', '${escapedDesc}', ${field.isRequired ? 1 : 0}, datetime('now'), 'CRM')`;
    }).join(',\n');
    
    const insertSQL = `INSERT INTO fx_field_definitions 
      (object_api_name, field_api_name, field_label, field_type, field_description, is_required, created_at, data_source) 
      VALUES ${insertValues};`;
    
    sqlStatements.push(insertSQL);
    
    console.log(`  ✅ ${result.displayName}: ${result.fields.length} 個欄位`);
  });

  return sqlStatements.join('\n\n');
}

async function updateAllFieldDefinitions() {
  console.log('='.repeat(80));
  console.log('更新所有對象的欄位定義為實際 CRM 數據');
  console.log('='.repeat(80));

  try {
    // 1. 獲取 CRM 認證
    console.log('\n1. 獲取 CRM 認證...');
    const { corpId, corpAccessToken } = await getAccessToken();
    const currentOpenUserId = await getCurrentUserId(corpId, corpAccessToken);
    console.log('✅ CRM 認證成功');

    // 2. 分析所有對象
    console.log('\n2. 分析所有對象的欄位定義...');
    const analysisResults = [];
    
    for (const objectConfig of objects) {
      const result = await analyzeObjectFields(corpId, corpAccessToken, currentOpenUserId, objectConfig);
      if (result) {
        analysisResults.push(result);
      }
      
      // 避免 API 限流，稍微暫停
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 3. 生成 SQL
    console.log('\n3. 生成更新 SQL...');
    const updateSQL = await generateSQL(analysisResults);
    
    if (updateSQL.trim().length === 0) {
      console.log('⚠️ 沒有生成任何 SQL 語句');
      return;
    }

    // 4. 輸出 SQL 檔案
    const fs = require('fs');
    const path = require('path');
    const sqlFilePath = path.join(__dirname, '..', 'workers', 'sql', 'update-all-field-definitions.sql');
    
    fs.writeFileSync(sqlFilePath, updateSQL, 'utf8');
    console.log(`✅ SQL 已保存到: ${sqlFilePath}`);

    // 5. 顯示摘要
    console.log('\n4. 更新摘要:');
    let totalFields = 0;
    analysisResults.forEach(result => {
      console.log(`  - ${result.displayName}: ${result.fields.length} 個欄位`);
      totalFields += result.fields.length;
    });
    console.log(`  總計: ${totalFields} 個欄位`);

    console.log('\n5. 執行建議:');
    console.log('請運行以下命令來執行 SQL 更新:');
    console.log(`cd workers && npx wrangler d1 execute fx-crm-database --file=sql/update-all-field-definitions.sql --remote`);

  } catch (error) {
    console.error('❌ 更新失敗:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('欄位定義更新任務完成');
  console.log('='.repeat(80));
}

// 執行更新
updateAllFieldDefinitions();