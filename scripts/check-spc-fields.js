// 檢查案場欄位變化
const axios = require('axios');

const API_URL = 'https://fx-crm-sync-dev.lai-jameslai.workers.dev';

async function checkFields() {
    console.log('🔍 檢查案場(SPC)欄位結構...\n');
    
    try {
        // 1. 從 API 獲取欄位信息
        const response = await axios.get(`${API_URL}/api/objects/object_8W9cb__c/fields`);
        const fields = response.data.data;
        
        console.log('📊 欄位統計：');
        console.log(`  系統欄位：${fields.systemFields.length} 個`);
        console.log(`  自定義欄位：${fields.customFields.length} 個`);
        console.log(`  總計：${fields.systemFields.length + fields.customFields.length} 個\n`);
        
        // 2. 檢查特定的重要欄位
        const importantFields = [
            'field_y6I8U__c',  // 案場名稱
            'field_03OBe__c',  // 案場編號
            'field_j14r1__c',  // 案場狀態
            'field_23Z5i__c',  // 可能是新欄位
            'field_shift_time__c',  // 班次時間
            'field_7dfz3__c',  // 師父姓名
        ];
        
        console.log('🔎 重要欄位檢查：');
        importantFields.forEach(fieldName => {
            const exists = [...fields.systemFields, ...fields.customFields].some(f => f.apiName === fieldName);
            console.log(`  ${fieldName}: ${exists ? '✅ 存在' : '❌ 不存在'}`);
        });
        
        // 3. 列出最新的幾個自定義欄位
        console.log('\n📝 最後 10 個自定義欄位：');
        const lastFields = fields.customFields.slice(-10);
        lastFields.forEach(field => {
            console.log(`  - ${field.apiName} (${field.displayName}) - ${field.fieldType}`);
        });
        
        // 4. 檢查可能的新欄位（2024年後添加的）
        console.log('\n🆕 可能的新欄位（包含特定模式）：');
        const newPatterns = ['23Z5i', '2024', 'new', 'shift'];
        fields.customFields.forEach(field => {
            if (newPatterns.some(pattern => field.apiName.toLowerCase().includes(pattern.toLowerCase()))) {
                console.log(`  - ${field.apiName} (${field.displayName})`);
            }
        });
        
        // 5. 數據庫同步建議
        console.log('\n💡 同步建議：');
        console.log('如果發現新欄位，可以執行以下操作：');
        console.log('1. 使用 field-sync API 更新欄位定義');
        console.log('2. 執行完整同步以獲取新欄位數據');
        console.log('3. 檢查 schema 是否需要更新');
        
    } catch (error) {
        console.error('❌ 錯誤：', error.message);
        if (error.response) {
            console.error('API 響應：', error.response.data);
        }
    }
}

checkFields();