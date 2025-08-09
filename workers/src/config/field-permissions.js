/**
 * 欄位權限配置
 * 定義不同角色可以編輯的欄位
 */

export const FIELD_PERMISSIONS = {
  // CRM 系統擁有的欄位（只從 CRM → D1，不允許在 D1 編輯）
  systemFields: [
    '_id',
    'name',
    'create_time',
    'created_by',
    'created_by__r',
    'owner',
    'owner__r',
    'owner_department_id',
    'owner_department',
    'life_status',
    'life_status__r',
    'lock_status',
    'lock_status__r',
    'is_deleted',
    'record_type',
    'version',
    'data_own_department',
    'data_own_department__r',
    'last_modified_time',  // 由系統自動更新
    'last_modified_by',     // 由系統自動更新
    'last_modified_by__r'   // 由系統自動更新
  ],
  
  // 工地師父可編輯的欄位（從 D1 → CRM）- 基於實際案場和商機需求
  workerEditableFields: {
    // 商機表欄位 - 工地師父可編輯的施工相關欄位
    newopportunityobj: [
      'field_Kt4Pg__c',      // 開工日期
      'field_11xou__c',      // 舖土面日期  
      'field_IZys1__c',      // 頂樓完成日
      'field_zYRAu__c',      // 實體層或樣品屋日期
      'field_n4qm3__c',      // 預計拆架日
      'field_Mss6d__c',      // 預計交屋日期
      'field_0t3OP__c',      // 施工管理表
      'field_ncsUJ__c',      // 缺失追蹤表
      'field_g927h__c',      // 維修管理表
      'field_2zhjh__c',      // 案場備註
    ],
    // 案場表欄位 - 工地師父可編輯的單元狀態
    'object_8w9cb__c': [
      'field_23Z5i__c',      // 狀態 (施工狀態)
      'field_23Z5i__c__r',   // 狀態顯示
      'field_dxr31__c',      // 類型 (施工類型)
      'field_dxr31__c__r',   // 類型顯示
      'field_Q6Svh__c',      // 面積 (實際施工面積)
    ]
  },
  
  // 業主可編輯的欄位（從 D1 → CRM）- 基於實際商機和案場需求
  ownerEditableFields: {
    // 商機表欄位 - 業主可編輯的驗收和滿意度相關欄位
    newopportunityobj: [
      'field_3NRfq__c',      // 客户是否确认报价
      'field_DlN6M__c',      // 認列比例 (業主確認比例)
      'field_2zhjh__c',      // 案場備註 (業主意見)
      'field_lmjjf__c',      // 商機可能性 (業主評估)
      'field_lmjjf__c__r',   // 商機可能性顯示
    ],
    // 案場表欄位 - 業主可編輯的驗收狀態  
    'object_8w9cb__c': [
      'field_23Z5i__c',      // 狀態 (驗收狀態)
      'field_23Z5i__c__r',   // 狀態顯示
      'field_dxr31__c',      // 類型 (驗收類型/滿意度)
      'field_dxr31__c__r',   // 類型顯示
    ]
  },
  
  // 雙向同步欄位（比較時間戳決定同步方向）
  bidirectionalFields: {
    // 商機表的雙向同步欄位
    newopportunityobj: [
      'relevant_team',       // 相關團隊
      'amount',              // 金額 (可能由多方更新)
      'field_rU4l5__c',      // 工地名或案場名
      'field_nI1xS__c',      // 案場地址或地段
    ],
    // 案場表的雙向同步欄位
    'object_8w9cb__c': [
      'total_num',           // 總數量
      'field_k7e6q__c',      // 建案ID
      'field_k7e6q__c__r',   // 建案名稱
      'field_1P96q__c',      // 年度建案ID
      'field_1P96q__c__r',   // 年度建案名稱
      'field_i2Q1g__c',      // 坪數1
      'field_tXAko__c',      // 坪數2
    ]
  },
  
  // D1 專用欄位（不同步到 CRM）
  d1OnlyFields: [
    'history_log',         // 歷史記錄（長文本）
    'd1_last_modified_time',
    'd1_last_modified_by',
    'edit_locked_by',
    'edit_locked_at',
    'sync_conflict',
    'sync_version',
    'sync_time',
    'fx_created_at',
    'fx_updated_at'
  ]
};

