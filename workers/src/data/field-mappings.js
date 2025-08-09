/**
 * 欄位對應表 - 從 CSV 檔案匯入的欄位映射
 * 這些資料來自紛享銷客後台匯出的 CSV 檔案
 */

export const fieldMappings = {
  // 案場(SPC) - object_8W9cb__c
  'object_8W9cb__c': {
    displayName: '案場(SPC)',
    fields: [
      // 這裡將放入從 CSV 匯入的欄位
      // 格式範例：
      // { apiName: 'name', label: '案場名稱', dataType: 'TEXT', required: true, description: '案場的名稱' },
      // { apiName: 'field_1P96q__c', label: '所屬建案', dataType: 'LOOKUP', required: false, description: '關聯到建案對象' },
      // { apiName: 'field_dxr31__c', label: '案場類型', dataType: 'SELECT', required: true, description: '工地/樣品屋/展示間' },
      // { apiName: 'field_23Z5i__c', label: '施工狀態', dataType: 'SELECT', required: false, description: '準備中/施工中/已完工' },
    ]
  },
  
  // 案場(浴櫃) - site_cabinet__c
  'site_cabinet__c': {
    displayName: '案場(浴櫃)',
    fields: [
      // 這裡將放入從 CSV 匯入的欄位
      // 格式範例：
      // { apiName: 'name', label: '浴櫃名稱', dataType: 'TEXT', required: true, description: '浴櫃的名稱' },
      // { apiName: 'field_1P96q__c', label: '所屬建案', dataType: 'LOOKUP', required: false, description: '關聯到建案對象' },
      // { apiName: 'field_dxr31__c', label: '浴櫃類型', dataType: 'SELECT', required: true, description: '標準型/客製型' },
      // { apiName: 'field_23Z5i__c', label: '安裝狀態', dataType: 'SELECT', required: false, description: '待安裝/安裝中/已完成' },
    ]
  },
  
  // 商機 - NewOpportunityObj
  'NewOpportunityObj': {
    displayName: '商機',
    fields: [
      { apiName: '_id', label: '記錄ID', dataType: 'TEXT', required: true, description: '系統自動產生的唯一識別碼' },
      { apiName: 'name', label: '商機名稱', dataType: 'TEXT', required: true, description: '商機的名稱' },
      { apiName: 'account_id', label: '客戶ID', dataType: 'TEXT', required: false, description: '關聯的客戶ID' },
      { apiName: 'account_id__r', label: '客戶', dataType: 'LOOKUP', required: false, description: '關聯的客戶詳情' },
      { apiName: 'owner', label: '負責人', dataType: 'TEXT', required: true, description: '商機負責人' },
      { apiName: 'owner__r', label: '負責人詳情', dataType: 'LOOKUP', required: false, description: '負責人的詳細資訊' },
      { apiName: 'sales_stage__r', label: '銷售階段', dataType: 'SELECT', required: false, description: '商機所處的銷售階段' },
      { apiName: 'sales_status__r', label: '銷售狀態', dataType: 'SELECT', required: false, description: '進行中/贏單/輸單' },
      { apiName: 'create_time', label: '創建時間', dataType: 'DATETIME', required: true, description: '記錄創建時間' },
      { apiName: 'last_modified_time', label: '最後修改時間', dataType: 'DATETIME', required: true, description: '記錄最後修改時間' },
    ]
  },
  
  // 維修單 - object_k1XqG__c
  'object_k1XqG__c': {
    displayName: '維修單',
    fields: [
      { apiName: '_id', label: '記錄ID', dataType: 'TEXT', required: true, description: '系統自動產生的唯一識別碼' },
      { apiName: 'name', label: '維修單號', dataType: 'TEXT', required: true, description: '維修單編號' },
      { apiName: 'field_SW6Eb__c', label: '維修內容', dataType: 'TEXT', required: false, description: '維修的詳細內容' },
      { apiName: 'building_type__c', label: '建築類型', dataType: 'SELECT', required: false, description: '建築物類型' },
      { apiName: 'owner', label: '負責人', dataType: 'TEXT', required: true, description: '維修單負責人' },
      { apiName: 'life_status', label: '生命週期狀態', dataType: 'SELECT', required: false, description: '正常/作廢' },
    ]
  },
  
  // 工地師父 - object_50HJ8__c
  'object_50HJ8__c': {
    displayName: '工地師父',
    fields: [
      { apiName: '_id', label: '記錄ID', dataType: 'TEXT', required: true, description: '系統自動產生的唯一識別碼' },
      { apiName: 'name', label: '師父姓名', dataType: 'TEXT', required: true, description: '工地師父的姓名' },
      { apiName: 'field_iL2BT__c__r', label: '工種', dataType: 'SELECT', required: false, description: '工班/木工/水電等' },
      { apiName: 'field_D1087__c__r', label: '所屬公司', dataType: 'LOOKUP', required: false, description: '所屬的承包公司' },
      { apiName: 'field_a7jCj__c__r', label: '負責案場', dataType: 'MULTI_LOOKUP', required: false, description: '負責的案場列表' },
    ]
  },
  
  // 供應商 - SupplierObj
  'SupplierObj': {
    displayName: '供應商',
    fields: [
      { apiName: '_id', label: '記錄ID', dataType: 'TEXT', required: true, description: '系統自動產生的唯一識別碼' },
      { apiName: 'name', label: '供應商名稱', dataType: 'TEXT', required: true, description: '供應商的公司名稱' },
      { apiName: 'field_S4126__c__r', label: '供應類別', dataType: 'SELECT', required: false, description: '材料/工程/服務' },
      { apiName: 'is_enable__r', label: '啟用狀態', dataType: 'BOOLEAN', required: false, description: '是否啟用' },
    ]
  },
  
  // 進度管理公告 - progress_management_announ__c
  'progress_management_announ__c': {
    displayName: '進度管理公告',
    fields: [
      { apiName: '_id', label: '記錄ID', dataType: 'TEXT', required: true, description: '系統自動產生的唯一識別碼' },
      { apiName: 'name', label: '公告標題', dataType: 'TEXT', required: true, description: '公告的標題' },
      { apiName: 'field_RFr42__c__r', label: '關聯案場', dataType: 'LOOKUP', required: false, description: '關聯的案場' },
      { apiName: 'field_dvR88__c', label: '公告內容', dataType: 'TEXTAREA', required: false, description: '公告的詳細內容' },
    ]
  }
};

