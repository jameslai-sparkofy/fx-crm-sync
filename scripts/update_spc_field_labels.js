// 更新案場欄位中文標籤
const fs = require('fs');
const axios = require('axios');

// 從 CSV 文件讀取的欄位對照表
const fieldMapping = {
    // 系統欄位
    'lock_rule': '锁定规则',
    'shift_time__c': '工班',
    'life_status_before_invalid': '作废前生命状态',
    'owner_department': '负责人主属部门',
    'lock_status': '锁定状态',
    'package': 'package',
    'create_time': '创建时间',
    'version': 'version',
    'created_by': '创建人',
    'relevant_team': '相关团队',
    'data_own_department': '归属部门',
    'name': '編號',
    '_id': '_id',
    'tenant_id': 'tenant_id',
    'origin_source': '数据来源',
    'lock_user': '加锁人',
    'is_deleted': 'is_deleted',
    'object_describe_api_name': 'object_describe_api_name',
    'out_owner': '外部负责人',
    'owner': '负责人',
    'last_modified_time': '最后修改时间',
    'life_status': '生命状态',
    'last_modified_by': '最后修改人',
    'out_tenant_id': '外部企业',
    'record_type': '业务类型',
    'order_by': 'order_by',
    
    // 自定義欄位
    'field_3T38o__c': '平面圖',
    'field_u1wpv__c': '工班師父',
    'field_sF6fn__c': '施工前備註',
    'field_27g6n__c': '保護板坪數',
    'field_23pFq__c': '施工日期',
    'field_V3d91__c': '施工前照片',
    'field_v1x3S__c': '驗收照片',
    'field_B2gh1__c': '舖設坪數',
    'field_f0mz3__c': '保固日期',
    'field_i2Q1g__c': '少請坪數',
    'field_03U9h__c': '工地狀況照片',
    'field_WD7k1__c': '棟別',
    'field_sijGR__c': '維修備註1',
    'bad_case_scene__c': '做壞案場',
    'field_npLvn__c': '請款單',
    'field_1zk34__c': '缺失影片',
    'field_V32Xl__c': '工班備註',
    'construction_completed__c': '施工完成',
    'field_3Fqof__c': '完工照片',
    'field_k7e6q__c': '工單',
    'field_Q6Svh__c': '樓層',
    'field_n37jC__c': '驗收備註',
    'field_23Z5i__c': '標籤',
    'field_XuJP2__c': '戶別',
    'field_1P96q__c': '商機',
    'field_g18hX__c': '工地備註',
    'field_tXAko__c': '工地坪數',
    'field_z9H6O__c': '階段',
    'field_W2i6j__c': '施工前缺失',
    'field_dxr31__c': '案場類型'
};

async function compareAndUpdate() {
    console.log('📊 案場欄位標籤比對與更新');
    console.log('=====================================\n');
    
    try {
        // 1. 獲取當前 API 的欄位
        const response = await axios.get('https://fx-crm-sync-dev.lai-jameslai.workers.dev/api/objects/object_8W9cb__c/fields');
        const apiFields = response.data.data;
        const allFields = [...apiFields.systemFields, ...apiFields.customFields];
        
        console.log(`API 欄位總數: ${allFields.length}`);
        console.log(`CSV 定義欄位: ${Object.keys(fieldMapping).length}\n`);
        
        // 2. 比對差異
        const needsUpdate = [];
        const correct = [];
        const missing = [];
        
        allFields.forEach(field => {
            const apiName = field.apiName;
            const currentName = field.displayName;
            const expectedName = fieldMapping[apiName];
            
            if (expectedName) {
                if (currentName !== expectedName) {
                    needsUpdate.push({
                        apiName,
                        current: currentName,
                        expected: expectedName
                    });
                } else {
                    correct.push(apiName);
                }
            } else {
                missing.push({
                    apiName,
                    currentName
                });
            }
        });
        
        // 3. 顯示結果
        console.log(`✅ 正確的欄位: ${correct.length} 個`);
        
        if (needsUpdate.length > 0) {
            console.log(`\n🔄 需要更新的欄位: ${needsUpdate.length} 個`);
            console.log('前 20 個需要更新的欄位:');
            needsUpdate.slice(0, 20).forEach(field => {
                console.log(`  ${field.apiName}:`);
                console.log(`    當前: ${field.current}`);
                console.log(`    應為: ${field.expected}`);
            });
        }
        
        if (missing.length > 0) {
            console.log(`\n⚠️ CSV 中未定義的欄位: ${missing.length} 個`);
            console.log('前 10 個未定義的欄位:');
            missing.slice(0, 10).forEach(field => {
                console.log(`  - ${field.apiName}: ${field.currentName}`);
            });
        }
        
        // 4. 生成更新文件
        const updateData = {
            'object_8W9cb__c': fieldMapping
        };
        
        fs.writeFileSync(
            '/mnt/c/claude/紛銷資料庫/spc_field_labels_update.json',
            JSON.stringify(updateData, null, 2),
            'utf-8'
        );
        
        console.log('\n✅ 已生成更新文件: spc_field_labels_update.json');
        console.log('   可用於更新系統中的欄位標籤');
        
        // 5. 統計摘要
        console.log('\n📈 統計摘要:');
        console.log(`  總欄位數: ${allFields.length}`);
        console.log(`  正確標籤: ${correct.length} (${(correct.length/allFields.length*100).toFixed(1)}%)`);
        console.log(`  需要更新: ${needsUpdate.length} (${(needsUpdate.length/allFields.length*100).toFixed(1)}%)`);
        console.log(`  未定義: ${missing.length} (${(missing.length/allFields.length*100).toFixed(1)}%)`);
        
    } catch (error) {
        console.error('❌ 錯誤:', error.message);
    }
}

compareAndUpdate();