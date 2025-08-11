export const adminHTMLTest = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vue 初始化測試</title>
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
    <link rel="stylesheet" href="https://unpkg.com/element-plus/dist/index.css">
    <script src="https://unpkg.com/element-plus"></script>
    <script src="https://unpkg.com/@element-plus/icons-vue"></script>
    <style>
        body { font-family: monospace; padding: 20px; background: #f5f5f5; }
        .test-case { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .success { background: #d4edda; color: #155724; padding: 10px; border-radius: 4px; }
        .error { background: #f8d7da; color: #721c24; padding: 10px; border-radius: 4px; }
        h2 { color: #333; margin-top: 0; }
    </style>
</head>
<body>
    <h1>Vue 初始化測試對比</h1>
    
    <!-- 測試1: 簡單版 (成功) -->
    <div id="test1" class="test-case">
        <h2>測試1: 簡單版（預期成功）</h2>
        <div v-if="!mounted">載入中...</div>
        <div v-else>
            <div class="success">✅ Vue 已掛載</div>
            <div>消息: {{ message }}</div>
            <el-button @click="count++">點擊: {{ count }}</el-button>
        </div>
    </div>
    
    <!-- 測試2: 複雜版（可能失敗）-->
    <div id="test2" class="test-case">
        <h2>測試2: 複雜版（測試失敗原因）</h2>
        <div v-if="!mounted">載入中...</div>
        <div v-else>
            <div class="success">✅ Vue 已掛載</div>
            <div>消息: {{ message }}</div>
            <el-tabs v-model="activeTab">
                <el-tab-pane label="標籤1" name="tab1">
                    內容1: {{ content1 }}
                </el-tab-pane>
                <el-tab-pane label="標籤2" name="tab2">
                    內容2: {{ content2 }}
                </el-tab-pane>
            </el-tabs>
        </div>
    </div>
    
    <!-- 測試3: 原始失敗版本 -->
    <div id="test3" class="test-case">
        <h2>測試3: 原始失敗版本（鏈式調用）</h2>
        <div>{{ failMessage || '如果看到這個，表示 Vue 沒有掛載' }}</div>
    </div>
    
    <!-- 結果匯總 -->
    <div id="results" class="test-case">
        <h2>測試結果</h2>
        <div id="test-results"></div>
    </div>

    <script>
        const results = [];
        
        // 測試1: 簡單版
        try {
            const { createApp } = Vue;
            const app1 = createApp({
                data() {
                    return {
                        mounted: true,
                        message: '簡單版成功！',
                        count: 0
                    };
                }
            });
            app1.use(ElementPlus);
            app1.mount('#test1');
            results.push('✅ 測試1 (簡單版): 成功');
        } catch (e) {
            results.push('❌ 測試1 (簡單版): ' + e.message);
        }
        
        // 測試2: 複雜版
        try {
            const app2 = Vue.createApp({
                data() {
                    return {
                        mounted: true,
                        message: '複雜版測試',
                        activeTab: 'tab1',
                        content1: '這是標籤1的內容',
                        content2: '這是標籤2的內容'
                    };
                }
            });
            app2.use(ElementPlus);
            app2.mount('#test2');
            results.push('✅ 測試2 (複雜版): 成功');
        } catch (e) {
            results.push('❌ 測試2 (複雜版): ' + e.message);
        }
        
        // 測試3: 原始失敗版本（鏈式調用）
        try {
            Vue.createApp({
                data() {
                    return {
                        failMessage: '鏈式調用版本'
                    };
                }
            }).use(ElementPlus).mount('#test3');
            results.push('✅ 測試3 (鏈式調用): 成功');
        } catch (e) {
            results.push('❌ 測試3 (鏈式調用): ' + e.message);
        }
        
        // 測試4: 檢查 computed 和 methods
        const testApp = Vue.createApp({
            data() {
                return { value: 1 };
            },
            computed: {
                double() {
                    return this.value * 2;
                }
            },
            methods: {
                increment() {
                    this.value++;
                }
            }
        });
        
        try {
            // 測試在掛載前訪問
            const beforeMount = testApp._instance ? '實例存在' : '實例不存在';
            results.push('測試4 掛載前: ' + beforeMount);
            
            // 這裡可能是問題所在
            testApp.use(ElementPlus);
            
            // 檢查 use 之後的狀態
            const afterUse = testApp._instance ? '實例存在' : '實例不存在';
            results.push('測試4 use後: ' + afterUse);
            
        } catch (e) {
            results.push('❌ 測試4: ' + e.message);
        }
        
        // 顯示結果
        document.getElementById('test-results').innerHTML = results.map(r => '<div>' + r + '</div>').join('');
        
        // 額外診斷
        setTimeout(() => {
            const diagnostic = [];
            
            // 檢查全局狀態
            diagnostic.push('=== 延遲診斷 (1秒後) ===');
            diagnostic.push('Vue 版本: ' + Vue.version);
            diagnostic.push('ElementPlus 載入: ' + (typeof ElementPlus !== 'undefined'));
            
            // 檢查 DOM
            const test1El = document.querySelector('#test1');
            const test2El = document.querySelector('#test2');
            const test3El = document.querySelector('#test3');
            
            diagnostic.push('測試1 DOM 有 Vue 實例: ' + (test1El && test1El.__vue_app__ ? '是' : '否'));
            diagnostic.push('測試2 DOM 有 Vue 實例: ' + (test2El && test2El.__vue_app__ ? '是' : '否'));
            diagnostic.push('測試3 DOM 有 Vue 實例: ' + (test3El && test3El.__vue_app__ ? '是' : '否'));
            
            // 檢查模板是否被渲染
            diagnostic.push('測試1 有未渲染模板: ' + (test1El.innerHTML.includes('{{') ? '是' : '否'));
            diagnostic.push('測試2 有未渲染模板: ' + (test2El.innerHTML.includes('{{') ? '是' : '否'));
            diagnostic.push('測試3 有未渲染模板: ' + (test3El.innerHTML.includes('{{') ? '是' : '否'));
            
            document.getElementById('test-results').innerHTML += '<br>' + diagnostic.map(d => '<div>' + d + '</div>').join('');
        }, 1000);
    </script>
</body>
</html>`;