/**
 * 獲取對象的欄位映射
 */
export function getFieldMapping(objectApiName) {
  return fieldMappings[objectApiName] || null;
}

/**
 * 獲取所有對象列表
 */
export function getAllObjects() {
  return Object.keys(fieldMappings).map(apiName => ({
    apiName,
    displayName: fieldMappings[apiName].displayName,
    fieldCount: fieldMappings[apiName].fields.length,
    isCustom: apiName.endsWith('__c')
  }));
}

/**
 * 匯入 CSV 欄位對應表
 * CSV 格式應該包含: API名稱, 顯示名稱, 數據類型, 是否必填, 描述
 */
export function importCSVMapping(objectApiName, csvData) {
  // 這個函數可以用來從 CSV 檔案匯入欄位對應表
  // CSV 格式範例:
  // API名稱,顯示名稱,數據類型,是否必填,描述
  // name,案場名稱,TEXT,是,案場的名稱
  // field_1P96q__c,所屬建案,LOOKUP,否,關聯到建案對象
  
  const lines = csvData.split('\n');
  const fields = [];
  
  // 跳過標題行
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const [apiName, label, dataType, required, description] = line.split(',').map(s => s.trim());
    
    fields.push({
      apiName,
      label,
      dataType,
      required: required === '是' || required === 'true' || required === 'TRUE',
      description: description || ''
    });
  }
  
  // 更新對應表
  if (!fieldMappings[objectApiName]) {
    fieldMappings[objectApiName] = {
      displayName: objectApiName,
      fields: []
    };
  }
  
  fieldMappings[objectApiName].fields = fields;
  
  return fields.length;
}