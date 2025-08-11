export const adminHTMLDebug = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vue Debug Test</title>
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
    <link rel="stylesheet" href="https://unpkg.com/element-plus/dist/index.css">
    <script src="https://unpkg.com/element-plus"></script>
    <script src="https://unpkg.com/@element-plus/icons-vue"></script>
    <style>
        body { font-family: monospace; padding: 20px; background: #f5f5f5; }
        .debug-info { background: white; padding: 20px; margin: 10px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .success { color: green; }
        .error { color: red; }
        .warning { color: orange; }
        h2 { color: #333; }
        pre { background: #f0f0f0; padding: 10px; border-radius: 4px; overflow-x: auto; }
    </style>
</head>
<body>
    <div id="debug-info" class="debug-info">
        <h2>環境診斷</h2>
        <div id="env-check"></div>
    </div>
    
    <div id="app" class="debug-info">
        <h2>Vue 應用測試</h2>
        <div v-if="!mounted">❌ Vue 未掛載</div>
        <div v-else>
            <div class="success">✅ Vue 已掛載</div>
            <div>{{ message }}</div>
            <div>計數器: {{ counter }}</div>
            <el-button @click="counter++">增加</el-button>
        </div>
    </div>

    <div id="console-log" class="debug-info">
        <h2>控制台日誌</h2>
        <pre id="log-output"></pre>
    </div>

    <script>
        // 捕獲所有控制台輸出
        const logs = [];
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;
        
        function addLog(type, ...args) {
            const msg = args.map(a => {
                if (typeof a === 'object') {
                    // 避免循環引用
                    try {
                        return JSON.stringify(a);
                    } catch (e) {
                        return '[Object - 無法序列化]';
                    }
                }
                return String(a);
            }).join(' ');
            logs.push(\`[\${type}] \${msg}\`);
            document.getElementById('log-output').textContent = logs.join('\\n');
        }
        
        console.log = function(...args) {
            addLog('LOG', ...args);
            originalLog.apply(console, args);
        };
        console.error = function(...args) {
            addLog('ERROR', ...args);
            originalError.apply(console, args);
        };
        console.warn = function(...args) {
            addLog('WARN', ...args);
            originalWarn.apply(console, args);
        };

        // 環境檢查
        const envCheck = document.getElementById('env-check');
        const checks = [];
        
        // 檢查全局對象
        checks.push(\`Vue 載入: \${typeof Vue !== 'undefined' ? '✅' : '❌'}\`);
        checks.push(\`ElementPlus 載入: \${typeof ElementPlus !== 'undefined' ? '✅' : '❌'}\`);
        checks.push(\`Icons 載入: \${typeof ElementPlusIconsVue !== 'undefined' ? '✅' : '❌'}\`);
        
        // 檢查 window 對象
        checks.push(\`Window 對象: \${typeof window !== 'undefined' ? '✅' : '❌'}\`);
        checks.push(\`Document 對象: \${typeof document !== 'undefined' ? '✅' : '❌'}\`);
        
        envCheck.innerHTML = checks.map(c => \`<div>\${c}</div>\`).join('');
        
        console.log('開始 Vue 初始化測試...');
        
        // 測試1: 原始方法（會失敗的）
        try {
            console.log('測試1: 使用鏈式調用');
            const { createApp } = Vue;
            
            // 這是失敗的方法
            // createApp({
            //     data() {
            //         return {
            //             mounted: true,
            //             message: '使用鏈式調用',
            //             counter: 0
            //         };
            //     }
            // }).use(ElementPlus).mount('#app');
            
            console.log('測試2: 分步驟創建');
            
            // 這是成功的方法
            const appConfig = {
                data() {
                    return {
                        mounted: true,
                        message: 'Vue 應用成功初始化！',
                        counter: 0
                    };
                },
                mounted() {
                    console.log('Vue mounted 鉤子被調用');
                    console.log('this.$data:', this.$data);
                },
                created() {
                    console.log('Vue created 鉤子被調用');
                }
            };
            
            const app = createApp(appConfig);
            console.log('App 實例創建:', app);
            
            app.use(ElementPlus);
            console.log('ElementPlus 已註冊');
            
            // 註冊圖標
            if (typeof ElementPlusIconsVue !== 'undefined') {
                const iconCount = Object.keys(ElementPlusIconsVue).length;
                console.log(\`準備註冊 \${iconCount} 個圖標\`);
                // 只註冊前10個作為測試
                let registered = 0;
                for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
                    if (registered < 10) {
                        app.component(key, component);
                        registered++;
                    }
                }
                console.log(\`已註冊 \${registered} 個圖標\`);
            }
            
            const vm = app.mount('#app');
            console.log('App 已掛載，實例:', vm);
            
            // 保存到 window
            window.app = app;
            window.vm = vm;
            
            console.log('✅ Vue 初始化成功！');
            
        } catch (error) {
            console.error('Vue 初始化失敗:', error.message);
            console.error('錯誤堆疊:', error.stack);
        }
        
        // 延遲檢查
        setTimeout(() => {
            console.log('=== 延遲檢查 (1秒後) ===');
            console.log('window.app 存在:', !!window.app);
            console.log('window.vm 存在:', !!window.vm);
            if (window.vm) {
                console.log('Vue 數據:', window.vm.$data);
            }
        }, 1000);
    </script>
</body>
</html>`;