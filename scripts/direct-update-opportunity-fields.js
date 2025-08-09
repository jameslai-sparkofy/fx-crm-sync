#!/usr/bin/env node
/**
 * 直接更新商機對象欄位定義到 D1 資料庫
 */

require('dotenv').config();
const axios = require('axios');

const baseUrl = 'https://open.fxiaoke.com';
const credentials = {
  appId: process.env.FX_APP_ID || 'FSAID_1320691',
  appSecret: process.env.FX_APP_SECRET || 'ec63ff237c5c4a759be36d3a8fb7a3b4',
  permanentCode: process.env.FX_PERMANENT_CODE || '899433A4A04A3B8CB1CC2183DA4B5B48'
};

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

async function updateOpportunityFields() {
  console.log('='.repeat(60));
  console.log('直接更新商機對象欄位定義');
  console.log('='.repeat(60));

  try {
    // 1. 獲取 CRM 認證
    console.log('\n1. 獲取 CRM 認證...');
    const { corpId, corpAccessToken } = await getAccessToken();
    const currentOpenUserId = await getCurrentUserId(corpId, corpAccessToken);
    console.log('✅ CRM 認證成功');

    // 2. 查詢商機數據獲取實際欄位
    console.log('\n2. 查詢商機數據...');
    const queryResponse = await axios.post(`${baseUrl}/cgi/crm/v2/data/query`, {
      corpId,
      corpAccessToken,
      currentOpenUserId,
      data: {
        dataObjectApiName: 'NewOpportunityObj',
        search_query_info: {
          limit: 50, // 多取一些樣本來分析欄位類型
          offset: 0,
          filters: []
        }
      }
    });

    if (queryResponse.data.errorCode !== 0) {
      throw new Error(`查詢失敗: ${queryResponse.data.errorMessage}`);
    }

    const records = queryResponse.data.data.dataList || [];
    console.log(`✅ 獲取到 ${records.length} 條商機記錄`);

    if (records.length === 0) {
      console.log('⚠️ 沒有商機數據，無法分析欄位');
      return;
    }

    // 3. 分析欄位並生成欄位定義
    console.log('\n3. 分析欄位定義...');
    const fieldDefinitions = new Map();
    
    records.forEach(record => {
      Object.entries(record).forEach(([fieldName, value]) => {
        if (fieldName !== 'searchAfterId' && fieldName !== 'total_num') {
          if (!fieldDefinitions.has(fieldName)) {
            const fieldType = inferFieldType(value);
            fieldDefinitions.set(fieldName, {
              apiName: fieldName,
              label: fieldName, // CRM 沒有提供標籤，使用 API 名稱
              dataType: fieldType,
              description: `Auto-generated from CRM data`,
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

    console.log(`✅ 分析得到 ${fieldDefinitions.size} 個欄位`);

    // 4. 使用 Cloudflare D1 API 更新欄位定義
    console.log('\n4. 更新 D1 資料庫中的欄位定義...');
    
    const fieldArray = Array.from(fieldDefinitions.values());
    
    // 構建 SQL 語句
    const deleteOldSQL = `DELETE FROM fx_field_definitions WHERE object_api_name = 'NewOpportunityObj'`;
    
    const insertValues = fieldArray.map(field => 
      `('NewOpportunityObj', '${field.apiName}', '${field.label}', '${field.dataType}', '${field.description}', ${field.isRequired ? 1 : 0}, datetime('now'), 'CRM')`
    ).join(',\n');
    
    const insertSQL = `INSERT INTO fx_field_definitions 
      (object_api_name, field_api_name, field_label, field_type, field_description, is_required, created_at, data_source) 
      VALUES ${insertValues}`;

    console.log('SQL 更新語句:');
    console.log('- 刪除舊定義:', deleteOldSQL);
    console.log('- 插入新定義: 插入', fieldArray.length, '條記錄');

    // 5. 執行 D1 更新（使用 Cloudflare API）
    const workerUrl = 'https://fx-crm-sync.lai-jameslai.workers.dev';
    
    // 嘗試通過 worker 的 debug API 執行 SQL
    console.log('\n5. 執行資料庫更新...');
    
    try {
      // 先刪除舊記錄
      const deleteResponse = await axios.post(`${workerUrl}/api/debug/execute-sql`, {
        sql: deleteOldSQL
      });
      
      if (deleteResponse.data.success) {
        console.log('✅ 刪除舊欄位定義成功');
      } else {
        console.log('⚠️ 刪除舊欄位定義失敗:', deleteResponse.data.error);
      }

      // 再插入新記錄
      const insertResponse = await axios.post(`${workerUrl}/api/debug/execute-sql`, {
        sql: insertSQL
      });
      
      if (insertResponse.data.success) {
        console.log(`✅ 插入 ${fieldArray.length} 個新欄位定義成功`);
      } else {
        console.log('❌ 插入新欄位定義失敗:', insertResponse.data.error);
      }
      
    } catch (apiError) {
      console.log('⚠️ 無法通過 worker API 更新，輸出 SQL 供手動執行:');
      console.log('\n--- 手動執行以下 SQL ---');
      console.log(deleteOldSQL);
      console.log('\n' + insertSQL);
      console.log('\n--- SQL 結束 ---');
    }

    // 6. 驗證更新結果
    console.log('\n6. 驗證更新結果...');
    
    // 檢查是否還有浴櫃價格欄位
    const bathCabinetFields = fieldArray.filter(f => 
      f.apiName.includes('147x8') || 
      f.label?.includes('浴櫃') ||
      f.label?.includes('價格')
    );
    
    if (bathCabinetFields.length > 0) {
      console.log('⚠️ 仍然找到浴櫃相關欄位:');
      bathCabinetFields.forEach(field => {
        console.log(`  - ${field.apiName}: ${field.label}`);
      });
    } else {
      console.log('✅ 確認沒有浴櫃價格欄位');
    }
    
    // 顯示實際的價格欄位
    const priceFields = fieldArray.filter(f => 
      f.apiName.toLowerCase().includes('amount') ||
      f.label?.toLowerCase().includes('amount') ||
      f.label?.toLowerCase().includes('price') ||
      f.label?.includes('金額') ||
      f.label?.includes('價格')
    );
    
    if (priceFields.length > 0) {
      console.log('\n💰 實際的價格相關欄位:');
      priceFields.forEach(field => {
        console.log(`  - ${field.apiName}: ${field.label} (${field.dataType})`);
        console.log(`    樣本值: ${JSON.stringify(field.sampleValue)}`);
      });
    }

  } catch (error) {
    console.error('❌ 更新失敗:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('直接更新完成');
  console.log('='.repeat(60));
}

// 執行更新
updateOpportunityFields();