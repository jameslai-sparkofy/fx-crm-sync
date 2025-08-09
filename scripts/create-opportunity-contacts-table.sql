-- 創建商機連絡人表
CREATE TABLE IF NOT EXISTS newopportunitycontactsobj (
  -- 主鍵
  _id TEXT PRIMARY KEY,
  
  -- 基本資訊
  name TEXT NOT NULL,
  
  -- 關聯資訊
  new_opportunity_id TEXT,
  new_opportunity_id__r TEXT,
  new_opportunity_id__relation_ids TEXT,
  contact_id TEXT,
  contact_id__r TEXT, 
  contact_id__relation_ids TEXT,
  field_ck71r__c TEXT,
  field_ck71r__c__r TEXT,
  field_ck71r__c__relation_ids TEXT,
  
  -- 擁有者資訊
  owner TEXT,
  owner__r TEXT,
  owner_department_id TEXT,
  owner_department TEXT,
  
  -- 創建資訊
  create_time INTEGER,
  created_by TEXT,
  created_by__r TEXT,
  
  -- 修改資訊  
  last_modified_time INTEGER,
  last_modified_by TEXT,
  last_modified_by__r TEXT,
  
  -- 狀態資訊
  life_status TEXT DEFAULT 'normal',
  life_status__r TEXT,
  lock_status TEXT DEFAULT '0',
  lock_status__r TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  
  -- 系統資訊
  record_type TEXT DEFAULT 'default__c',
  version TEXT,
  data_own_department TEXT,
  data_own_department__r TEXT,
  total_num INTEGER,
  extend_obj_data_id TEXT,
  
  -- 同步資訊
  fx_created_at INTEGER,
  fx_updated_at INTEGER,
  sync_version INTEGER DEFAULT 0,
  sync_time DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 創建索引提升查詢效能
CREATE INDEX IF NOT EXISTS idx_newopportunitycontactsobj_opportunity ON newopportunitycontactsobj(new_opportunity_id);
CREATE INDEX IF NOT EXISTS idx_newopportunitycontactsobj_contact ON newopportunitycontactsobj(contact_id);
CREATE INDEX IF NOT EXISTS idx_newopportunitycontactsobj_owner ON newopportunitycontactsobj(owner);
CREATE INDEX IF NOT EXISTS idx_newopportunitycontactsobj_modified ON newopportunitycontactsobj(last_modified_time);
CREATE INDEX IF NOT EXISTS idx_newopportunitycontactsobj_sync ON newopportunitycontactsobj(sync_time);