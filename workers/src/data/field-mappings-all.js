/**
 * 完整的欄位對應表 - 包含所有 7 個同步對象
 * 從紛享銷客匯出的 CSV 和 Excel 檔案整理
 */

export const fieldMappingsAll = {
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
  },

  // SPC維修單 - object_k1XqG__c
  'object_k1XqG__c': {
    displayName: 'SPC維修單',
    fields: [
      { apiName: 'tenant_id', label: 'tenant_id', dataType: '单行文本', required: true, description: '' },
      { apiName: 'shift_time__c', label: '工班', dataType: '查找关联', required: false, description: '' },
      { apiName: 'lock_rule', label: '锁定规则', dataType: 'lock_rule', required: false, description: '' },
      { apiName: 'field_7Aw8e__c', label: '戶別', dataType: '单行文本', required: false, description: '' },
      { apiName: 'location__c', label: '位置', dataType: '单行文本', required: false, description: '' },
      { apiName: 'work_shift_quotation_image__c', label: '工班報價圖片', dataType: '图片', required: false, description: '' },
      { apiName: 'inspection_stage__c', label: '驗屋階段', dataType: '单选', required: false, description: '初驗;複驗;三驗;其他' },
      { apiName: 'origin_source', label: '数据来源', dataType: '单选', required: false, description: '数据同步' },
      { apiName: 'lock_user', label: '加锁人', dataType: '人员', required: false, description: '' },
      { apiName: 'field_sxZVc__c', label: '商機', dataType: '查找关联', required: false, description: '' },
      { apiName: 'date__c', label: '驗屋日期', dataType: '日期', required: false, description: '' },
      { apiName: 'is_deleted', label: 'is_deleted', dataType: '布尔值', required: false, description: '' },
      { apiName: 'movie__c', label: '影片', dataType: '附件', required: false, description: '' },
      { apiName: 'life_status_before_invalid', label: '作废前生命状态', dataType: '单行文本', required: false, description: '' },
      { apiName: 'field_repair_claim_form__c', label: '維修請款單', dataType: '查找关联', required: false, description: '' },
      { apiName: 'area__c', label: '坪數', dataType: '单行文本', required: false, description: '' },
      { apiName: 'object_describe_api_name', label: 'object_describe_api_name', dataType: '单行文本', required: true, description: '' },
      { apiName: 'owner_department', label: '负责人主属部门', dataType: '单行文本', required: false, description: '' },
      { apiName: 'out_owner', label: '外部负责人', dataType: '人员', required: false, description: '' },
      { apiName: 'field_SW6Eb__c', label: '內容', dataType: '多行文本', required: false, description: '' },
      { apiName: 'photo__c', label: '照片', dataType: '图片', required: false, description: '' },
      { apiName: 'owner', label: '负责人', dataType: '人员', required: true, description: '' },
      { apiName: 'building_type__c', label: '棟別', dataType: '单行文本', required: false, description: '' },
      { apiName: 'lock_status', label: '锁定状态', dataType: '单选', required: false, description: '未锁定;锁定' },
      { apiName: 'package', label: 'package', dataType: '单行文本', required: false, description: '' },
      { apiName: 'last_modified_time', label: '最后修改时间', dataType: '日期时间', required: false, description: '' },
      { apiName: 'create_time', label: '创建时间', dataType: '日期时间', required: false, description: '' },
      { apiName: 'life_status', label: '生命状态', dataType: '单选', required: false, description: '未生效;审核中;正常;变更中;作废' },
      { apiName: 'last_modified_by', label: '最后修改人', dataType: '人员', required: false, description: '' },
      { apiName: 'out_tenant_id', label: '外部企业', dataType: '单行文本', required: false, description: '' },
      { apiName: 'version', label: 'version', dataType: '数字', required: false, description: '' },
      { apiName: 'created_by', label: '创建人', dataType: '人员', required: false, description: '' },
      { apiName: 'relevant_team', label: '相关团队', dataType: 'embedded_object_list', required: false, description: '' },
      { apiName: 'record_type', label: '业务类型', dataType: 'record_type', required: false, description: '' },
      { apiName: 'field_g0vub__c', label: '請款金額(工班)', dataType: '金额', required: false, description: '' },
      { apiName: 'field_Gm2wG__c', label: '樓層', dataType: '数字', required: false, description: '' },
      { apiName: 'data_own_department', label: '归属部门', dataType: '部门', required: false, description: '' },
      { apiName: 'field_87raN__c', label: '維修金額', dataType: '金额', required: false, description: '' },
      { apiName: 'name', label: '維修單編號', dataType: '自增编号', required: true, description: '' },
      { apiName: 'order_by', label: 'order_by', dataType: '数字', required: false, description: '' },
      { apiName: '_id', label: '_id', dataType: '单行文本', required: false, description: '' },
      { apiName: 'property_site__c', label: '案場', dataType: '查找关联', required: false, description: '' }
    ]
  },

  // 進度管理公告 - progress_management_announ__c
  'progress_management_announ__c': {
    displayName: '進度管理公告',
    fields: [
      { apiName: 'tenant_id', label: 'tenant_id', dataType: '单行文本', required: true, description: '' },
      { apiName: 'lock_rule', label: '锁定规则', dataType: 'lock_rule', required: false, description: '' },
      { apiName: 'field_q97ij__c', label: '是否讓工班知道？', dataType: '布尔值', required: false, description: '' },
      { apiName: 'origin_source', label: '数据来源', dataType: '单选', required: false, description: '数据同步' },
      { apiName: 'lock_user', label: '加锁人', dataType: '人员', required: false, description: '' },
      { apiName: 'is_deleted', label: 'is_deleted', dataType: '布尔值', required: false, description: '' },
      { apiName: 'life_status_before_invalid', label: '作废前生命状态', dataType: '单行文本', required: false, description: '' },
      { apiName: 'object_describe_api_name', label: 'object_describe_api_name', dataType: '单行文本', required: true, description: '' },
      { apiName: 'owner_department', label: '負責人主屬部門', dataType: '单行文本', required: false, description: '' },
      { apiName: 'out_owner', label: '外部负责人', dataType: '人员', required: false, description: '' },
      { apiName: 'field_dvR88__c', label: '圖片', dataType: '图片', required: false, description: '' },
      { apiName: 'owner', label: '負責人', dataType: '人员', required: true, description: '' },
      { apiName: 'lock_status', label: '锁定状态', dataType: '单选', required: false, description: '未锁定;锁定' },
      { apiName: 'package', label: 'package', dataType: '单行文本', required: false, description: '' },
      { apiName: 'last_modified_time', label: '最后修改时间', dataType: '日期时间', required: false, description: '' },
      { apiName: 'create_time', label: '创建时间', dataType: '日期时间', required: false, description: '' },
      { apiName: 'life_status', label: '生命狀態', dataType: '单选', required: false, description: '未生效;稽核中;正常;變更中;作廢' },
      { apiName: 'last_modified_by', label: '最后修改人', dataType: '人员', required: false, description: '' },
      { apiName: 'out_tenant_id', label: '外部企业', dataType: '单行文本', required: false, description: '' },
      { apiName: 'version', label: 'version', dataType: '数字', required: false, description: '' },
      { apiName: 'created_by', label: '创建人', dataType: '人员', required: false, description: '' },
      { apiName: 'relevant_team', label: '相关团队', dataType: 'embedded_object_list', required: false, description: '' },
      { apiName: 'record_type', label: '业务类型', dataType: 'record_type', required: false, description: '' },
      { apiName: 'announcement_content__c', label: '公告內容', dataType: '多行文本', required: false, description: '' },
      { apiName: 'data_own_department', label: '歸屬部門', dataType: '部门', required: false, description: '' },
      { apiName: 'name', label: '公告編號', dataType: '自增编号', required: true, description: '' },
      { apiName: 'field_RFr42__c', label: '商機', dataType: '查找关联', required: false, description: '' },
      { apiName: 'order_by', label: 'order_by', dataType: '数字', required: false, description: '' },
      { apiName: '_id', label: '_id', dataType: '单行文本', required: false, description: '' },
      { apiName: 'field_uO778__c', label: '是否讓業主知道', dataType: '布尔值', required: false, description: '' }
    ]
  },

  // 商機 - NewOpportunityObj
  'NewOpportunityObj': {
    displayName: '商機',
    fields: [
      { apiName: 'lock_rule', label: '锁定规则', dataType: 'lock_rule', required: false, description: '' },
      { apiName: 'close_date', label: '預計成交日期', dataType: '日期', required: true, description: '' },
      { apiName: 'field_n4qm3__c', label: '預計拆架日', dataType: '日期', required: false, description: '' },
      { apiName: 'extend_obj_data_id', label: 'extend_obj_data_id', dataType: '单行文本', required: false, description: '' },
      { apiName: 'cost_time', label: '结单周期', dataType: '计算字段', required: false, description: '' },
      { apiName: 'life_status_before_invalid', label: '作废前生命状态', dataType: '单行文本', required: false, description: '' },
      { apiName: 'field_3e2B2__c', label: 'GMAP定位', dataType: '网址', required: false, description: '' },
      { apiName: 'owner_department', label: '负责人主属部门', dataType: '单行文本', required: false, description: '' },
      { apiName: 'field_g927h__c', label: '維修管理表', dataType: '网址', required: false, description: '' },
      { apiName: 'opp_lines_sum', label: '产品合计', dataType: '统计字段', required: false, description: '' },
      { apiName: 'field_b196b__c', label: '備註', dataType: '多行文本', required: false, description: '' },
      { apiName: 'tenant_id', label: 'tenant_id', dataType: '单行文本', required: true, description: '' },
      { apiName: 'discount_sum', label: '折扣后金额', dataType: '统计字段', required: false, description: '' },
      { apiName: 'extend_obj_data_id_original', label: 'extend_obj_data_id_original', dataType: '单行文本', required: false, description: '' },
      { apiName: 'final_amount', label: '成交金额', dataType: '金额', required: false, description: '' },
      { apiName: 'deal_status', label: '成单状态', dataType: '引用字段', required: false, description: '' },
      { apiName: 'close_result', label: '赢单原因', dataType: '多选', required: false, description: '品牌影响力;渠道关系稳定;价格优势;售前服务专业;产品竞争力强;实施周期符合预期' },
      { apiName: 'lock_status', label: '锁定状态', dataType: '单选', required: false, description: '未锁定;锁定' },
      { apiName: 'origin_source', label: '数据来源', dataType: '单选', required: false, description: '数据同步' },
      { apiName: 'lock_user', label: '加锁人', dataType: '人员', required: false, description: '' },
      { apiName: 'is_deleted', label: 'is_deleted', dataType: '布尔值', required: false, description: '' },
      { apiName: 'competitor', label: '竞争对手', dataType: '单行文本', required: false, description: '' },
      { apiName: 'object_describe_api_name', label: 'object_describe_api_name', dataType: '单行文本', required: true, description: '' },
      { apiName: 'industry', label: '所属行业', dataType: '查找关联', required: false, description: '' },
      { apiName: 'expected_product_amount', label: '预计产品金额', dataType: '金额', required: false, description: '' },
      { apiName: 'area_location__r', label: '區位', dataType: '查找关联', required: false, description: '' },
      { apiName: 'field_h3B29__c', label: '樣品屋地址', dataType: '单行文本', required: false, description: '' },
      { apiName: 'opportunity_type', label: '商机类型', dataType: '单选', required: false, description: '新签;续签;增购' },
      { apiName: 'out_owner', label: '外部负责人', dataType: '人员', required: false, description: '' },
      { apiName: 'loss_reason', label: '丢单原因', dataType: '多选', required: false, description: '价格太高;售后支撑不满意;实施周期太长;暂时放弃;产品问题;其他;运营过程不满意' },
      { apiName: 'sales_team', label: '销售团队', dataType: '查找关联', required: false, description: '' },
      { apiName: 'owner', label: '负责人', dataType: '人员', required: true, description: '' },
      { apiName: 'quote_status', label: '报价状态', dataType: '单选', required: false, description: '初次报价;正在优化报价;完成报价;报价已被接受' },
      { apiName: 'package', label: 'package', dataType: '单行文本', required: false, description: '' },
      { apiName: 'create_time', label: '创建时间', dataType: '日期时间', required: false, description: '' },
      { apiName: 'version', label: 'version', dataType: '数字', required: false, description: '' },
      { apiName: 'created_by', label: '创建人', dataType: '人员', required: false, description: '' },
      { apiName: 'relevant_team', label: '相关团队', dataType: 'embedded_object_list', required: false, description: '' },
      { apiName: 'data_own_department', label: '归属部门', dataType: '部门', required: false, description: '' },
      { apiName: 'discount_amount', label: '折扣金额', dataType: '金额', required: false, description: '' },
      { apiName: 'field_n29iL__c', label: '地址', dataType: '单行文本', required: false, description: '' },
      { apiName: 'budget', label: '项目预算', dataType: '单选', required: false, description: '0-1万;1-5万;5-10万;10-30万;30-100万;100万以上' },
      { apiName: 'win_probability', label: '赢单概率(%)', dataType: '数字', required: false, description: '' },
      { apiName: 'opportunity_stage', label: '商机阶段', dataType: '单选', required: false, description: '潜在客户;客户认可;需求确认;方案报价;商务谈判;合同签订' },
      { apiName: 'amount', label: '商机金额', dataType: '金额', required: false, description: '' },
      { apiName: 'custom_amount_5', label: '不含税金额', dataType: '金额', required: false, description: '' },
      { apiName: 'lead_source', label: '商机来源', dataType: '单选', required: false, description: '电话销售;上门拜访;客户推荐;主动来电;网站;广告;展会;其他' },
      { apiName: 'opportunity_status', label: '商机状态', dataType: '单选', required: false, description: '实施中;赢单;输单;无效商机' },
      { apiName: 'real_close_date', label: '实际成交日期', dataType: '日期', required: false, description: '' },
      { apiName: 'name', label: '商机名', dataType: '单行文本', required: true, description: '' },
      { apiName: '_id', label: '_id', dataType: '单行文本', required: false, description: '' },
      { apiName: 'field_qF5U6__c', label: '開工日期', dataType: '日期', required: false, description: '' },
      { apiName: 'last_modified_time', label: '最后修改时间', dataType: '日期时间', required: false, description: '' },
      { apiName: 'accountId', label: '客户名', dataType: '主从', required: false, description: '' },
      { apiName: 'life_status', label: '生命状态', dataType: '单选', required: false, description: '未生效;审核中;正常;变更中;作废' },
      { apiName: 'last_modified_by', label: '最后修改人', dataType: '人员', required: false, description: '' },
      { apiName: 'out_tenant_id', label: '外部企业', dataType: '单行文本', required: false, description: '' },
      { apiName: 'record_type', label: '业务类型', dataType: 'record_type', required: false, description: '' },
      { apiName: 'lock_time', label: '加锁时间', dataType: '日期时间', required: false, description: '' },
      { apiName: 'contactId', label: '联系人', dataType: '查找关联', required: false, description: '' },
      { apiName: 'field_e0dVR__c', label: '開架日期', dataType: '日期', required: false, description: '' },
      { apiName: 'project_customer_name__c', label: '專案案名', dataType: '单行文本', required: false, description: '' },
      { apiName: 'valid_time', label: '生效时间', dataType: '日期时间', required: false, description: '' },
      { apiName: 'invalid_time', label: '作废时间', dataType: '日期时间', required: false, description: '' },
      { apiName: 'quotation_number', label: '报价单号', dataType: '单行文本', required: false, description: '' },
      { apiName: 'field_D4ph1__c', label: '建設公司', dataType: '查找关联', required: false, description: '' },
      { apiName: 'custom_amount_4', label: '税金', dataType: '金额', required: false, description: '' },
      { apiName: 'source_object_id', label: '原始业务ID', dataType: '单行文本', required: false, description: '' },
      { apiName: 'external_id_for_sync', label: '外部系统唯一ID', dataType: '单行文本', required: false, description: '' },
      { apiName: 'owner_department_id', label: '负责人主属部门', dataType: '单行文本', required: false, description: '' },
      { apiName: 'field_fhLzm__c', label: '開始搬建材日期', dataType: '日期', required: false, description: '' },
      { apiName: 'field_3xJW8__c', label: '進度管理表', dataType: '网址', required: false, description: '' },
      { apiName: 'field_JAAyi__c', label: '聯絡人地址', dataType: '单行文本', required: false, description: '' },
      { apiName: 'field_z89V3__c', label: '上架日期', dataType: '日期', required: false, description: '' },
      { apiName: 'field_i5Y0u__c', label: '照片', dataType: '图片', required: false, description: '' },
      { apiName: 'order_by', label: 'order_by', dataType: '数字', required: false, description: '' },
      { apiName: 'field_uK83z__c', label: '施工坪數', dataType: '数字', required: false, description: '' },
      { apiName: 'field_v5z8u__c', label: '合約金額', dataType: '金额', required: false, description: '' },
      { apiName: 'cost_type__c', label: '單價類型', dataType: '单选', required: false, description: '坪數;數量' }
    ]
  },

  // 工地師父 - object_50HJ8__c
  'object_50HJ8__c': {
    displayName: '工地師父',
    fields: [
      // 必填欄位
      { apiName: 'tenant_id', label: 'tenant_id', dataType: '单行文本', required: true, description: '' },
      { apiName: 'object_describe_api_name', label: 'object_describe_api_name', dataType: '单行文本', required: true, description: '' },
      { apiName: 'owner', label: '负责人', dataType: '人员', required: true, description: '' },
      { apiName: 'name', label: '姓名', dataType: '单行文本', required: true, description: '' },
      
      // 鎖定相關
      { apiName: 'lock_rule', label: '锁定规则', dataType: 'lock_rule', required: false, description: '' },
      { apiName: 'lock_status', label: '锁定状态', dataType: '单选', required: false, description: '未锁定;锁定' },
      { apiName: 'lock_user', label: '加锁人', dataType: '人员', required: false, description: '' },
      
      // 負責項目（多選查找關聯）
      { apiName: 'field_a7jCj__c', label: '負責維修單', dataType: '查找关联(多选)', required: false, description: '' },
      { apiName: 'field_zuA4N__c', label: '負責工單', dataType: '查找关联(多选)', required: false, description: '' },
      { apiName: 'field_GJk8L__c', label: '負責商機', dataType: '查找关联(多选)', required: false, description: '' },
      
      // 聯絡資訊
      { apiName: 'phone_number__c', label: '手機', dataType: '手机', required: false, description: '' },
      { apiName: 'field_HdgcK__c', label: '連絡人', dataType: '查找关联', required: false, description: '' },
      
      // 帳號資訊
      { apiName: 'account__c', label: '帳號', dataType: '单行文本', required: false, description: '' },
      { apiName: 'field_kz1Y9__c', label: '帳號1', dataType: '单行文本', required: false, description: '' },
      { apiName: 'password__c', label: '密碼', dataType: '单行文本', required: false, description: '' },
      
      // 基本資訊
      { apiName: 'abbreviation__c', label: '簡稱', dataType: '单行文本', required: false, description: '' },
      { apiName: 'LINE_user_id__c', label: 'UID', dataType: '单行文本', required: false, description: 'LINE用戶ID' },
      { apiName: 'field_iL2BT__c', label: '角色', dataType: '单选', required: false, description: '元心;建設公司;工班;設計師;其他' },
      { apiName: 'field_D1087__c', label: '屬於那個工班', dataType: '查找关联', required: false, description: '' },
      { apiName: 'field_Imtt7__c', label: '頭像', dataType: '图片', required: false, description: '' },
      { apiName: 'field_CKi2C__c', label: '單行文本', dataType: '单行文本', required: false, description: '' },
      
      // 生命週期
      { apiName: 'life_status', label: '生命状态', dataType: '单选', required: false, description: '未生效;审核中;正常;变更中;作废' },
      { apiName: 'life_status_before_invalid', label: '作废前生命状态', dataType: '单行文本', required: false, description: '' },
      
      // 數據來源
      { apiName: 'origin_source', label: '数据来源', dataType: '单选', required: false, description: '数据同步' },
      { apiName: 'is_deleted', label: 'is_deleted', dataType: '布尔值', required: false, description: '' },
      
      // 負責人部門
      { apiName: 'owner_department', label: '负责人主属部门', dataType: '单行文本', required: false, description: '' },
      { apiName: 'out_owner', label: '外部负责人', dataType: '人员', required: false, description: '' },
      
      // 時間戳記
      { apiName: 'create_time', label: '创建时间', dataType: '日期时间', required: false, description: '' },
      { apiName: 'created_by', label: '创建人', dataType: '人员', required: false, description: '' },
      { apiName: 'last_modified_time', label: '最后修改时间', dataType: '日期时间', required: false, description: '' },
      { apiName: 'last_modified_by', label: '最后修改人', dataType: '人员', required: false, description: '' },
      
      // 組織相關
      { apiName: 'out_tenant_id', label: '外部企业', dataType: '单行文本', required: false, description: '' },
      { apiName: 'data_own_department', label: '归属部门', dataType: '部门', required: false, description: '' },
      { apiName: 'relevant_team', label: '相关团队', dataType: 'embedded_object_list', required: false, description: '' },
      
      // 系統欄位
      { apiName: 'package', label: 'package', dataType: '单行文本', required: false, description: '' },
      { apiName: 'version', label: 'version', dataType: '数字', required: false, description: '' },
      { apiName: 'record_type', label: '业务类型', dataType: 'record_type', required: false, description: '' },
      { apiName: 'order_by', label: 'order_by', dataType: '数字', required: false, description: '' },
      { apiName: '_id', label: '_id', dataType: '单行文本', required: false, description: '' }
    ]
  },

  // 供應商 - SupplierObj
  'SupplierObj': {
    displayName: '供應商',
    fields: [
      { apiName: 'lock_rule', label: '锁定规则', dataType: 'lock_rule', required: false, description: '' },
      { apiName: 'country', label: '国家', dataType: '单选', required: false, description: '中国;美国;加拿大;英国;德国;法国;俄罗斯;澳大利亚;意大利;瑞士;荷兰;西班牙;巴西;墨西哥;印度;日本;韩国;朝鲜;泰国;新加坡;马来西亚;南非;新西兰;其他' },
      { apiName: 'province', label: '省份', dataType: '单选', required: false, description: '湖北省;广东省;黑龙江省;辽宁省;吉林省;河北省;河南省;山东省;山西省;安徽省;湖南省;江苏省;四川省;福建省;江西省;云南省;浙江省;海南省;陕西省;甘肃省;青海省;台湾省;贵州省;内蒙古自治区;新疆维吾尔自治区;西藏自治区;广西壮族自治区;宁夏回族自治区;北京市;上海市;天津市;重庆市;香港特别行政区;澳门特别行政区' },
      { apiName: 'enable_flag', label: '启用状态', dataType: '单选', required: false, description: '启用;停用' },
      { apiName: 'life_status_before_invalid', label: '作废前生命状态', dataType: '单行文本', required: false, description: '' },
      { apiName: 'owner_department', label: '负责人主属部门', dataType: '单行文本', required: false, description: '' },
      { apiName: 'tenant_id', label: 'tenant_id', dataType: '单行文本', required: true, description: '' },
      { apiName: 'tax_rate', label: '税率（%）', dataType: '数字', required: false, description: '' },
      { apiName: 'lock_status', label: '锁定状态', dataType: '单选', required: false, description: '未锁定;锁定' },
      { apiName: 'deposit_bank', label: '开户行', dataType: '单行文本', required: false, description: '' },
      { apiName: 'origin_source', label: '数据来源', dataType: '单选', required: false, description: '数据同步' },
      { apiName: 'lock_user', label: '加锁人', dataType: '人员', required: false, description: '' },
      { apiName: 'is_deleted', label: 'is_deleted', dataType: '布尔值', required: false, description: '' },
      { apiName: 'object_describe_api_name', label: 'object_describe_api_name', dataType: '单行文本', required: true, description: '' },
      { apiName: 'address', label: '地址', dataType: '单行文本', required: false, description: '' },
      { apiName: 'out_owner', label: '外部负责人', dataType: '人员', required: false, description: '' },
      { apiName: 'city', label: '城市', dataType: '单行文本', required: false, description: '' },
      { apiName: 'zip_code', label: '邮编', dataType: '单行文本', required: false, description: '' },
      { apiName: 'supplier_type', label: '供应商类型', dataType: '单选', required: false, description: '系统供应商;设备供应商;材料供应商;服务供应商;其他' },
      { apiName: 'owner', label: '负责人', dataType: '人员', required: true, description: '' },
      { apiName: 'package', label: 'package', dataType: '单行文本', required: false, description: '' },
      { apiName: 'create_time', label: '创建时间', dataType: '日期时间', required: false, description: '' },
      { apiName: 'bank_account', label: '银行账号', dataType: '单行文本', required: false, description: '' },
      { apiName: 'supplier_level', label: '供应商级别', dataType: '单选', required: false, description: '高级;中级;初级' },
      { apiName: 'industry', label: '所属行业', dataType: '查找关联', required: false, description: '' },
      { apiName: 'version', label: 'version', dataType: '数字', required: false, description: '' },
      { apiName: 'created_by', label: '创建人', dataType: '人员', required: false, description: '' },
      { apiName: 'relevant_team', label: '相关团队', dataType: 'embedded_object_list', required: false, description: '' },
      { apiName: 'data_own_department', label: '归属部门', dataType: '部门', required: false, description: '' },
      { apiName: 'fax', label: '传真', dataType: '单行文本', required: false, description: '' },
      { apiName: 'linkman', label: '联系人', dataType: '单行文本', required: false, description: '' },
      { apiName: 'supplier_name', label: '供应商名', dataType: '单行文本', required: true, description: '' },
      { apiName: 'description', label: '简介', dataType: '多行文本', required: false, description: '' },
      { apiName: '_id', label: '_id', dataType: '单行文本', required: false, description: '' },
      { apiName: 'last_modified_time', label: '最后修改时间', dataType: '日期时间', required: false, description: '' },
      { apiName: 'telephone', label: '联系电话', dataType: '单行文本', required: false, description: '' },
      { apiName: 'life_status', label: '生命状态', dataType: '单选', required: false, description: '未生效;审核中;正常;变更中;作废' },
      { apiName: 'last_modified_by', label: '最后修改人', dataType: '人员', required: false, description: '' },
      { apiName: 'email', label: 'Email', dataType: '邮箱', required: false, description: '' },
      { apiName: 'out_tenant_id', label: '外部企业', dataType: '单行文本', required: false, description: '' },
      { apiName: 'record_type', label: '业务类型', dataType: 'record_type', required: false, description: '' },
      { apiName: 'lock_time', label: '加锁时间', dataType: '日期时间', required: false, description: '' },
      { apiName: 'tax_num', label: '税号', dataType: '单行文本', required: false, description: '' },
      { apiName: 'contact_mobile', label: '联系人手机', dataType: '单行文本', required: false, description: '' },
      { apiName: 'valid_time', label: '生效时间', dataType: '日期时间', required: false, description: '' },
      { apiName: 'invalid_time', label: '作废时间', dataType: '日期时间', required: false, description: '' },
      { apiName: 'web_site', label: '网址', dataType: '网址', required: false, description: '' },
      { apiName: 'source_object_id', label: '原始业务ID', dataType: '单行文本', required: false, description: '' },
      { apiName: 'external_id_for_sync', label: '外部系统唯一ID', dataType: '单行文本', required: false, description: '' },
      { apiName: 'owner_department_id', label: '负责人主属部门', dataType: '单行文本', required: false, description: '' },
      { apiName: 'field_41B23__c', label: '統編', dataType: '单行文本', required: false, description: '' },
      { apiName: 'order_by', label: 'order_by', dataType: '数字', required: false, description: '' },
      { apiName: 'supplier_id', label: '供应商编号', dataType: '自增编号', required: false, description: '' },
      { apiName: 'field_hUy14__c', label: '開始合作日期', dataType: '日期', required: false, description: '' },
      { apiName: 'field_i7I1z__c', label: '類型', dataType: '单选', required: false, description: '工地;樣品屋;裝潢;其他' }
    ]
  }
};

