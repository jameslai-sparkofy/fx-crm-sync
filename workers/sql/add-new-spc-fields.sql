-- 新增案場(SPC)的兩個新欄位
-- construction_difficulty_ph__c: 工地狀況照片(施工後) - 圖片類型
-- work_shift_completion_note__c: 工班施工完備註 - 多行文本類型

-- 新增欄位到 object_8w9cb__c 表
ALTER TABLE object_8w9cb__c 
ADD COLUMN construction_difficulty_ph__c TEXT;

ALTER TABLE object_8w9cb__c 
ADD COLUMN work_shift_completion_note__c TEXT;

-- 更新欄位定義表
INSERT INTO fx_field_definitions (
    id,
    object_api_name,
    field_api_name,
    display_name,
    field_type,
    data_type,
    is_required,
    is_custom,
    is_active,
    is_synced,
    created_at,
    updated_at
) VALUES 
(
    'field_construction_difficulty_ph__c',
    'object_8W9cb__c',
    'construction_difficulty_ph__c',
    '工地狀況照片(施工後)',
    'image',
    'TEXT',
    0,
    1,
    1,
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'field_work_shift_completion_note__c',
    'object_8W9cb__c',
    'work_shift_completion_note__c',
    '工班施工完備註',
    'textarea',
    'TEXT',
    0,
    1,
    1,
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT(object_api_name, field_api_name) DO UPDATE SET
    display_name = excluded.display_name,
    field_type = excluded.field_type,
    data_type = excluded.data_type,
    is_active = 1,
    is_synced = 1,
    updated_at = CURRENT_TIMESTAMP;
