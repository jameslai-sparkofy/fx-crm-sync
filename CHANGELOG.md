# 變更日誌 (Changelog)

所有重要的變更都會記錄在此文件中。

本專案遵循 [Semantic Versioning](https://semver.org/spec/v2.0.0.html) 語義化版本規範。

## [2.0.0] - 2025-08-14

### 🎉 重大更新 (Breaking Changes)
- 從定時同步改為即時 Webhook 同步為主要機制
- 定時同步從每小時改為每天凌晨執行（僅作為備份）

### ✨ 新功能 (Features)
- **雙向同步機制**
  - CRM → D1：透過 Webhook 即時同步
  - D1 → CRM：透過觸發器和定期處理同步
  - 智能防止循環同步

- **Webhook 即時同步**
  - 支援所有 7 個對象的即時同步
  - 支援 create/update/delete 事件
  - 自動寫入 D1 資料庫

- **詳細同步日誌系統**
  - 新增 `sync_logs` 表記錄詳細資訊
  - 記錄觸發來源、變更欄位、新舊值
  - 提供 API 查看日誌和統計

- **D1 變更追蹤**
  - 新增 `d1_change_log` 表
  - D1 觸發器自動記錄變更
  - 支援批次處理和重試機制

### 🔧 改進 (Improvements)
- 優化同步效能和錯誤處理
- 增加同步衝突解決機制
- 改進日誌記錄的詳細程度

### 📚 文檔 (Documentation)
- 新增雙向同步配置文檔
- 新增測試腳本和部署腳本
- 更新 API 文檔

### 🛠️ 技術細節 (Technical)
- 新增服務：
  - `CrmWriteService` - 處理寫回 CRM
  - `SyncLogger` - 統一日誌管理
  - `D1ChangeProcessor` - 處理 D1 變更
- 新增 API 端點：
  - `/api/d1-sync/*` - D1 同步管理
  - `/api/sync-logs/*` - 同步日誌查詢

## [1.1.0] - 2025-08-13

### ✨ 新功能
- 增加 SPC 欄位標籤同步功能
- 支援欄位中文名稱映射
- 新增欄位比較工具

### 🔧 改進
- 優化批次同步邏輯
- 改進錯誤處理機制
- 增強資料驗證

## [1.0.0] - 2025-08-02

### 🎉 初始版本
- 基本的 CRM 到 D1 單向同步
- 支援 7 個對象的同步：
  - 商機 (NewOpportunityObj)
  - 案場 SPC (object_8W9cb__c)
  - SPC 維修單 (object_k1XqG__c)
  - 工地師父 (object_50HJ8__c)
  - 供應商 (SupplierObj)
  - 案場浴櫃 (site_cabinet__c)
  - 進度管理公告 (progress_management_announ__c)
- 定時同步機制（每小時執行）
- 基本的管理界面
- 增量同步支援

---

## 版本說明

- **主版本號 (Major)**：不相容的 API 變更
- **次版本號 (Minor)**：向下相容的功能新增
- **修訂號 (Patch)**：向下相容的錯誤修正

## 維護者

- James Lai (jameslai-sparkofy)

## 相關連結

- [GitHub Repository](https://github.com/jameslai-sparkofy/fx-crm-sync)
- [API 文檔](./API-DOCUMENTATION.md)
- [部署指南](./DEPLOYMENT.md)