/**
 * 獲取對象的欄位映射
 */
export function getFieldMapping(objectApiName) {
  return fieldMappingsAll[objectApiName] || null;
}

/**
 * 獲取欄位的中文標籤
 */
export function getFieldLabel(objectApiName, fieldApiName) {
  const mapping = fieldMappingsAll[objectApiName];
  if (!mapping) return fieldApiName;
  
  const field = mapping.fields.find(f => f.apiName === fieldApiName);
  return field ? field.label : fieldApiName;
}

/**
 * 獲取欄位的數據類型
 */
export function getFieldType(objectApiName, fieldApiName) {
  const mapping = fieldMappingsAll[objectApiName];
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
    '统计字段': 'STATISTIC',
    '主从': 'MASTER_DETAIL',
    '网址': 'URL',
    '邮箱': 'EMAIL',
    'embedded_object_list': 'EMBEDDED_LIST',
    'lock_rule': 'SYSTEM',
    'record_type': 'SYSTEM'
  };
  
  return typeMapping[field.dataType] || 'TEXT';
}

/**
 * 獲取所有對象的列表
 */
export function getAllObjects() {
  return Object.keys(fieldMappingsAll).map(apiName => ({
    apiName,
    displayName: fieldMappingsAll[apiName].displayName,
    fieldCount: fieldMappingsAll[apiName].fields.length
  }));
}