#!/usr/bin/env node
/**
 * 測試欄位顯示功能
 */

const axios = require('axios');

// Worker URL
const WORKER_URL = 'https://fx-crm-sync.lai-jameslai.workers.dev';

async function testFieldDisplay() {
  console.log('='.repeat(60));
  console.log('測試欄位顯示功能');
  console.log('='.repeat(60));

  try {
    // 測試案場(SPC)的欄位顯示
    const objectApiName = 'object_8W9cb__c';
    console.log(`\n測試對象: 案場(SPC) - ${objectApiName}`);
    console.log('-'.repeat(60));

    // 調用欄位獲取API
    const response = await axios.get(`${WORKER_URL}/api/schema/${objectApiName}/fields`);
    
    if (response.data.success) {
      const data = response.data.data;
      console.log(`\n✅ 成功獲取欄位資訊`);
      console.log(`對象名稱: ${data.objectDisplayName || data.objectApiName}`);
      console.log(`欄位總數: ${data.fieldCount}`);
      console.log(`資料來源: ${data.source || 'API'}`);
      
      // 顯示前10個欄位作為示例
      console.log('\n欄位對應表（前10個）:');
      console.log('-'.repeat(60));
      console.log('中文名稱\t\tAPI欄位\t\t資料類型\t必填\t選項值');
      console.log('-'.repeat(60));
      
      const fieldsToShow = data.fields.slice(0, 10);
      fieldsToShow.forEach(field => {
        const label = (field.label || '').padEnd(16, ' ');
        const apiName = (field.apiName || '').padEnd(20, ' ');
        const dataType = (field.dataType || '').padEnd(12, ' ');
        const required = field.required ? '是' : '否';
        const options = field.description ? field.description.substring(0, 20) : '';
        
        console.log(`${label}\t${apiName}\t${dataType}\t${required}\t${options}`);
      });
      
      // 檢查特定欄位
      console.log('\n重要欄位檢查:');
      const importantFields = ['name', 'field_23Z5i__c', 'field_1P96q__c', 'shift_time__c'];
      importantFields.forEach(fieldName => {
        const field = data.fields.find(f => f.apiName === fieldName);
        if (field) {
          console.log(`✅ ${fieldName}: ${field.label} (${field.dataType})`);
          if (field.description) {
            console.log(`   選項: ${field.description}`);
          }
        } else {
          console.log(`❌ ${fieldName}: 未找到`);
        }
      });
      
    } else {
      console.error('❌ 獲取欄位失敗:', response.data.error);
    }
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('測試完成');
  console.log('='.repeat(60));
}

// 執行測試
testFieldDisplay();