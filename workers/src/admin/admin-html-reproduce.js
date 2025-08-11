export const adminHTMLReproduce = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>問題重現測試</title>
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
    <link rel="stylesheet" href="https://unpkg.com/element-plus/dist/index.css">
    <script src="https://unpkg.com/element-plus"></script>
    <script src="https://unpkg.com/@element-plus/icons-vue"></script>
    <style>
        body { font-family: monospace; padding: 20px; background: #f5f5f5; }
        .test-case { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .error { color: red; font-weight: bold; }
        .success { color: green; font-weight: bold; }
    </style>
</head>
<body>
    <h1>問題重現測試</h1>
    
    <!-- 測試1: 原始代碼結構 (失敗版本) -->
    <div id="test1" class="test-case">
        <h2>測試1: 原始代碼結構</h2>
        <div>狀態: {{ status1 }}</div>
        <div>{{ message1 }}</div>
    </div>
    
    <!-- 測試2: 修正版本 -->
    <div id="test2" class="test-case">
        <h2>測試2: 修正版本</h2>
        <div>狀態: {{ status2 }}</div>
        <div>{{ message2 }}</div>
    </div>
    
    <!-- 測試3: 使用原始的錯誤模式 -->
    <div id="test3" class="test-case">
        <h2>測試3: 測試可能的錯誤原因</h2>
        <div>{{ testMessage }}</div>
        <el-button @click="handleClick">{{ buttonText }}</el-button>
    </div>
    
    <div id="results" class="test-case">
        <h2>診斷結果</h2>
        <pre id="diagnosis"></pre>
    </div>

    <script>
        const { createApp } = Vue;
        const { ElMessage } = ElementPlus;
        const diagnosis = [];
        
        // 測試1: 模擬原始失敗的代碼結構
        try {
            diagnosis.push('=== 測試1: 原始代碼結構 ===');
            
            // 這是原始代碼的模式
            createApp({
                data() {
                    return {
                        status1: 'loading',
                        message1: '初始化中...'
                    };
                },
                mounted() {
                    this.status1 = 'mounted';
                    this.message1 = '已掛載';
                }
            }).use(ElementPlus).mount('#test1');
            
            diagnosis.push('✅ 測試1: 成功掛載');
        } catch (e) {
            diagnosis.push('❌ 測試1 錯誤: ' + e.message);
        }
        
        // 測試2: 修正版本
        try {
            diagnosis.push('\\n=== 測試2: 修正版本 ===');
            
            const appConfig = {
                data() {
                    return {
                        status2: 'loading',
                        message2: '初始化中...'
                    };
                },
                mounted() {
                    this.status2 = 'mounted';
                    this.message2 = '已掛載';
                }
            };
            
            const app2 = createApp(appConfig);
            app2.use(ElementPlus);
            app2.mount('#test2');
            
            diagnosis.push('✅ 測試2: 成功掛載');
        } catch (e) {
            diagnosis.push('❌ 測試2 錯誤: ' + e.message);
        }
        
        // 測試3: 找出問題
        try {
            diagnosis.push('\\n=== 測試3: 可能的問題測試 ===');
            
            // 測試在 data() 中使用未定義的變量
            const Icons = ElementPlusIconsVue; // 這應該在 createApp 之前定義
            
            const testApp = createApp({
                data() {
                    // 問題可能在這裡 - 在 data() 中引用外部變量
                    return {
                        testMessage: '測試消息',
                        buttonText: '點擊我',
                        // 如果這裡引用 Icons.Something 可能會有問題
                        iconComponent: Icons ? Icons.Refresh : null
                    };
                },
                methods: {
                    handleClick() {
                        console.log('clicked');
                    }
                }
            });
            
            // 在這裡 use ElementPlus
            testApp.use(ElementPlus);
            
            // 註冊圖標組件
            if (Icons) {
                Object.keys(Icons).forEach(key => {
                    testApp.component(key, Icons[key]);
                });
                diagnosis.push('已註冊 ' + Object.keys(Icons).length + ' 個圖標組件');
            }
            
            testApp.mount('#test3');
            diagnosis.push('✅ 測試3: 成功掛載');
            
        } catch (e) {
            diagnosis.push('❌ 測試3 錯誤: ' + e.message);
            diagnosis.push('錯誤堆疊: ' + e.stack);
        }
        
        // 額外檢查
        setTimeout(() => {
            diagnosis.push('\\n=== 1秒後檢查 ===');
            
            const test1El = document.querySelector('#test1');
            const test2El = document.querySelector('#test2');
            const test3El = document.querySelector('#test3');
            
            // 檢查是否有未渲染的模板
            diagnosis.push('測試1 未渲染模板: ' + (test1El.innerHTML.includes('{{') ? '❌ 有' : '✅ 無'));
            diagnosis.push('測試2 未渲染模板: ' + (test2El.innerHTML.includes('{{') ? '❌ 有' : '✅ 無'));
            diagnosis.push('測試3 未渲染模板: ' + (test3El.innerHTML.includes('{{') ? '❌ 有' : '✅ 無'));
            
            // 檢查 Vue 實例
            diagnosis.push('測試1 Vue實例: ' + (test1El.__vue_app__ ? '✅ 存在' : '❌ 不存在'));
            diagnosis.push('測試2 Vue實例: ' + (test2El.__vue_app__ ? '✅ 存在' : '❌ 不存在'));
            diagnosis.push('測試3 Vue實例: ' + (test3El.__vue_app__ ? '✅ 存在' : '❌ 不存在'));
            
            // 顯示診斷結果
            document.getElementById('diagnosis').textContent = diagnosis.join('\\n');
        }, 1000);
        
        // 立即顯示初始診斷
        document.getElementById('diagnosis').textContent = diagnosis.join('\\n');
    </script>
</body>
</html>`;