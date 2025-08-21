/**
 * 智能分批同步配置
 * 根據Cloudflare Workers限制和數據特性優化批次處理
 */

// Cloudflare Workers 2025 限制
export const WORKER_LIMITS = {
  CPU_TIME_MS: 5 * 60 * 1000,        // 5分鐘CPU時間
  MAX_SUBREQUESTS: 1000,             // 1000個子請求
  D1_OPERATIONS_PER_REQUEST: 1000,   // 每請求1000個D1操作
  MEMORY_MB: 128,                    // 128MB內存
  SAFE_EXECUTION_TIME_MS: 2 * 60 * 1000  // 2分鐘安全執行時間
};

// 各對象的批次配置（基於數據複雜度和大小）
export const ENTITY_BATCH_CONFIG = {
  // 案場 - 大對象，約4000條，47個欄位
  'object_8W9cb__c': {
    batchSize: 100,           // 每批100條
    maxBatches: 8,            // 最多8批 = 800條/次
    fieldCount: 47,           // 欄位數量多
    estimatedSize: 'large',   // 數據大小
    priority: 'high'          // 高優先級（工班使用）
  },
  
  // 商機 - 中等對象
  'NewOpportunityObj': {
    batchSize: 100,
    maxBatches: 5,            // 最多5批 = 500條/次
    fieldCount: 61,           // 欄位很多
    estimatedSize: 'medium',
    priority: 'medium'
  },
  
  // SPC維修單 - 小對象
  'object_k1XqG__c': {
    batchSize: 200,           // 每批200條
    maxBatches: 4,            // 最多4批 = 800條/次
    fieldCount: 20,           // 欄位較少
    estimatedSize: 'small',
    priority: 'medium'
  },
  
  // 工地師父 - 小對象（已清空）
  'object_50HJ8__c': {
    batchSize: 300,
    maxBatches: 3,            // 最多3批 = 900條/次
    fieldCount: 15,
    estimatedSize: 'small',
    priority: 'low'
  },
  
  // 供應商 - 小對象
  'SupplierObj': {
    batchSize: 200,
    maxBatches: 4,
    fieldCount: 25,
    estimatedSize: 'small',
    priority: 'medium'
  },
  
  // 案場(浴櫃) - 小對象
  'site_cabinet__c': {
    batchSize: 250,
    maxBatches: 3,
    fieldCount: 18,
    estimatedSize: 'small',
    priority: 'low'
  },
  
  // 進度管理公告 - 小對象
  'progress_management_announ__c': {
    batchSize: 250,
    maxBatches: 3,
    fieldCount: 12,
    estimatedSize: 'small',
    priority: 'low'
  }
};

// 默認配置
export const DEFAULT_BATCH_CONFIG = {
  batchSize: 100,
  maxBatches: 5,
  fieldCount: 30,
  estimatedSize: 'medium',
  priority: 'medium'
};

/**
 * 獲取實體的批次配置
 */
export function getBatchConfig(entityType) {
  return ENTITY_BATCH_CONFIG[entityType] || DEFAULT_BATCH_CONFIG;
}

/**
 * 動態調整批次大小（基於運行時性能）
 */
export function adjustBatchSize(entityType, currentPerformance) {
  const config = getBatchConfig(entityType);
  let adjustedBatchSize = config.batchSize;
  
  // 基於執行時間調整
  if (currentPerformance.avgTimePerRecord > 100) {
    // 如果單記錄處理時間超過100ms，減少批次大小
    adjustedBatchSize = Math.max(20, Math.floor(config.batchSize * 0.7));
  } else if (currentPerformance.avgTimePerRecord < 20) {
    // 如果處理很快，可以增加批次大小
    adjustedBatchSize = Math.min(500, Math.floor(config.batchSize * 1.3));
  }
  
  // 基於錯誤率調整
  if (currentPerformance.errorRate > 0.1) {
    // 錯誤率超過10%，減少批次大小
    adjustedBatchSize = Math.max(10, Math.floor(adjustedBatchSize * 0.5));
  }
  
  console.log(`[BatchConfig] ${entityType} 動態調整: ${config.batchSize} -> ${adjustedBatchSize}`);
  return adjustedBatchSize;
}

/**
 * 計算安全的最大操作數
 */
export function calculateSafeOperations(entityType) {
  const config = getBatchConfig(entityType);
  const totalRecords = config.batchSize * config.maxBatches;
  
  // 每條記錄估計需要的D1操作數（讀取+寫入+更新時間戳等）
  const operationsPerRecord = Math.max(2, Math.ceil(config.fieldCount / 10));
  const totalOperations = totalRecords * operationsPerRecord;
  
  // 確保不超過D1限制
  const safeOperations = Math.min(totalOperations, WORKER_LIMITS.D1_OPERATIONS_PER_REQUEST * 0.8);
  const safeRecords = Math.floor(safeOperations / operationsPerRecord);
  
  return {
    maxRecords: safeRecords,
    maxBatches: Math.ceil(safeRecords / config.batchSize),
    estimatedOperations: safeOperations
  };
}

/**
 * 時間限制檢查
 */
export function shouldStopDueToTime(startTime, safetyBuffer = 30000) {
  const elapsed = Date.now() - startTime;
  return elapsed > (WORKER_LIMITS.SAFE_EXECUTION_TIME_MS - safetyBuffer);
}