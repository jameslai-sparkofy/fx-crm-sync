/**
 * 完整的欄位對應表 - 從紛享銷客匯出的 CSV 檔案
 */

export const fieldMappingsComplete = {
  // 案場(SPC) - object_8W9cb__c
  'object_8W9cb__c': {
    displayName: '案場(SPC)',
    fields: [
      { apiName: 'lock_rule', label: '锁定规则', dataType: 'lock_rule', required: false, description: '' },
      { apiName: 'shift_time__c', label: '工班', dataType: '引用字段', required: false, description: '' },
      { apiName: 'field_3T38o__c', label: '平面圖', dataType: '图片', required: false, description: '' },
      { apiName: 'field_u1wpv__c', label: '工班師父', dataType: '单行文本', required: false, description: '' },
      { apiName: 'field_sF6fn__c', label: '施工前備註', dataType: '单行文本', required: false, description: '' },
      { apiName: 'field_27g6n__c', label: '保護板坪數', dataType: '数字', required: false, description: '' },
      { apiName: 'life_status_before_invalid', label: '作废前生命状态', dataType: '单行文本', required: false, description: '' },
      { apiName: 'owner_department', label: '负责人主属部门', dataType: '单行文本', required: false, description: '' },
      { apiName: 'lock_status', label: '锁定状态', dataType: '单选', required: false, description: '未锁定;锁定' },
      { apiName: 'package', label: 'package', dataType: '单行文本', required: false, description: '' },
      { apiName: 'create_time', label: '创建时间', dataType: '日期时间', required: false, description: '' },
      { apiName: 'field_23pFq__c', label: '施工日期', dataType: '日期', required: false, description: '' },
      { apiName: 'field_V3d91__c', label: '施工前照片', dataType: '图片', required: false, description: '' },
      { apiName: 'version', label: 'version', dataType: '数字', required: false, description: '' },
      { apiName: 'created_by', label: '创建人', dataType: '人员', required: false, description: '' },
      { apiName: 'relevant_team', label: '相关团队', dataType: 'embedded_object_list', required: false, description: '' },
      { apiName: 'field_v1x3S__c', label: '驗收照片', dataType: '图片', required: false, description: '' },
      { apiName: 'data_own_department', label: '归属部门', dataType: '部门', required: false, description: '' },
      { apiName: 'field_B2gh1__c', label: '舖設坪數', dataType: '数字', required: false, description: '' },
      { apiName: 'name', label: '編號', dataType: '自增编号', required: true, description: '' },
      { apiName: 'field_f0mz3__c', label: '保固日期', dataType: '日期', required: false, description: '' },
      { apiName: 'field_i2Q1g__c', label: '少請坪數', dataType: '计算字段', required: false, description: '' },
      { apiName: '_id', label: '_id', dataType: '单行文本', required: false, description: '' },
      { apiName: 'field_03U9h__c', label: '工地狀況照片', dataType: '图片', required: false, description: '' },
      { apiName: 'field_WD7k1__c', label: '棟別', dataType: '单行文本', required: false, description: '' },
      { apiName: 'field_sijGR__c', label: '維修備註1', dataType: '单行文本', required: false, description: '' },
      { apiName: 'bad_case_scene__c', label: '做壞案場', dataType: '布尔值', required: false, description: '' },
      { apiName: 'tenant_id', label: 'tenant_id', dataType: '单行文本', required: true, description: '' },
      { apiName: 'field_npLvn__c', label: '請款單', dataType: '查找关联', required: false, description: '' },
      { apiName: 'origin_source', label: '数据来源', dataType: '单选', required: false, description: '数据同步' },
      { apiName: 'lock_user', label: '加锁人', dataType: '人员', required: false, description: '' },
      { apiName: 'is_deleted', label: 'is_deleted', dataType: '布尔值', required: false, description: '' },
      { apiName: 'field_1zk34__c', label: '缺失影片', dataType: '附件', required: false, description: '' },
      { apiName: 'object_describe_api_name', label: 'object_describe_api_name', dataType: '单行文本', required: true, description: '' },
      { apiName: 'out_owner', label: '外部负责人', dataType: '人员', required: false, description: '' },
      { apiName: 'field_V32Xl__c', label: '工班備註', dataType: '单行文本', required: false, description: '' },
      { apiName: 'construction_completed__c', label: '施工完成', dataType: '布尔值', required: false, description: '' },
      { apiName: 'owner', label: '负责人', dataType: '人员', required: true, description: '' },
      { apiName: 'field_3Fqof__c', label: '完工照片', dataType: '图片', required: false, description: '' },
      { apiName: 'last_modified_time', label: '最后修改时间', dataType: '日期时间', required: false, description: '' },
      { apiName: 'life_status', label: '生命状态', dataType: '单选', required: false, description: '未生效;审核中;正常;变更中;作废' },
      { apiName: 'field_k7e6q__c', label: '工單', dataType: '查找关联', required: false, description: '' },
      { apiName: 'last_modified_by', label: '最后修改人', dataType: '人员', required: false, description: '' },
      { apiName: 'field_Q6Svh__c', label: '樓層', dataType: '数字', required: false, description: '' },
      { apiName: 'out_tenant_id', label: '外部企业', dataType: '单行文本', required: false, description: '' },
      { apiName: 'record_type', label: '业务类型', dataType: 'record_type', required: false, description: '' },
      { apiName: 'field_n37jC__c', label: '驗收備註', dataType: '单行文本', required: false, description: '' },
      { apiName: 'field_23Z5i__c', label: '標籤', dataType: '多选', required: false, description: '準備中;不可施工;可施工;已完工;需維修;維修完成;其他' },
      { apiName: 'field_XuJP2__c', label: '戶別', dataType: '单行文本', required: false, description: '' },
      { apiName: 'field_dxr31__c', label: '類型', dataType: '单选', required: false, description: '工地;樣品;展示;其他' },
      { apiName: 'field_1P96q__c', label: '建案', dataType: '查找关联', required: false, description: '' },
      { apiName: 'field_BUOdw__c', label: '請款坪數', dataType: '数字', required: false, description: '' },
      { apiName: 'field_b1MZn__c', label: '保護板價格', dataType: '金额', required: false, description: '' },
      { apiName: 'field_G76J9__c', label: '舖設價格', dataType: '金额', required: false, description: '' },
      { apiName: 'responsible_supervisor__c', label: '負責主管', dataType: '查找关联', required: false, description: '' },
      { apiName: 'field_sjl7b__c', label: '實際施工坪數', dataType: '计算字段', required: false, description: '' },
      { apiName: 'lock_time', label: '加锁时间', dataType: '日期时间', required: false, description: '' },
      { apiName: 'field_z76cZ__c', label: '驗收師父', dataType: '查找关联(多选)', required: false, description: '' },
      { apiName: 'field_S2zx8__c', label: '驗收坪數', dataType: '数字', required: false, description: '' },
      { apiName: 'field_P8U0q__c', label: '樣品收據', dataType: '图片', required: false, description: '' },
      { apiName: 'field_jEAZy__c', label: '小計', dataType: '计算字段', required: false, description: '' },
      { apiName: 'valid_time', label: '生效时间', dataType: '日期时间', required: false, description: '' },
      { apiName: 'invalid_time', label: '作废时间', dataType: '日期时间', required: false, description: '' },
      { apiName: 'field_xHkCv__c', label: '驗收日期', dataType: '日期', required: false, description: '' },
      { apiName: 'source_object_id', label: '原始业务ID', dataType: '单行文本', required: false, description: '' },
      { apiName: 'external_id_for_sync', label: '外部系统唯一ID', dataType: '单行文本', required: false, description: '' },
      { apiName: 'field_5MgB8__c', label: '出貨照片', dataType: '图片', required: false, description: '' },
      { apiName: 'owner_department_id', label: '负责人主属部门', dataType: '单行文本', required: false, description: '' },
      { apiName: 'field_z9Bb8__c', label: '卸貨照片', dataType: '图片', required: false, description: '' },
      { apiName: 'field_WNT3R__c', label: '安裝數量', dataType: '数字', required: false, description: '' },
      { apiName: 'field_YWSD0__c', label: '維修類型', dataType: '多选', required: false, description: '異音;凸起;溝縫過大;地板開口;划傷/破損;浸水;色差;直角度;其他' },
      { apiName: 'field_5P19b__c', label: '是否驗收', dataType: '布尔值', required: false, description: '' },
      { apiName: 'field_67g8l__c', label: '工班照片', dataType: '图片', required: false, description: '' },
      { apiName: 'field_9JNT5__c', label: '施工數量', dataType: '数字', required: false, description: '' },
      { apiName: 'field_A72C1__c', label: '師父', dataType: '查找关联(多选)', required: false, description: '' },
      { apiName: 'field_i1d13__c', label: '維修日期', dataType: '日期', required: false, description: '' },
      { apiName: 'field_Cc0qF__c', label: '工班坪數', dataType: '数字', required: false, description: '' },
      { apiName: 'field_k6L83__c', label: '建設公司', dataType: '查找关联', required: false, description: '' },
      { apiName: 'field_75H7O__c', label: '保護板影片', dataType: '附件', required: false, description: '' },
      { apiName: 'field_9f69G__c', label: '缺失數量', dataType: '数字', required: false, description: '' },
      { apiName: 'field_L9Q37__c', label: '維修費用', dataType: '金额', required: false, description: '' },
      { apiName: 'field_kO0D3__c', label: '報價人員', dataType: '查找关联', required: false, description: '' },
      { apiName: 'field_N6vfw__c', label: '實際保護板數量', dataType: '数字', required: false, description: '' },
      { apiName: 'field_V9B2J__c', label: '實際舖設坪數', dataType: '数字', required: false, description: '' },
      { apiName: 'field_hQ8P8__c', label: '施工影片', dataType: '附件', required: false, description: '' },
      { apiName: 'field_ZkGAy__c', label: '保護板照片', dataType: '图片', required: false, description: '' }
    ]
  },
  
  // 案場(浴櫃) - site_cabinet__c
  'site_cabinet__c': {
    displayName: '案場(浴櫃)',
    fields: [
      { apiName: 'lock_rule', label: '锁定规则', dataType: 'lock_rule', required: false, description: '' },
      { apiName: 'shift_time__c', label: '工班', dataType: '引用字段', required: false, description: '' },
      { apiName: 'field_qEaXB__c', label: '驗屋日期2', dataType: '日期', required: false, description: '' },
      { apiName: 'field_3T38o__c', label: '平面圖', dataType: '图片', required: false, description: '' },
      { apiName: 'field_2jM31__c', label: '維修費用2', dataType: '金额', required: false, description: '' },
      { apiName: 'field_u1wpv__c', label: '工班師父', dataType: '单行文本', required: false, description: '' },
      { apiName: 'field_sF6fn__c', label: '施工前備註', dataType: '单行文本', required: false, description: '' },
      { apiName: 'field_27g6n__c', label: '保護板', dataType: '数字', required: false, description: '' },
      { apiName: 'field_PuaLk__c', label: '維修完成照片1', dataType: '图片', required: false, description: '' },
      { apiName: 'field_OmPo8__c', label: '缺失分類1', dataType: '多选', required: false, description: '刮傷;矽力康;空心;不平;區隔條;異音;其他' },
      { apiName: 'field_r1mp8__c', label: '維修日期1', dataType: '日期', required: false, description: '' },
      { apiName: 'field_tyRfE__c', label: '缺失照片1', dataType: '图片', required: false, description: '' },
      { apiName: 'life_status_before_invalid', label: '作废前生命状态', dataType: '单行文本', required: false, description: '' },
      { apiName: 'owner_department', label: '负责人主属部门', dataType: '单行文本', required: false, description: '' },
      { apiName: 'field_nht8k__c', label: '缺失備註1', dataType: '单行文本', required: false, description: '' },
      { apiName: 'lock_status', label: '锁定状态', dataType: '单选', required: false, description: '未锁定;锁定' },
      { apiName: 'package', label: 'package', dataType: '单行文本', required: false, description: '' },
      { apiName: 'create_time', label: '创建时间', dataType: '日期时间', required: false, description: '' },
      { apiName: 'field_23pFq__c', label: '施工日期', dataType: '日期', required: false, description: '' },
      { apiName: 'field_lZaAp__c', label: '維修備註2', dataType: '单行文本', required: false, description: '' },
      { apiName: 'field_d2O5i__c', label: '維修完成照片2', dataType: '图片', required: false, description: '' },
      { apiName: 'field_V3d91__c', label: '施工前照片', dataType: '图片', required: false, description: '' },
      { apiName: 'version', label: 'version', dataType: '数字', required: false, description: '' },
      { apiName: 'created_by', label: '创建人', dataType: '人员', required: false, description: '' },
      { apiName: 'relevant_team', label: '相关团队', dataType: 'embedded_object_list', required: false, description: '' },
      { apiName: 'field_v1x3S__c', label: '驗收照片', dataType: '图片', required: false, description: '' },
      { apiName: 'field_t2GYf__c', label: '維修單', dataType: '查找关联(多选)', required: false, description: '' },
      { apiName: 'data_own_department', label: '归属部门', dataType: '部门', required: false, description: '' },
      { apiName: 'name', label: '編號', dataType: '自增编号', required: true, description: '' },
      { apiName: 'field_7ndUg__c', label: '維修費用1', dataType: '金额', required: false, description: '' },
      { apiName: 'field_f0mz3__c', label: '保固日期', dataType: '日期', required: false, description: '' },
      { apiName: '_id', label: '_id', dataType: '单行文本', required: false, description: '' },
      { apiName: 'field_03U9h__c', label: '工地狀況照片', dataType: '图片', required: false, description: '' },
      { apiName: 'field_WD7k1__c', label: '棟別', dataType: '单行文本', required: false, description: '' },
      { apiName: 'field_sijGR__c', label: '維修備註1', dataType: '单行文本', required: false, description: '' },
      { apiName: 'tenant_id', label: 'tenant_id', dataType: '单行文本', required: true, description: '' },
      { apiName: 'location__c', label: '位置', dataType: '单行文本', required: false, description: '' },
      { apiName: 'field_npLvn__c', label: '請款單', dataType: '查找关联', required: false, description: '' },
      { apiName: 'origin_source', label: '数据来源', dataType: '单选', required: false, description: '数据同步' },
      { apiName: 'lock_user', label: '加锁人', dataType: '人员', required: false, description: '' },
      { apiName: 'field_xFCKf__c', label: '維修師父1', dataType: '查找关联(多选)', required: false, description: '' },
      { apiName: 'is_deleted', label: 'is_deleted', dataType: '布尔值', required: false, description: '' },
      { apiName: 'field_1zk34__c', label: '缺失影片', dataType: '附件', required: false, description: '' },
      { apiName: 'object_describe_api_name', label: 'object_describe_api_name', dataType: '单行文本', required: true, description: '' },
      { apiName: 'out_owner', label: '外部负责人', dataType: '人员', required: false, description: '' },
      { apiName: 'field_V32Xl__c', label: '工班備註', dataType: '单行文本', required: false, description: '' },
      { apiName: 'construction_completed__c', label: '施工完成', dataType: '布尔值', required: false, description: '' },
      { apiName: 'owner', label: '负责人', dataType: '人员', required: true, description: '' },
      { apiName: 'field_32Hxs__c', label: '缺失分類2', dataType: '单选', required: false, description: '示例选项;其他' },
      { apiName: 'field_3Fqof__c', label: '完工照片', dataType: '图片', required: false, description: '' },
      { apiName: 'last_modified_time', label: '最后修改时间', dataType: '日期时间', required: false, description: '' },
      { apiName: 'field_e1RGC__c', label: '缺失照片2', dataType: '图片', required: false, description: '' },
      { apiName: 'field_8mRJh__c', label: '驗屋備註2', dataType: '单行文本', required: false, description: '' },
      { apiName: 'life_status', label: '生命状态', dataType: '单选', required: false, description: '未生效;审核中;正常;变更中;作废' },
      { apiName: 'field_P6o5z__c', label: '維修師父2', dataType: '查找关联(多选)', required: false, description: '' },
      { apiName: 'field_k7e6q__c', label: '工單', dataType: '查找关联', required: false, description: '' },
      { apiName: 'field_62Afs__c', label: '維修日期2', dataType: '日期', required: false, description: '' },
      { apiName: 'last_modified_by', label: '最后修改人', dataType: '人员', required: false, description: '' },
      { apiName: 'field_Q6Svh__c', label: '樓層', dataType: '数字', required: false, description: '' },
      { apiName: 'out_tenant_id', label: '外部企业', dataType: '单行文本', required: false, description: '' },
      { apiName: 'record_type', label: '业务类型', dataType: 'record_type', required: false, description: '' },
      { apiName: 'field_n37jC__c', label: '驗收備註', dataType: '单行文本', required: false, description: '' },
      { apiName: 'field_23Z5i__c', label: '標籤', dataType: '多选', required: false, description: '準備中;不可施工;可施工;已完工;需維修;維修完成;其他' },
      { apiName: 'field_XuJP2__c', label: '戶別', dataType: '单行文本', required: false, description: '' },
      { apiName: 'field_dxr31__c', label: '類型', dataType: '单选', required: false, description: '工地;樣品;展示;其他' },
      { apiName: 'field_1P96q__c', label: '建案', dataType: '查找关联', required: false, description: '' },
      { apiName: 'field_AED82__c', label: '缺失備註2', dataType: '单行文本', required: false, description: '' },
      { apiName: 'field_0LHI1__c', label: '驗屋備註1', dataType: '单行文本', required: false, description: '' },
      { apiName: 'responsible_supervisor__c', label: '負責主管', dataType: '查找关联', required: false, description: '' },
      { apiName: 'lock_time', label: '加锁时间', dataType: '日期时间', required: false, description: '' },
      { apiName: 'field_jw0Rr__c', label: '驗屋日期1', dataType: '日期', required: false, description: '' },
      { apiName: 'field_z76cZ__c', label: '驗收師父', dataType: '查找关联(多选)', required: false, description: '' },
      { apiName: 'field_P8U0q__c', label: '樣品收據', dataType: '图片', required: false, description: '' },
      { apiName: 'valid_time', label: '生效时间', dataType: '日期时间', required: false, description: '' },
      { apiName: 'invalid_time', label: '作废时间', dataType: '日期时间', required: false, description: '' },
      { apiName: 'field_xHkCv__c', label: '驗收日期', dataType: '日期', required: false, description: '' },
      { apiName: 'source_object_id', label: '原始业务ID', dataType: '单行文本', required: false, description: '' },
      { apiName: 'external_id_for_sync', label: '外部系统唯一ID', dataType: '单行文本', required: false, description: '' },
      { apiName: 'field_5MgB8__c', label: '出貨照片', dataType: '图片', required: false, description: '' },
      { apiName: 'owner_department_id', label: '负责人主属部门', dataType: '单行文本', required: false, description: '' },
      { apiName: 'field_z9Bb8__c', label: '卸貨照片', dataType: '图片', required: false, description: '' },
      { apiName: 'field_5P19b__c', label: '是否驗收', dataType: '布尔值', required: false, description: '' },
      { apiName: 'field_67g8l__c', label: '工班照片', dataType: '图片', required: false, description: '' },
      { apiName: 'field_A72C1__c', label: '師父', dataType: '查找关联(多选)', required: false, description: '' },
      { apiName: 'field_k6L83__c', label: '建設公司', dataType: '查找关联', required: false, description: '' },
      { apiName: 'field_75H7O__c', label: '保護板影片', dataType: '附件', required: false, description: '' },
      { apiName: 'field_kO0D3__c', label: '報價人員', dataType: '查找关联', required: false, description: '' }
    ]
  }
};

