export const syncDetailMonitorHTML = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>同步詳細監控 - FX CRM</title>
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
    <link rel="stylesheet" href="https://unpkg.com/element-plus/dist/index.css">
    <script src="https://unpkg.com/element-plus"></script>
    <script src="https://unpkg.com/@element-plus/icons-vue"></script>
    <script src="https://unpkg.com/axios/dist/axios.min.js"></script>
    <script src="https://unpkg.com/dayjs/dayjs.min.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fa; }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px 0;
            text-align: center;
            margin-bottom: 20px;
        }
        
        .header h1 {
            font-size: 28px;
            margin-bottom: 8px;
        }
        
        .header p {
            opacity: 0.9;
            font-size: 16px;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 20px;
        }
        
        .stats-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        .stat-number {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 8px;
        }
        
        .stat-label {
            color: #666;
            font-size: 14px;
        }
        
        .controls {
            background: white;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.1);
        }
        
        .sync-log {
            background: white;
            border-radius: 12px;
            margin-bottom: 15px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            border-left: 4px solid #409eff;
        }
        
        .log-header {
            padding: 15px 20px;
            background: #f8f9fa;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: between;
            align-items: center;
        }
        
        .log-title {
            font-weight: 600;
            font-size: 16px;
            color: #303133;
        }
        
        .log-meta {
            font-size: 12px;
            color: #909399;
            display: flex;
            gap: 15px;
        }
        
        .log-records {
            padding: 0;
        }
        
        .record-item {
            padding: 12px 20px;
            border-bottom: 1px solid #f5f7fa;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .record-item:last-child {
            border-bottom: none;
        }
        
        .record-id {
            font-family: 'Courier New', monospace;
            background: #f0f2f5;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            color: #606266;
            min-width: 100px;
        }
        
        .record-changes {
            flex: 1;
            margin-left: 15px;
        }
        
        .field-change {
            margin-bottom: 8px;
        }
        
        .field-change:last-child {
            margin-bottom: 0;
        }
        
        .field-name {
            font-weight: 500;
            color: #409eff;
            font-size: 13px;
        }
        
        .value-change {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 4px;
        }
        
        .old-value {
            background: #fef0f0;
            color: #f56c6c;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 12px;
            border: 1px solid #fbc4c4;
        }
        
        .new-value {
            background: #f0f9ff;
            color: #67c23a;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 12px;
            border: 1px solid #b3d8ff;
        }
        
        .arrow {
            color: #909399;
            font-size: 12px;
        }
        
        .record-time {
            font-size: 11px;
            color: #c0c4cc;
            text-align: right;
        }
        
        .no-data {
            text-align: center;
            padding: 40px;
            color: #909399;
        }
        
        .loading {
            text-align: center;
            padding: 40px;
        }
        
        .phase-badge {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
        }
        
        .phase-processing { background: #e1f3ff; color: #409eff; }
        .phase-completed { background: #f0f9ff; color: #67c23a; }
        .phase-failed { background: #fef0f0; color: #f56c6c; }
        
        .auto-refresh {
            display: flex;
            align-items: center;
            gap: 10px;
        }
    </style>
</head>
<body>
    <div id="app">
        <div class="header">
            <h1>🔄 同步詳細監控</h1>
            <p>實時監控每筆記錄的同步變更</p>
        </div>
        
        <div class="container">
            <!-- 統計卡片 -->
            <div class="stats-cards">
                <div class="stat-card">
                    <div class="stat-number" style="color: #409eff;">{{ stats.totalRecords }}</div>
                    <div class="stat-label">總記錄數</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" style="color: #67c23a;">{{ stats.syncedToday }}</div>
                    <div class="stat-label">今日同步</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" style="color: #e6a23c;">{{ stats.inProgress }}</div>
                    <div class="stat-label">進行中</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" style="color: #f56c6c;">{{ stats.failed }}</div>
                    <div class="stat-label">失敗次數</div>
                </div>
            </div>
            
            <!-- 控制面板 -->
            <div class="controls">
                <el-row :gutter="20" type="flex" justify="space-between" align="middle">
                    <el-col :span="12">
                        <el-select v-model="selectedObject" placeholder="選擇對象" style="width: 200px;" @change="loadSyncDetails">
                            <el-option label="案場 (SPC)" value="object_8W9cb__c"></el-option>
                            <el-option label="維修單" value="object_k1XqG__c"></el-option>
                            <el-option label="工地師父" value="object_50HJ8__c"></el-option>
                        </el-select>
                        
                        <el-input
                            v-model="searchKeyword"
                            placeholder="搜尋記錄ID或欄位名..."
                            style="width: 250px; margin-left: 15px;"
                            clearable
                            @input="filterRecords">
                            <template #prefix>
                                <i class="el-icon-search"></i>
                            </template>
                        </el-input>
                    </el-col>
                    
                    <el-col :span="12" style="text-align: right;">
                        <div class="auto-refresh">
                            <el-switch v-model="autoRefresh" @change="toggleAutoRefresh"></el-switch>
                            <span style="font-size: 14px;">自動刷新</span>
                            <el-button @click="loadSyncDetails" :loading="loading" type="primary" size="small">
                                刷新數據
                            </el-button>
                        </div>
                    </el-col>
                </el-row>
            </div>
            
            <!-- 同步日誌列表 -->
            <div v-if="loading" class="loading">
                <el-icon class="is-loading"><Loading /></el-icon>
                <div>載入中...</div>
            </div>
            
            <div v-else-if="filteredLogs.length === 0" class="no-data">
                <el-empty description="暫無同步記錄">
                    <el-button type="primary" @click="loadSyncDetails">重新載入</el-button>
                </el-empty>
            </div>
            
            <div v-else>
                <div v-for="log in filteredLogs" :key="log.sync_id" class="sync-log">
                    <div class="log-header">
                        <div>
                            <div class="log-title">{{ getObjectName(log.entity_type) }} - {{ log.sync_id.split('_').pop() }}</div>
                            <div class="log-meta">
                                <span>📅 {{ formatTime(log.started_at) }}</span>
                                <span class="phase-badge" :class="getPhaseClass(log.phase)">{{ log.phase || 'UNKNOWN' }}</span>
                                <span>📊 {{ log.message || '無詳細信息' }}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 記錄變更詳情 -->
                    <div class="log-records" v-if="log.recordChanges && log.recordChanges.length > 0">
                        <div v-for="record in log.recordChanges" :key="record.id" class="record-item">
                            <div class="record-id">{{ record.id }}</div>
                            <div class="record-changes">
                                <div v-for="change in record.changes" :key="change.field" class="field-change">
                                    <div class="field-name">{{ getFieldLabel(change.field) }}</div>
                                    <div class="value-change">
                                        <span class="old-value">{{ formatValue(change.oldValue) }}</span>
                                        <span class="arrow">→</span>
                                        <span class="new-value">{{ formatValue(change.newValue) }}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="record-time">{{ formatTime(record.updatedAt) }}</div>
                        </div>
                    </div>
                    
                    <!-- 如果沒有詳細記錄，顯示基本信息 -->
                    <div v-else class="log-records">
                        <div class="record-item">
                            <div style="width: 100%; text-align: center; color: #909399; padding: 20px;">
                                {{ log.records_count ? '處理了 ' + log.records_count + ' 條記錄' : '暫無詳細記錄變更信息' }}
                                <br>
                                <small style="color: #c0c4cc;">提示：只顯示有實際欄位變更的記錄</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        const { createApp } = Vue;
        const { ElMessage, ElLoading } = ElementPlus;

        createApp({
            data() {
                return {
                    loading: false,
                    autoRefresh: false,
                    refreshInterval: null,
                    selectedObject: 'object_8W9cb__c',
                    searchKeyword: '',
                    syncLogs: [],
                    filteredLogs: [],
                    stats: {
                        totalRecords: 0,
                        syncedToday: 0,
                        inProgress: 0,
                        failed: 0
                    }
                };
            },
            
            async mounted() {
                await this.loadSyncDetails();
                await this.loadStats();
            },
            
            beforeUnmount() {
                if (this.refreshInterval) {
                    clearInterval(this.refreshInterval);
                }
            },
            
            methods: {
                async loadSyncDetails() {
                    this.loading = true;
                    try {
                        // 載入基本同步日誌
                        const logsResponse = await axios.get('/api/sync-logs?limit=50');
                        if (logsResponse.data.success) {
                            this.syncLogs = logsResponse.data.data;
                            
                            // 為每個日誌載入詳細變更信息
                            for (let log of this.syncLogs) {
                                try {
                                    // 先嘗試獲取最近的變更記錄
                                    const changesResponse = await axios.get('/api/recent-changes?object=' + log.entity_type + '&limit=10');
                                    if (changesResponse.data.success && changesResponse.data.data.changes.length > 0) {
                                        log.recordChanges = changesResponse.data.data.changes.map(change => ({
                                            id: change.id,
                                            changes: change.changes.map(c => ({
                                                field: c.field,
                                                oldValue: c.oldValue,
                                                newValue: c.newValue
                                            })),
                                            updatedAt: change.syncTime || change.lastModified
                                        }));
                                    }
                                } catch (error) {
                                    console.log('無法獲取詳細變更:', error);
                                    log.recordChanges = [];
                                }
                            }
                            
                            this.filterRecords();
                        }
                        
                    } catch (error) {
                        console.error('載入同步詳情失敗:', error);
                        ElMessage.error('載入失敗: ' + error.message);
                    } finally {
                        this.loading = false;
                    }
                },
                
                async loadStats() {
                    try {
                        const [dbResponse, logsResponse] = await Promise.all([
                            axios.get('/api/database-stats'),
                            axios.get('/api/sync-logs?limit=100')
                        ]);
                        
                        if (dbResponse.data.success) {
                            const dbStats = dbResponse.data.data;
                            this.stats.totalRecords = Object.values(dbStats).reduce((sum, count) => sum + (typeof count === 'number' ? count : 0), 0);
                        }
                        
                        if (logsResponse.data.success) {
                            const logs = logsResponse.data.data;
                            const today = new Date().toISOString().split('T')[0];
                            
                            this.stats.syncedToday = logs.filter(log => 
                                log.started_at && log.started_at.startsWith(today) && log.status === 'COMPLETED'
                            ).length;
                            
                            this.stats.inProgress = logs.filter(log => log.status === 'IN_PROGRESS').length;
                            this.stats.failed = logs.filter(log => log.status === 'FAILED').length;
                        }
                    } catch (error) {
                        console.error('載入統計失敗:', error);
                    }
                },
                
                filterRecords() {
                    if (!this.searchKeyword.trim()) {
                        this.filteredLogs = this.syncLogs.filter(log => 
                            !this.selectedObject || log.entity_type === this.selectedObject
                        );
                    } else {
                        const keyword = this.searchKeyword.toLowerCase();
                        this.filteredLogs = this.syncLogs.filter(log => {
                            const matchesObject = !this.selectedObject || log.entity_type === this.selectedObject;
                            const matchesKeyword = 
                                log.sync_id.toLowerCase().includes(keyword) ||
                                log.entity_type.toLowerCase().includes(keyword) ||
                                (log.message && log.message.toLowerCase().includes(keyword));
                            return matchesObject && matchesKeyword;
                        });
                    }
                },
                
                toggleAutoRefresh() {
                    if (this.autoRefresh) {
                        this.refreshInterval = setInterval(() => {
                            this.loadSyncDetails();
                        }, 10000); // 每10秒刷新
                        ElMessage.success('已開啟自動刷新');
                    } else {
                        if (this.refreshInterval) {
                            clearInterval(this.refreshInterval);
                            this.refreshInterval = null;
                        }
                        ElMessage.info('已關閉自動刷新');
                    }
                },
                
                getObjectName(apiName) {
                    const names = {
                        'object_8W9cb__c': '案場(SPC)',
                        'object_k1XqG__c': '維修單', 
                        'object_50HJ8__c': '工地師父'
                    };
                    return names[apiName] || apiName;
                },
                
                getFieldLabel(fieldName) {
                    const labels = {
                        'name': '名稱',
                        'shift_time__c': '班次時間',
                        'field_23Z5i__c': '案場編號', 
                        'construction_completed__c': '施工完成',
                        'responsible_supervisor__c': '負責主管',
                        'field_u1wpv__c': '現場狀況',
                        'field_WD7k1__c': '進度狀態',
                        'field_Q6Svh__c': '完成度',
                        'field_B2gh1__c': '工程金額',
                        'bad_case_scene__c': '問題案場',
                        'sync_version': '同步版本'
                    };
                    return labels[fieldName] || fieldName;
                },
                
                getPhaseClass(phase) {
                    const classes = {
                        'COMPLETED': 'phase-completed',
                        'FAILED': 'phase-failed',
                        'IN_PROGRESS': 'phase-processing',
                        'PROCESSING': 'phase-processing'
                    };
                    return classes[phase] || 'phase-processing';
                },
                
                formatTime(timeStr) {
                    if (!timeStr) return '-';
                    return dayjs(timeStr).format('MM/DD HH:mm:ss');
                },
                
                formatValue(value) {
                    if (value === null || value === undefined || value === '') return '(空)';
                    
                    // 處理布爾值
                    if (typeof value === 'boolean') {
                        return value ? '是' : '否';
                    }
                    
                    // 處理數字
                    if (typeof value === 'number') {
                        // 如果是0或1，可能是狀態值
                        if (value === 0) return '否';
                        if (value === 1) return '是';
                        // 如果是金額等數值，加上千位分隔符
                        if (value > 1000) {
                            return value.toLocaleString();
                        }
                        return String(value);
                    }
                    
                    // 處理字串
                    if (typeof value === 'string') {
                        if (value.length > 50) {
                            return value.substring(0, 50) + '...';
                        }
                    }
                    
                    return String(value);
                }
            }
        }).use(ElementPlus).mount('#app');
    </script>
</body>
</html>`;