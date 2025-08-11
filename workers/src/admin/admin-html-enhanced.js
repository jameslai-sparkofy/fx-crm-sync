export const adminHTMLEnhanced = `<!DOCTYPE html>
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
                    <el-row :gutter="20">
                        <el-col :span="8" v-for="obj in syncObjects" :key="obj.apiName">
                            <el-card class="sync-card">
                                <template #header>
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <span>{{ obj.displayName }}同步</span>
                                        <el-tag v-if="obj.isCustom" type="warning" size="small">自定義</el-tag>
                                        <el-tag v-else type="info" size="small">標準</el-tag>
                                    </div>
                                </template>
                                <p class="sync-description">{{ obj.description }}</p>
                                <div style="margin-bottom: 15px;">
                                    <el-switch 
                                        v-model="obj.enabled" 
                                        active-text="啟用" 
                                        inactive-text="停用"
                                        @change="toggleObjectSync(obj.apiName, $event)"
                                    />
                                </div>
                                <div class="sync-actions">
                                    <el-button 
                                        type="primary" 
                                        size="small"
                                        @click="syncData(obj.apiName, false)" 
                                        :loading="syncing[obj.apiName]"
                                        :disabled="!obj.enabled">
                                        增量同步
                                    </el-button>
                                    <el-button 
                                        size="small"
                                        @click="syncData(obj.apiName, true)" 
                                        :loading="syncing[obj.apiName]"
                                        :disabled="!obj.enabled">
                                        完整同步
                                    </el-button>
                                </div>
                            </el-card>
                        </el-col>
                    </el-row>
                    
                    <!-- 同步結果 -->
                    <el-alert 
                        v-if="syncResult" 
                        :title="syncResult.success ? '同步成功' : '同步失敗'"
                        :type="syncResult.success ? 'success' : 'error'"
                        :description="syncResult.message"
                        :closable="true"
                        @close="syncResult = null"
                        style="margin-top: 20px;">
                    </el-alert>
                </el-tab-pane>
                
                <!-- 同步日誌 Tab -->
                <el-tab-pane label="同步日誌" name="logs">
                    <el-table :data="recentLogs" stripe>
                        <el-table-column prop="completed_at" label="時間" width="200">
                            <template #default="scope">
                                {{ formatDate(scope.row.completed_at) }}
                            </template>
                        </el-table-column>
                        <el-table-column prop="entity_type" label="對象">
                            <template #default="scope">
                                {{ getObjectName(scope.row.entity_type) }}
                            </template>
                        </el-table-column>
                        <el-table-column prop="status" label="狀態" width="100">
                            <template #default="scope">
                                <el-tag :type="scope.row.status === 'COMPLETED' ? 'success' : 'danger'">
                                    {{ scope.row.status === 'COMPLETED' ? '成功' : '失敗' }}
                                </el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column prop="records_count" label="總記錄數" width="120"></el-table-column>
                        <el-table-column prop="error_count" label="錯誤數" width="100">
                            <template #default="scope">
                                <span :style="{color: scope.row.error_count > 0 ? '#f56c6c' : '#67c23a'}">
                                    {{ scope.row.error_count || 0 }}
                                </span>
                            </template>
                        </el-table-column>
                        <el-table-column prop="success_count" label="成功數" width="100">
                            <template #default="scope">
                                {{ (scope.row.records_count || 0) - (scope.row.error_count || 0) }}
                            </template>
                        </el-table-column>
                    </el-table>
                </el-tab-pane>
                
                <!-- 對象管理 Tab -->
                <el-tab-pane label="對象管理" name="objects">
                    <el-row :gutter="20">
                        <el-col :span="24">
                            <el-card>
                                <template #header>
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <span>CRM 對象列表</span>
                                        <el-button type="primary" size="small" @click="discoverObjects" :loading="discovering">
                                            發現新對象
                                        </el-button>
                                    </div>
                                </template>
                                
                                <!-- 標準對象 -->
                                <h4 style="margin-bottom: 15px;">標準對象</h4>
                                <el-table :data="standardObjects" border style="margin-bottom: 30px;">
                                    <el-table-column prop="displayName" label="對象名稱" width="200"></el-table-column>
                                    <el-table-column prop="apiName" label="API 名稱"></el-table-column>
                                    <el-table-column prop="fieldCount" label="欄位數量" width="120"></el-table-column>
                                    <el-table-column label="同步狀態" width="120">
                                        <template #default="scope">
                                            <el-switch 
                                                v-model="scope.row.enabled"
                                                @change="toggleObjectSync(scope.row.apiName, $event)"
                                            />
                                        </template>
                                    </el-table-column>
                                    <el-table-column label="操作" width="150">
                                        <template #default="scope">
                                            <el-button size="small" @click="viewFieldMapping(scope.row)">
                                                查看欄位
                                            </el-button>
                                        </template>
                                    </el-table-column>
                                </el-table>
                                
                                <!-- 自定義對象 -->
                                <h4 style="margin-bottom: 15px;">自定義對象（__c 結尾）</h4>
                                <el-table :data="customObjects" border>
                                    <el-table-column prop="displayName" label="對象名稱" width="200"></el-table-column>
                                    <el-table-column prop="apiName" label="API 名稱"></el-table-column>
                                    <el-table-column prop="fieldCount" label="欄位數量" width="120"></el-table-column>
                                    <el-table-column label="同步狀態" width="120">
                                        <template #default="scope">
                                            <el-switch 
                                                v-model="scope.row.enabled"
                                                @change="toggleObjectSync(scope.row.apiName, $event)"
                                            />
                                        </template>
                                    </el-table-column>
                                    <el-table-column label="操作" width="150">
                                        <template #default="scope">
                                            <el-button size="small" @click="viewFieldMapping(scope.row)">
                                                查看欄位
                                            </el-button>
                                        </template>
                                    </el-table-column>
                                </el-table>
                            </el-card>
                        </el-col>
                    </el-row>
                </el-tab-pane>
                
                <!-- 欄位對應 Tab -->
                <el-tab-pane label="欄位對應表" name="fields">
                    <el-card>
                        <template #header>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span>欄位對應關係</span>
                                <div style="display: flex; gap: 10px;">
                                    <el-select v-model="selectedObject" placeholder="選擇對象" style="width: 300px;" @change="loadFieldMapping">
                                        <el-option 
                                            v-for="obj in allObjects" 
                                            :key="obj.apiName"
                                            :label="obj.displayName + ' (' + obj.apiName + ')'"
                                            :value="obj.apiName">
                                        </el-option>
                                    </el-select>
                                    <el-button type="primary" size="small" @click="exportFieldMapping" v-if="selectedObject">
                                        匯出 CSV
                                    </el-button>
                                </div>
                            </div>
                        </template>
                        
                        <div v-if="selectedObject && fieldMappings[selectedObject]">
                            <!-- 欄位統計 -->
                            <div class="field-stats">
                                <div class="field-stat-item">
                                    <el-icon><DocumentCopy /></el-icon>
                                    <span>總欄位數: <strong>{{ fieldStats.total }}</strong></span>
                                </div>
                                <div class="field-stat-item">
                                    <el-icon><CircleCheck /></el-icon>
                                    <span>必填欄位: <strong style="color: #f56c6c;">{{ fieldStats.required }}</strong></span>
                                </div>
                                <div class="field-stat-item">
                                    <el-icon><Picture /></el-icon>
                                    <span>圖片欄位: <strong style="color: #409eff;">{{ fieldStats.images }}</strong></span>
                                </div>
                                <div class="field-stat-item">
                                    <el-icon><Connection /></el-icon>
                                    <span>關聯欄位: <strong style="color: #e6a23c;">{{ fieldStats.lookups }}</strong></span>
                                </div>
                                <div class="field-stat-item">
                                    <el-icon><DataLine /></el-icon>
                                    <span>來源: <strong style="color: #67c23a;">{{ fieldDataSource }}</strong></span>
                                </div>
                            </div>
                            
                            <!-- 搜尋框 -->
                            <div class="field-search-box">
                                <el-input 
                                    v-model="fieldSearchKeyword" 
                                    placeholder="搜尋欄位名稱或 API 名稱"
                                    clearable
                                    style="width: 300px;">
                                    <template #prefix>
                                        <el-icon><Search /></el-icon>
                                    </template>
                                </el-input>
                            </div>
                            
                            <!-- 欄位表格 -->
                            <el-table 
                                :data="filteredFields" 
                                border 
                                class="field-mapping-table"
                                max-height="600"
                                :default-sort="{ prop: 'required', order: 'descending' }">
                                <el-table-column type="index" label="#" width="50"></el-table-column>
                                <el-table-column prop="apiName" label="API 欄位名" width="200" sortable>
                                    <template #default="scope">
                                        <el-tooltip :content="scope.row.apiName" placement="top">
                                            <span style="font-family: monospace; font-size: 12px;">{{ scope.row.apiName }}</span>
                                        </el-tooltip>
                                    </template>
                                </el-table-column>
                                <el-table-column prop="label" label="顯示名稱" width="150" sortable>
                                    <template #default="scope">
                                        <strong>{{ scope.row.label }}</strong>
                                    </template>
                                </el-table-column>
                                <el-table-column prop="dataType" label="數據類型" width="120" sortable>
                                    <template #default="scope">
                                        <el-tag 
                                            :type="getFieldTypeTagType(scope.row.dataType)" 
                                            size="small"
                                            class="field-type-tag">
                                            {{ getFieldTypeDisplay(scope.row.dataType) }}
                                        </el-tag>
                                    </template>
                                </el-table-column>
                                <el-table-column label="必填" width="80" sortable prop="required">
                                    <template #default="scope">
                                        <el-tag v-if="scope.row.required" type="danger" size="small">必填</el-tag>
                                        <el-tag v-else type="info" size="small">選填</el-tag>
                                    </template>
                                </el-table-column>
                                <el-table-column prop="description" label="描述/選項值">
                                    <template #default="scope">
                                        <div v-if="scope.row.options">
                                            <el-tag 
                                                v-for="(option, idx) in scope.row.options.split(';').slice(0, 3)" 
                                                :key="idx"
                                                size="small"
                                                style="margin-right: 4px;">
                                                {{ option }}
                                            </el-tag>
                                            <span v-if="scope.row.options.split(';').length > 3" style="color: #909399;">
                                                ...等 {{ scope.row.options.split(';').length }} 個選項
                                            </span>
                                        </div>
                                        <span v-else style="color: #909399;">{{ scope.row.description || '-' }}</span>
                                    </template>
                                </el-table-column>
                            </el-table>
                        </div>
                        <el-empty v-else description="請選擇一個對象查看欄位對應關係"></el-empty>
                    </el-card>
                </el-tab-pane>
                
                    <el-card>
                        <template #header>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span>欄位編輯權限設定</span>
                                <el-button type="primary" @click="loadPermissions">刷新權限</el-button>
                            </div>
                        </template>
                        
                        <div v-if="permissions.length > 0">
                            <div v-for="objectPerm in permissions" :key="objectPerm.objectApiName" style="margin-bottom: 30px;">
                                <el-divider content-position="left">
                                    <h3>{{ objectPerm.objectDisplayName || objectPerm.objectApiName }}</h3>
                                </el-divider>
                                
                                <el-table :data="objectPerm.fields" stripe>
                                    <el-table-column prop="fieldDisplayName" label="欄位名稱" width="200">
                                        <template #default="scope">
                                            <div>
                                                <div>{{ scope.row.fieldDisplayName || scope.row.fieldApiName }}</div>
                                                <div style="font-size: 12px; color: #909399;">{{ scope.row.fieldApiName }}</div>
                                            </div>
                                        </template>
                                    </el-table-column>
                                    
                                    <el-table-column prop="fieldType" label="類型" width="100">
                                        <template #default="scope">
                                            <el-tag size="small" type="info">{{ scope.row.fieldType }}</el-tag>
                                        </template>
                                    </el-table-column>
                                    
                                    <el-table-column label="工班可編輯" width="120" align="center">
                                        <template #default="scope">
                                            <el-switch
                                                v-model="scope.row.canEditByWorker"
                                                @change="updatePermission(scope.row)"
                                            />
                                        </template>
                                    </el-table-column>
                                    
                                    <el-table-column label="業主可編輯" width="120" align="center">
                                        <template #default="scope">
                                            <el-switch
                                                v-model="scope.row.canEditByOwner"
                                                @change="updatePermission(scope.row)"
                                            />
                                        </template>
                                    </el-table-column>
                                    
                                    <el-table-column label="管理員可編輯" width="120" align="center">
                                        <template #default="scope">
                                            <el-switch
                                                v-model="scope.row.canEditByAdmin"
                                                @change="updatePermission(scope.row)"
                                            />
                                        </template>
                                    </el-table-column>
                                    
                                    <el-table-column prop="editDescription" label="權限說明">
                                        <template #default="scope">
                                            <div style="font-size: 13px; color: #606266;">
                                                {{ scope.row.editDescription || '無說明' }}
                                            </div>
                                        </template>
                                    </el-table-column>
                                    
                                    <el-table-column label="操作" width="100">
                                        <template #default="scope">
                                            <el-button 
                                                type="text" 
                                                size="small" 
                                                @click="editPermissionDescription(scope.row)"
                                            >
                                                編輯說明
                                            </el-button>
                                        </template>
                                    </el-table-column>
                                </el-table>
                            </div>
                        </div>
                        
                        <div v-else style="text-align: center; color: #909399; padding: 50px 0;">
                            <el-empty description="尚無權限設定數據">
                                <el-button type="primary" @click="loadPermissions">載入權限設定</el-button>
                            </el-empty>
                        </div>
                    </el-card>
                </el-tab-pane>
                
            </el-tabs>
        </div>
        
        <!-- 欄位詳情對話框 -->
        <el-dialog v-model="fieldDialogVisible" :title="'欄位詳情 - ' + currentObjectName" width="80%">
            <el-table :data="currentFields" border max-height="500">
                <el-table-column prop="apiName" label="API 欄位名" width="200"></el-table-column>
                <el-table-column prop="label" label="顯示名稱" width="200"></el-table-column>
                <el-table-column prop="dataType" label="數據類型" width="120"></el-table-column>
                <el-table-column prop="description" label="描述"></el-table-column>
            </el-table>
        </el-dialog>
        
        <!-- 權限說明編輯對話框 -->
        <el-dialog 
            v-model="permissionDialogVisible" 
            title="編輯權限說明" 
            width="60%"
        >
            <el-form :model="permissionForm" label-width="120px">
                <el-form-item label="欄位名稱">
                    <div style="color: #606266;">
                        <div>{{ editingPermission?.fieldDisplayName || editingPermission?.fieldApiName }}</div>
                        <div style="font-size: 12px; color: #909399;">{{ editingPermission?.fieldApiName }}</div>
                    </div>
                </el-form-item>
                
                <el-form-item label="當前權限">
                    <div style="display: flex; gap: 20px;">
                        <el-tag :type="editingPermission?.canEditByWorker ? 'success' : 'info'" size="small">
                            工班: {{ editingPermission?.canEditByWorker ? '可編輯' : '不可編輯' }}
                        </el-tag>
                        <el-tag :type="editingPermission?.canEditByOwner ? 'success' : 'info'" size="small">
                            業主: {{ editingPermission?.canEditByOwner ? '可編輯' : '不可編輯' }}
                        </el-tag>
                        <el-tag :type="editingPermission?.canEditByAdmin ? 'success' : 'info'" size="small">
                            管理員: {{ editingPermission?.canEditByAdmin ? '可編輯' : '不可編輯' }}
                        </el-tag>
                    </div>
                </el-form-item>
                
                <el-form-item label="權限說明">
                    <el-input
                        v-model="permissionForm.editDescription"
                        type="textarea"
                        :rows="3"
                        placeholder="請輸入該欄位的編輯權限說明..."
                    ></el-input>
                </el-form-item>
                
                <el-form-item label="業務規則">
                    <el-input
                        v-model="permissionForm.businessRules"
                        type="textarea"
                        :rows="3"
                        placeholder="請輸入相關的業務規則說明..."
                    ></el-input>
                </el-form-item>
            </el-form>
            
            <template #footer>
                <el-button @click="permissionDialogVisible = false">取消</el-button>
                <el-button type="primary" @click="savePermissionDescription">保存</el-button>
            </template>
        </el-dialog>
    </div>

    <script>
        const { createApp } = Vue;
        const { ElMessage, ElMessageBox } = ElementPlus;
        
        const appConfig = {
            data() {
                return {
                    activeTab: 'sync',
                    lastUpdate: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                    cronStatus: {
                        enabled: true,
                        lastRun: null,
                        nextRun: null
                    },
                    objectStats: [],
                    syncObjects: [
                        {
                            apiName: 'NewOpportunityObj',
                            displayName: '商機',
                            description: '銷售機會與商機管理',
                            isCustom: false,
                            enabled: true
                        },
                        {
                            apiName: 'NewOpportunityContactsObj',
                            displayName: '商機連絡人',
                            description: '商機關聯的連絡人資訊',
                            isCustom: false,
                            enabled: true
                        },
                        {
                            apiName: 'object_8W9cb__c',
                            displayName: '案場',
                            description: '建築案場資料',
                            isCustom: true,
                            enabled: true
                        },
                        {
                            apiName: 'object_k1XqG__c',
                            displayName: '維修單',
                            description: 'SPC維修單管理',
                            isCustom: true,
                            enabled: true
                        },
                        {
                            apiName: 'object_50HJ8__c',
                            displayName: '工地師父',
                            description: '工地師父資料',
                            isCustom: true,
                            enabled: true
                        },
                        {
                            apiName: 'SupplierObj',
                            displayName: '供應商',
                            description: '供應商資料管理',
                            isCustom: false,
                            enabled: true
                        },
                        {
                            apiName: 'site_cabinet__c',
                            displayName: '案場(浴櫃)',
                            description: '浴櫃設施資料',
                            isCustom: true,
                            enabled: true
                        },
                        {
                            apiName: 'progress_management_announ__c',
                            displayName: '進度管理公告',
                            description: '施工進度公告',
                            isCustom: true,
                            enabled: true
                        }
                    ],
                    standardObjects: [],
                    customObjects: [],
                    allObjects: [],
                    syncing: {},
                    syncResult: null,
                    recentLogs: [],
                    discovering: false,
                    selectedObject: null,
                    fieldMappings: {},
                    fieldSearchKeyword: '',
                    fieldStats: {
                        total: 0,
                        required: 0,
                        images: 0,
                        lookups: 0
                    },
                    fieldDataSource: '',
                    fieldDialogVisible: false,
                    currentObjectName: '',
                    currentFields: [],
                    permissions: [],
                    editingPermission: null,
                    permissionDialogVisible: false,
                    permissionForm: {
                        editDescription: '',
                        businessRules: ''
                    },
                    RefreshIcon: ElementPlusIconsVue.Refresh
                };
            },
            
            mounted() {
                this.initializeData();
                this.startAutoRefresh();
            },
            
            computed: {
                filteredFields() {
                    if (!this.selectedObject || !this.fieldMappings[this.selectedObject]) {
                        return [];
                    }
                    
                    const fields = this.fieldMappings[this.selectedObject];
                    
                    if (!this.fieldSearchKeyword) {
                        return fields;
                    }
                    
                    const keyword = this.fieldSearchKeyword.toLowerCase();
                    return fields.filter(field => 
                        field.apiName.toLowerCase().includes(keyword) ||
                        field.label.toLowerCase().includes(keyword)
                    );
                }
            },
            
            methods: {
                async initializeData() {
                    await this.loadStats();
                    await this.loadRecentLogs();
                    await this.loadObjects();
                    await this.loadSyncStatus();
                    this.separateObjects();
                },
                
                async loadStats() {
                    try {
                        const response = await axios.get('/api/sync/database-stats');
                        if (response.data.success) {
                            const dbStats = response.data.data.tables || [];
                            this.objectStats = this.syncObjects.map((obj, index) => {
                                const stat = dbStats.find(s => s.apiName === obj.apiName);
                                const colorClasses = ['primary', 'success', 'warning', 'danger', 'info'];
                                return {
                                    apiName: obj.apiName,
                                    displayName: obj.displayName,
                                    count: stat ? stat.recordCount : 0,
                                    lastSync: stat ? stat.lastSync : null,
                                    colorClass: colorClasses[index % colorClasses.length]
                                };
                            });
                        }
                    } catch (error) {
                        console.error('Failed to load database stats:', error);
                        // 回退到原來的同步統計
                        try {
                            const response = await axios.get('/api/sync/status');
                            if (response.data.success) {
                                const stats = response.data.data.statistics || [];
                                this.objectStats = this.syncObjects.map((obj, index) => {
                                    const stat = stats.find(s => s.entity_type === obj.apiName);
                                    const colorClasses = ['primary', 'success', 'warning', 'danger', 'info'];
                                    return {
                                        apiName: obj.apiName,
                                        displayName: obj.displayName,
                                        count: stat ? stat.sync_count : 0,
                                        lastSync: null,
                                        colorClass: colorClasses[index % colorClasses.length]
                                    };
                                });
                            }
                        } catch (fallbackError) {
                            console.error('Fallback stats loading failed:', fallbackError);
                        }
                    }
                },
                
                async loadRecentLogs() {
                    try {
                        const response = await axios.get('/api/sync/status');
                        if (response.data.success) {
                            this.recentLogs = response.data.data.recentSyncs || [];
                            if (this.recentLogs.length > 0) {
                                this.cronStatus.lastRun = this.recentLogs[0].completed_at;
                            }
                        }
                    } catch (error) {
                        console.error('Failed to load logs:', error);
                    }
                },
                
                async loadObjects() {
                    try {
                        // 從 KV 存儲載入對象狀態
                        const response = await axios.get('/api/objects/status');
                        if (response.data.success) {
                            const status = response.data.data;
                            this.syncObjects.forEach(obj => {
                                if (status[obj.apiName] !== undefined) {
                                    obj.enabled = status[obj.apiName].enabled;
                                }
                            });
                        }
                    } catch (error) {
                        console.error('Failed to load object status:', error);
                    }
                },
                
                async loadSyncStatus() {
                    // 載入定時同步狀態
                    try {
                        const response = await axios.get('/api/sync/cron-status');
                        if (response.data.success) {
                            this.cronStatus = response.data.data;
                        }
                    } catch (error) {
                        console.error('Failed to load cron status:', error);
                    }
                },
                
                separateObjects() {
                    this.standardObjects = this.syncObjects.filter(obj => !obj.isCustom).map(obj => ({
                        ...obj,
                        fieldCount: this.getFieldCount(obj.apiName)
                    }));
                    this.customObjects = this.syncObjects.filter(obj => obj.isCustom).map(obj => ({
                        ...obj,
                        fieldCount: this.getFieldCount(obj.apiName)
                    }));
                    this.allObjects = [...this.standardObjects, ...this.customObjects];
                },
                
                getFieldCount(apiName) {
                    const fieldCounts = {
                        'NewOpportunityObj': 61,
                        'object_8W9cb__c': 47,
                        'object_k1XqG__c': 50,
                        'object_50HJ8__c': 45,
                        'SupplierObj': 38,
                        'site_cabinet__c': 42,
                        'progress_management_announ__c': 35
                    };
                    return fieldCounts[apiName] || 0;
                },
                
                async toggleObjectSync(apiName, enabled) {
                    try {
                        const response = await axios.post('/api/objects/toggle', {
                            apiName: apiName,
                            enabled: enabled
                        });
                        
                        if (response.data.success) {
                            ElMessage.success(\`已\${enabled ? '啟用' : '停用'} \${this.getObjectName(apiName)} 的同步\`);
                        }
                    } catch (error) {
                        ElMessage.error('更新失敗: ' + error.message);
                    }
                },
                
                async syncData(objectName, fullSync = false) {
                    this.syncing[objectName] = true;
                    this.syncResult = null;
                    
                    try {
                        const endpoint = fullSync ? 'full' : 'start';
                        const response = await axios.post(\`/api/sync/\${objectName}/\${endpoint}\`);
                        
                        if (response.data.success) {
                            this.syncResult = {
                                success: true,
                                message: \`同步完成！成功: \${response.data.data?.result?.success || 0} 條，錯誤: \${response.data.data?.result?.errors || 0} 條\`
                            };
                            await this.loadStats();
                            await this.loadRecentLogs();
                        } else {
                            this.syncResult = {
                                success: false,
                                message: \`同步失敗: \${response.data.error}\`
                            };
                        }
                    } catch (error) {
                        this.syncResult = {
                            success: false,
                            message: \`同步失敗: \${error.message}\`
                        };
                    } finally {
                        this.syncing[objectName] = false;
                    }
                },
                
                async discoverObjects() {
                    this.discovering = true;
                    try {
                        const response = await axios.post('/api/objects/discover');
                        if (response.data.success) {
                            ElMessage.success('發現完成！找到 ' + response.data.data.count + ' 個對象');
                            await this.loadObjects();
                            this.separateObjects();
                        }
                    } catch (error) {
                        ElMessage.error('發現失敗: ' + error.message);
                    } finally {
                        this.discovering = false;
                    }
                },
                
                async viewFieldMapping(object) {
                    this.selectedObject = object.apiName;
                    await this.loadFieldMapping();
                    this.activeTab = 'fields';
                },
                
                async loadFieldMapping() {
                    if (!this.selectedObject) return;
                    
                    // 如果還沒有載入過這個對象的欄位，先載入
                    if (!this.fieldMappings[this.selectedObject]) {
                        try {
                            const response = await axios.get(\`/api/schema/\${this.selectedObject}/fields\`);
                            if (response.data.success) {
                                const data = response.data.data;
                                this.fieldMappings[this.selectedObject] = data.fields;
                                this.fieldDataSource = data.source === 'predefined' ? 'CSV 預定義' : 'API 動態獲取';
                                
                                // 計算統計
                                this.calculateFieldStats(data.fields);
                            }
                        } catch (error) {
                            ElMessage.error('載入欄位失敗: ' + error.message);
                        }
                    } else {
                        // 重新計算統計
                        this.calculateFieldStats(this.fieldMappings[this.selectedObject]);
                    }
                },
                
                calculateFieldStats(fields) {
                    this.fieldStats = {
                        total: fields.length,
                        required: fields.filter(f => f.required).length,
                        images: fields.filter(f => f.dataType === 'IMAGE').length,
                        lookups: fields.filter(f => 
                            f.dataType === 'LOOKUP' || 
                            f.dataType === 'MULTI_LOOKUP' || 
                            f.dataType === 'REFERENCE'
                        ).length
                    };
                },
                
                getFieldTypeDisplay(dataType) {
                    const typeMap = {
                        'TEXT': '文本',
                        'TEXTAREA': '多行文本',
                        'NUMBER': '數字',
                        'CURRENCY': '金額',
                        'DATE': '日期',
                        'DATETIME': '日期時間',
                        'SELECT': '單選',
                        'MULTISELECT': '多選',
                        'BOOLEAN': '布爾值',
                        'USER': '人員',
                        'DEPARTMENT': '部門',
                        'LOOKUP': '查找關聯',
                        'MULTI_LOOKUP': '多選關聯',
                        'REFERENCE': '引用',
                        'IMAGE': '圖片',
                        'ATTACHMENT': '附件',
                        'AUTO_NUMBER': '自增編號',
                        'FORMULA': '計算欄位',
                        'EMBEDDED_LIST': '內嵌列表',
                        'SYSTEM': '系統欄位'
                    };
                    return typeMap[dataType] || dataType;
                },
                
                getFieldTypeTagType(dataType) {
                    const typeMap = {
                        'TEXT': 'info',
                        'TEXTAREA': 'info',
                        'NUMBER': 'warning',
                        'CURRENCY': 'warning',
                        'DATE': 'success',
                        'DATETIME': 'success',
                        'SELECT': '',
                        'MULTISELECT': '',
                        'BOOLEAN': 'danger',
                        'USER': 'primary',
                        'DEPARTMENT': 'primary',
                        'LOOKUP': 'warning',
                        'MULTI_LOOKUP': 'warning',
                        'REFERENCE': 'warning',
                        'IMAGE': 'success',
                        'ATTACHMENT': 'success',
                        'AUTO_NUMBER': 'info',
                        'FORMULA': 'danger',
                        'EMBEDDED_LIST': 'info',
                        'SYSTEM': 'info'
                    };
                    return typeMap[dataType] || '';
                },
                
                async exportFieldMapping() {
                    if (!this.selectedObject || !this.fieldMappings[this.selectedObject]) {
                        ElMessage.warning('請先選擇對象');
                        return;
                    }
                    
                    const fields = this.fieldMappings[this.selectedObject];
                    const objectName = this.getObjectName(this.selectedObject);
                    
                    // 生成 CSV 內容
                    let csv = 'API名稱,顯示名稱,數據類型,是否必填,描述\\n';
                    fields.forEach(field => {
                        csv += \`\${field.apiName},\${field.label},\${field.dataType},\${field.required ? '是' : '否'},\${field.description || field.options || ''}\\n\`;
                    });
                    
                    // 下載 CSV
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = \`\${objectName}_欄位對應表_\${new Date().toISOString().split('T')[0]}.csv\`;
                    link.click();
                    
                    ElMessage.success('匯出成功');
                },
                
                async refreshData() {
                    this.lastUpdate = dayjs().format('YYYY-MM-DD HH:mm:ss');
                    await this.initializeData();
                    ElMessage.success('資料已更新');
                },
                
                formatDate(timestamp) {
                    if (!timestamp) return '-';
                    return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss');
                },
                
                getObjectName(apiName) {
                    const obj = this.syncObjects.find(o => o.apiName === apiName);
                    return obj ? obj.displayName : apiName;
                },
                
                getNextRunTime() {
                    const now = new Date();
                    const next = new Date(now);
                    next.setHours(next.getHours() + 1, 0, 0, 0);
                    return dayjs(next).format('YYYY-MM-DD HH:mm:ss');
                },
                
                async loadPermissions() {
                    try {
                        const response = await axios.get('/api/permissions');
                        if (response.data.success) {
                            this.permissions = response.data.data;
                            ElMessage.success('權限設定載入成功');
                        } else {
                            ElMessage.error('載入權限設定失敗: ' + response.data.error);
                        }
                    } catch (error) {
                        console.error('載入權限設定錯誤:', error);
                        ElMessage.error('載入權限設定失敗: ' + error.message);
                    }
                },
                
                async updatePermission(permission) {
                    try {
                        const response = await axios.put('/api/permissions/' + permission.id, {
                            canEditByWorker: permission.canEditByWorker,
                            canEditByOwner: permission.canEditByOwner,
                            canEditByAdmin: permission.canEditByAdmin,
                            editDescription: permission.editDescription,
                            businessRules: permission.businessRules
                        });
                        
                        if (response.data.success) {
                            ElMessage.success('權限設定已更新');
                        } else {
                            ElMessage.error('更新權限失敗: ' + response.data.error);
                        }
                    } catch (error) {
                        console.error('更新權限錯誤:', error);
                        ElMessage.error('更新權限失敗: ' + error.message);
                    }
                },
                
                editPermissionDescription(permission) {
                    this.editingPermission = permission;
                    this.permissionForm.editDescription = permission.editDescription || '';
                    this.permissionForm.businessRules = permission.businessRules || '';
                    this.permissionDialogVisible = true;
                },
                
                async savePermissionDescription() {
                    if (!this.editingPermission) return;
                    
                    try {
                        const response = await axios.put('/api/permissions/' + this.editingPermission.id, {
                            canEditByWorker: this.editingPermission.canEditByWorker,
                            canEditByOwner: this.editingPermission.canEditByOwner,
                            canEditByAdmin: this.editingPermission.canEditByAdmin,
                            editDescription: this.permissionForm.editDescription,
                            businessRules: this.permissionForm.businessRules
                        });
                        
                        if (response.data.success) {
                            this.editingPermission.editDescription = this.permissionForm.editDescription;
                            this.editingPermission.businessRules = this.permissionForm.businessRules;
                            this.permissionDialogVisible = false;
                            ElMessage.success('權限說明已更新');
                        } else {
                            ElMessage.error('更新說明失敗: ' + response.data.error);
                        }
                    } catch (error) {
                        console.error('更新說明錯誤:', error);
                        ElMessage.error('更新說明失敗: ' + error.message);
                    }
                },
                
                startAutoRefresh() {
                    // 每分鐘更新一次
                    setInterval(() => {
                        this.lastUpdate = dayjs().format('YYYY-MM-DD HH:mm:ss');
                    }, 60000);
                }
            }
        });
        
        // 創建並掛載應用
        const app = createApp(appConfig);
        app.use(ElementPlus);
        
        // 註冊所有圖標
        if (typeof ElementPlusIconsVue !== 'undefined') {
            Object.keys(ElementPlusIconsVue).forEach(key => {
                app.component(key, ElementPlusIconsVue[key]);
            });
        }
        
        app.mount('#app');
        window.app = app;
    </script>
</body>
</html>`;