export const adminHTML = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FX CRM 同步管理系統</title>
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
    <link rel="stylesheet" href="https://unpkg.com/element-plus/dist/index.css">
    <script src="https://unpkg.com/element-plus"></script>
    <script src="https://unpkg.com/@element-plus/icons-vue"></script>
    <script src="https://unpkg.com/axios/dist/axios.min.js"></script>
    <script src="https://unpkg.com/dayjs/dayjs.min.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fa; }
        .header { background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 0 20px; height: 60px; display: flex; align-items: center; justify-content: space-between; }
        .header h1 { font-size: 24px; color: #303133; }
        .header-right { display: flex; align-items: center; gap: 20px; }
        .update-time { color: #909399; font-size: 14px; }
        .main-content { padding: 20px; }
        .stats-row { margin-bottom: 20px; }
        .stat-card { text-align: center; }
        .stat-title { font-size: 14px; color: #909399; margin-bottom: 12px; }
        .stat-value { font-size: 36px; font-weight: 700; margin-bottom: 8px; }
        .stat-value.primary { color: #409eff; }
        .stat-value.success { color: #67c23a; }
        .stat-value.warning { color: #e6a23c; }
        .stat-subtitle { font-size: 12px; color: #c0c4cc; }
        .sync-card { margin-bottom: 20px; }
        .sync-description { color: #909399; font-size: 14px; margin-bottom: 20px; }
        .sync-actions { display: flex; gap: 10px; }
    </style>
</head>
<body>
    <div id="app">
        <div class="header">
            <h1>紛享銷客 CRM 同步管理系統</h1>
            <div class="header-right">
                <span class="update-time">最後更新: {{ lastUpdate }}</span>
                <el-button type="primary" @click="refreshData" :icon="RefreshIcon">重新載入</el-button>
            </div>
        </div>
        
        <div class="main-content">
            <!-- Statistics Cards -->
            <el-row :gutter="20" class="stats-row">
                <el-col :span="8">
                    <el-card class="stat-card">
                        <div class="stat-title">商機總數</div>
                        <div class="stat-value primary">{{ stats.opportunities }}</div>
                        <div class="stat-subtitle">NewOpportunityObj</div>
                    </el-card>
                </el-col>
                <el-col :span="8">
                    <el-card class="stat-card">
                        <div class="stat-title">案場總數</div>
                        <div class="stat-value success">{{ stats.sites }}</div>
                        <div class="stat-subtitle">object_8W9cb__c</div>
                    </el-card>
                </el-col>
                <el-col :span="8">
                    <el-card class="stat-card">
                        <div class="stat-title">同步記錄</div>
                        <div class="stat-value warning">{{ stats.syncLogs }}</div>
                        <div class="stat-subtitle">總執行次數</div>
                    </el-card>
                </el-col>
            </el-row>

            <!-- Tabs -->
            <el-tabs v-model="activeTab">
                <el-tab-pane label="同步管理" name="sync">
                    <el-row :gutter="20">
                        <!-- 商機同步 -->
                        <el-col :span="12">
                            <el-card class="sync-card">
                                <template #header>商機同步</template>
                                <p class="sync-description">同步 CRM 中的商機數據到 D1 資料庫</p>
                                <div class="sync-actions">
                                    <el-button type="primary" @click="syncData('NewOpportunityObj', false)" :loading="syncing.opportunities">
                                        增量同步
                                    </el-button>
                                    <el-button @click="syncData('NewOpportunityObj', true)" :loading="syncing.opportunities">
                                        完整同步
                                    </el-button>
                                </div>
                            </el-card>
                        </el-col>
                        
                        <!-- 案場同步 -->
                        <el-col :span="12">
                            <el-card class="sync-card">
                                <template #header>案場同步</template>
                                <p class="sync-description">同步 CRM 中的案場數據到 D1 資料庫</p>
                                <div class="sync-actions">
                                    <el-button type="success" @click="syncData('object_8W9cb__c', false)" :loading="syncing.sites">
                                        增量同步
                                    </el-button>
                                    <el-button @click="syncData('object_8W9cb__c', true)" :loading="syncing.sites">
                                        完整同步
                                    </el-button>
                                </div>
                            </el-card>
                        </el-col>
                    </el-row>
                </el-tab-pane>
                
                <el-tab-pane label="同步日誌" name="logs">
                    <el-table :data="recentLogs" stripe>
                        <el-table-column prop="completed_at" label="完成時間" width="180">
                            <template #default="{ row }">
                                {{ formatDate(row.completed_at) }}
                            </template>
                        </el-table-column>
                        <el-table-column prop="entity_type" label="對象類型" width="150">
                            <template #default="{ row }">
                                {{ getObjectName(row.entity_type) }}
                            </template>
                        </el-table-column>
                        <el-table-column prop="status" label="狀態" width="100">
                            <template #default="{ row }">
                                <el-tag :type="row.status === 'COMPLETED' ? 'success' : 'danger'">
                                    {{ row.status === 'COMPLETED' ? '成功' : '失敗' }}
                                </el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column prop="records_count" label="總記錄數" width="120" align="center" />
                        <el-table-column label="成功數量" width="120" align="center">
                            <template #default="{ row }">
                                {{ row.records_count - row.error_count }}
                            </template>
                        </el-table-column>
                        <el-table-column prop="error_count" label="錯誤數量" width="120" align="center" />
                    </el-table>
                </el-tab-pane>
                
                <el-tab-pane label="對象管理" name="objects">
                    <el-card>
                        <template #header>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span>CRM 對象管理</span>
                                <el-button type="primary" @click="discoverObjects" :loading="discovering" :icon="SearchIcon">發現對象</el-button>
                            </div>
                        </template>
                        
                        <el-tabs v-model="objectTab">
                            <el-tab-pane label="標準對象" name="standard">
                                <el-table :data="standardObjects" stripe v-loading="loadingObjects">
                                    <el-table-column label="對象名稱" width="200">
                                        <template #default="{ row }">
                                            {{ row.displayName }}
                                        </template>
                                    </el-table-column>
                                    <el-table-column label="API 名稱" width="250">
                                        <template #default="{ row }">
                                            {{ row.apiName }}
                                        </template>
                                    </el-table-column>
                                    <el-table-column label="同步狀態" width="100" align="center">
                                        <template #default="{ row }">
                                            <el-tag :type="row.isSynced ? 'success' : 'info'">
                                                {{ row.isSynced ? '已同步' : '未同步' }}
                                            </el-tag>
                                        </template>
                                    </el-table-column>
                                    <el-table-column label="啟用狀態" width="160" align="center">
                                        <template #default="{ row }">
                                            <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                                                <el-tag :type="row.isEnabled ? 'success' : 'info'" size="small">
                                                    {{ row.isEnabled ? '已啟用' : '未啟用' }}
                                                </el-tag>
                                                <el-switch 
                                                    v-model="row.isEnabled"
                                                    @change="toggleObject(row)"
                                                    :disabled="!row.isSynced"
                                                    size="small"
                                                />
                                            </div>
                                        </template>
                                    </el-table-column>
                                    <el-table-column prop="lastSyncedAt" label="最後同步" width="180">
                                        <template #default="{ row }">
                                            {{ formatDate(row.lastSyncedAt) }}
                                        </template>
                                    </el-table-column>
                                    <el-table-column label="操作" align="center">
                                        <template #default="{ row }">
                                            <el-button-group size="small">
                                                <el-button @click="viewFields(row)" :icon="ViewIcon">欄位</el-button>
                                                <el-button v-if="!row.isSynced" @click="initTable(row)" type="primary">初始化</el-button>
                                                <el-button v-else @click="syncSchema(row)" type="success">同步結構</el-button>
                                            </el-button-group>
                                        </template>
                                    </el-table-column>
                                </el-table>
                            </el-tab-pane>
                            
                            <el-tab-pane label="自定義對象" name="custom">
                                <el-table :data="customObjects" stripe v-loading="loadingObjects">
                                    <el-table-column label="對象名稱" width="200">
                                        <template #default="{ row }">
                                            {{ row.displayName }}
                                        </template>
                                    </el-table-column>
                                    <el-table-column label="API 名稱" width="250">
                                        <template #default="{ row }">
                                            {{ row.apiName }}
                                        </template>
                                    </el-table-column>
                                    <el-table-column label="同步狀態" width="100" align="center">
                                        <template #default="{ row }">
                                            <el-tag :type="row.isSynced ? 'success' : 'info'">
                                                {{ row.isSynced ? '已同步' : '未同步' }}
                                            </el-tag>
                                        </template>
                                    </el-table-column>
                                    <el-table-column label="啟用狀態" width="160" align="center">
                                        <template #default="{ row }">
                                            <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                                                <el-tag :type="row.isEnabled ? 'success' : 'info'" size="small">
                                                    {{ row.isEnabled ? '已啟用' : '未啟用' }}
                                                </el-tag>
                                                <el-switch 
                                                    v-model="row.isEnabled"
                                                    @change="toggleObject(row)"
                                                    :disabled="!row.isSynced"
                                                    size="small"
                                                />
                                            </div>
                                        </template>
                                    </el-table-column>
                                    <el-table-column prop="lastSyncedAt" label="最後同步" width="180">
                                        <template #default="{ row }">
                                            {{ formatDate(row.lastSyncedAt) }}
                                        </template>
                                    </el-table-column>
                                    <el-table-column label="操作" align="center">
                                        <template #default="{ row }">
                                            <el-button-group size="small">
                                                <el-button @click="viewFields(row)" :icon="ViewIcon">欄位</el-button>
                                                <el-button v-if="!row.isSynced" @click="initTable(row)" type="primary">初始化</el-button>
                                                <el-button v-else @click="syncSchema(row)" type="success">同步結構</el-button>
                                            </el-button-group>
                                        </template>
                                    </el-table-column>
                                </el-table>
                            </el-tab-pane>
                        </el-tabs>
                    </el-card>
                </el-tab-pane>
            </el-tabs>
        </div>
        
        <!-- 欄位詳情對話框 -->
        <el-dialog v-model="fieldDialogVisible" title="對象欄位詳情" width="80%">
            <div v-if="selectedObject">
                <el-descriptions :column="2" border style="margin-bottom: 20px;">
                    <el-descriptions-item label="對象名稱">{{ selectedObject.displayName }}</el-descriptions-item>
                    <el-descriptions-item label="API 名稱">{{ selectedObject.apiName }}</el-descriptions-item>
                    <el-descriptions-item label="系統欄位數">{{ fieldDetails.systemFields?.length || 0 }}</el-descriptions-item>
                    <el-descriptions-item label="自定義欄位數">{{ fieldDetails.customFields?.length || 0 }}</el-descriptions-item>
                </el-descriptions>
                
                <el-tabs v-model="fieldTab">
                    <el-tab-pane label="系統欄位" name="system">
                        <el-table :data="fieldDetails.systemFields" stripe max-height="400">
                            <el-table-column prop="displayName" label="欄位名稱" width="200" />
                            <el-table-column prop="apiName" label="API 名稱" width="200" />
                            <el-table-column prop="fieldType" label="欄位類型" width="150" />
                            <el-table-column prop="dataType" label="數據類型" width="150" />
                            <el-table-column label="必填" width="80" align="center">
                                <template #default="{ row }">
                                    <el-tag :type="row.isRequired ? 'danger' : 'info'" size="small">
                                        {{ row.isRequired ? '是' : '否' }}
                                    </el-tag>
                                </template>
                            </el-table-column>
                        </el-table>
                    </el-tab-pane>
                    
                    <el-tab-pane label="自定義欄位" name="custom">
                        <el-table :data="fieldDetails.customFields" stripe max-height="400">
                            <el-table-column prop="displayName" label="欄位名稱" width="200" />
                            <el-table-column prop="apiName" label="API 名稱" width="200" />
                            <el-table-column prop="fieldType" label="欄位類型" width="150" />
                            <el-table-column prop="dataType" label="數據類型" width="150" />
                            <el-table-column label="必填" width="80" align="center">
                                <template #default="{ row }">
                                    <el-tag :type="row.isRequired ? 'danger' : 'info'" size="small">
                                        {{ row.isRequired ? '是' : '否' }}
                                    </el-tag>
                                </template>
                            </el-table-column>
                        </el-table>
                    </el-tab-pane>
                </el-tabs>
            </div>
        </el-dialog>
    </div>

    <script>
        const { createApp } = Vue;
        const { ElMessage } = ElementPlus;
        
        createApp({
            data() {
                return {
                    activeTab: 'sync',
                    objectTab: 'standard',
                    fieldTab: 'system',
                    lastUpdate: new Date().toLocaleString('zh-TW'),
                    stats: {
                        opportunities: 0,
                        sites: 0,
                        syncLogs: 0
                    },
                    syncing: {
                        opportunities: false,
                        sites: false
                    },
                    recentLogs: [],
                    syncedObjects: [
                        { displayName: '商機', apiName: 'NewOpportunityObj', fieldCount: 61, lastSync: '2025-08-03 10:01:23' },
                        { displayName: '案場', apiName: 'object_8W9cb__c', fieldCount: 47, lastSync: '2025-08-03 10:09:12' }
                    ],
                    // 對象管理相關
                    standardObjects: [],
                    customObjects: [],
                    loadingObjects: false,
                    discovering: false,
                    fieldDialogVisible: false,
                    selectedObject: null,
                    fieldDetails: {
                        systemFields: [],
                        customFields: []
                    },
                    // Icons
                    RefreshIcon: ElementPlusIconsVue.Refresh,
                    SearchIcon: ElementPlusIconsVue.Search,
                    ViewIcon: ElementPlusIconsVue.View
                }
            },
            mounted() {
                this.loadStats();
                // 預先載入對象數據
                this.loadObjects();
            },
            watch: {
                activeTab(newVal) {
                    if (newVal === 'objects' && this.standardObjects.length === 0) {
                        this.loadObjects();
                    }
                }
            },
            methods: {
                async loadStats() {
                    try {
                        const response = await axios.get('/api/debug/d1-stats');
                        if (response.data.success) {
                            this.stats = response.data.data.tables;
                            this.recentLogs = response.data.data.recentSyncs || [];
                        }
                    } catch (error) {
                        ElMessage.error('載入統計失敗: ' + error.message);
                    }
                },
                
                async syncData(objectName, fullSync) {
                    const syncType = objectName === 'NewOpportunityObj' ? 'opportunities' : 'sites';
                    this.syncing[syncType] = true;
                    
                    try {
                        const endpoint = fullSync ? 'full' : 'start';
                        const response = await axios.post(\`/api/sync/\${objectName}/\${endpoint}\`);
                        
                        if (response.data.success) {
                            const result = response.data.data?.result || {};
                            ElMessage.success(\`同步完成！成功: \${result.success || 0} 條，錯誤: \${result.errors || 0} 條\`);
                            await this.loadStats();
                        } else {
                            ElMessage.error('同步失敗: ' + response.data.error);
                        }
                    } catch (error) {
                        ElMessage.error('同步失敗: ' + error.message);
                    } finally {
                        this.syncing[syncType] = false;
                    }
                },
                
                async refreshData() {
                    this.lastUpdate = new Date().toLocaleString('zh-TW');
                    await this.loadStats();
                    ElMessage.success('資料已更新');
                },
                
                formatDate(timestamp) {
                    if (!timestamp) return '-';
                    return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss');
                },
                
                getObjectName(apiName) {
                    const names = {
                        'NewOpportunityObj': '商機',
                        'object_8W9cb__c': '案場'
                    };
                    return names[apiName] || apiName;
                },
                
                // 對象管理方法
                async loadObjects() {
                    this.loadingObjects = true;
                    try {
                        const response = await axios.get('/api/objects');
                        if (response.data.success) {
                            this.standardObjects = response.data.data.defaultObjects || [];
                            this.customObjects = response.data.data.customObjects || [];
                        } else {
                            ElMessage.error('載入對象失敗: ' + response.data.error);
                        }
                    } catch (error) {
                        ElMessage.error('載入對象失敗: ' + error.message);
                    } finally {
                        this.loadingObjects = false;
                    }
                },
                
                async discoverObjects() {
                    this.discovering = true;
                    try {
                        const response = await axios.post('/api/objects/discover');
                        if (response.data.success) {
                            ElMessage.success(\`發現完成！共 \${response.data.data.total} 個對象\`);
                            await this.loadObjects();
                        } else {
                            ElMessage.error('發現對象失敗: ' + response.data.error);
                        }
                    } catch (error) {
                        ElMessage.error('發現對象失敗: ' + error.message);
                    } finally {
                        this.discovering = false;
                    }
                },
                
                async toggleObject(object) {
                    try {
                        const response = await axios.post(\`/api/objects/\${object.apiName}/toggle\`, {
                            enabled: object.isEnabled
                        });
                        if (response.data.success) {
                            ElMessage.success(response.data.message);
                        } else {
                            object.isEnabled = !object.isEnabled; // 回滾
                            ElMessage.error('更新失敗: ' + response.data.error);
                        }
                    } catch (error) {
                        object.isEnabled = !object.isEnabled; // 回滾
                        ElMessage.error('更新失敗: ' + error.message);
                    }
                },
                
                async initTable(object) {
                    try {
                        const response = await axios.post(\`/api/objects/\${object.apiName}/init-table\`);
                        if (response.data.success) {
                            ElMessage.success(response.data.message);
                            object.isSynced = true;
                            object.tableName = response.data.data.tableName;
                        } else {
                            ElMessage.error('初始化失敗: ' + response.data.error);
                        }
                    } catch (error) {
                        ElMessage.error('初始化失敗: ' + error.message);
                    }
                },
                
                async syncSchema(object) {
                    try {
                        const response = await axios.post(\`/api/objects/\${object.apiName}/sync-schema\`);
                        if (response.data.success) {
                            ElMessage.success(response.data.message);
                            object.lastSyncedAt = new Date().toISOString();
                        } else {
                            ElMessage.error('同步結構失敗: ' + response.data.error);
                        }
                    } catch (error) {
                        ElMessage.error('同步結構失敗: ' + error.message);
                    }
                },
                
                async viewFields(object) {
                    this.selectedObject = object;
                    this.fieldDialogVisible = true;
                    this.fieldDetails = { systemFields: [], customFields: [] };
                    
                    try {
                        const response = await axios.get(\`/api/objects/\${object.apiName}/fields\`);
                        if (response.data.success) {
                            this.fieldDetails = response.data.data;
                        } else {
                            ElMessage.error('載入欄位失敗: ' + response.data.error);
                        }
                    } catch (error) {
                        ElMessage.error('載入欄位失敗: ' + error.message);
                    }
                }
            }
        }).use(ElementPlus).mount('#app');
    </script>
</body>
</html>`;