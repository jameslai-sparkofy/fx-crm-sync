# 使用指南 - 查找並同步案場(SPC)對象

## 1. 查找案場對象

### 方法一：列出所有對象
```bash
# 執行發現腳本
node scripts/discover-all-objects.js
```

這會列出所有CRM對象，您可以查找：
- 名稱包含"案場"、"SPC"、"工地"、"項目"的對象
- 通常自定義對象的API名稱格式為: `object_xxxxx__c`

### 方法二：使用API搜索
```bash
# 搜索包含"案場"的對象
curl "http://localhost:8787/api/objects?search=案場"

# 搜索包含"SPC"的對象  
curl "http://localhost:8787/api/objects?search=SPC"
```

### 方法三：在Web界面搜索
1. 打開 Web 管理界面
2. 切換到"自定義對象"標籤
3. 瀏覽列表找到案場相關對象

## 2. 讀取案場對象欄位

找到正確的API名稱後（例如：`SPCObject`），執行：

```bash
# 獲取欄位定義
curl "http://localhost:8787/api/objects/SPCObject/fields"
```

或使用測試腳本：
```bash
node scripts/test-spc.js
```

## 3. 創建案場資料表

### 使用API：
```bash
curl -X POST "http://localhost:8787/api/schema/SPCObject/create"
```

### 使用Web界面：
1. 在對象列表中找到案場對象
2. 點擊"創建表"按鈕

## 4. 預期的案場對象特徵

基於經驗，案場對象可能包含以下欄位：
- 案場名稱
- 地址
- 城市/區域
- 負責人
- 聯絡電話
- 建案狀態
- 開工日期
- 完工日期
- 總戶數
- 建築面積

## 5. 常見對象API名稱模式

紛享銷客的自定義對象通常遵循這些命名模式：
- `object_xxxxx__c` - 最常見的格式
- `CustomObjectXXX` - 自定義對象
- `XXXObject` - 對象後綴
- 直接使用中文拼音或英文縮寫

## 6. 故障排除

### 找不到案場對象？
1. 確認您有權限訪問該對象
2. 檢查對象是否在CRM後台啟用
3. 嘗試不同的搜索關鍵字

### API返回空列表？
1. 檢查紛享銷客API憑證是否正確
2. 確認corpId和permanentCode有效
3. 查看Worker日誌是否有錯誤

## 7. 完整測試流程

```bash
# 1. 發現所有對象
node scripts/discover-all-objects.js

# 2. 找到案場對象後，修改test-spc.js中的對象名稱
# 編輯第20行，替換為實際的API名稱

# 3. 執行案場測試
node scripts/test-spc.js

# 4. 檢查結果
# - 應該看到所有欄位列表
# - 成功創建資料表
# - 表名通常為API名稱的小寫版本
```

## 8. 示例輸出

成功找到案場對象時，您會看到類似：
```
✅ 成功找到案場對象: 案場管理 (object_2jFGH__c)
   - 是否自定義: 是
   - 同步狀態: 未同步
   
📊 成功獲取 45 個欄位
   - 系統欄位: 15 個
   - 自定義欄位: 30 個
```