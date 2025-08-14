export const employeeManagementHTML = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>員工管理 - 紛享銷客 CRM 同步系統</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: #f5f5f5;
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
        }

        /* 頂部導航 */
        .header {
            background: white;
            border-radius: 12px;
            padding: 20px 30px;
            margin-bottom: 24px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .header h1 {
            font-size: 24px;
            color: #333;
            font-weight: 600;
        }

        .nav-tabs {
            display: flex;
            gap: 10px;
        }

        .nav-tab {
            padding: 8px 20px;
            background: transparent;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            color: #495057;
            cursor: pointer;
            transition: all 0.3s;
            text-decoration: none;
            font-weight: 500;
        }

        .nav-tab:hover {
            background: #0066cc;
            color: white;
            border-color: #0066cc;
        }

        .nav-tab.active {
            background: #0066cc;
            color: white;
            border-color: #0066cc;
        }

        /* 統計卡片 */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 24px;
        }

        .stat-card {
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
            position: relative;
            overflow: hidden;
        }

        .stat-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: #0066cc;
        }

        .stat-label {
            color: #6c757d;
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 8px;
        }

        .stat-value {
            font-size: 28px;
            font-weight: 700;
            color: #212529;
            margin-bottom: 8px;
        }

        .stat-change {
            font-size: 12px;
            color: #28a745;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .stat-change.neutral {
            color: #6c757d;
        }

        /* 主要內容區 */
        .main-content {
            display: grid;
            grid-template-columns: 1fr 350px;
            gap: 20px;
        }

        /* 組織圖卡片 */
        .org-chart-card {
            background: white;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }

        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 16px;
            border-bottom: 1px solid #e9ecef;
        }

        .card-title {
            font-size: 18px;
            font-weight: 600;
            color: #212529;
        }

        .sync-button {
            background: #0066cc;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .sync-button:hover {
            background: #0052a3;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 102, 204, 0.25);
        }

        .sync-button:active {
            transform: translateY(0);
        }

        .sync-button.syncing {
            background: #6c757d;
            cursor: not-allowed;
        }

        /* 組織樹 */
        .org-tree {
            padding: 20px 0;
            overflow-x: auto;
            min-height: 500px;
        }

        .tree-node {
            margin-left: 0;
        }

        .tree-node.child {
            margin-left: 30px;
            position: relative;
        }

        .tree-node.child::before {
            content: '';
            position: absolute;
            left: -20px;
            top: -10px;
            width: 20px;
            height: 35px;
            border-left: 2px solid #dee2e6;
            border-bottom: 2px solid #dee2e6;
        }

        .node-content {
            display: flex;
            align-items: center;
            padding: 12px 16px;
            background: #f8f9fa;
            border-radius: 8px;
            margin-bottom: 10px;
            cursor: pointer;
            transition: all 0.3s;
            border: 1px solid transparent;
        }

        .node-content:hover {
            background: white;
            border-color: #0066cc;
            box-shadow: 0 2px 8px rgba(0, 102, 204, 0.15);
        }

        .node-content.department {
            background: #f0f8ff;
            font-weight: 600;
            border: 1px solid #cce5ff;
        }

        .node-icon {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 12px;
            font-size: 18px;
        }

        .node-icon.dept {
            background: #0066cc;
            color: white;
        }

        .node-icon.employee {
            background: #e8f4fd;
            color: #0066cc;
        }

        .node-info {
            flex: 1;
        }

        .node-name {
            font-size: 14px;
            color: #212529;
            margin-bottom: 2px;
        }

        .node-desc {
            font-size: 12px;
            color: #6c757d;
        }

        .node-badge {
            background: #e9ecef;
            color: #495057;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
        }

        .expand-icon {
            margin-left: 8px;
            transition: transform 0.3s;
            color: #6c757d;
        }

        .collapsed .expand-icon {
            transform: rotate(-90deg);
        }

        /* 側邊欄 */
        .sidebar {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        .sidebar-card {
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }

        .search-box {
            display: flex;
            gap: 8px;
            margin-bottom: 15px;
        }

        .search-input {
            flex: 1;
            padding: 10px 12px;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            font-size: 14px;
            transition: border-color 0.3s;
        }

        .search-input:focus {
            outline: none;
            border-color: #0066cc;
            box-shadow: 0 0 0 0.2rem rgba(0, 102, 204, 0.25);
        }

        .search-button {
            padding: 10px 16px;
            background: #0066cc;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: background 0.3s;
            font-weight: 500;
        }

        .search-button:hover {
            background: #0052a3;
        }

        /* 員工列表 */
        .employee-list {
            max-height: 400px;
            overflow-y: auto;
        }

        .employee-item {
            display: flex;
            align-items: center;
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 8px;
            cursor: pointer;
            transition: background 0.3s;
        }

        .employee-item:hover {
            background: #f8f9fa;
        }

        .employee-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #0066cc;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 12px;
            font-weight: 600;
        }

        .employee-info {
            flex: 1;
        }

        .employee-name {
            font-size: 14px;
            font-weight: 500;
            color: #212529;
            margin-bottom: 2px;
        }

        .employee-dept {
            font-size: 12px;
            color: #6c757d;
        }

        /* 載入動畫 */
        .spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid white;
            border-radius: 50%;
            border-top-color: transparent;
            animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        /* 提示訊息 */
        .toast {
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            padding: 16px 24px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 12px;
            transform: translateX(400px);
            transition: transform 0.3s;
            z-index: 1000;
        }

        .toast.show {
            transform: translateX(0);
        }

        .toast.success {
            border-left: 4px solid #28a745;
        }

        .toast.error {
            border-left: 4px solid #dc3545;
        }

        .toast-icon {
            font-size: 20px;
        }

        .toast.success .toast-icon {
            color: #28a745;
        }

        .toast.error .toast-icon {
            color: #dc3545;
        }

        /* 響應式設計 */
        @media (max-width: 1024px) {
            .main-content {
                grid-template-columns: 1fr;
            }
            
            .sidebar {
                grid-row: 1;
            }
        }

        @media (max-width: 640px) {
            .stats-grid {
                grid-template-columns: 1fr;
            }
            
            .header {
                flex-direction: column;
                gap: 15px;
            }
            
            .nav-tabs {
                width: 100%;
                justify-content: center;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- 頂部導航 -->
        <div class="header">
            <h1>🏢 員工組織管理</h1>
            <div class="nav-tabs">
                <a href="/admin" class="nav-tab">對象管理</a>
                <a href="/admin/employees" class="nav-tab active">員工管理</a>
                <a href="/admin/sync" class="nav-tab">同步記錄</a>
            </div>
        </div>

        <!-- 統計卡片 -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">總員工數</div>
                <div class="stat-value" id="totalEmployees">-</div>
                <div class="stat-change">
                    <span>↑</span>
                    <span>本月新增 3 人</span>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-label">部門數量</div>
                <div class="stat-value" id="totalDepartments">-</div>
                <div class="stat-change neutral">
                    <span>→</span>
                    <span>結構穩定</span>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-label">在職員工</div>
                <div class="stat-value" id="activeEmployees">-</div>
                <div class="stat-change">
                    <span>↑</span>
                    <span>在職率 98%</span>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-label">最後同步</div>
                <div class="stat-value" id="lastSyncTime" style="font-size: 16px;">從未同步</div>
                <div class="stat-change neutral">
                    <span>⏱</span>
                    <span id="syncStatus">等待同步</span>
                </div>
            </div>
        </div>

        <!-- 主要內容 -->
        <div class="main-content">
            <!-- 組織圖 -->
            <div class="org-chart-card">
                <div class="card-header">
                    <h2 class="card-title">組織架構圖</h2>
                    <button class="sync-button" id="syncButton" onclick="syncEmployees()">
                        <span>🔄</span>
                        <span>同步員工資料</span>
                    </button>
                </div>
                <div class="org-tree" id="orgTree">
                    <div style="text-align: center; padding: 100px 20px; color: #6c757d;">
                        <div style="font-size: 48px; margin-bottom: 16px;">📊</div>
                        <div style="font-size: 18px; margin-bottom: 8px;">暫無組織資料</div>
                        <div style="font-size: 14px;">請點擊上方按鈕同步員工資料</div>
                    </div>
                </div>
            </div>

            <!-- 側邊欄 -->
            <div class="sidebar">
                <!-- 搜尋 -->
                <div class="sidebar-card">
                    <h3 class="card-title" style="font-size: 16px; margin-bottom: 15px;">快速搜尋</h3>
                    <div class="search-box">
                        <input type="text" class="search-input" placeholder="搜尋員工姓名、手機..." id="searchInput">
                        <button class="search-button" onclick="searchEmployees()">搜尋</button>
                    </div>
                </div>

                <!-- 最近員工 -->
                <div class="sidebar-card">
                    <h3 class="card-title" style="font-size: 16px; margin-bottom: 15px;">最近更新</h3>
                    <div class="employee-list" id="recentEmployees">
                        <div style="text-align: center; padding: 40px 20px; color: #6c757d;">
                            <div style="font-size: 14px;">暫無資料</div>
                        </div>
                    </div>
                </div>

                <!-- 操作記錄 -->
                <div class="sidebar-card">
                    <h3 class="card-title" style="font-size: 16px; margin-bottom: 15px;">同步記錄</h3>
                    <div id="syncLogs" style="font-size: 14px; color: #6c757d;">
                        <div style="padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                            暫無同步記錄
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- 提示訊息 -->
    <div class="toast" id="toast">
        <span class="toast-icon" id="toastIcon"></span>
        <span id="toastMessage"></span>
    </div>

    <script>
        // API 基礎路徑
        const API_BASE = '/api';
        
        // 全域變數
        let employeeData = [];
        let departmentData = [];
        let treeData = {};

        // 初始化
        document.addEventListener('DOMContentLoaded', () => {
            loadStats();
            loadOrganization();
        });

        // 載入統計資料
        async function loadStats() {
            try {
                const response = await fetch(\`\${API_BASE}/simple-employees/stats\`);
                const result = await response.json();
                
                if (result.success) {
                    const stats = result.data;
                    document.getElementById('totalEmployees').textContent = stats.total_employees || 0;
                    document.getElementById('activeEmployees').textContent = stats.total_employees || 0;
                    document.getElementById('totalDepartments').textContent = 9; // 固定部門數量
                    
                    if (stats.lastSyncLog) {
                        const lastSync = new Date(stats.lastSyncLog.completed_at);
                        document.getElementById('lastSyncTime').textContent = formatDateTime(lastSync);
                        document.getElementById('syncStatus').textContent = \`成功同步 \${stats.lastSyncLog.synced_count || 0} 筆\`;
                    }
                }
            } catch (error) {
                console.error('載入統計失敗:', error);
            }
        }

        // 載入組織架構
        async function loadOrganization() {
            try {
                // 載入部門
                const deptResponse = await fetch(\`\${API_BASE}/departments\`);
                const deptResult = await deptResponse.json();
                
                // 載入員工
                const empResponse = await fetch(\`\${API_BASE}/simple-employees?limit=1000\`);
                const empResult = await empResponse.json();
                
                if (deptResult.success && empResult.success) {
                    departmentData = deptResult.data.departments;
                    employeeData = empResult.data.employees;
                    
                    if (departmentData.length > 0 || employeeData.length > 0) {
                        renderOrgTree();
                        renderRecentEmployees();
                    }
                }
            } catch (error) {
                console.error('載入組織架構失敗:', error);
            }
        }

        // 渲染組織樹
        function renderOrgTree() {
            const treeContainer = document.getElementById('orgTree');
            
            if (departmentData.length === 0 && employeeData.length === 0) {
                return;
            }
            
            let html = '';
            
            // 遞迴渲染部門和員工
            function renderNode(dept, level = 0) {
                const nodeClass = level > 0 ? 'tree-node child' : 'tree-node';
                const employeesInDept = employeeData.filter(emp => {
                    // 對於總公司(999999)，不顯示任何員工
                    if (dept.id == 999999) return false;
                    
                    // 檢查員工是否屬於這個部門（通過副部門）
                    if (emp.sub_department_ids) {
                        try {
                            const subDepts = JSON.parse(emp.sub_department_ids);
                            return subDepts.includes(dept.id);
                        } catch (e) {
                            return false;
                        }
                    }
                    return false;
                });
                
                html += \`
                    <div class="\${nodeClass}" data-dept-id="\${dept.id}">
                        <div class="node-content department" onclick="toggleDepartment(\${dept.id})">
                            <div class="node-icon dept">🏢</div>
                            <div class="node-info">
                                <div class="node-name">\${dept.name}</div>
                                <div class="node-desc">\${dept.id == 999999 ? \`\${employeeData.length} 位員工\` : \`\${employeesInDept.length} 位員工\`}</div>
                            </div>
                            <div class="node-badge">\${dept.id == 999999 ? employeeData.length : employeesInDept.length}</div>
                            \${dept.children && dept.children.length > 0 ? '<span class="expand-icon">▼</span>' : ''}
                        </div>
                        <div class="department-children" id="dept-\${dept.id}">
                \`;
                
                // 渲染該部門的員工
                employeesInDept.forEach(emp => {
                    html += \`
                        <div class="tree-node child">
                            <div class="node-content" onclick="showEmployeeDetail('\${emp.open_user_id}')">
                                <div class="node-icon employee">\${emp.name ? emp.name[0] : '👤'}</div>
                                <div class="node-info">
                                    <div class="node-name">\${emp.name}</div>
                                    <div class="node-desc">員工 · \${emp.mobile || ''}</div>
                                </div>
                            </div>
                        </div>
                    \`;
                });
                
                // 渲染子部門
                if (dept.children && dept.children.length > 0) {
                    dept.children.forEach(child => {
                        renderNode(child, level + 1);
                    });
                }
                
                html += \`
                        </div>
                    </div>
                \`;
            }
            
            // 從根部門開始渲染
            departmentData.forEach(dept => {
                renderNode(dept);
            });
            
            treeContainer.innerHTML = html || '<div style="text-align: center; padding: 50px;">暫無組織資料</div>';
        }

        // 渲染最近員工
        function renderRecentEmployees() {
            const container = document.getElementById('recentEmployees');
            const recentEmps = employeeData.slice(0, 5);
            
            if (recentEmps.length === 0) {
                return;
            }
            
            let html = '';
            recentEmps.forEach(emp => {
                html += \`
                    <div class="employee-item" onclick="showEmployeeDetail('\${emp.open_user_id}')">
                        <div class="employee-avatar">\${emp.name ? emp.name[0] : '👤'}</div>
                        <div class="employee-info">
                            <div class="employee-name">\${emp.name}</div>
                            <div class="employee-dept">\${emp.main_department_name || '未分配部門'}</div>
                        </div>
                    </div>
                \`;
            });
            
            container.innerHTML = html;
        }

        // 同步員工資料
        async function syncEmployees() {
            const button = document.getElementById('syncButton');
            if (button.classList.contains('syncing')) {
                return;
            }
            
            button.classList.add('syncing');
            button.innerHTML = '<span class="spinner"></span><span>同步中...</span>';
            
            try {
                const response = await fetch(\`\${API_BASE}/simple-employees/sync\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fullSync: true })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showToast('success', \`成功同步 \${result.data.successCount} 位員工\`);
                    
                    // 重新載入資料
                    await loadStats();
                    await loadOrganization();
                } else {
                    showToast('error', '同步失敗：' + result.error);
                }
            } catch (error) {
                showToast('error', '同步失敗：' + error.message);
            } finally {
                button.classList.remove('syncing');
                button.innerHTML = '<span>🔄</span><span>同步員工資料</span>';
            }
        }

        // 搜尋員工
        async function searchEmployees() {
            const searchTerm = document.getElementById('searchInput').value.trim();
            
            if (!searchTerm) {
                return;
            }
            
            try {
                const response = await fetch(\`\${API_BASE}/simple-employees?search=\${encodeURIComponent(searchTerm)}\`);
                const result = await response.json();
                
                if (result.success && result.data.employees.length > 0) {
                    // 高亮搜尋結果
                    const firstEmployee = result.data.employees[0];
                    showEmployeeDetail(firstEmployee.open_user_id);
                    showToast('success', \`找到 \${result.data.employees.length} 筆結果\`);
                } else {
                    showToast('error', '未找到符合的員工');
                }
            } catch (error) {
                showToast('error', '搜尋失敗：' + error.message);
            }
        }

        // 顯示員工詳情
        function showEmployeeDetail(openUserId) {
            const employee = employeeData.find(emp => emp.open_user_id === openUserId);
            if (employee) {
                showToast('success', \`查看員工：\${employee.name}\`);
                // 這裡可以開啟詳情彈窗或跳轉到詳情頁
            }
        }

        // 切換部門展開/收起
        function toggleDepartment(deptId) {
            const deptChildren = document.getElementById(\`dept-\${deptId}\`);
            if (deptChildren) {
                deptChildren.style.display = deptChildren.style.display === 'none' ? 'block' : 'none';
            }
        }

        // 顯示提示訊息
        function showToast(type, message) {
            const toast = document.getElementById('toast');
            const icon = document.getElementById('toastIcon');
            const msg = document.getElementById('toastMessage');
            
            toast.className = \`toast \${type}\`;
            icon.textContent = type === 'success' ? '✓' : '✕';
            msg.textContent = message;
            
            toast.classList.add('show');
            
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }

        // 格式化日期時間
        function formatDateTime(date) {
            const now = new Date();
            const diff = now - date;
            
            if (diff < 60000) {
                return '剛剛';
            } else if (diff < 3600000) {
                return Math.floor(diff / 60000) + ' 分鐘前';
            } else if (diff < 86400000) {
                return Math.floor(diff / 3600000) + ' 小時前';
            } else {
                return date.toLocaleDateString('zh-TW', {
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
        }

        // Enter 鍵搜尋
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchEmployees();
            }
        });
    </script>
</body>
</html>`;