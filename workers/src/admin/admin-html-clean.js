export const adminHTMLClean = `<!DOCTYPE html>
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
        .main-content { padding: 20px; max-width: 1400px; margin: 0 auto; }
        .stats-row { margin-bottom: 20px; }
        .stat-card { text-align: center; }
        .stat-title { font-size: 14px; color: #909399; margin-bottom: 12px; }
        .stat-value { font-size: 36px; font-weight: 700; margin-bottom: 8px; }
        .stat-value.primary { color: #409eff; }
        .stat-value.success { color: #67c23a; }
        .stat-value.warning { color: #e6a23c; }
        .stat-value.danger { color: #f56c6c; }
        .stat-value.info { color: #909399; }
        .stat-subtitle { font-size: 12px; color: #c0c4cc; }
        .sync-card { margin-bottom: 20px; }
        .sync-description { color: #909399; font-size: 14px; margin-bottom: 20px; }
        .sync-actions { display: flex; gap: 10px; }
        .object-type-tag { margin-left: 10px; }
        .field-mapping-table { margin-top: 20px; }
        .field-mapping-table .el-table__header th { background: #f5f7fa !important; }
        .field-type-tag { font-size: 11px; }
        .field-stats { display: flex; gap: 20px; margin: 20px 0; padding: 15px; background: #f5f7fa; border-radius: 8px; }
        .field-stat-item { display: flex; align-items: center; gap: 8px; }
        .field-search-box { margin-bottom: 20px; }
        .cron-status { display: flex; align-items: center; gap: 20px; padding: 15px; background: #f0f9ff; border-radius: 8px; margin-bottom: 20px; }
        .cron-status-item { display: flex; align-items: center; gap: 8px; }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; }
        .status-dot.active { background: #67c23a; animation: pulse 2s infinite; }
        .status-dot.inactive { background: #909399; }
        @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(103, 194, 58, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(103, 194, 58, 0); }
            100% { box-shadow: 0 0 0 0 rgba(103, 194, 58, 0); }
        }
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
            <!-- 定時同步狀態 -->
            <div class="cron-status">
                <div class="cron-status-item">
                    <span class="status-dot" :class="cronStatus.enabled ? 'active' : 'inactive'"></span>
                    <span>定時同步: {{ cronStatus.enabled ? '啟用' : '停用' }}</span>
                </div>
                <div class="cron-status-item">
                    <el-icon><Clock /></el-icon>
                    <span>同步週期: 每小時執行一次（整點）</span>
                </div>
                <div class="cron-status-item" v-if="cronStatus.lastRun">
                    <el-icon><SuccessFilled /></el-icon>
                    <span>上次執行: {{ formatDate(cronStatus.lastRun) }}</span>
                </div>
                <div class="cron-status-item">
                    <el-icon><Timer /></el-icon>
                    <span>下次執行: {{ getNextRunTime() }}</span>
                </div>
            </div>

            <!-- Statistics Cards -->
            <el-row :gutter="20" class="stats-row">
                <el-col :span="4" v-for="stat in objectStats" :key="stat.apiName">
                    <el-card class="stat-card">
                        <div class="stat-title">{{ stat.displayName }}</div>
                        <div class="stat-value" :class="stat.colorClass">{{ stat.count }}</div>
                        <div class="stat-subtitle">{{ stat.apiName }}</div>
                    </el-card>
                </el-col>
            </el-row>

            <!-- Tabs -->
            <el-tabs v-model="activeTab">
                <!-- 同步管理 Tab -->
                <el-tab-pane label="同步管理" name="sync">
                    <div style="margin-bottom: 20px;">
                        <el-button type="primary" @click="syncAllFields" size="large">
                            <i class="fas fa-sync mr-2"></i>同步所有對象欄位
                        </el-button>
                        <el-button type="success" @click="syncAllData" size="large">
                            <i class="fas fa-database mr-2"></i>同步所有數據
                        </el-button>
                    </div>
                    
                    <el-row :gutter="20">
                        <el-col :span="8" v-for="obj in syncObjects" :key="obj.apiName">
                            <el-card class="sync-card">
                                <template #header>
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <span>{{ obj.displayName }}</span>
                                        <el-tag 
                                            :type="obj.isCustom ? 'warning' : 'primary'" 
                                            size="small" 
                                            class="object-type-tag"
                                        >
                                            {{ obj.isCustom ? '自定義' : '標準' }}
                                        </el-tag>
                                    </div>
                                </template>
                                <div class="sync-description">
                                    {{ obj.description || obj.apiName }}
                                </div>
                                <div class="sync-actions">
                                    <el-button size="small" @click="syncFields(obj)">
                                        <i class="fas fa-columns mr-1"></i>同步欄位
                                    </el-button>
                                    <el-button size="small" @click="syncData(obj)" type="success">
                                        <i class="fas fa-sync mr-1"></i>同步數據
                                    </el-button>
                                    <el-button size="small" @click="viewFields(obj)">
                                        <i class="fas fa-list mr-1"></i>查看欄位
                                    </el-button>
                                </div>
                            </el-card>
                        </el-col>
                    </el-row>
                </el-tab-pane>

                <!-- 同步日誌 Tab -->
                <el-tab-pane label="同步日誌" name="log">
                    <el-card>
                        <template #header>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span>最近同步記錄</span>
                                <el-button type="primary" @click="refreshLogs">刷新日誌</el-button>
                            </div>
                        </template>
                        
                        <el-table :data="recentSyncs" stripe style="width: 100%">
                            <el-table-column prop="entity_type" label="對象" width="200">
                                <template #default="scope">
                                    <div>{{ scope.row.object_display_name || scope.row.entity_type }}</div>
                                    <div style="font-size: 12px; color: #909399;">{{ scope.row.entity_type }}</div>
                                </template>
                            </el-table-column>
                            <el-table-column prop="action" label="操作" width="100">
                                <template #default="scope">
                                    <el-tag :type="scope.row.action === 'SYNC' ? 'primary' : 'info'" size="small">
                                        {{ scope.row.action }}
                                    </el-tag>
                                </template>
                            </el-table-column>
                            <el-table-column prop="status" label="狀態" width="100">
                                <template #default="scope">
                                    <el-tag :type="scope.row.status === 'COMPLETED' ? 'success' : 'danger'" size="small">
                                        {{ scope.row.status }}
                                    </el-tag>
                                </template>
                            </el-table-column>
                            <el-table-column prop="records_count" label="記錄數" width="100" align="center"></el-table-column>
                            <el-table-column prop="error_count" label="錯誤數" width="100" align="center"></el-table-column>
                            <el-table-column prop="started_at" label="開始時間" width="160">
                                <template #default="scope">
                                    {{ formatDate(scope.row.started_at) }}
                                </template>
                            </el-table-column>
                            <el-table-column prop="completed_at" label="完成時間" width="160">
                                <template #default="scope">
                                    {{ formatDate(scope.row.completed_at) }}
                                </template>
                            </el-table-column>
                        </el-table>
                    </el-card>
                </el-tab-pane>

                <!-- 對象管理 Tab -->
                <el-tab-pane label="對象管理" name="objects">
                    <el-row :gutter="20">
                        <el-col :span="12">
                            <el-card>
                                <template #header>
                                    <span>預設對象</span>
                                </template>
                                <el-table :data="defaultObjects" stripe>
                                    <el-table-column prop="displayName" label="對象名稱"></el-table-column>
                                    <el-table-column prop="apiName" label="API名稱" width="200"></el-table-column>
                                    <el-table-column label="狀態" width="80">
                                        <template #default="scope">
                                            <el-tag :type="scope.row.isSynced ? 'success' : 'info'" size="small">
                                                {{ scope.row.isSynced ? '已同步' : '未同步' }}
                                            </el-tag>
                                        </template>
                                    </el-table-column>
                                    <el-table-column label="操作" width="200">
                                        <template #default="scope">
                                            <el-button size="small" @click="viewFields(scope.row)">
                                                <el-icon><List /></el-icon>
                                                查看欄位
                                            </el-button>
                                        </template>
                                    </el-table-column>
                                </el-table>
                            </el-card>
                        </el-col>
                        
                        <el-col :span="12">
                            <el-card>
                                <template #header>
                                    <span>自定義對象</span>
                                </template>
                                <el-table :data="customObjects" stripe>
                                    <el-table-column prop="displayName" label="對象名稱"></el-table-column>
                                    <el-table-column prop="apiName" label="API名稱" width="200"></el-table-column>
                                    <el-table-column label="狀態" width="80">
                                        <template #default="scope">
                                            <el-tag :type="scope.row.isSynced ? 'success' : 'info'" size="small">
                                                {{ scope.row.isSynced ? '已同步' : '未同步' }}
                                            </el-tag>
                                        </template>
                                    </el-table-column>
                                    <el-table-column label="操作" width="200">
                                        <template #default="scope">
                                            <el-button size="small" @click="viewFields(scope.row)">
                                                <el-icon><List /></el-icon>
                                                查看欄位
                                            </el-button>
                                        </template>
                                    </el-table-column>
                                </el-table>
                            </el-card>
                        </el-col>
                    </el-row>
                </el-tab-pane>

                <!-- 欄位對應表 Tab -->
                <el-tab-pane label="欄位對應表" name="fields">
                    <el-card>
                        <template #header>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span>欄位對應關係</span>
                                <div>
                                    <el-select v-model="selectedObject" placeholder="選擇對象" style="width: 300px;" @change="loadFieldMapping">
                                        <el-option
                                            v-for="obj in allObjects"
                                            :key="obj.apiName"
                                            :label="obj.displayName"
                                            :value="obj.apiName">
                                        </el-option>
                                    </el-select>
                                    <el-button type="primary" size="small" @click="exportFieldMapping" v-if="selectedObject">
                                        <i class="fas fa-download mr-1"></i>匯出CSV
                                    </el-button>
                                </div>
                            </div>
                        </template>
                        
                        <div v-if="selectedObject && fieldMappings[selectedObject]">
                            <!-- 欄位統計 -->
                            <div class="field-stats">
                                <div class="field-stat-item">
                                    <el-icon><DataBoard /></el-icon>
                                    <span>總欄位數: <strong>{{ totalFieldsCount }}</strong></span>
                                </div>
                                <div class="field-stat-item">
                                    <el-icon><Setting /></el-icon>
                                    <span>系統欄位: <strong>{{ systemFieldsCount }}</strong></span>
                                </div>
                                <div class="field-stat-item">
                                    <el-icon><Plus /></el-icon>
                                    <span>自定義欄位: <strong>{{ customFieldsCount }}</strong></span>
                                </div>
                                <div class="field-stat-item">
                                    <el-icon><Check /></el-icon>
                                    <span>必填欄位: <strong>{{ requiredFieldsCount }}</strong></span>
                                </div>
                            </div>
                            
                            <!-- 欄位搜索 -->
                            <div class="field-search-box">
                                <el-input
                                    v-model="fieldSearchText"
                                    placeholder="搜尋欄位名稱或 API 名稱..."
                                    prefix-icon="Search"
                                    style="max-width: 300px;"
                                />
                            </div>

                            <!-- 欄位對應表 -->
                            <el-table 
                                :data="filteredFields" 
                                stripe 
                                class="field-mapping-table"
                                :default-sort="{ prop: 'apiName', order: 'ascending' }"
                            >
                                <el-table-column prop="label" label="中文名稱" width="200" sortable>
                                    <template #default="scope">
                                        <div>{{ scope.row.label || scope.row.displayName }}</div>
                                    </template>
                                </el-table-column>
                                
                                <el-table-column prop="apiName" label="API欄位" width="250" sortable>
                                    <template #default="scope">
                                        <el-tag size="small" type="info">{{ scope.row.apiName }}</el-tag>
                                    </template>
                                </el-table-column>
                                
                                <el-table-column prop="dataType" label="資料類型" width="120" sortable>
                                    <template #default="scope">
                                        <el-tag size="small" :type="getFieldTypeColor(scope.row.dataType)" class="field-type-tag">
                                            {{ scope.row.dataType || scope.row.fieldType }}
                                        </el-tag>
                                    </template>
                                </el-table-column>
                                
                                <el-table-column prop="required" label="必填" width="80" align="center">
                                    <template #default="scope">
                                        <el-icon v-if="scope.row.required || scope.row.isRequired" color="#f56c6c">
                                            <Check />
                                        </el-icon>
                                    </template>
                                </el-table-column>
                                
                                <el-table-column prop="source" label="數據來源" width="120">
                                    <template #default="scope">
                                        <el-tag 
                                            size="small" 
                                            :type="scope.row.source === 'database' ? 'success' : 'warning'"
                                        >
                                            {{ getSourceLabel(scope.row.source) }}
                                        </el-tag>
                                    </template>
                                </el-table-column>
                                
                                <el-table-column prop="description" label="說明" min-width="200">
                                    <template #default="scope">
                                        <div v-if="scope.row.description" style="font-size: 12px; color: #606266;">
                                            {{ scope.row.description }}
                                        </div>
                                        <div v-if="scope.row.options" style="font-size: 11px; color: #909399; margin-top: 2px;">
                                            選項: {{ scope.row.options }}
                                        </div>
                                    </template>
                                </el-table-column>
                            </el-table>
                        </div>
                        
                        <el-empty v-else description="請選擇一個對象查看欄位對應關係"></el-empty>
                    </el-card>
                </el-tab-pane>
            </el-tabs>
        </div>

        <!-- 欄位詳情對話框 -->
        <el-dialog v-model="fieldDialogVisible" title="欄位詳細資訊" width="70%">
            <div v-if="selectedFieldDetails">
                <h3>{{ selectedFieldDetails.displayName || selectedFieldDetails.objectApiName }}</h3>
                <p style="color: #909399; margin-bottom: 20px;">{{ selectedFieldDetails.objectApiName }}</p>
                
                <el-table :data="selectedFieldDetails.fields" stripe>
                    <el-table-column prop="label" label="中文名稱" width="200"></el-table-column>
                    <el-table-column prop="apiName" label="API名稱" width="200"></el-table-column>
                    <el-table-column prop="dataType" label="資料類型" width="120"></el-table-column>
                    <el-table-column prop="required" label="必填" width="80" align="center">
                        <template #default="scope">
                            <el-icon v-if="scope.row.required" color="#f56c6c"><Check /></el-icon>
                        </template>
                    </el-table-column>
                    <el-table-column prop="description" label="描述" min-width="200"></el-table-column>
                </el-table>
            </div>
        </el-dialog>
    </div>

    <script>
        const { createApp } = Vue;
        const { ElMessage, ElMessageBox } = ElementPlus;

        const Icons = ElementPlusIconsVue;

        createApp({
            data() {
                return {
                    activeTab: 'sync',
                    lastUpdate: new Date().toLocaleString('zh-TW'),
                    loading: false,
                    
                    // Statistics
                    objectStats: [],
                    
                    // Sync objects
                    syncObjects: [],
                    defaultObjects: [],
                    customObjects: [],
                    allObjects: [],
                    
                    // Logs
                    recentSyncs: [],
                    
                    // Cron status
                    cronStatus: {
                        enabled: true,
                        lastRun: null
                    },
                    
                    // Field mapping
                    selectedObject: '',
                    currentObjectName: '',
                    currentFields: [],
                    fieldMappings: {},
                    fieldSearchText: '',
                    
                    // Dialog
                    fieldDialogVisible: false,
                    selectedFieldDetails: null,
                    
                    // Icons
                    RefreshIcon: Icons.Refresh
                };
            },
            computed: {
                totalFieldsCount() {
                    const fields = this.fieldMappings[this.selectedObject];
                    return fields ? fields.length : 0;
                },
                
                systemFieldsCount() {
                    const fields = this.fieldMappings[this.selectedObject];
                    if (!fields) return 0;
                    return fields.filter(f => this.isSystemField(f.apiName)).length;
                },
                
                customFieldsCount() {
                    const fields = this.fieldMappings[this.selectedObject];
                    if (!fields) return 0;
                    return fields.filter(f => !this.isSystemField(f.apiName)).length;
                },
                
                requiredFieldsCount() {
                    const fields = this.fieldMappings[this.selectedObject];
                    if (!fields) return 0;
                    return fields.filter(f => f.required || f.isRequired).length;
                },
                
                filteredFields() {
                    const fields = this.fieldMappings[this.selectedObject];
                    if (!fields || !this.fieldSearchText) return fields || [];
                    
                    return fields.filter(field => 
                        field.apiName.toLowerCase().includes(this.fieldSearchText.toLowerCase()) ||
                        (field.label || field.displayName || '').toLowerCase().includes(this.fieldSearchText.toLowerCase())
                    );
                }
            },
            
            mounted() {
                this.refreshData();
                this.loadCronStatus();
            },
            
            methods: {
                async refreshData() {
                    this.loading = true;
                    try {
                        await Promise.all([
                            this.loadObjectStats(),
                            this.loadSyncObjects(),
                            this.refreshLogs()
                        ]);
                        this.lastUpdate = new Date().toLocaleString('zh-TW');
                    } catch (error) {
                        console.error('刷新數據失敗:', error);
                        ElMessage.error('刷新數據失敗: ' + error.message);
                    } finally {
                        this.loading = false;
                    }
                },
                
                async loadObjectStats() {
                    try {
                        const response = await axios.get('/api/sync/database-stats');
                        if (response.data.success) {
                            this.objectStats = response.data.data.tables.map(table => ({
                                displayName: this.getDisplayName(table.tableName),
                                apiName: table.tableName,
                                count: table.recordCount,
                                colorClass: this.getStatColorClass(table.tableName)
                            }));
                        }
                    } catch (error) {
                        console.error('載入統計失敗:', error);
                    }
                },
                
                async loadSyncObjects() {
                    try {
                        const response = await axios.get('/api/objects');
                        if (response.data.success) {
                            const objects = response.data.data;
                            this.defaultObjects = objects.defaultObjects || [];
                            this.customObjects = objects.customObjects || [];
                            this.syncObjects = [...this.defaultObjects, ...this.customObjects];
                            this.allObjects = this.syncObjects;
                        }
                    } catch (error) {
                        console.error('載入對象失敗:', error);
                    }
                },
                
                async refreshLogs() {
                    try {
                        const response = await axios.get('/api/sync/status');
                        if (response.data.success) {
                            this.recentSyncs = response.data.data.recentSyncs || [];
                        }
                    } catch (error) {
                        console.error('載入日誌失敗:', error);
                    }
                },
                
                async loadCronStatus() {
                    try {
                        const response = await axios.get('/api/schema/sync/cron-status');
                        if (response.data.success) {
                            this.cronStatus = response.data.data;
                        }
                    } catch (error) {
                        console.error('載入定時狀態失敗:', error);
                    }
                },
                
                async syncAllFields() {
                    const confirmed = await ElMessageBox.confirm(
                        '確定要同步所有對象的欄位嗎？這將比對CRM和資料庫的欄位差異並進行更新。',
                        '確認操作',
                        { type: 'warning' }
                    ).catch(() => false);
                    
                    if (!confirmed) return;
                    
                    try {
                        ElMessage.info('開始同步所有對象欄位...');
                        const response = await axios.post('/api/field-sync/all');
                        if (response.data.success) {
                            const summary = response.data.data.summary;
                            ElMessage.success(\`欄位同步完成！成功: \${summary.success}, 失敗: \${summary.failed}, 總變更: \${summary.totalChanges}\`);
                            this.refreshData();
                        } else {
                            ElMessage.error('欄位同步失敗: ' + response.data.error);
                        }
                    } catch (error) {
                        console.error('欄位同步錯誤:', error);
                        ElMessage.error('欄位同步錯誤: ' + error.message);
                    }
                },
                
                async syncAllData() {
                    const confirmed = await ElMessageBox.confirm(
                        '確定要同步所有對象的數據嗎？',
                        '確認操作',
                        { type: 'warning' }
                    ).catch(() => false);
                    
                    if (!confirmed) return;
                    
                    ElMessage.info('功能開發中...');
                },
                
                async syncFields(obj) {
                    try {
                        ElMessage.info(\`開始同步 \${obj.displayName} 的欄位...\`);
                        const response = await axios.post(\`/api/field-sync/\${obj.apiName}\`);
                        if (response.data.success) {
                            const data = response.data.data;
                            const changeCount = data.changes.length;
                            ElMessage.success(\`\${obj.displayName} 欄位同步完成！共 \${changeCount} 個變更\`);
                        } else {
                            ElMessage.error(\`\${obj.displayName} 欄位同步失敗: \` + response.data.error);
                        }
                    } catch (error) {
                        console.error('欄位同步錯誤:', error);
                        ElMessage.error('欄位同步錯誤: ' + error.message);
                    }
                },
                
                async syncData(obj) {
                    try {
                        ElMessage.info(\`開始同步 \${obj.displayName} 的數據...\`);
                        const response = await axios.post(\`/api/sync/\${obj.apiName}/start\`, {
                            fullSync: false,
                            batchSize: 200
                        });
                        if (response.data.success) {
                            const result = response.data.data.result;
                            ElMessage.success(\`\${obj.displayName} 數據同步完成！成功: \${result.success}, 錯誤: \${result.errors}\`);
                            this.refreshLogs();
                        } else {
                            ElMessage.error(\`\${obj.displayName} 數據同步失敗: \` + response.data.error);
                        }
                    } catch (error) {
                        console.error('數據同步錯誤:', error);
                        ElMessage.error('數據同步錯誤: ' + error.message);
                    }
                },
                
                async viewFields(obj) {
                    try {
                        const response = await axios.get(\`/api/field-sync/\${obj.apiName}/fields\`);
                        if (response.data.success) {
                            this.selectedFieldDetails = {
                                objectApiName: obj.apiName,
                                displayName: obj.displayName,
                                fields: response.data.data.fields
                            };
                            this.fieldDialogVisible = true;
                        } else {
                            ElMessage.error('載入欄位失敗: ' + response.data.error);
                        }
                    } catch (error) {
                        console.error('載入欄位錯誤:', error);
                        ElMessage.error('載入欄位錯誤: ' + error.message);
                    }
                },
                
                async loadFieldMapping() {
                    if (!this.selectedObject) return;
                    
                    try {
                        const response = await axios.get(\`/api/field-sync/\${this.selectedObject}/fields\`);
                        if (response.data.success) {
                            this.fieldMappings[this.selectedObject] = response.data.data.fields;
                        } else {
                            ElMessage.error('載入欄位對應失敗: ' + response.data.error);
                        }
                    } catch (error) {
                        console.error('載入欄位對應錯誤:', error);
                        ElMessage.error('載入欄位對應錯誤: ' + error.message);
                    }
                },
                
                async exportFieldMapping() {
                    if (!this.selectedObject || !this.fieldMappings[this.selectedObject]) {
                        ElMessage.warning('請先選擇對象並載入欄位資訊');
                        return;
                    }
                    
                    const fields = this.fieldMappings[this.selectedObject];
                    const objectName = this.allObjects.find(o => o.apiName === this.selectedObject)?.displayName || this.selectedObject;
                    
                    const csvContent = [
                        ['中文名稱', 'API欄位', '資料類型', '必填', '說明'].join(','),
                        ...fields.map(field => [
                            field.label || field.displayName || '',
                            field.apiName || '',
                            field.dataType || field.fieldType || '',
                            (field.required || field.isRequired) ? '是' : '否',
                            field.description || ''
                        ].join(','))
                    ].join('\\n');
                    
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = \`\${objectName}_欄位對應表_\${new Date().toISOString().split('T')[0]}.csv\`;
                    link.click();
                    
                    ElMessage.success('欄位對應表已匯出');
                },
                
                // Helper methods
                getDisplayName(tableName) {
                    const nameMap = {
                        'object_8W9cb__c': '案場',
                        'object_k1XqG__c': '維修單', 
                        'object_50HJ8__c': '工地師父',
                        'site_cabinet__c': '案場(浴櫃)',
                        'progress_management_announ__c': '進度管理公告',
                        'NewOpportunityObj': '商機',
                        'NewOpportunityContactsObj': '商機聯絡人',
                        'SupplierObj': '供應商'
                    };
                    return nameMap[tableName] || tableName;
                },
                
                getStatColorClass(tableName) {
                    const colorMap = {
                        'object_8W9cb__c': 'warning',
                        'object_k1XqG__c': 'danger',
                        'object_50HJ8__c': 'info',
                        'NewOpportunityObj': 'primary',
                        'SupplierObj': 'success'
                    };
                    return colorMap[tableName] || 'info';
                },
                
                getFieldTypeColor(dataType) {
                    const colorMap = {
                        'TEXT': 'info',
                        'NUMBER': 'success', 
                        'REAL': 'success',
                        'BOOLEAN': 'warning',
                        'DATETIME': 'primary',
                        'DATE': 'primary',
                        'LOOKUP': 'danger',
                        'REFERENCE': 'danger',
                        'MULTISELECT': 'warning'
                    };
                    return colorMap[dataType] || 'info';
                },
                
                getSourceLabel(source) {
                    const labelMap = {
                        'database': '資料庫',
                        'crm_api': 'CRM API',
                        'describe_api': 'Describe API',
                        'data_inference': '數據推斷',
                        'predefined': '預定義'
                    };
                    return labelMap[source] || source;
                },
                
                isSystemField(fieldName) {
                    const systemFields = [
                        '_id', 'name', 'owner', 'owner__r', 'owner_department', 'owner_department_id',
                        'create_time', 'created_by', 'created_by__r', 'last_modified_time', 
                        'last_modified_by', 'last_modified_by__r', 'life_status', 'life_status__r',
                        'lock_status', 'lock_status__r', 'is_deleted', 'record_type', 'version',
                        'data_own_department', 'data_own_department__r', 'relevant_team', 'total_num',
                        'sync_version', 'fx_created_at', 'fx_updated_at', 'sync_time'
                    ];
                    return systemFields.includes(fieldName);
                },
                
                formatDate(dateStr) {
                    if (!dateStr) return '';
                    return new Date(dateStr).toLocaleString('zh-TW');
                },
                
                getNextRunTime() {
                    const now = new Date();
                    const next = new Date(now);
                    next.setHours(next.getHours() + 1, 0, 0, 0);
                    return next.toLocaleString('zh-TW');
                }
            }
        }).use(ElementPlus).mount('#app');
        
        // 註冊所有 Element Plus 圖標
        Object.keys(Icons).forEach(key => {
            app.component(key, Icons[key]);
        });
    </script>
</body>
</html>`;