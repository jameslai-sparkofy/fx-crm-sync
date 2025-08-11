export const adminHTMLSimple = `<!DOCTYPE html>
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
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fa; }
        .header { background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 0 20px; height: 60px; display: flex; align-items: center; justify-content: space-between; }
        .header h1 { font-size: 24px; color: #303133; }
        .main-content { padding: 20px; max-width: 1400px; margin: 0 auto; }
        .stat-card { text-align: center; padding: 20px; }
        .stat-title { font-size: 14px; color: #909399; margin-bottom: 12px; }
        .stat-value { font-size: 36px; font-weight: 700; margin-bottom: 8px; }
        .stat-value.primary { color: #409eff; }
        .stat-value.success { color: #67c23a; }
        .stat-value.warning { color: #e6a23c; }
        .stat-value.danger { color: #f56c6c; }
    </style>
</head>
<body>
    <div id="app">
        <div class="header">
            <h1>紛享銷客 CRM 同步管理系統</h1>
            <div>
                <span>最後更新: {{ lastUpdate }}</span>
                <el-button type="primary" @click="loadData">重新載入</el-button>
            </div>
        </div>
        
        <div class="main-content">
            <el-row :gutter="20">
                <el-col :span="6" v-for="stat in stats" :key="stat.name">
                    <el-card class="stat-card">
                        <div class="stat-title">{{ stat.name }}</div>
                        <div class="stat-value" :class="stat.color">{{ stat.count }}</div>
                    </el-card>
                </el-col>
            </el-row>
            
            <el-card style="margin-top: 20px">
                <h3>同步狀態</h3>
                <el-table :data="tableData" style="width: 100%; margin-top: 20px">
                    <el-table-column prop="apiName" label="對象 API 名稱" />
                    <el-table-column prop="displayName" label="顯示名稱" />
                    <el-table-column prop="recordCount" label="記錄數" />
                    <el-table-column prop="lastSync" label="最後同步時間" />
                </el-table>
            </el-card>
        </div>
    </div>

    <script>
        const { createApp } = Vue;
        const { ElMessage } = ElementPlus;

        const app = createApp({
            data() {
                return {
                    lastUpdate: new Date().toLocaleString('zh-TW'),
                    stats: [],
                    tableData: []
                }
            },
            mounted() {
                console.log('App mounted!');
                this.loadData();
            },
            methods: {
                async loadData() {
                    console.log('Loading data...');
                    try {
                        const response = await axios.get('/api/sync/database-stats');
                        console.log('Response:', response.data);
                        
                        if (response.data.success) {
                            const tables = response.data.data.tables;
                            
                            // 統計卡片
                            this.stats = [
                                { name: '商機', count: tables.find(t => t.apiName === 'NewOpportunityObj')?.recordCount || 0, color: 'primary' },
                                { name: '案場', count: tables.find(t => t.apiName === 'object_8W9cb__c')?.recordCount || 0, color: 'success' },
                                { name: '維修單', count: tables.find(t => t.apiName === 'object_k1XqG__c')?.recordCount || 0, color: 'warning' },
                                { name: '總記錄', count: tables.reduce((sum, t) => sum + t.recordCount, 0), color: 'danger' }
                            ];
                            
                            // 表格數據
                            this.tableData = tables;
                            
                            this.lastUpdate = new Date().toLocaleString('zh-TW');
                            ElMessage.success('數據載入成功');
                        }
                    } catch (error) {
                        console.error('載入失敗:', error);
                        ElMessage.error('載入數據失敗: ' + error.message);
                    }
                }
            }
        });
        
        app.use(ElementPlus);
        app.mount('#app');
        
        // 保存到全局以便調試
        window.app = app;
    </script>
</body>
</html>`;