/**
 * 檢查用戶是否可以編輯特定欄位
 */
export function canEditField(userRole, fieldName, tableName) {
  // 系統欄位任何人都不能編輯
  if (FIELD_PERMISSIONS.systemFields.includes(fieldName)) {
    return false;
  }
  
  // D1 專用欄位在 D1 中可以修改
  if (FIELD_PERMISSIONS.d1OnlyFields.includes(fieldName)) {
    return true;
  }
  
  // 根據角色檢查權限
  switch (userRole) {
    case 'worker':
      const workerFields = FIELD_PERMISSIONS.workerEditableFields[tableName] || [];
      const workerBidirectional = FIELD_PERMISSIONS.bidirectionalFields[tableName] || [];
      return workerFields.includes(fieldName) || workerBidirectional.includes(fieldName);
    
    case 'owner':
      const ownerFields = FIELD_PERMISSIONS.ownerEditableFields[tableName] || [];
      const ownerBidirectional = FIELD_PERMISSIONS.bidirectionalFields[tableName] || [];
      return ownerFields.includes(fieldName) || ownerBidirectional.includes(fieldName);
    
    case 'admin':
      // 管理員可以編輯所有非系統欄位
      return !FIELD_PERMISSIONS.systemFields.includes(fieldName);
    
    default:
      return false;
  }
}

/**
 * 獲取用戶可編輯的欄位列表
 */
export function getEditableFields(userRole, tableName) {
  switch (userRole) {
    case 'worker':
      const workerFields = FIELD_PERMISSIONS.workerEditableFields[tableName] || [];
      const workerBidirectional = FIELD_PERMISSIONS.bidirectionalFields[tableName] || [];
      return [...workerFields, ...workerBidirectional];
    
    case 'owner':
      const ownerFields = FIELD_PERMISSIONS.ownerEditableFields[tableName] || [];
      const ownerBidirectional = FIELD_PERMISSIONS.bidirectionalFields[tableName] || [];
      return [...ownerFields, ...ownerBidirectional];
    
    case 'admin':
      // 管理員可以編輯除系統欄位外的所有欄位
      const adminWorkerFields = FIELD_PERMISSIONS.workerEditableFields[tableName] || [];
      const adminOwnerFields = FIELD_PERMISSIONS.ownerEditableFields[tableName] || [];
      const adminBidirectional = FIELD_PERMISSIONS.bidirectionalFields[tableName] || [];
      return [...adminWorkerFields, ...adminOwnerFields, ...adminBidirectional];
    
    default:
      return [];
  }
}

/**
 * 判斷欄位的同步方向
 */
export function getSyncDirection(fieldName, tableName) {
  if (FIELD_PERMISSIONS.systemFields.includes(fieldName)) {
    return 'CRM_TO_D1';  // 只從 CRM 同步到 D1
  }
  
  if (FIELD_PERMISSIONS.d1OnlyFields.includes(fieldName)) {
    return 'D1_ONLY';  // 不同步
  }
  
  const workerFields = FIELD_PERMISSIONS.workerEditableFields[tableName] || [];
  const ownerFields = FIELD_PERMISSIONS.ownerEditableFields[tableName] || [];
  const bidirectionalFields = FIELD_PERMISSIONS.bidirectionalFields[tableName] || [];
  
  if (workerFields.includes(fieldName) || ownerFields.includes(fieldName)) {
    return 'D1_TO_CRM';  // 只從 D1 同步到 CRM
  }
  
  if (bidirectionalFields.includes(fieldName)) {
    return 'BIDIRECTIONAL';  // 雙向同步
  }
  
  return 'CRM_TO_D1';  // 預設從 CRM 到 D1
}

/**
 * 檢查用戶對特定記錄的所有可編輯欄位
 */
export function validateFieldPermissions(userRole, tableName, fieldUpdates) {
  const allowedFields = getEditableFields(userRole, tableName);
  const unauthorizedFields = [];
  
  for (const fieldName of Object.keys(fieldUpdates)) {
    if (!canEditField(userRole, fieldName, tableName)) {
      unauthorizedFields.push(fieldName);
    }
  }
  
  return {
    isValid: unauthorizedFields.length === 0,
    unauthorizedFields,
    allowedFields
  };
}