#!/usr/bin/env node
/**
 * 強制更新商機對象的欄位到資料庫，替換假數據
 */

const axios = require('axios');

const WORKER_URL = 'https://fx-crm-sync.lai-jameslai.workers.dev';

async function updateOpportunityFields() {
  console.log('='.repeat(60));
  console.log('更新商機對象欄位定義');
  console.log('='.repeat(60));

  try {
    // 1. 強制同步商機欄位
    console.log('\n1. 執行商機欄位同步...');
    const response = await axios.post(`${WORKER_URL}/api/field-sync/NewOpportunityObj`);
    
    if (response.data.success) {
      console.log('✅ 商機欄位同步成功');
      const data = response.data.data;
      console.log(`  - CRM欄位數: ${data.comparison.crmFields}`);
      console.log(`  - D1欄位數: ${data.comparison.d1Fields}`);
      console.log(`  - 變更數: ${data.changes.length}`);
    } else {
      console.log('❌ 商機欄位同步失敗:', response.data.error);
    }

    // 2. 驗證欄位定義
    console.log('\n2. 驗證更新後的欄位定義...');
    const fieldsResponse = await axios.get(`${WORKER_URL}/api/field-sync/NewOpportunityObj/fields`);
    
    if (fieldsResponse.data.success) {
      const fields = fieldsResponse.data.data.fields;
      console.log(`✅ 獲取到 ${fields.length} 個欄位`);
      console.log(`  - 數據來源: ${fieldsResponse.data.data.source}`);
      
      // 檢查是否還有浴櫃價格欄位
      const bathCabinetField = fields.find(f => 
        f.apiName.includes('147x8') || 
        f.label?.includes('浴櫃') ||
        f.label?.includes('價格')
      );
      
      if (bathCabinetField) {
        console.log('⚠️ 仍然找到浴櫃相關欄位:', bathCabinetField);
      } else {
        console.log('✅ 已移除假的浴櫃價格欄位');
      }
      
      // 顯示實際的價格欄位
      const priceFields = fields.filter(f => 
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
        });
      }
      
    } else {
      console.log('❌ 獲取欄位定義失敗:', fieldsResponse.data.error);
    }

  } catch (error) {
    console.error('❌ 更新失敗:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('更新完成');
  console.log('='.repeat(60));
}

// 執行更新
updateOpportunityFields();