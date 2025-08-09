const axios = require('axios');
const { execSync } = require('child_process');

// CRM 實際返回的 50 個欄位（從之前的 CSV 獲得）
const crmFields = [
  "shift_time__c", "created_by__r", "owner_department_id", "total_num", 
  "owner_department", "searchAfterId", "field_k7e6q__c__r", "lock_status", 
  "data_own_department__r", "create_time", "field_1P96q__c__r", 
  "field_npLvn__c__relation_ids", "version", "created_by", "relevant_team", 
  "data_own_department", "field_B2gh1__c", "name", "field_i2Q1g__c", "_id", 
  "data_own_department__l", "field_WD7k1__c", "field_npLvn__c", 
  "field_dxr31__c__r", "lock_status__r", "is_deleted", "owner__l", 
  "field_npLvn__c__r", "relevant_team__r", "shift_time__c__v", 
  "field_23Z5i__c__r", "owner__r", "owner", "field_k7e6q__c__relation_ids", 
  "last_modified_time", "life_status", "last_modified_by__l", "created_by__l", 
  "field_k7e6q__c", "last_modified_by", "field_Q6Svh__c", "record_type", 
  "last_modified_by__r", "field_23Z5i__c", "field_XuJP2__c", "life_status__r", 
  "field_1P96q__c", "field_1P96q__c__relation_ids", "field_tXAko__c", 
  "field_dxr31__c"
];

// 獲取 D1 表的所有欄位
const command = `export CLOUDFLARE_API_TOKEN="dVz3UwCaZ3n617xbQOshQU1NnA0qqRgTR9BAjxPK" && npx wrangler d1 execute fx-crm-database --remote --command="SELECT name FROM pragma_table_info('object_8w9cb__c');" --json 2>/dev/null`;

try {
  const output = execSync(command, { encoding: 'utf-8' });
  const result = JSON.parse(output);
  const d1Fields = result[0].results.map(row => row.name);
  
  console.log('=== 欄位比較分析 ===\n');
  console.log(`CRM 欄位數量: ${crmFields.length}`);
  console.log(`D1 欄位數量: ${d1Fields.length}\n`);
  
  // 找出 D1 有但 CRM 沒有的欄位
  const d1OnlyFields = d1Fields.filter(field => !crmFields.includes(field));
  console.log(`D1 獨有的欄位 (${d1OnlyFields.length} 個):`);
  console.log('-----------------------------------');
  d1OnlyFields.sort().forEach(field => {
    console.log(`- ${field}`);
  });
  
  console.log('\n');
  
  // 找出 CRM 有但 D1 沒有的欄位
  const crmOnlyFields = crmFields.filter(field => !d1Fields.includes(field));
  console.log(`CRM 有但 D1 沒有的欄位 (${crmOnlyFields.length} 個):`);
  console.log('-----------------------------------');
  crmOnlyFields.sort().forEach(field => {
    console.log(`- ${field}`);
  });
  
  console.log('\n');
  
  // 共同的欄位
  const commonFields = crmFields.filter(field => d1Fields.includes(field));
  console.log(`共同的欄位 (${commonFields.length} 個):`);
  console.log('-----------------------------------');
  commonFields.sort().forEach(field => {
    console.log(`- ${field}`);
  });
  
  // 分析 D1 獨有欄位的類型
  console.log('\n=== D1 獨有欄位分析 ===');
  const fieldTypes = {
    system: [],
    field_extra: [],
    other: []
  };
  
  d1OnlyFields.forEach(field => {
    if (field.startsWith('fx_') || field.startsWith('sync_')) {
      fieldTypes.system.push(field);
    } else if (field.startsWith('field_')) {
      fieldTypes.field_extra.push(field);
    } else {
      fieldTypes.other.push(field);
    }
  });
  
  console.log(`\n系統欄位 (${fieldTypes.system.length} 個): ${fieldTypes.system.join(', ')}`);
  console.log(`\n額外的 field 欄位 (${fieldTypes.field_extra.length} 個):`);
  fieldTypes.field_extra.forEach(f => console.log(`  - ${f}`));
  console.log(`\n其他欄位 (${fieldTypes.other.length} 個):`);
  fieldTypes.other.forEach(f => console.log(`  - ${f}`));
  
} catch (error) {
  console.error('Error:', error.message);
}