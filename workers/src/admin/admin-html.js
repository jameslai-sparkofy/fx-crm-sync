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
        .stat-card { text-align: center; transition: all 0.3s; }
        .stat-card.clickable:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .stat-title { font-size: 14px; color: #909399; margin-bottom: 12px; }
        .stat-value { font-size: 36px; font-weight: 700; margin-bottom: 8px; }
        .stat-value.primary { color: #409eff; }
        .stat-value.success { color: #67c23a; }
        .stat-value.warning { color: #e6a23c; }
        .stat-value.danger { color: #f56c6c; }
        .stat-value.info { color: #909399; }
        .stat-subtitle { font-size: 12px; color: #c0c4cc; }
        .sync-card { 
            margin-bottom: 20px; 
            height: 100%;
            min-height: 150px;
        }
        .sync-card .el-card__header {
            padding: 12px 20px;
        }
        .sync-description { 
            color: #909399; 
            font-size: 13px; 
            margin-bottom: 15px;
            min-height: 20px;
        }
        .sync-actions { 
            display: flex; 
            gap: 8px; 
        }
        .sync-actions .el-button {
            flex: 1;
        }
    </style>
</head>
<body>
    <div id="app">
        <div class="header">
            <h1>紛享銷客 CRM 同步管理系統</h1>
            <div class="header-right">
                <span class="update-time">最後更新: {{ lastUpdate }}</span>
                <el-button type="success" @click="goToEmployees" icon="User">員工管理</el-button>
                <el-button type="primary" @click="refreshData" :icon="RefreshIcon">重新載入</el-button>
            </div>
        </div>
        
        <div class="main-content">
            <!-- Statistics Cards -->
            <el-row :gutter="20" class="stats-row">
                <el-col :span="3" v-for="stat in objectStats" :key="stat.apiName">
                    <el-card class="stat-card" 
                            :class="{ 'clickable': stat.apiName === 'employees_simple' }"
                            @click="handleStatClick(stat.apiName)"
                            style="cursor: pointer;">
                        <div class="stat-title">{{ stat.displayName }}</div>
                        <div class="stat-value" :class="stat.colorClass">{{ stat.count }}</div>
                        <div class="stat-subtitle">{{ stat.apiName }}</div>
                    </el-card>
                </el-col>
            </el-row>

            <!-- Tabs -->
            <el-tabs v-model="activeTab">
                <el-tab-pane label="同步管理" name="sync">
                    <el-row :gutter="20" style="margin-bottom: 20px;">
                        <!-- 商機同步 -->
                        <el-col :span="8">
                            <el-card class="sync-card">
                                <template #header>
                                    <span>商機同步</span>
                                    <el-tag type="primary" size="small" style="float: right;">標準對象</el-tag>
                                </template>
                                <p class="sync-description">同步 CRM 中的商機數據</p>
                                <div class="sync-actions">
                                    <el-button type="primary" size="small" @click="syncData('NewOpportunityObj', false)" :loading="syncing['NewOpportunityObj']">
                                        增量同步
                                    </el-button>
                                    <el-button size="small" @click="syncData('NewOpportunityObj', true)" :loading="syncing['NewOpportunityObj']">
                                        完整同步
                                    </el-button>
                                </div>
                            </el-card>
                        </el-col>
                        
                        <!-- 商機連絡人同步 -->
                        <el-col :span="8">
                            <el-card class="sync-card">
                                <template #header>
                                    <span>商機連絡人</span>
                                    <el-tag type="info" size="small" style="float: right;">標準對象</el-tag>
                                </template>
                                <p class="sync-description">同步商機相關連絡人數據</p>
                                <div class="sync-actions">
                                    <el-button type="info" size="small" @click="syncData('NewOpportunityContactsObj', false)" :loading="syncing['NewOpportunityContactsObj']">
                                        增量同步
                                    </el-button>
                                    <el-button size="small" @click="syncData('NewOpportunityContactsObj', true)" :loading="syncing['NewOpportunityContactsObj']">
                                        完整同步
                                    </el-button>
                                </div>
                            </el-card>
                        </el-col>
                        
                        <!-- 供應商同步 -->
                        <el-col :span="8">
                            <el-card class="sync-card">
                                <template #header>
                                    <span>供應商</span>
                                    <el-tag type="primary" size="small" style="float: right;">標準對象</el-tag>
                                </template>
                                <p class="sync-description">同步供應商基本資料</p>
                                <div class="sync-actions">
                                    <el-button type="primary" size="small" @click="syncData('SupplierObj', false)" :loading="syncing['SupplierObj']">
                                        增量同步
                                    </el-button>
                                    <el-button size="small" @click="syncData('SupplierObj', true)" :loading="syncing['SupplierObj']">
                                        完整同步
                                    </el-button>
                                </div>
                            </el-card>
                        </el-col>
                    </el-row>
                    
                    <el-row :gutter="20" style="margin-bottom: 20px;">
                        <!-- 案場同步 -->
                        <el-col :span="8">
                            <el-card class="sync-card">
                                <template #header>
                                    <span>案場(SPC)</span>
                                    <el-tag type="success" size="small" style="float: right;">自定義對象</el-tag>
                                </template>
                                <p class="sync-description">同步案場管理數據</p>
                                <div class="sync-actions">
                                    <el-button type="success" size="small" @click="syncData('object_8W9cb__c', false)" :loading="syncing['object_8W9cb__c']">
                                        增量同步
                                    </el-button>
                                    <el-button size="small" @click="syncData('object_8W9cb__c', true)" :loading="syncing['object_8W9cb__c']">
                                        完整同步
                                    </el-button>
                                </div>
                            </el-card>
                        </el-col>
                        
                        <!-- 維修單同步 -->
                        <el-col :span="8">
                            <el-card class="sync-card">
                                <template #header>
                                    <span>SPC維修單</span>
                                    <el-tag type="warning" size="small" style="float: right;">自定義對象</el-tag>
                                </template>
                                <p class="sync-description">同步維修單記錄</p>
                                <div class="sync-actions">
                                    <el-button type="warning" size="small" @click="syncData('object_k1XqG__c', false)" :loading="syncing['object_k1XqG__c']">
                                        增量同步
                                    </el-button>
                                    <el-button size="small" @click="syncData('object_k1XqG__c', true)" :loading="syncing['object_k1XqG__c']">
                                        完整同步
                                    </el-button>
                                </div>
                            </el-card>
                        </el-col>
                        
                        <!-- 工地師父同步 -->
                        <el-col :span="8">
                            <el-card class="sync-card">
                                <template #header>
                                    <span>工地師父</span>
                                    <el-tag type="danger" size="small" style="float: right;">自定義對象</el-tag>
                                </template>
                                <p class="sync-description">同步工地師父資料</p>
                                <div class="sync-actions">
                                    <el-button type="danger" size="small" @click="syncData('object_50HJ8__c', false)" :loading="syncing['object_50HJ8__c']">
                                        增量同步
                                    </el-button>
                                    <el-button size="small" @click="syncData('object_50HJ8__c', true)" :loading="syncing['object_50HJ8__c']">
                                        完整同步
                                    </el-button>
                                </div>
                            </el-card>
                        </el-col>
                    </el-row>
                    
                    <el-row :gutter="20" style="margin-bottom: 20px;">
                        <!-- 案場浴櫃同步 -->
                        <el-col :span="8">
                            <el-card class="sync-card">
                                <template #header>
                                    <span>案場(浴櫃)</span>
                                    <el-tag type="success" size="small" style="float: right;">自定義對象</el-tag>
                                </template>
                                <p class="sync-description">同步浴櫃相關數據</p>
                                <div class="sync-actions">
                                    <el-button type="success" size="small" @click="syncData('site_cabinet__c', false)" :loading="syncing['site_cabinet__c']">
                                        增量同步
                                    </el-button>
                                    <el-button size="small" @click="syncData('site_cabinet__c', true)" :loading="syncing['site_cabinet__c']">
                                        完整同步
                                    </el-button>
                                </div>
                            </el-card>
                        </el-col>
                        
                        <!-- 進度管理公告同步 -->
                        <el-col :span="8">
                            <el-card class="sync-card">
                                <template #header>
                                    <span>進度管理公告</span>
                                    <el-tag type="warning" size="small" style="float: right;">自定義對象</el-tag>
                                </template>
                                <p class="sync-description">同步進度公告訊息</p>
                                <div class="sync-actions">
                                    <el-button type="warning" size="small" @click="syncData('progress_management_announ__c', false)" :loading="syncing['progress_management_announ__c']">
                                        增量同步
                                    </el-button>
                                    <el-button size="small" @click="syncData('progress_management_announ__c', true)" :loading="syncing['progress_management_announ__c']">
                                        完整同步
                                    </el-button>
                                </div>
                            </el-card>
                        </el-col>
                        
                        <!-- 批次同步 -->
                        <el-col :span="8">
                            <el-card class="sync-card">
                                <template #header>
                                    <span>批次同步</span>
                                    <el-tag type="danger" size="small" style="float: right;">全部對象</el-tag>
                                </template>
                                <p class="sync-description">同步所有啟用的對象</p>
                                <div class="sync-actions">
                                    <el-button type="danger" size="small" @click="syncAllObjects(false)" :loading="syncing.all">
                                        全部增量同步
                                    </el-button>
                                    <el-button size="small" @click="syncAllObjects(true)" :loading="syncing.all">
                                        全部完整同步
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
                
                <!-- 時間旅行 Tab -->
                <el-tab-pane label="時間旅行" name="backup">
                    <el-row :gutter="20">
                        <!-- 資料庫統計 -->
                        <el-col :span="8">
                            <el-card>
                                <template #header>
                                    <span>資料庫統計</span>
                                </template>
                                <el-descriptions :column="1" border>
                                    <el-descriptions-item label="資料庫大小">
                                        {{ backupStats.sizeMB || '0' }} MB
                                    </el-descriptions-item>
                                    <el-descriptions-item label="總頁數">
                                        {{ backupStats.pageCount || '0' }}
                                    </el-descriptions-item>
                                    <el-descriptions-item label="最後備份">
                                        {{ formatTime(backupStats.lastBackup) }}
                                    </el-descriptions-item>
                                </el-descriptions>
                                <div style="margin-top: 20px;">
                                    <el-button type="primary" @click="refreshBackupStats" :icon="RefreshIcon">
                                        重新整理
                                    </el-button>
                                </div>
                            </el-card>
                        </el-col>
                        
                        <!-- 標記檢查點 -->
                        <el-col :span="8">
                            <el-card>
                                <template #header>
                                    <span>標記檢查點</span>
                                </template>
                                <el-form>
                                    <el-form-item label="描述">
                                        <el-input 
                                            v-model="checkpointDescription" 
                                            placeholder="例如：重建工地師父表結構"
                                            type="textarea"
                                            :rows="3">
                                        </el-input>
                                    </el-form-item>
                                    <el-form-item>
                                        <el-button type="success" @click="markCheckpoint">
                                            <i class="fas fa-bookmark"></i> 標記當前時間點
                                        </el-button>
                                    </el-form-item>
                                </el-form>
                                <el-alert type="info" :closable="false">
                                    在重大操作前標記檢查點，方便需要時恢復
                                </el-alert>
                            </el-card>
                        </el-col>
                        
                        <!-- 恢復指令 -->
                        <el-col :span="8">
                            <el-card>
                                <template #header>
                                    <span>時間旅行指令</span>
                                </template>
                                <el-form>
                                    <el-form-item label="選擇時間">
                                        <el-date-picker
                                            v-model="restoreTimestamp"
                                            type="datetime"
                                            placeholder="選擇恢復時間點"
                                            format="YYYY-MM-DD HH:mm:ss"
                                            value-format="YYYY-MM-DDTHH:mm:ss[Z]">
                                        </el-date-picker>
                                    </el-form-item>
                                    <el-form-item>
                                        <el-button type="warning" @click="generateRestoreCommand">
                                            生成恢復指令
                                        </el-button>
                                    </el-form-item>
                                </el-form>
                                <div v-if="restoreCommand" style="margin-top: 20px;">
                                    <el-alert type="warning" :closable="false">
                                        <template #title>
                                            恢復指令（請在終端機執行）
                                        </template>
                                        <pre style="margin-top: 10px;">{{ restoreCommand }}</pre>
                                        <el-button 
                                            size="small" 
                                            style="margin-top: 10px;"
                                            @click="copyCommand">
                                            複製指令
                                        </el-button>
                                    </el-alert>
                                </div>
                            </el-card>
                        </el-col>
                    </el-row>
                    
                    <!-- 重要檢查點列表 -->
                    <el-row style="margin-top: 20px;">
                        <el-col :span="24">
                            <el-card>
                                <template #header>
                                    <span>重要檢查點</span>
                                    <el-button 
                                        type="primary" 
                                        size="small" 
                                        style="float: right;" 
                                        @click="loadCheckpoints">
                                        重新載入
                                    </el-button>
                                </template>
                                
                                <el-table :data="checkpoints" stripe>
                                    <el-table-column prop="timestamp" label="時間" width="200">
                                        <template #default="{ row }">
                                            {{ formatTime(row.timestamp) }}
                                        </template>
                                    </el-table-column>
                                    <el-table-column prop="description" label="描述" />
                                    <el-table-column label="操作" width="200" align="center">
                                        <template #default="{ row }">
                                            <el-button 
                                                size="small" 
                                                type="warning"
                                                @click="setRestoreTime(row.timestamp)">
                                                選擇此時間點
                                            </el-button>
                                        </template>
                                    </el-table-column>
                                </el-table>
                                
                                <el-empty v-if="checkpoints.length === 0" description="尚未標記任何檢查點">
                                    <el-button type="primary" @click="markCheckpoint">標記第一個檢查點</el-button>
                                </el-empty>
                            </el-card>
                        </el-col>
                    </el-row>
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
                            <el-table-column prop="displayName" label="欄位名稱" width="200"></el-table-column>
                            <el-table-column prop="apiName" label="API 名稱" width="200"></el-table-column>
                            <el-table-column prop="fieldType" label="欄位類型" width="150"></el-table-column>
                            <el-table-column prop="dataType" label="數據類型" width="150"></el-table-column>
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
                            <el-table-column prop="displayName" label="欄位名稱" width="200"></el-table-column>
                            <el-table-column prop="apiName" label="API 名稱" width="200"></el-table-column>
                            <el-table-column prop="fieldType" label="欄位類型" width="150"></el-table-column>
                            <el-table-column prop="dataType" label="數據類型" width="150"></el-table-column>
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
        const { createApp, reactive, ref } = Vue;
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
                    objectStats: [],
                    syncing: {
                        'NewOpportunityObj': false,
                        'NewOpportunityContactsObj': false,
                        'SupplierObj': false,
                        'object_8W9cb__c': false,
                        'object_k1XqG__c': false,
                        'object_50HJ8__c': false,
                        'site_cabinet__c': false,
                        'progress_management_announ__c': false,
                        'all': false
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
                    // Time Travel 相關
                    backupStats: {
                        sizeMB: 0,
                        pageCount: 0,
                        lastBackup: null
                    },
                    checkpointDescription: '',
                    restoreTimestamp: null,
                    restoreCommand: '',
                    checkpoints: [],
                    // Icons
                    RefreshIcon: ElementPlusIconsVue.Refresh,
                    SearchIcon: ElementPlusIconsVue.Search,
                    ViewIcon: ElementPlusIconsVue.View
                }
            },
            mounted() {
                this.loadStats();
                this.loadDatabaseStats();
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
                async loadDatabaseStats() {
                    try {
                        // 載入CRM對象統計
                        const response = await fetch('/api/sync/database-stats');
                        const result = await response.json();
                        
                        if (result.success) {
                            const tables = result.data.tables;
                            this.objectStats = tables.map(table => ({
                                displayName: this.getDisplayName(table.apiName),
                                apiName: table.apiName,
                                count: table.recordCount,
                                colorClass: this.getColorClass(table.apiName)
                            }));
                        }
                        
                        // 載入員工統計
                        const empResponse = await fetch('/api/simple-employees/stats');
                        const empResult = await empResponse.json();
                        
                        if (empResult.success) {
                            this.objectStats.push({
                                displayName: '員工',
                                apiName: 'employees_simple',
                                count: empResult.data.total_employees || 0,
                                colorClass: 'success'
                            });
                        }
                    } catch (error) {
                        console.error('載入統計失敗:', error);
                    }
                },
                
                getDisplayName(apiName) {
                    const nameMap = {
                        'NewOpportunityObj': '商機',
                        'NewOpportunityContactsObj': '商機連絡人',
                        'object_8W9cb__c': '案場(SPC)',
                        'object_k1XqG__c': '維修單',
                        'object_50HJ8__c': '工地師父',
                        'employees_simple': '員工',
                        'SupplierObj': '供應商',
                        'site_cabinet__c': '案場(浴櫃)',
                        'progress_management_announ__c': '進度公告'
                    };
                    return nameMap[apiName] || apiName;
                },
                
                getColorClass(apiName) {
                    const colorMap = {
                        'NewOpportunityObj': 'primary',
                        'NewOpportunityContactsObj': 'info',
                        'object_8W9cb__c': 'success',
                        'object_k1XqG__c': 'warning',
                        'object_50HJ8__c': 'danger',
                        'SupplierObj': 'primary',
                        'site_cabinet__c': 'success',
                        'progress_management_announ__c': 'warning'
                    };
                    return colorMap[apiName] || 'info';
                },
                
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
                    this.syncing[objectName] = true;
                    
                    try {
                        const endpoint = fullSync ? 'full' : 'start';
                        const response = await axios.post(\`/api/sync/\${objectName}/\${endpoint}\`);
                        
                        if (response.data.success) {
                            const result = response.data.data?.result || {};
                            const displayName = this.getObjectName(objectName);
                            ElMessage.success(\`\${displayName} 同步完成！成功: \${result.success || 0} 條，錯誤: \${result.errors || 0} 條\`);
                            await this.loadStats();
                            await this.loadRecentLogs();
                        } else {
                            ElMessage.error('同步失敗: ' + response.data.error);
                        }
                    } catch (error) {
                        ElMessage.error('同步失敗: ' + error.message);
                    } finally {
                        this.syncing[objectName] = false;
                    }
                },
                
                async syncAllObjects(fullSync) {
                    this.syncing.all = true;
                    const objects = [
                        'NewOpportunityObj',
                        'NewOpportunityContactsObj',
                        'SupplierObj',
                        'object_8W9cb__c',
                        'object_k1XqG__c',
                        'object_50HJ8__c',
                        'site_cabinet__c',
                        'progress_management_announ__c'
                    ];
                    
                    ElMessage.info('開始批次同步所有對象...');
                    
                    try {
                        let totalSuccess = 0;
                        let totalErrors = 0;
                        let failedObjects = [];
                        
                        for (const objectName of objects) {
                            try {
                                const endpoint = fullSync ? 'full' : 'start';
                                const response = await axios.post(\`/api/sync/\${objectName}/\${endpoint}\`);
                                
                                if (response.data.success) {
                                    const result = response.data.data?.result || {};
                                    totalSuccess += result.success || 0;
                                    totalErrors += result.errors || 0;
                                } else {
                                    failedObjects.push(this.getObjectName(objectName));
                                }
                            } catch (error) {
                                failedObjects.push(this.getObjectName(objectName));
                                console.error(\`同步 \${objectName} 失敗:\`, error);
                            }
                        }
                        
                        if (failedObjects.length === 0) {
                            ElMessage.success(\`批次同步完成！總成功: \${totalSuccess} 條，總錯誤: \${totalErrors} 條\`);
                        } else {
                            ElMessage.warning(\`批次同步部分完成。失敗對象: \${failedObjects.join(', ')}\`);
                        }
                        
                        await this.loadStats();
                        await this.loadRecentLogs();
                        
                    } catch (error) {
                        ElMessage.error('批次同步失敗: ' + error.message);
                    } finally {
                        this.syncing.all = false;
                    }
                },
                
                async refreshData() {
                    this.lastUpdate = new Date().toLocaleString('zh-TW');
                    await this.loadStats();
                    ElMessage.success('資料已更新');
                },
                
                goToEmployees() {
                    window.open('/admin/employees', '_blank');
                },
                
                handleStatClick(apiName) {
                    if (apiName === 'employees_simple') {
                        this.goToEmployees();
                    }
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
                    // 先清空數據
                    this.fieldDetails = { 
                        systemFields: [], 
                        customFields: [] 
                    };
                    
                    // 等待對話框渲染完成後再載入數據
                    await this.$nextTick();
                    
                    try {
                        console.log('Loading fields for:', object.apiName);
                        const response = await axios.get(\`/api/objects/\${object.apiName}/fields\`);
                        console.log('API Response:', response.data);
                        
                        if (response.data.success) {
                            // 確保數據結構正確
                            const data = response.data.data;
                            
                            // 直接替換整個 fieldDetails 對象以觸發響應式更新
                            this.fieldDetails = {
                                systemFields: data.systemFields || [],
                                customFields: data.customFields || []
                            };
                            
                            console.log('Field details updated:', this.fieldDetails);
                            console.log('System fields count:', this.fieldDetails.systemFields.length);
                            console.log('Custom fields count:', this.fieldDetails.customFields.length);
                            console.log('First system field:', this.fieldDetails.systemFields[0]);
                            
                            // 強制Vue重新渲染
                            this.$forceUpdate();
                            
                            // 延遲一下再次強制更新以確保DOM重新渲染
                            setTimeout(() => {
                                this.$forceUpdate();
                            }, 100);
                            
                            ElMessage.success(\`已載入 \${this.fieldDetails.systemFields.length} 個系統欄位和 \${this.fieldDetails.customFields.length} 個自定義欄位\`);
                        } else {
                            ElMessage.error('載入欄位失敗: ' + response.data.error);
                        }
                    } catch (error) {
                        console.error('載入欄位錯誤:', error);
                        ElMessage.error('載入欄位失敗: ' + error.message);
                    }
                },
                
                // Time Travel 方法
                async refreshBackupStats() {
                    try {
                        const response = await axios.get('/api/backup/stats');
                        if (response.data.success) {
                            this.backupStats = response.data.data.database || {};
                        } else {
                            ElMessage.error('載入備份統計失敗: ' + response.data.error);
                        }
                    } catch (error) {
                        console.error('載入備份統計失敗:', error);
                        ElMessage.error('載入備份統計失敗');
                    }
                },
                
                async loadCheckpoints() {
                    try {
                        const response = await axios.get('/api/backup/checkpoints');
                        if (response.data.success) {
                            this.checkpoints = response.data.data.checkpoints || [];
                        } else {
                            ElMessage.error('載入檢查點失敗: ' + response.data.error);
                        }
                    } catch (error) {
                        console.error('載入檢查點失敗:', error);
                        ElMessage.error('載入檢查點失敗');
                    }
                },
                
                async markCheckpoint() {
                    if (!this.checkpointDescription.trim()) {
                        ElMessage.warning('請輸入檢查點描述');
                        return;
                    }
                    
                    try {
                        const response = await axios.post('/api/backup/mark', {
                            description: this.checkpointDescription
                        });
                        if (response.data.success) {
                            ElMessage.success('檢查點已標記');
                            this.checkpointDescription = '';
                            await this.loadCheckpoints();
                        } else {
                            ElMessage.error('標記檢查點失敗: ' + response.data.error);
                        }
                    } catch (error) {
                        console.error('標記檢查點失敗:', error);
                        ElMessage.error('標記檢查點失敗');
                    }
                },
                
                generateRestoreCommand() {
                    if (!this.restoreTimestamp) {
                        ElMessage.warning('請選擇恢復時間點');
                        return;
                    }
                    
                    const timestamp = new Date(this.restoreTimestamp).toISOString();
                    this.restoreCommand = 
                        'wrangler d1 time-travel info fx-crm-database --timestamp="' + timestamp + '"\\n\\n' +
                        '# 確認上述資訊無誤後，執行以下指令進行恢復：\\n' +
                        'wrangler d1 time-travel restore fx-crm-database --timestamp="' + timestamp + '"';
                    
                    ElMessage.success('恢復指令已生成');
                },
                
                setRestoreTime(timestamp) {
                    this.restoreTimestamp = new Date(timestamp);
                    ElMessage.success('已設定恢復時間點');
                },
                
                copyCommand() {
                    if (navigator.clipboard) {
                        navigator.clipboard.writeText(this.restoreCommand).then(() => {
                            ElMessage.success('指令已複製到剪貼簿');
                        });
                    } else {
                        ElMessage.warning('無法複製，請手動選取指令');
                    }
                },
                
                formatTime(timestamp) {
                    if (!timestamp) return '-';
                    return new Date(timestamp).toLocaleString('zh-TW');
                }
            }
        }).use(ElementPlus).mount('#app');
    </script>
</body>
</html>`;