/**
 * 獲取對象的欄位映射
 */
export function getFieldMapping(objectApiName) {
  return fieldMappingsComplete[objectApiName] || null;
}

/**
 * 獲取欄位的中文標籤
 */
export function getFieldLabel(objectApiName, fieldApiName) {
  const mapping = fieldMappingsComplete[objectApiName];
  if (!mapping) return fieldApiName;
  
  const field = mapping.fields.find(f => f.apiName === fieldApiName);
  return field ? field.label : fieldApiName;
}

/**
 * 獲取欄位的數據類型
 */
export function getFieldType(objectApiName, fieldApiName) {
  const mapping = fieldMappingsComplete[objectApiName];
  if (!mapping) return 'TEXT';
  
  const field = mapping.fields.find(f => f.apiName === fieldApiName);
  if (!field) return 'TEXT';
  
  // 轉換中文類型到標準類型
  const typeMapping = {
    '单行文本': 'TEXT',
    '多行文本': 'TEXTAREA',
    '数字': 'NUMBER',
    '金额': 'CURRENCY',
    '日期': 'DATE',
    '日期时间': 'DATETIME',
    '单选': 'SELECT',
    '多选': 'MULTISELECT',
    '布尔值': 'BOOLEAN',
    '人员': 'USER',
    '部门': 'DEPARTMENT',
    '查找关联': 'LOOKUP',
    '查找关联(多选)': 'MULTI_LOOKUP',
    '引用字段': 'REFERENCE',
    '图片': 'IMAGE',
    '附件': 'ATTACHMENT',
    '自增编号': 'AUTO_NUMBER',
    '计算字段': 'FORMULA',
    'embedded_object_list': 'EMBEDDED_LIST',
    'lock_rule': 'SYSTEM',
    'record_type': 'SYSTEM'
  };
  
  return typeMapping[field.dataType] || 'TEXT';
}