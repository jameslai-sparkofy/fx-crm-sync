/**
 * 資料同步服務
 * 負責同步商機、案場和維修單數據到D1
 */

const FieldValidator = require('./field-validator');
const DynamicFieldHandler = require('./dynamic-field-handler');

export class DataSyncService {
  constructor(fxClient, db) {
    this.fxClient = fxClient;
    this.db = db;
    this.fieldValidator = new FieldValidator(db, fxClient);
    this.dynamicHandler = new DynamicFieldHandler();
  }

  /**
   * 同步商機數據 - 自適應分批處理
   */
  async syncOpportunities(options = {}) {
    const syncId = `opp_sync_${Date.now()}`;
    const startTime = new Date();
    const execStartTime = Date.now();
    const MAX_EXECUTION_TIME = 25000; // 25秒安全限制
    const batchSize = 500; // 每批處理500條
    
    try {
      console.log(`[${syncId}] 開始同步商機數據...`);
      
      // 在同步前驗證欄位結構
      console.log(`[${syncId}] 驗證欄位結構...`);
      const fieldValidationResult = await this.fieldValidator.validateAndSyncFields('NewOpportunityObj');
      if (fieldValidationResult.fieldsAdded > 0) {
        console.log(`[${syncId}] 已添加 ${fieldValidationResult.fieldsAdded} 個新欄位`);
      }
      
      // 記錄同步開始
      await this.logSyncStart(syncId, 'NewOpportunityObj', startTime);
      
      // 獲取最後同步時間（如果是完整同步則忽略）
      const lastSyncTime = options.fullSync ? null : await this.getLastSyncTime('NewOpportunityObj');
      
      if (options.fullSync) {
        console.log(`[${syncId}] 執行完整同步（忽略最後同步時間）`);
      } else {
        console.log(`[${syncId}] 執行增量同步`);
      }
      
      // 構建查詢條件
      const filters = [
        {
          field_name: 'life_status',
          operator: 'NEQ',
          field_values: ['作废']
        }
      ];
      
      // 增量同步：使用正確的時間戳格式
      if (lastSyncTime) {
        const timestampValue = typeof lastSyncTime === 'number' ? lastSyncTime : new Date(lastSyncTime).getTime();
        console.log(`[${syncId}] 使用增量同步，最後同步時間戳: ${timestampValue}`);
        filters.push({
          field_name: 'last_modified_time',
          operator: 'GTE',
          field_values: [timestampValue]
        });
      }
      
      let offset = 0;
      let hasMore = true;
      let totalSuccess = 0;
      let totalErrors = 0;
      let totalRecords = 0;
      let batchNumber = 0;
      
      // 分批處理直到沒有更多數據或接近時間限制
      while (hasMore) {
        // 檢查執行時間
        if (Date.now() - execStartTime > MAX_EXECUTION_TIME) {
          console.log(`[${syncId}] 接近執行時間限制，本次同步處理了 ${totalRecords} 條記錄`);
          break;
        }
        
        batchNumber++;
        console.log(`[${syncId}] 開始處理第 ${batchNumber} 批，offset: ${offset}`);
        
        // 獲取一批數據
        const response = await this.fxClient.post('/cgi/crm/v2/data/query', {
          data: {
            dataObjectApiName: 'NewOpportunityObj',
            search_query_info: {
              offset: offset,
              limit: batchSize,
              filters: filters,
              orders: [{ fieldName: 'last_modified_time', isAsc: false }]
            }
          }
        });
        
        if (response.errorCode !== 0) {
          throw new Error(`獲取商機數據失敗: ${response.errorMessage}`);
        }
        
        const batch = response.data?.dataList || [];
        const batchCount = batch.length;
        
        // 判斷是否還有更多數據
        hasMore = batchCount === batchSize;
        
        if (batchCount > 0) {
          console.log(`[${syncId}] 第 ${batchNumber} 批獲取到 ${batchCount} 條記錄`);
          
          // 同步這批數據到D1
          const result = await this.batchSyncOpportunities(batch);
          totalSuccess += result.success;
          totalErrors += result.errors;
          totalRecords += batchCount;
          
          console.log(`[${syncId}] 第 ${batchNumber} 批同步完成: 成功 ${result.success}/${batchCount}`);
        } else {
          console.log(`[${syncId}] 第 ${batchNumber} 批無數據，同步結束`);
        }
        
        offset += batchSize;
        
        // 批次間短暫延遲
        if (hasMore && batchCount > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // 記錄同步完成
      await this.logSyncComplete(syncId, 'NewOpportunityObj', {
        records_count: totalRecords,
        success_count: totalSuccess,
        error_count: totalErrors
      });
      
      console.log(`[${syncId}] 商機同步完成: 總處理 ${totalRecords} 條，成功 ${totalSuccess}，失敗 ${totalErrors}`);
      return { success: totalSuccess, errors: totalErrors, total: totalRecords };
      
    } catch (error) {
      console.error(`[${syncId}] 商機同步失敗:`, error);
      await this.logSyncError(syncId, 'NewOpportunityObj', error);
      throw error;
    }
  }

  /**
   * 同步商機連絡人數據 - 自適應分批處理
   */
  async syncOpportunityContacts(options = {}) {
    const syncId = `opp_contacts_sync_${Date.now()}`;
    const startTime = new Date();
    const execStartTime = Date.now();
    const MAX_EXECUTION_TIME = 25000; // 25秒安全限制
    const batchSize = 500; // 每批處理500條
    
    try {
      console.log(`[${syncId}] 開始同步商機連絡人數據...`);
      
      // 記錄同步開始
      await this.logSyncStart(syncId, 'NewOpportunityContactsObj', startTime);
      
      // 獲取最後同步時間（如果是完整同步則忽略）
      const lastSyncTime = options.fullSync ? null : await this.getLastSyncTime('NewOpportunityContactsObj');
      
      if (options.fullSync) {
        console.log(`[${syncId}] 執行完整同步（忽略最後同步時間）`);
      } else {
        console.log(`[${syncId}] 執行增量同步`);
      }
      
      // 構建查詢條件
      const filters = [
        {
          field_name: 'life_status',
          operator: 'NEQ',
          field_values: ['作废']
        }
      ];
      
      // 增量同步：使用正確的時間戳格式
      if (lastSyncTime) {
        const timestampValue = typeof lastSyncTime === 'number' ? lastSyncTime : new Date(lastSyncTime).getTime();
        console.log(`[${syncId}] 使用增量同步，最後同步時間戳: ${timestampValue}`);
        filters.push({
          field_name: 'last_modified_time',
          operator: 'GTE',
          field_values: [timestampValue]
        });
      }
      
      let offset = 0;
      let hasMore = true;
      let totalSuccess = 0;
      let totalErrors = 0;
      let totalRecords = 0;
      let batchNumber = 0;
      
      // 分批處理直到沒有更多數據或接近時間限制
      while (hasMore) {
        // 檢查執行時間
        if (Date.now() - execStartTime > MAX_EXECUTION_TIME) {
          console.log(`[${syncId}] 接近執行時間限制，本次同步處理了 ${totalRecords} 條記錄`);
          break;
        }
        
        batchNumber++;
        console.log(`[${syncId}] 開始處理第 ${batchNumber} 批，offset: ${offset}`);
        
        // 獲取一批數據
        const response = await this.fxClient.post('/cgi/crm/v2/data/query', {
          data: {
            dataObjectApiName: 'NewOpportunityContactsObj',
            search_query_info: {
              offset: offset,
              limit: batchSize,
              filters: filters,
              orders: [{ fieldName: 'last_modified_time', isAsc: false }]
            }
          }
        });
        
        if (response.errorCode !== 0) {
          throw new Error(`獲取商機連絡人數據失敗: ${response.errorMessage}`);
        }
        
        const batch = response.data?.dataList || [];
        const batchCount = batch.length;
        
        // 判斷是否還有更多數據
        hasMore = batchCount === batchSize;
        
        if (batchCount > 0) {
          console.log(`[${syncId}] 第 ${batchNumber} 批獲取到 ${batchCount} 條記錄`);
          
          // 同步這批數據到D1
          for (const contact of batch) {
            try {
              await this.saveOpportunityContact(contact);
              totalSuccess++;
            } catch (error) {
              console.error(`[${syncId}] 保存商機連絡人失敗 (ID: ${contact._id}):`, error);
              totalErrors++;
            }
          }
          
          totalRecords += batchCount;
        } else {
          console.log(`[${syncId}] 第 ${batchNumber} 批沒有數據，同步完成`);
          hasMore = false;
        }
        
        offset += batchSize;
      }
      
      // 記錄同步完成
      await this.logSyncComplete(syncId, 'NewOpportunityContactsObj', {
        records_count: totalRecords,
        success_count: totalSuccess,
        error_count: totalErrors
      });
      
      console.log(`[${syncId}] 商機連絡人同步完成: 處理 ${totalRecords} 條，成功 ${totalSuccess}，失敗 ${totalErrors}`);
      
      return { success: totalSuccess, errors: totalErrors, total: totalRecords };
      
    } catch (error) {
      console.error(`[${syncId}] 商機連絡人同步失敗:`, error);
      await this.logSyncError(syncId, 'NewOpportunityContactsObj', error);
      throw error;
    }
  }

  /**
   * 分頁同步案場數據
   */
  async syncSitesByPage(offset, limit) {
    const syncId = `site_page_sync_${Date.now()}`;
    const startTime = new Date();
    
    try {
      console.log(`[${syncId}] 開始分頁同步案場數據 (offset: ${offset}, limit: ${limit})...`);
      
      // 記錄同步開始
      await this.logSyncStart(syncId, 'object_8W9cb__c', startTime);
      
      // 獲取指定範圍的案場數據
      const sites = await this.fetchSitesByPage(offset, limit);
      console.log(`[${syncId}] 獲取到 ${sites.length} 條案場記錄`);
      
      // 批量同步到D1
      const result = await this.batchSyncSites(sites);
      
      // 記錄同步完成
      await this.logSyncComplete(syncId, 'object_8W9cb__c', {
        records_count: sites.length,
        success_count: result.success,
        error_count: result.errors,
        offset: offset,
        limit: limit
      });
      
      console.log(`[${syncId}] 分頁同步完成: 成功 ${result.success}, 失敗 ${result.errors}`);
      return {
        ...result,
        totalFetched: sites.length,
        offset: offset,
        limit: limit
      };
      
    } catch (error) {
      console.error(`[${syncId}] 分頁同步失敗:`, error);
      await this.logSyncError(syncId, 'object_8W9cb__c', error);
      throw error;
    }
  }

  /**
   * 同步維修單數據 - 自適應分批處理
   */
  async syncRepairOrders(options = {}) {
    const syncId = `repair_sync_${Date.now()}`;
    const startTime = new Date();
    const execStartTime = Date.now();
    const MAX_EXECUTION_TIME = 25000;
    const batchSize = 500;
    
    try {
      console.log(`[${syncId}] 開始同步維修單數據...`);
      
      await this.logSyncStart(syncId, 'object_k1XqG__c', startTime);
      const lastSyncTime = options.fullSync ? null : await this.getLastSyncTime('object_k1XqG__c');
      
      if (options.fullSync) {
        console.log(`[${syncId}] 執行完整同步`);
      } else {
        console.log(`[${syncId}] 執行增量同步`);
      }
      
      const filters = [{
        field_name: 'life_status',
        operator: 'NEQ',
        field_values: ['作废']
      }];
      
      if (lastSyncTime) {
        const timestampValue = typeof lastSyncTime === 'number' ? lastSyncTime : new Date(lastSyncTime).getTime();
        console.log(`[${syncId}] 最後同步時間戳: ${timestampValue}`);
        filters.push({
          field_name: 'last_modified_time',
          operator: 'GTE',
          field_values: [timestampValue]
        });
      }
      
      let offset = 0, hasMore = true, totalSuccess = 0, totalErrors = 0, totalRecords = 0, batchNumber = 0;
      
      while (hasMore) {
        if (Date.now() - execStartTime > MAX_EXECUTION_TIME) {
          console.log(`[${syncId}] 接近執行時間限制，處理了 ${totalRecords} 條`);
          break;
        }
        
        batchNumber++;
        console.log(`[${syncId}] 第 ${batchNumber} 批，offset: ${offset}`);
        
        const response = await this.fxClient.post('/cgi/crm/custom/v2/data/query', {
          data: {
            dataObjectApiName: 'object_k1XqG__c',
            search_query_info: {
              offset: offset,
              limit: batchSize,
              filters: filters,
              orders: [{ fieldName: 'last_modified_time', isAsc: false }]
            }
          }
        });
        
        if (response.errorCode !== 0) {
          throw new Error(`獲取維修單失敗: ${response.errorMessage}`);
        }
        
        const batch = response.data?.dataList || [];
        const batchCount = batch.length;
        hasMore = batchCount === batchSize;
        
        if (batchCount > 0) {
          console.log(`[${syncId}] 第 ${batchNumber} 批獲取 ${batchCount} 條`);
          const result = await this.batchSyncRepairOrders(batch);
          totalSuccess += result.success;
          totalErrors += result.errors;
          totalRecords += batchCount;
          console.log(`[${syncId}] 第 ${batchNumber} 批完成: ${result.success}/${batchCount}`);
        } else {
          console.log(`[${syncId}] 第 ${batchNumber} 批無數據`);
        }
        
        offset += batchSize;
        if (hasMore && batchCount > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      await this.logSyncComplete(syncId, 'object_k1XqG__c', {
        records_count: totalRecords,
        success_count: totalSuccess,
        error_count: totalErrors
      });
      
      console.log(`[${syncId}] 維修單同步完成: 總 ${totalRecords} 條，成功 ${totalSuccess}，失敗 ${totalErrors}`);
      return { success: totalSuccess, errors: totalErrors, total: totalRecords };
      
    } catch (error) {
      console.error(`[${syncId}] 維修單同步失敗:`, error);
      await this.logSyncError(syncId, 'object_k1XqG__c', error);
      throw error;
    }
  }

  /**
   * 同步工地師父數據 - 自適應分批處理
   */
  async syncWorkers(options = {}) {
    const syncId = `worker_sync_${Date.now()}`;
    const startTime = new Date();
    const execStartTime = Date.now();
    const MAX_EXECUTION_TIME = 25000;
    const batchSize = 500;
    
    try {
      console.log(`[${syncId}] 開始同步工地師父數據...`);
      
      await this.logSyncStart(syncId, 'object_50HJ8__c', startTime);
      const lastSyncTime = options.fullSync ? null : await this.getLastSyncTime('object_50HJ8__c');
      
      if (options.fullSync) {
        console.log(`[${syncId}] 執行完整同步`);
      } else {
        console.log(`[${syncId}] 執行增量同步`);
      }
      
      const filters = [{
        field_name: 'life_status',
        operator: 'NEQ',
        field_values: ['作废']
      }];
      
      if (lastSyncTime) {
        const timestampValue = typeof lastSyncTime === 'number' ? lastSyncTime : new Date(lastSyncTime).getTime();
        console.log(`[${syncId}] 最後同步時間戳: ${timestampValue}`);
        filters.push({
          field_name: 'last_modified_time',
          operator: 'GTE',
          field_values: [timestampValue]
        });
      }
      
      let offset = 0, hasMore = true, totalSuccess = 0, totalErrors = 0, totalRecords = 0, batchNumber = 0;
      
      while (hasMore) {
        if (Date.now() - execStartTime > MAX_EXECUTION_TIME) {
          console.log(`[${syncId}] 接近執行時間限制，處理了 ${totalRecords} 條`);
          break;
        }
        
        batchNumber++;
        console.log(`[${syncId}] 第 ${batchNumber} 批，offset: ${offset}`);
        
        const response = await this.fxClient.post('/cgi/crm/custom/v2/data/query', {
          data: {
            dataObjectApiName: 'object_50HJ8__c',
            search_query_info: {
              offset: offset,
              limit: batchSize,
              filters: filters,
              orders: [{ fieldName: 'last_modified_time', isAsc: false }]
            }
          }
        });
        
        if (response.errorCode !== 0) {
          throw new Error(`獲取工地師父失敗: ${response.errorMessage}`);
        }
        
        const batch = response.data?.dataList || [];
        const batchCount = batch.length;
        hasMore = batchCount === batchSize;
        
        if (batchCount > 0) {
          console.log(`[${syncId}] 第 ${batchNumber} 批獲取 ${batchCount} 條`);
          const result = await this.batchSyncWorkers(batch);
          totalSuccess += result.success;
          totalErrors += result.errors;
          totalRecords += batchCount;
          console.log(`[${syncId}] 第 ${batchNumber} 批完成: ${result.success}/${batchCount}`);
        } else {
          console.log(`[${syncId}] 第 ${batchNumber} 批無數據`);
        }
        
        offset += batchSize;
        if (hasMore && batchCount > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      await this.logSyncComplete(syncId, 'object_50HJ8__c', {
        records_count: totalRecords,
        success_count: totalSuccess,
        error_count: totalErrors
      });
      
      console.log(`[${syncId}] 工地師父同步完成: 總 ${totalRecords} 條，成功 ${totalSuccess}，失敗 ${totalErrors}`);
      return { success: totalSuccess, errors: totalErrors, total: totalRecords };
      
    } catch (error) {
      console.error(`[${syncId}] 工地師父同步失敗:`, error);
      await this.logSyncError(syncId, 'object_50HJ8__c', error);
      throw error;
    }
  }

  /**
   * 同步供應商數據 - 自適應分批處理
   */
  async syncSuppliers(options = {}) {
    const syncId = `supplier_sync_${Date.now()}`;
    const startTime = new Date();
    const execStartTime = Date.now();
    const MAX_EXECUTION_TIME = 25000;
    const batchSize = 500;
    
    try {
      console.log(`[${syncId}] 開始同步供應商數據...`);
      
      await this.logSyncStart(syncId, 'SupplierObj', startTime);
      const lastSyncTime = options.fullSync ? null : await this.getLastSyncTime('SupplierObj');
      
      if (options.fullSync) {
        console.log(`[${syncId}] 執行完整同步`);
      } else {
        console.log(`[${syncId}] 執行增量同步`);
      }
      
      const filters = [{
        field_name: 'life_status',
        operator: 'NEQ',
        field_values: ['作废']
      }];
      
      if (lastSyncTime) {
        const timestampValue = typeof lastSyncTime === 'number' ? lastSyncTime : new Date(lastSyncTime).getTime();
        console.log(`[${syncId}] 最後同步時間戳: ${timestampValue}`);
        filters.push({
          field_name: 'last_modified_time',
          operator: 'GTE',
          field_values: [timestampValue]
        });
      }
      
      let offset = 0, hasMore = true, totalSuccess = 0, totalErrors = 0, totalRecords = 0, batchNumber = 0;
      
      while (hasMore) {
        if (Date.now() - execStartTime > MAX_EXECUTION_TIME) {
          console.log(`[${syncId}] 接近執行時間限制，處理了 ${totalRecords} 條`);
          break;
        }
        
        batchNumber++;
        console.log(`[${syncId}] 第 ${batchNumber} 批，offset: ${offset}`);
        
        const response = await this.fxClient.post('/cgi/crm/v2/data/query', {
          data: {
            dataObjectApiName: 'SupplierObj',
            search_query_info: {
              offset: offset,
              limit: batchSize,
              filters: filters,
              orders: [{ fieldName: 'last_modified_time', isAsc: false }]
            }
          }
        });
        
        if (response.errorCode !== 0) {
          throw new Error(`獲取供應商失敗: ${response.errorMessage}`);
        }
        
        const batch = response.data?.dataList || [];
        const batchCount = batch.length;
        hasMore = batchCount === batchSize;
        
        if (batchCount > 0) {
          console.log(`[${syncId}] 第 ${batchNumber} 批獲取 ${batchCount} 條`);
          const result = await this.batchSyncSuppliers(batch);
          totalSuccess += result.success;
          totalErrors += result.errors;
          totalRecords += batchCount;
          console.log(`[${syncId}] 第 ${batchNumber} 批完成: ${result.success}/${batchCount}`);
        } else {
          console.log(`[${syncId}] 第 ${batchNumber} 批無數據`);
        }
        
        offset += batchSize;
        if (hasMore && batchCount > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      await this.logSyncComplete(syncId, 'SupplierObj', {
        records_count: totalRecords,
        success_count: totalSuccess,
        error_count: totalErrors
      });
      
      console.log(`[${syncId}] 供應商同步完成: 總 ${totalRecords} 條，成功 ${totalSuccess}，失敗 ${totalErrors}`);
      return { success: totalSuccess, errors: totalErrors, total: totalRecords };
      
    } catch (error) {
      console.error(`[${syncId}] 供應商同步失敗:`, error);
      await this.logSyncError(syncId, 'SupplierObj', error);
      throw error;
    }
  }

  /**
   * 同步案場(浴櫃)數據 - 自適應分批處理
   */
  async syncSiteCabinet(options = {}) {
    const syncId = `site_cabinet_sync_${Date.now()}`;
    const startTime = new Date();
    const execStartTime = Date.now();
    const MAX_EXECUTION_TIME = 25000;
    const batchSize = 500;
    
    try {
      console.log(`[${syncId}] 開始同步案場(浴櫃)數據...`);
      
      await this.logSyncStart(syncId, 'site_cabinet__c', startTime);
      const lastSyncTime = options.fullSync ? null : await this.getLastSyncTime('site_cabinet__c');
      
      if (options.fullSync) {
        console.log(`[${syncId}] 執行完整同步`);
      } else {
        console.log(`[${syncId}] 執行增量同步`);
      }
      
      const filters = [{
        field_name: 'life_status',
        operator: 'NEQ',
        field_values: ['作廢']
      }];
      
      if (lastSyncTime) {
        const timestampValue = typeof lastSyncTime === 'number' ? lastSyncTime : new Date(lastSyncTime).getTime();
        console.log(`[${syncId}] 最後同步時間戳: ${timestampValue}`);
        filters.push({
          field_name: 'last_modified_time',
          operator: 'GTE',
          field_values: [timestampValue]
        });
      }
      
      let offset = 0, hasMore = true, totalSuccess = 0, totalErrors = 0, totalRecords = 0, batchNumber = 0;
      
      while (hasMore) {
        if (Date.now() - execStartTime > MAX_EXECUTION_TIME) {
          console.log(`[${syncId}] 接近執行時間限制，處理了 ${totalRecords} 條`);
          break;
        }
        
        batchNumber++;
        console.log(`[${syncId}] 第 ${batchNumber} 批，offset: ${offset}`);
        
        const response = await this.fxClient.post('/cgi/crm/custom/v2/data/query', {
          data: {
            dataObjectApiName: 'site_cabinet__c',
            search_query_info: {
              offset: offset,
              limit: batchSize,
              filters: filters,
              orders: [{ fieldName: 'last_modified_time', isAsc: false }]
            }
          }
        });
        
        if (response.errorCode !== 0) {
          throw new Error(`獲取案場(浴櫃)失敗: ${response.errorMessage}`);
        }
        
        const batch = response.data?.dataList || [];
        const batchCount = batch.length;
        hasMore = batchCount === batchSize;
        
        if (batchCount > 0) {
          console.log(`[${syncId}] 第 ${batchNumber} 批獲取 ${batchCount} 條`);
          const result = await this.batchSyncSiteCabinet(batch);
          totalSuccess += result.success;
          totalErrors += result.errors;
          totalRecords += batchCount;
          console.log(`[${syncId}] 第 ${batchNumber} 批完成: ${result.success}/${batchCount}`);
        } else {
          console.log(`[${syncId}] 第 ${batchNumber} 批無數據`);
        }
        
        offset += batchSize;
        if (hasMore && batchCount > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      await this.logSyncComplete(syncId, 'site_cabinet__c', {
        records_count: totalRecords,
        success_count: totalSuccess,
        error_count: totalErrors
      });
      
      console.log(`[${syncId}] 案場(浴櫃)同步完成: 總 ${totalRecords} 條，成功 ${totalSuccess}，失敗 ${totalErrors}`);
      return { success: totalSuccess, errors: totalErrors, total: totalRecords };
      
    } catch (error) {
      console.error(`[${syncId}] 案場(浴櫃)同步失敗:`, error);
      await this.logSyncError(syncId, 'site_cabinet__c', error);
      throw error;
    }
  }

  /**
   * 同步進度管理公告數據 - 自適應分批處理
   */
  async syncProgressAnnouncement(options = {}) {
    const syncId = `progress_announcement_sync_${Date.now()}`;
    const startTime = new Date();
    const execStartTime = Date.now();
    const MAX_EXECUTION_TIME = 25000;
    const batchSize = 500;
    
    try {
      console.log(`[${syncId}] 開始同步進度管理公告數據...`);
      
      await this.logSyncStart(syncId, 'progress_management_announ__c', startTime);
      const lastSyncTime = options.fullSync ? null : await this.getLastSyncTime('progress_management_announ__c');
      
      if (options.fullSync) {
        console.log(`[${syncId}] 執行完整同步`);
      } else {
        console.log(`[${syncId}] 執行增量同步`);
      }
      
      const filters = [{
        field_name: 'life_status',
        operator: 'NEQ',
        field_values: ['作廢']
      }];
      
      if (lastSyncTime) {
        const timestampValue = typeof lastSyncTime === 'number' ? lastSyncTime : new Date(lastSyncTime).getTime();
        console.log(`[${syncId}] 最後同步時間戳: ${timestampValue}`);
        filters.push({
          field_name: 'last_modified_time',
          operator: 'GTE',
          field_values: [timestampValue]
        });
      }
      
      let offset = 0, hasMore = true, totalSuccess = 0, totalErrors = 0, totalRecords = 0, batchNumber = 0;
      
      while (hasMore) {
        if (Date.now() - execStartTime > MAX_EXECUTION_TIME) {
          console.log(`[${syncId}] 接近執行時間限制，處理了 ${totalRecords} 條`);
          break;
        }
        
        batchNumber++;
        console.log(`[${syncId}] 第 ${batchNumber} 批，offset: ${offset}`);
        
        const response = await this.fxClient.post('/cgi/crm/custom/v2/data/query', {
          data: {
            dataObjectApiName: 'progress_management_announ__c',
            search_query_info: {
              offset: offset,
              limit: batchSize,
              filters: filters,
              orders: [{ fieldName: 'last_modified_time', isAsc: false }]
            }
          }
        });
        
        if (response.errorCode !== 0) {
          throw new Error(`獲取進度管理公告失敗: ${response.errorMessage}`);
        }
        
        const batch = response.data?.dataList || [];
        const batchCount = batch.length;
        hasMore = batchCount === batchSize;
        
        if (batchCount > 0) {
          console.log(`[${syncId}] 第 ${batchNumber} 批獲取 ${batchCount} 條`);
          const result = await this.batchSyncProgressAnnouncement(batch);
          totalSuccess += result.success;
          totalErrors += result.errors;
          totalRecords += batchCount;
          console.log(`[${syncId}] 第 ${batchNumber} 批完成: ${result.success}/${batchCount}`);
        } else {
          console.log(`[${syncId}] 第 ${batchNumber} 批無數據`);
        }
        
        offset += batchSize;
        if (hasMore && batchCount > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      await this.logSyncComplete(syncId, 'progress_management_announ__c', {
        records_count: totalRecords,
        success_count: totalSuccess,
        error_count: totalErrors
      });
      
      console.log(`[${syncId}] 進度管理公告同步完成: 總 ${totalRecords} 條，成功 ${totalSuccess}，失敗 ${totalErrors}`);
      return { success: totalSuccess, errors: totalErrors, total: totalRecords };
      
    } catch (error) {
      console.error(`[${syncId}] 進度管理公告同步失敗:`, error);
      await this.logSyncError(syncId, 'progress_management_announ__c', error);
      throw error;
    }
  }

  /**
   * 同步案場數據 - 優化版（平衡限制）
   */
  async syncSites(options = {}) {
    const syncId = `site_sync_${Date.now()}`;
    const startTime = new Date();
    const execStartTime = Date.now();
    const MAX_EXECUTION_TIME = 120000; // 2 分鐘執行時間
    const MAX_BATCHES = 3; // 3 批次，每批 200 條 = 600 條
    const batchSize = 200; // 每批 200 條，總共 600 個操作，在 1000 限制內
    
    try {
      console.log(`[${syncId}] 開始同步案場數據...`);
      
      // 在同步前驗證欄位結構
      console.log(`[${syncId}] 驗證欄位結構...`);
      const fieldValidationResult = await this.fieldValidator.validateAndSyncFields('object_8W9cb__c');
      if (fieldValidationResult.fieldsAdded > 0) {
        console.log(`[${syncId}] 已添加 ${fieldValidationResult.fieldsAdded} 個新欄位`);
      }
      
      // 記錄同步開始
      await this.logSyncStart(syncId, 'object_8W9cb__c', startTime);
      
      // 檢查是否有未完成的同步（斷點續傳）
      const savedProgress = await this.getSyncProgress('object_8W9cb__c');
      let offset = savedProgress?.offset || 0;
      
      // 獲取最後同步時間（如果是完整同步則忽略）
      const lastSyncTime = options.fullSync ? null : await this.getLastSyncTime('object_8W9cb__c');
      
      if (options.fullSync) {
        console.log(`[${syncId}] 執行完整同步`);
        if (offset > 0) {
          console.log(`[${syncId}] 從上次中斷處繼續，offset: ${offset}`);
        }
      } else {
        console.log(`[${syncId}] 執行增量同步`);
        offset = 0; // 增量同步總是從頭開始
      }
      
      // 構建查詢條件
      const filters = [
        {
          field_name: 'life_status',
          operator: 'NEQ',
          field_values: ['作废']
        }
      ];
      
      // 增量同步：使用正確的時間戳格式
      if (lastSyncTime && !options.fullSync) {
        const timestampValue = typeof lastSyncTime === 'number' ? lastSyncTime : new Date(lastSyncTime).getTime();
        console.log(`[${syncId}] 使用增量同步，最後同步時間戳: ${timestampValue}`);
        filters.push({
          field_name: 'last_modified_time',
          operator: 'GTE',
          field_values: [timestampValue]
        });
      }
      
      let hasMore = true;
      let totalSuccess = 0;
      let totalErrors = 0;
      let totalRecords = 0;
      let batchNumber = 0;
      let isCompleted = false;
      
      // 分批處理，但限制批次數量
      while (hasMore && batchNumber < MAX_BATCHES) {
        // 檢查執行時間
        if (Date.now() - execStartTime > MAX_EXECUTION_TIME) {
          console.log(`[${syncId}] 接近執行時間限制，保存進度並退出`);
          break;
        }
        
        batchNumber++;
        console.log(`[${syncId}] 處理第 ${batchNumber}/${MAX_BATCHES} 批，offset: ${offset}`);
        
        // 獲取一批數據
        const response = await this.fxClient.post('/cgi/crm/custom/v2/data/query', {
          data: {
            dataObjectApiName: 'object_8W9cb__c',
            search_query_info: {
              offset: offset,
              limit: batchSize,
              filters: filters,
              orders: [{ fieldName: '_id', isAsc: true }] // 按ID排序確保穩定
            }
          }
        });
        
        if (response.errorCode !== 0) {
          throw new Error(`獲取案場數據失敗: ${response.errorMessage}`);
        }
        
        const batch = response.data?.dataList || [];
        const batchCount = batch.length;
        const totalInCRM = response.data?.total || 0;
        
        // 判斷是否還有更多數據
        hasMore = batchCount === batchSize;
        
        if (batchCount > 0) {
          console.log(`[${syncId}] 第 ${batchNumber} 批獲取 ${batchCount} 條（CRM總數: ${totalInCRM}）`);
          
          // 同步這批數據到D1
          const result = await this.batchSyncSites(batch);
          totalSuccess += result.success;
          totalErrors += result.errors;
          totalRecords += batchCount;
          
          console.log(`[${syncId}] 第 ${batchNumber} 批完成: 成功 ${result.success}/${batchCount}`);
        } else {
          console.log(`[${syncId}] 第 ${batchNumber} 批無數據，同步完成`);
          isCompleted = true;
          hasMore = false;
        }
        
        offset += batchSize;
        
        // 檢查是否已完成所有數據
        if (offset >= totalInCRM) {
          console.log(`[${syncId}] 已處理所有數據（${offset} >= ${totalInCRM}）`);
          isCompleted = true;
          hasMore = false;
        }
      }
      
      // 保存同步進度
      if (options.fullSync && hasMore && !isCompleted) {
        // 還有更多數據，保存進度
        await this.saveSyncProgress('object_8W9cb__c', offset);
        console.log(`[${syncId}] 保存進度，下次從 offset ${offset} 繼續`);
      } else if (isCompleted || !hasMore) {
        // 同步完成，清除進度
        await this.clearSyncProgress('object_8W9cb__c');
        console.log(`[${syncId}] 同步完成，清除進度記錄`);
      }
      
      // 記錄同步完成
      await this.logSyncComplete(syncId, 'object_8W9cb__c', {
        records_count: totalRecords,
        success_count: totalSuccess,
        error_count: totalErrors,
        is_completed: isCompleted,
        next_offset: hasMore ? offset : null
      });
      
      const status = isCompleted ? '✅ 全部完成' : `⏸️ 部分完成（下次從 ${offset} 繼續）`;
      console.log(`[${syncId}] 案場同步 ${status}: 本次處理 ${totalRecords} 條，成功 ${totalSuccess}，失敗 ${totalErrors}`);
      
      return { 
        success: totalSuccess, 
        errors: totalErrors, 
        total: totalRecords,
        isCompleted: isCompleted,
        nextOffset: hasMore ? offset : null
      };
      
    } catch (error) {
      console.error(`[${syncId}] 案場同步失敗:`, error);
      await this.logSyncError(syncId, 'object_8W9cb__c', error);
      throw error;
    }
  }

  /**
   * 從CRM獲取商機數據
   */
  async fetchOpportunities(lastSyncTime = null) {
    const allData = [];
    let offset = 0;
    let hasMore = true;
    const pageSize = 500; // 使用最大批次大小
    
    // 構建查詢條件
    const filters = [
      {
        field_name: 'life_status',
        operator: 'NEQ',
        field_values: ['作废']
      }
    ];
    
    // 增量同步：只獲取更新的記錄
    if (lastSyncTime) {
      // 確保使用正確的時間戳格式（數字，毫秒）
      const timestampValue = typeof lastSyncTime === 'number' ? lastSyncTime : new Date(lastSyncTime).getTime();
      console.log(`[商機同步] 使用增量同步，最後同步時間戳: ${timestampValue}`);
      filters.push({
        field_name: 'last_modified_time',
        operator: 'GTE',
        field_values: [timestampValue]
      });
    } else {
      console.log(`[商機同步] 執行完整同步`);
    }
    
    console.log(`[商機同步] 開始獲取數據，每批 ${pageSize} 條，過濾條件:`, JSON.stringify(filters, null, 2));
    
    while (hasMore) {
      const response = await this.fxClient.post('/cgi/crm/v2/data/query', {
        data: {
          dataObjectApiName: 'NewOpportunityObj',
          search_query_info: {
            limit: pageSize,
            offset: offset,
            filters: filters,
            orders: [{ fieldName: 'last_modified_time', isAsc: false }]
          }
        }
      });
      
      if (response.errorCode !== 0) {
        throw new Error(`獲取商機數據失敗: ${response.errorMessage}`);
      }
      
      const records = response.data?.dataList || [];
      allData.push(...records);
      
      console.log(`[商機同步] 第 ${Math.floor(offset / pageSize) + 1} 批，獲取 ${records.length} 條，總計 ${allData.length} 條`);
      
      if (records.length < pageSize) {
        hasMore = false;
        console.log(`[商機同步] 獲取完成，共 ${allData.length} 條記錄`);
      } else {
        offset += pageSize;
        // 添加短暫延遲，避免請求過快
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return allData;
  }

  /**
   * 從CRM獲取案場數據（分頁）
   */
  async fetchSitesByPage(offset, limit) {
    const pageSize = Math.min(limit, 500); // 每批最多 500
    const allData = [];
    let currentOffset = offset;
    
    console.log(`[案場分頁] 從 offset ${offset} 獲取 ${limit} 條數據`);
    
    while (allData.length < limit) {
      const currentLimit = Math.min(pageSize, limit - allData.length);
      
      const response = await this.fxClient.post('/cgi/crm/custom/v2/data/query', {
        data: {
          dataObjectApiName: 'object_8W9cb__c',
          search_query_info: {
            limit: currentLimit,
            offset: currentOffset,
            filters: [
              {
                field_name: 'life_status',
                operator: 'NEQ',
                field_values: ['作废']
              }
            ],
            orders: [{ fieldName: 'last_modified_time', isAsc: false }]
          }
        }
      });
      
      if (response.errorCode !== 0) {
        throw new Error(`獲取案場數據失敗: ${response.errorMessage}`);
      }
      
      const records = response.data?.dataList || [];
      allData.push(...records);
      
      console.log(`[案場分頁] 獲取到 ${records.length} 條，累計 ${allData.length} 條`);
      
      // 如果返回的記錄少於請求的，說明沒有更多數據了
      if (records.length < currentLimit) {
        break;
      }
      
      currentOffset += currentLimit;
      
      // 添加短暫延遲，避免請求過快
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return allData;
  }

  /**
   * 從CRM獲取維修單數據
   */
  async fetchRepairOrders(lastSyncTime = null) {
    const allData = [];
    let offset = 0;
    let hasMore = true;
    const pageSize = 500; // 使用最大批次大小
    
    // 構建查詢條件
    const filters = [
      {
        field_name: 'life_status',
        operator: 'NEQ',
        field_values: ['作废']
      }
    ];
    
    // 增量同步：只獲取更新的記錄
    if (lastSyncTime) {
      // 確保使用正確的時間戳格式（數字，毫秒）
      const timestampValue = typeof lastSyncTime === 'number' ? lastSyncTime : new Date(lastSyncTime).getTime();
      console.log(`[維修單同步] 使用增量同步，最後同步時間戳: ${timestampValue}`);
      filters.push({
        field_name: 'last_modified_time',
        operator: 'GTE',
        field_values: [timestampValue]
      });
    }
    
    console.log(`[維修單同步] 開始獲取數據，每批 ${pageSize} 條`);
    
    while (hasMore) {
      const response = await this.fxClient.post('/cgi/crm/custom/v2/data/query', {
        data: {
          dataObjectApiName: 'object_k1XqG__c',
          search_query_info: {
            limit: pageSize,
            offset: offset,
            filters: filters,
            orders: [{ fieldName: 'last_modified_time', isAsc: false }]
          }
        }
      });
      
      if (response.errorCode !== 0) {
        throw new Error(`獲取維修單數據失敗: ${response.errorMessage}`);
      }
      
      const records = response.data?.dataList || [];
      allData.push(...records);
      
      console.log(`[維修單同步] 第 ${Math.floor(offset / pageSize) + 1} 批，獲取 ${records.length} 條，總計 ${allData.length} 條`);
      
      if (records.length < pageSize) {
        hasMore = false;
        console.log(`[維修單同步] 獲取完成，共 ${allData.length} 條記錄`);
      } else {
        offset += pageSize;
        // 添加短暫延遲，避免請求過快
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return allData;
  }

  /**
   * 從CRM獲取工地師父數據
   */
  async fetchWorkers(lastSyncTime = null) {
    const allData = [];
    let offset = 0;
    let hasMore = true;
    const pageSize = 500; // 使用最大批次大小
    
    // 構建查詢條件
    const filters = [
      {
        field_name: 'life_status',
        operator: 'NEQ',
        field_values: ['作废']
      }
    ];
    
    // 增量同步：只獲取更新的記錄
    if (lastSyncTime) {
      // 確保使用正確的時間戳格式（數字，毫秒）
      const timestampValue = typeof lastSyncTime === 'number' ? lastSyncTime : new Date(lastSyncTime).getTime();
      console.log(`[工地師父同步] 使用增量同步，最後同步時間戳: ${timestampValue}`);
      filters.push({
        field_name: 'last_modified_time',
        operator: 'GTE',
        field_values: [timestampValue]
      });
    }
    
    console.log(`[工地師父同步] 開始獲取數據，每批 ${pageSize} 條`);
    
    while (hasMore) {
      const response = await this.fxClient.post('/cgi/crm/custom/v2/data/query', {
        data: {
          dataObjectApiName: 'object_50HJ8__c',
          search_query_info: {
            limit: pageSize,
            offset: offset,
            filters: filters,
            orders: [{ fieldName: 'last_modified_time', isAsc: false }]
          }
        }
      });
      
      if (response.errorCode !== 0) {
        throw new Error(`獲取工地師父數據失敗: ${response.errorMessage}`);
      }
      
      const records = response.data?.dataList || [];
      allData.push(...records);
      
      console.log(`[工地師父同步] 第 ${Math.floor(offset / pageSize) + 1} 批，獲取 ${records.length} 條，總計 ${allData.length} 條`);
      
      if (records.length < pageSize) {
        hasMore = false;
        console.log(`[工地師父同步] 獲取完成，共 ${allData.length} 條記錄`);
      } else {
        offset += pageSize;
        // 添加短暫延遲，避免請求過快
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return allData;
  }

  /**
   * 從CRM獲取供應商數據
   */
  async fetchSuppliers(lastSyncTime = null) {
    const allData = [];
    let offset = 0;
    let hasMore = true;
    const pageSize = 500; // 使用最大批次大小
    
    // 構建查詢條件
    const filters = [
      {
        field_name: 'life_status',
        operator: 'NEQ',
        field_values: ['作废']
      }
    ];
    
    // 增量同步：只獲取更新的記錄
    if (lastSyncTime) {
      // 確保使用正確的時間戳格式（數字，毫秒）
      const timestampValue = typeof lastSyncTime === 'number' ? lastSyncTime : new Date(lastSyncTime).getTime();
      console.log(`[供應商同步] 使用增量同步，最後同步時間戳: ${timestampValue}`);
      filters.push({
        field_name: 'last_modified_time',
        operator: 'GTE',
        field_values: [timestampValue]
      });
    }
    
    console.log(`[供應商同步] 開始獲取數據，每批 ${pageSize} 條`);
    
    while (hasMore) {
      const response = await this.fxClient.post('/cgi/crm/v2/data/query', {
        data: {
          dataObjectApiName: 'SupplierObj',
          search_query_info: {
            limit: pageSize,
            offset: offset,
            filters: filters,
            orders: [{ fieldName: 'last_modified_time', isAsc: false }]
          }
        }
      });
      
      if (response.errorCode !== 0) {
        throw new Error(`獲取供應商數據失敗: ${response.errorMessage}`);
      }
      
      const records = response.data?.dataList || [];
      allData.push(...records);
      
      console.log(`[供應商同步] 第 ${Math.floor(offset / pageSize) + 1} 批，獲取 ${records.length} 條，總計 ${allData.length} 條`);
      
      if (records.length < pageSize) {
        hasMore = false;
        console.log(`[供應商同步] 獲取完成，共 ${allData.length} 條記錄`);
      } else {
        offset += pageSize;
        // 添加短暫延遲，避免請求過快
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return allData;
  }

  /**
   * 從CRM獲取案場(浴櫃)數據
   */
  async fetchSiteCabinet(lastSyncTime = null) {
    const allData = [];
    let offset = 0;
    let hasMore = true;
    const pageSize = 500; // 使用最大批次大小
    
    // 構建查詢條件
    const filters = [
      {
        field_name: 'life_status',
        operator: 'NEQ',
        field_values: ['作废']
      }
    ];
    
    // 增量同步：只獲取更新的記錄
    if (lastSyncTime) {
      // 確保使用正確的時間戳格式（數字，毫秒）
      const timestampValue = typeof lastSyncTime === 'number' ? lastSyncTime : new Date(lastSyncTime).getTime();
      console.log(`[案場(浴櫃)同步] 使用增量同步，最後同步時間戳: ${timestampValue}`);
      filters.push({
        field_name: 'last_modified_time',
        operator: 'GTE',
        field_values: [timestampValue]
      });
    }
    
    console.log(`[案場(浴櫃)同步] 開始獲取數據，每批 ${pageSize} 條`);
    
    while (hasMore) {
      const response = await this.fxClient.post('/cgi/crm/custom/v2/data/query', {
        data: {
          dataObjectApiName: 'site_cabinet__c',
          search_query_info: {
            limit: pageSize,
            offset: offset,
            filters: filters,
            orders: [{ fieldName: 'last_modified_time', isAsc: false }]
          }
        }
      });
      
      if (response.errorCode !== 0) {
        throw new Error(`獲取案場(浴櫃)數據失敗: ${response.errorMessage}`);
      }
      
      const records = response.data?.dataList || [];
      allData.push(...records);
      
      console.log(`[案場(浴櫃)同步] 第 ${Math.floor(offset / pageSize) + 1} 批，獲取 ${records.length} 條，總計 ${allData.length} 條`);
      
      if (records.length < pageSize) {
        hasMore = false;
        console.log(`[案場(浴櫃)同步] 獲取完成，共 ${allData.length} 條記錄`);
      } else {
        offset += pageSize;
        // 添加短暫延遲，避免請求過快
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return allData;
  }

  /**
   * 從CRM獲取進度管理公告數據
   */
  async fetchProgressAnnouncement(lastSyncTime = null) {
    const allData = [];
    let offset = 0;
    let hasMore = true;
    const pageSize = 500; // 使用最大批次大小
    
    // 構建查詢條件
    const filters = [
      {
        field_name: 'life_status',
        operator: 'NEQ',
        field_values: ['作废']
      }
    ];
    
    // 增量同步：只獲取更新的記錄
    if (lastSyncTime) {
      // 確保使用正確的時間戳格式（數字，毫秒）
      const timestampValue = typeof lastSyncTime === 'number' ? lastSyncTime : new Date(lastSyncTime).getTime();
      console.log(`[進度管理公告同步] 使用增量同步，最後同步時間戳: ${timestampValue}`);
      filters.push({
        field_name: 'last_modified_time',
        operator: 'GTE',
        field_values: [timestampValue]
      });
    }
    
    console.log(`[進度管理公告同步] 開始獲取數據，每批 ${pageSize} 條`);
    
    while (hasMore) {
      const response = await this.fxClient.post('/cgi/crm/custom/v2/data/query', {
        data: {
          dataObjectApiName: 'progress_management_announ__c',
          search_query_info: {
            limit: pageSize,
            offset: offset,
            filters: filters,
            orders: [{ fieldName: 'last_modified_time', isAsc: false }]
          }
        }
      });
      
      if (response.errorCode !== 0) {
        throw new Error(`獲取進度管理公告數據失敗: ${response.errorMessage}`);
      }
      
      const records = response.data?.dataList || [];
      allData.push(...records);
      
      console.log(`[進度管理公告同步] 第 ${Math.floor(offset / pageSize) + 1} 批，獲取 ${records.length} 條，總計 ${allData.length} 條`);
      
      if (records.length < pageSize) {
        hasMore = false;
        console.log(`[進度管理公告同步] 獲取完成，共 ${allData.length} 條記錄`);
      } else {
        offset += pageSize;
        // 添加短暫延遲，避免請求過快
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return allData;
  }

  /**
   * 從CRM獲取案場數據
   */
  async fetchSites(lastSyncTime = null, maxRecords = null) {
    const allData = [];
    let offset = 0;
    let hasMore = true;
    const pageSize = 100; // 減少批次大小以避免超時
    
    // 構建查詢條件
    const filters = [
      {
        field_name: 'life_status',
        operator: 'NEQ',
        field_values: ['作废']
      }
    ];
    
    // 增量同步：使用正確的時間戳格式
    if (lastSyncTime) {
      console.log(`[案場同步] 使用增量同步，最後同步時間戳: ${lastSyncTime}`);
      // 確保使用正確的時間戳格式（數字，毫秒）
      const timestampValue = typeof lastSyncTime === 'number' ? lastSyncTime : new Date(lastSyncTime).getTime();
      filters.push({
        field_name: 'last_modified_time',
        operator: 'GTE',
        field_values: [timestampValue]
      });
    } else {
      console.log(`[案場同步] 執行完整同步`);
    }
    
    console.log(`[案場同步] 開始獲取數據，每批 ${pageSize} 條，過濾條件:`, JSON.stringify(filters, null, 2));
    if (maxRecords) {
      console.log(`[案場同步] 限制最大記錄數: ${maxRecords}`);
    }
    
    while (hasMore) {
      // 如果設置了最大記錄數，調整 pageSize
      let currentPageSize = pageSize;
      if (maxRecords && allData.length + pageSize > maxRecords) {
        currentPageSize = maxRecords - allData.length;
      }
      
      const response = await this.fxClient.post('/cgi/crm/custom/v2/data/query', {
        data: {
          dataObjectApiName: 'object_8W9cb__c',
          search_query_info: {
            limit: currentPageSize,
            offset: offset,
            filters: filters,
            orders: [{ fieldName: 'last_modified_time', isAsc: false }]
          }
        }
      });
      
      if (response.errorCode !== 0) {
        throw new Error(`獲取案場數據失敗: ${response.errorMessage}`);
      }
      
      const records = response.data?.dataList || [];
      allData.push(...records);
      
      console.log(`[案場同步] 第 ${Math.floor(offset / pageSize) + 1} 批，獲取 ${records.length} 條，總計 ${allData.length} 條`);
      
      // 檢查是否需要停止
      if (records.length < currentPageSize || (maxRecords && allData.length >= maxRecords)) {
        hasMore = false;
        console.log(`[案場同步] 獲取完成，共 ${allData.length} 條記錄`);
      } else {
        offset += pageSize;
        // 添加短暫延遲，避免請求過快
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return allData;
  }

  /**
   * 批量同步商機到D1
   */
  async batchSyncOpportunities(opportunities) {
    let success = 0;
    let errors = 0;
    const batchSize = 500;
    
    // 分批處理
    for (let i = 0; i < opportunities.length; i += batchSize) {
      const batch = opportunities.slice(i, i + batchSize);
      
      try {
        // 準備批量插入語句
        const stmt = this.db.prepare(`
          INSERT INTO newopportunityobj (
            _id, name, amount, close_date, account_id, account_id__r,
            sales_stage, sales_stage__r, sales_status, sales_status__r,
            sales_process_id, sales_process_id__r, probability, probability_amount,
            owner, owner__r, owner_department_id, owner_department,
            opp_discount, opp_lines_sum, relevant_team,
            create_time, created_by, created_by__r,
            last_modified_time, last_modified_by, last_modified_by__r,
            last_followed_time, stg_changed_time, cost_time,
            lock_status, lock_status__r, life_status, life_status__r,
            is_deleted, record_type, version,
            data_own_department, data_own_department__r,
            field_rU4l5__c, field_SdEgv__c, field_nI1xS__c,
            field_lmjjf__c, field_lmjjf__c__r,
            field_UJ7fD__c, field_UJ7fD__c__r,
            field_e8m3q__c, field_vE1Zn__c, field_5co25__c, field_i32Uj__c,
            fx_created_at, fx_updated_at, sync_version
          ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10,
            ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21,
            ?22, ?23, ?24, ?25, ?26, ?27, ?28, ?29, ?30,
            ?31, ?32, ?33, ?34, ?35, ?36, ?37, ?38, ?39,
            ?40, ?41, ?42, ?43, ?44, ?45, ?46, ?47, ?48, ?49, ?50,
            ?51, ?52, ?53
          )
          ON CONFLICT(_id) DO UPDATE SET
            name = excluded.name,
            amount = excluded.amount,
            close_date = excluded.close_date,
            account_id = excluded.account_id,
            account_id__r = excluded.account_id__r,
            sales_stage = excluded.sales_stage,
            sales_stage__r = excluded.sales_stage__r,
            sales_status = excluded.sales_status,
            sales_status__r = excluded.sales_status__r,
            probability = excluded.probability,
            probability_amount = excluded.probability_amount,
            owner = excluded.owner,
            owner__r = excluded.owner__r,
            owner_department_id = excluded.owner_department_id,
            owner_department = excluded.owner_department,
            last_modified_time = excluded.last_modified_time,
            last_modified_by = excluded.last_modified_by,
            last_modified_by__r = excluded.last_modified_by__r,
            life_status = excluded.life_status,
            life_status__r = excluded.life_status__r,
            is_deleted = excluded.is_deleted,
            field_rU4l5__c = excluded.field_rU4l5__c,
            field_SdEgv__c = excluded.field_SdEgv__c,
            field_nI1xS__c = excluded.field_nI1xS__c,
            field_lmjjf__c = excluded.field_lmjjf__c,
            field_lmjjf__c__r = excluded.field_lmjjf__c__r,
            field_UJ7fD__c = excluded.field_UJ7fD__c,
            field_UJ7fD__c__r = excluded.field_UJ7fD__c__r,
            fx_updated_at = excluded.fx_updated_at,
            sync_version = sync_version + 1,
            sync_time = CURRENT_TIMESTAMP
        `);
        
        // 批量執行
        const batchPromises = batch.map(opp => this.bindOpportunityData(stmt, opp));
        const results = await this.db.batch(batchPromises);
        
        // 檢查每個結果
        results.forEach((result, index) => {
          if (result && result.success !== false) {
            success++;
          } else {
            errors++;
            const errorMsg = result?.error || result?.meta?.error || '未知錯誤';
            console.error(`商機 ${batch[index]._id} 保存失敗:`, errorMsg);
          }
        });
      } catch (error) {
        console.error(`批次同步失敗:`, error);
        errors += batch.length;
      }
    }
    
    return { success, errors };
  }

  /**
   * 批量同步維修單到D1
   */
  async batchSyncRepairOrders(repairOrders) {
    let success = 0;
    let errors = 0;
    const batchSize = 100; // 批次大小
    
    console.log(`[維修單同步] 開始同步 ${repairOrders.length} 條數據到 D1`);
    
    for (let i = 0; i < repairOrders.length; i += batchSize) {
      const batch = repairOrders.slice(i, i + batchSize);
      
      try {
        console.log(`[維修單同步] 處理第 ${Math.floor(i / batchSize) + 1} 批，共 ${batch.length} 條`);
        const stmt = this.db.prepare(`
          INSERT INTO object_k1xqg__c (
            _id, name, owner, owner__r, owner_department_id, owner_department,
            create_time, created_by, created_by__r,
            last_modified_time, last_modified_by, last_modified_by__r,
            life_status, life_status__r, lock_status, lock_status__r,
            is_deleted, record_type, version,
            data_own_department, data_own_department__r,
            relevant_team, total_num,
            fx_created_at, fx_updated_at, sync_version
          ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10,
            ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20,
            ?21, ?22, ?23, ?24, ?25, ?26
          )
          ON CONFLICT(_id) DO UPDATE SET
            name = excluded.name,
            owner = excluded.owner,
            owner__r = excluded.owner__r,
            owner_department_id = excluded.owner_department_id,
            owner_department = excluded.owner_department,
            last_modified_time = excluded.last_modified_time,
            last_modified_by = excluded.last_modified_by,
            last_modified_by__r = excluded.last_modified_by__r,
            life_status = excluded.life_status,
            life_status__r = excluded.life_status__r,
            lock_status = excluded.lock_status,
            lock_status__r = excluded.lock_status__r,
            is_deleted = excluded.is_deleted,
            fx_updated_at = excluded.fx_updated_at,
            sync_version = sync_version + 1,
            sync_time = CURRENT_TIMESTAMP
        `);
        
        const batchPromises = batch.map(repair => this.bindRepairOrderData(stmt, repair));
        const results = await this.db.batch(batchPromises);
        
        // 檢查每個結果
        results.forEach((result, index) => {
          if (result && result.success !== false) {
            success++;
          } else {
            errors++;
            const errorMsg = result?.error || result?.meta?.error || '未知錯誤';
            console.error(`維修單 ${batch[index]._id} 保存失敗:`, errorMsg);
          }
        });
      } catch (error) {
        console.error(`批次同步失敗:`, error);
        errors += batch.length;
      }
    }
    
    return { success, errors };
  }

  /**
   * 批量同步工地師父到D1
   */
  async batchSyncWorkers(workers) {
    let success = 0;
    let errors = 0;
    const batchSize = 100; // 批次大小
    
    console.log(`[工地師父同步] 開始同步 ${workers.length} 條數據到 D1`);
    
    for (let i = 0; i < workers.length; i += batchSize) {
      const batch = workers.slice(i, i + batchSize);
      
      try {
        console.log(`[工地師父同步] 處理第 ${Math.floor(i / batchSize) + 1} 批，共 ${batch.length} 條`);
        const stmt = this.db.prepare(`
          INSERT INTO object_50hj8__c (
            _id, name, owner, owner__r, owner_department_id, owner_department,
            create_time, created_by, created_by__r,
            last_modified_time, last_modified_by, last_modified_by__r,
            life_status, life_status__r, lock_status, lock_status__r,
            is_deleted, record_type, version,
            data_own_department, data_own_department__r,
            relevant_team, total_num,
            fx_created_at, fx_updated_at, sync_version
          ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10,
            ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20,
            ?21, ?22, ?23, ?24, ?25, ?26
          )
          ON CONFLICT(_id) DO UPDATE SET
            name = excluded.name,
            owner = excluded.owner,
            owner__r = excluded.owner__r,
            owner_department_id = excluded.owner_department_id,
            owner_department = excluded.owner_department,
            last_modified_time = excluded.last_modified_time,
            last_modified_by = excluded.last_modified_by,
            last_modified_by__r = excluded.last_modified_by__r,
            life_status = excluded.life_status,
            life_status__r = excluded.life_status__r,
            lock_status = excluded.lock_status,
            lock_status__r = excluded.lock_status__r,
            is_deleted = excluded.is_deleted,
            fx_updated_at = excluded.fx_updated_at,
            sync_version = sync_version + 1,
            sync_time = CURRENT_TIMESTAMP
        `);
        
        const batchPromises = batch.map(worker => this.bindWorkerData(stmt, worker));
        const results = await this.db.batch(batchPromises);
        
        // 檢查每個結果
        results.forEach((result, index) => {
          if (result && result.success !== false) {
            success++;
          } else {
            errors++;
            const errorMsg = result?.error || result?.meta?.error || '未知錯誤';
            console.error(`工地師父 ${batch[index]._id} 保存失敗:`, errorMsg);
          }
        });
      } catch (error) {
        console.error(`批次同步失敗:`, error);
        errors += batch.length;
      }
    }
    
    return { success, errors };
  }

  /**
   * 批量同步供應商到D1
   */
  async batchSyncSuppliers(suppliers) {
    let success = 0;
    let errors = 0;
    const batchSize = 100; // 批次大小
    
    console.log(`[供應商同步] 開始同步 ${suppliers.length} 條數據到 D1`);
    
    for (let i = 0; i < suppliers.length; i += batchSize) {
      const batch = suppliers.slice(i, i + batchSize);
      
      try {
        console.log(`[供應商同步] 處理第 ${Math.floor(i / batchSize) + 1} 批，共 ${batch.length} 條`);
        const stmt = this.db.prepare(`
          INSERT INTO supplierobj (
            _id, name, owner, owner__r, owner_department_id, owner_department,
            create_time, created_by, created_by__r,
            last_modified_time, last_modified_by, last_modified_by__r,
            life_status, life_status__r, lock_status, lock_status__r,
            is_deleted, record_type, version,
            data_own_department, data_own_department__r,
            relevant_team, total_num,
            fx_created_at, fx_updated_at, sync_version
          ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10,
            ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20,
            ?21, ?22, ?23, ?24, ?25, ?26
          )
          ON CONFLICT(_id) DO UPDATE SET
            name = excluded.name,
            owner = excluded.owner,
            owner__r = excluded.owner__r,
            owner_department_id = excluded.owner_department_id,
            owner_department = excluded.owner_department,
            last_modified_time = excluded.last_modified_time,
            last_modified_by = excluded.last_modified_by,
            last_modified_by__r = excluded.last_modified_by__r,
            life_status = excluded.life_status,
            life_status__r = excluded.life_status__r,
            lock_status = excluded.lock_status,
            lock_status__r = excluded.lock_status__r,
            is_deleted = excluded.is_deleted,
            fx_updated_at = excluded.fx_updated_at,
            sync_version = sync_version + 1,
            sync_time = CURRENT_TIMESTAMP
        `);
        
        const batchPromises = batch.map(supplier => this.bindSupplierData(stmt, supplier));
        const results = await this.db.batch(batchPromises);
        
        // 檢查每個結果
        results.forEach((result, index) => {
          if (result && result.success !== false) {
            success++;
          } else {
            errors++;
            const errorMsg = result?.error || result?.meta?.error || '未知錯誤';
            console.error(`供應商 ${batch[index]._id} 保存失敗:`, errorMsg);
          }
        });
      } catch (error) {
        console.error(`批次同步失敗:`, error);
        errors += batch.length;
      }
    }
    
    return { success, errors };
  }

  /**
   * 批量同步案場(浴櫃)到D1
   */
  async batchSyncSiteCabinet(siteCabinets) {
    let success = 0;
    let errors = 0;
    const batchSize = 100; // 批次大小
    
    console.log(`[案場(浴櫃)同步] 開始同步 ${siteCabinets.length} 條數據到 D1`);
    
    for (let i = 0; i < siteCabinets.length; i += batchSize) {
      const batch = siteCabinets.slice(i, i + batchSize);
      
      try {
        console.log(`[案場(浴櫃)同步] 處理第 ${Math.floor(i / batchSize) + 1} 批，共 ${batch.length} 條`);
        const stmt = this.db.prepare(`
          INSERT INTO site_cabinet__c (
            _id, name, owner, owner__r, owner_department_id, owner_department,
            create_time, created_by, created_by__r,
            last_modified_time, last_modified_by, last_modified_by__r,
            life_status, life_status__r, lock_status, lock_status__r,
            is_deleted, record_type, version,
            data_own_department, data_own_department__r,
            relevant_team, total_num, modification_record__c,
            fx_created_at, fx_updated_at, sync_version
          ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10,
            ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20,
            ?21, ?22, ?23, ?24, ?25, ?26, ?27
          )
          ON CONFLICT(_id) DO UPDATE SET
            name = excluded.name,
            owner = excluded.owner,
            owner__r = excluded.owner__r,
            owner_department_id = excluded.owner_department_id,
            owner_department = excluded.owner_department,
            last_modified_time = excluded.last_modified_time,
            last_modified_by = excluded.last_modified_by,
            last_modified_by__r = excluded.last_modified_by__r,
            life_status = excluded.life_status,
            life_status__r = excluded.life_status__r,
            lock_status = excluded.lock_status,
            lock_status__r = excluded.lock_status__r,
            is_deleted = excluded.is_deleted,
            modification_record__c = excluded.modification_record__c,
            fx_updated_at = excluded.fx_updated_at,
            sync_version = sync_version + 1,
            sync_time = CURRENT_TIMESTAMP
        `);
        
        const batchPromises = batch.map(siteCabinet => this.bindSiteCabinetData(stmt, siteCabinet));
        const results = await this.db.batch(batchPromises);
        
        // 檢查每個結果
        results.forEach((result, index) => {
          if (result && result.success !== false) {
            success++;
          } else {
            errors++;
            const errorMsg = result?.error || result?.meta?.error || '未知錯誤';
            console.error(`案場(浴櫃) ${batch[index]._id} 保存失敗:`, errorMsg);
          }
        });
      } catch (error) {
        console.error(`批次同步失敗:`, error);
        errors += batch.length;
      }
    }
    
    return { success, errors };
  }

  /**
   * 批量同步進度管理公告到D1
   */
  async batchSyncProgressAnnouncement(progressAnnouncements) {
    let success = 0;
    let errors = 0;
    const batchSize = 100; // 批次大小
    
    console.log(`[進度管理公告同步] 開始同步 ${progressAnnouncements.length} 條數據到 D1`);
    
    for (let i = 0; i < progressAnnouncements.length; i += batchSize) {
      const batch = progressAnnouncements.slice(i, i + batchSize);
      
      try {
        console.log(`[進度管理公告同步] 處理第 ${Math.floor(i / batchSize) + 1} 批，共 ${batch.length} 條`);
        const stmt = this.db.prepare(`
          INSERT INTO progress_management_announ__c (
            _id, name, owner, owner__r, owner_department_id, owner_department,
            create_time, created_by, created_by__r,
            last_modified_time, last_modified_by, last_modified_by__r,
            life_status, life_status__r, lock_status, lock_status__r,
            is_deleted, record_type, version,
            data_own_department, data_own_department__r,
            relevant_team, total_num,
            fx_created_at, fx_updated_at, sync_version
          ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10,
            ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20,
            ?21, ?22, ?23, ?24, ?25, ?26
          )
          ON CONFLICT(_id) DO UPDATE SET
            name = excluded.name,
            owner = excluded.owner,
            owner__r = excluded.owner__r,
            owner_department_id = excluded.owner_department_id,
            owner_department = excluded.owner_department,
            last_modified_time = excluded.last_modified_time,
            last_modified_by = excluded.last_modified_by,
            last_modified_by__r = excluded.last_modified_by__r,
            life_status = excluded.life_status,
            life_status__r = excluded.life_status__r,
            lock_status = excluded.lock_status,
            lock_status__r = excluded.lock_status__r,
            is_deleted = excluded.is_deleted,
            fx_updated_at = excluded.fx_updated_at,
            sync_version = sync_version + 1,
            sync_time = CURRENT_TIMESTAMP
        `);
        
        const batchPromises = batch.map(progressAnnouncement => this.bindProgressAnnouncementData(stmt, progressAnnouncement));
        const results = await this.db.batch(batchPromises);
        
        // 檢查每個結果
        results.forEach((result, index) => {
          if (result && result.success !== false) {
            success++;
          } else {
            errors++;
            const errorMsg = result?.error || result?.meta?.error || '未知錯誤';
            console.error(`進度管理公告 ${batch[index]._id} 保存失敗:`, errorMsg);
          }
        });
      } catch (error) {
        console.error(`批次同步失敗:`, error);
        errors += batch.length;
      }
    }
    
    return { success, errors };
  }

  /**
   * 批量同步案場到D1（使用動態欄位處理）
   */
  async batchSyncSites(sites) {
    // 如果有數據，使用動態處理器
    if (sites.length > 0) {
      console.log(`[案場同步] 使用動態欄位處理器同步 ${sites.length} 條數據`);
      return this.dynamicHandler.batchSyncSitesDynamic(this.db, sites);
    }
    
    // 沒有數據時直接返回
    return { success: 0, errors: 0 };
  }
  
  /**
   * 批量同步案場到D1（舊的靜態版本，保留作為備份）
   */
  async batchSyncSitesStatic(sites) {
    let success = 0;
    let errors = 0;
    const batchSize = 10; // 減少批次大小以便更容易調試
    
    console.log(`[案場同步-靜態] 開始同步 ${sites.length} 條數據到 D1`);
    
    for (let i = 0; i < sites.length; i += batchSize) {
      const batch = sites.slice(i, i + batchSize);
      
      try {
        console.log(`[案場同步] 處理第 ${Math.floor(i / batchSize) + 1} 批，共 ${batch.length} 條`);
        const stmt = this.db.prepare(`
          INSERT INTO object_8w9cb__c (
            _id, name, owner, owner__r, owner_department_id, owner_department,
            create_time, created_by, created_by__r,
            last_modified_time, last_modified_by, last_modified_by__r,
            life_status, life_status__r, lock_status, lock_status__r,
            is_deleted, record_type, version,
            data_own_department, data_own_department__r,
            relevant_team, total_num,
            field_k7e6q__c, field_k7e6q__c__r, field_k7e6q__c__relation_ids,
            field_1P96q__c, field_1P96q__c__r, field_1P96q__c__relation_ids,
            field_npLvn__c, field_npLvn__c__r, field_npLvn__c__relation_ids,
            field_WD7k1__c, field_XuJP2__c,
            field_i2Q1g__c, field_tXAko__c, field_Q6Svh__c,
            field_23Z5i__c, field_23Z5i__c__r,
            field_dxr31__c, field_dxr31__c__r, modification_record__c,
            fx_created_at, fx_updated_at, sync_version
          ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10,
            ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20,
            ?21, ?22, ?23, ?24, ?25, ?26, ?27, ?28, ?29, ?30,
            ?31, ?32, ?33, ?34, ?35, ?36, ?37, ?38, ?39, ?40,
            ?41, ?42, ?43, ?44, ?45
          )
          ON CONFLICT(_id) DO UPDATE SET
            name = excluded.name,
            owner = excluded.owner,
            owner__r = excluded.owner__r,
            owner_department_id = excluded.owner_department_id,
            owner_department = excluded.owner_department,
            last_modified_time = excluded.last_modified_time,
            last_modified_by = excluded.last_modified_by,
            last_modified_by__r = excluded.last_modified_by__r,
            life_status = excluded.life_status,
            life_status__r = excluded.life_status__r,
            lock_status = excluded.lock_status,
            lock_status__r = excluded.lock_status__r,
            is_deleted = excluded.is_deleted,
            field_23Z5i__c = excluded.field_23Z5i__c,
            field_23Z5i__c__r = excluded.field_23Z5i__c__r,
            modification_record__c = excluded.modification_record__c,
            fx_updated_at = excluded.fx_updated_at,
            sync_version = sync_version + 1,
            sync_time = CURRENT_TIMESTAMP
        `);
        
        // 使用單個操作而不是批量操作來獲得更好的錯誤信息
        const batchResults = [];
        for (let j = 0; j < batch.length; j++) {
          const site = batch[j];
          try {
            const result = this.bindSiteData(stmt, site);
            batchResults.push({ success: true, result });
            success++;
          } catch (error) {
            errors++;
            batchResults.push({ success: false, error: error.message });
            console.error(`案場 ${site._id} (${site.name}) 保存失敗:`, error.message);
            
            // 記錄第一個錯誤的詳細信息
            if (errors === 1) {
              console.error(`第一個錯誤的詳細數據:`, {
                _id: site._id,
                name: site.name,
                owner: site.owner,
                owner_type: typeof site.owner,
                created_by: site.created_by,
                created_by_type: typeof site.created_by,
                field_23Z5i__c: site.field_23Z5i__c,
                field_23Z5i__c_type: typeof site.field_23Z5i__c
              });
            }
          }
        }
        
      } catch (error) {
        console.error(`批次同步失敗:`, error);
        errors += batch.length;
      }
    }
    
    console.log(`[案場同步] 完成: 成功 ${success}, 失敗 ${errors}`);
    return { success, errors };
  }

  /**
   * 綁定商機數據
   */
  bindOpportunityData(stmt, opp) {
    return stmt.bind(
      opp._id,
      opp.name,
      opp.amount || null,
      opp.close_date,
      opp.account_id,
      opp.account_id__r || null,
      opp.sales_stage,
      opp.sales_stage__r || null,
      opp.sales_status || null,
      opp.sales_status__r || null,
      opp.sales_process_id,
      opp.sales_process_id__r || null,
      opp.probability || null,
      opp.probability_amount || null,
      Array.isArray(opp.owner) ? opp.owner[0] : opp.owner,
      this.getObjectValue(opp.owner__r, 'name'),
      opp.owner_department_id || null,
      opp.owner_department || null,
      opp.opp_discount || null,
      opp.opp_lines_sum || null,
      JSON.stringify(opp.relevant_team || []),
      opp.create_time,
      Array.isArray(opp.created_by) ? opp.created_by[0] : opp.created_by,
      this.getObjectValue(opp.created_by__r, 'name'),
      opp.last_modified_time,
      Array.isArray(opp.last_modified_by) ? opp.last_modified_by[0] : opp.last_modified_by,
      this.getObjectValue(opp.last_modified_by__r, 'name'),
      opp.last_followed_time || null,
      opp.stg_changed_time || null,
      opp.cost_time || null,
      opp.lock_status || '0',
      opp.lock_status__r || null,
      opp.life_status || 'normal',
      opp.life_status__r || null,
      opp.is_deleted || false,
      opp.record_type || 'default__c',
      opp.version || null,
      Array.isArray(opp.data_own_department) ? opp.data_own_department[0] : opp.data_own_department,
      this.getObjectValue(opp.data_own_department__r, 'deptName'),
      opp.field_rU4l5__c || null,
      opp.field_SdEgv__c || null,
      opp.field_nI1xS__c || null,
      opp.field_lmjjf__c || null,
      opp.field_lmjjf__c__r || null,
      opp.field_UJ7fD__c || null,
      opp.field_UJ7fD__c__r || null,
      opp.field_e8m3q__c || null,
      opp.field_vE1Zn__c || null,
      opp.field_5co25__c || null,
      opp.field_i32Uj__c || null,
      opp.create_time,
      opp.last_modified_time,
      0
    ).run();
  }

  /**
   * 綁定維修單數據
   */
  bindRepairOrderData(stmt, repair) {
    // 26 個值對應 26 個欄位
    return stmt.bind(
      repair._id,                                                        // 1
      repair.name,                                                       // 2
      Array.isArray(repair.owner) ? repair.owner[0] : repair.owner,     // 3
      this.getObjectValue(repair.owner__r, 'name'),                     // 4
      repair.owner_department_id || null,                               // 5
      repair.owner_department || null,                                  // 6
      repair.create_time,                                               // 7
      Array.isArray(repair.created_by) ? repair.created_by[0] : repair.created_by, // 8
      this.getObjectValue(repair.created_by__r, 'name'),               // 9
      repair.last_modified_time,                                        // 10
      Array.isArray(repair.last_modified_by) ? repair.last_modified_by[0] : repair.last_modified_by, // 11
      this.getObjectValue(repair.last_modified_by__r, 'name'),         // 12
      repair.life_status || 'normal',                                   // 13
      repair.life_status__r || null,                                    // 14
      repair.lock_status || '0',                                        // 15
      repair.lock_status__r || null,                                    // 16
      repair.is_deleted || false,                                       // 17
      repair.record_type || 'default__c',                               // 18
      repair.version || null,                                           // 19
      Array.isArray(repair.data_own_department) ? repair.data_own_department[0] : repair.data_own_department, // 20
      this.getObjectValue(repair.data_own_department__r, 'deptName'),   // 21
      Array.isArray(repair.relevant_team) ? JSON.stringify(repair.relevant_team) : null,  // 22
      repair.total_num || null,                                         // 23
      repair.create_time,                                                // 24
      repair.last_modified_time,                                        // 25
      0                                                                  // 26
    ).run();
  }

  /**
   * 綁定工地師父數據
   */
  bindWorkerData(stmt, worker) {
    // 26 個值對應 26 個欄位
    return stmt.bind(
      worker._id,                                                        // 1
      worker.name,                                                       // 2
      Array.isArray(worker.owner) ? worker.owner[0] : worker.owner,     // 3
      this.getObjectValue(worker.owner__r, 'name'),                     // 4
      worker.owner_department_id || null,                               // 5
      worker.owner_department || null,                                  // 6
      worker.create_time,                                               // 7
      Array.isArray(worker.created_by) ? worker.created_by[0] : worker.created_by, // 8
      this.getObjectValue(worker.created_by__r, 'name'),               // 9
      worker.last_modified_time,                                        // 10
      Array.isArray(worker.last_modified_by) ? worker.last_modified_by[0] : worker.last_modified_by, // 11
      this.getObjectValue(worker.last_modified_by__r, 'name'),         // 12
      worker.life_status || 'normal',                                   // 13
      worker.life_status__r || null,                                    // 14
      worker.lock_status || '0',                                        // 15
      worker.lock_status__r || null,                                    // 16
      worker.is_deleted || false,                                       // 17
      worker.record_type || 'default__c',                               // 18
      worker.version || null,                                           // 19
      Array.isArray(worker.data_own_department) ? worker.data_own_department[0] : worker.data_own_department, // 20
      this.getObjectValue(worker.data_own_department__r, 'deptName'),   // 21
      Array.isArray(worker.relevant_team) ? JSON.stringify(worker.relevant_team) : null,  // 22
      worker.total_num || null,                                         // 23
      worker.create_time,                                                // 24
      worker.last_modified_time,                                        // 25
      0                                                                  // 26
    ).run();
  }

  /**
   * 綁定供應商數據
   */
  bindSupplierData(stmt, supplier) {
    // 26 個值對應 26 個欄位
    return stmt.bind(
      supplier._id,                                                        // 1
      supplier.name,                                                       // 2
      Array.isArray(supplier.owner) ? supplier.owner[0] : supplier.owner,     // 3
      this.getObjectValue(supplier.owner__r, 'name'),                     // 4
      supplier.owner_department_id || null,                               // 5
      supplier.owner_department || null,                                  // 6
      supplier.create_time,                                               // 7
      Array.isArray(supplier.created_by) ? supplier.created_by[0] : supplier.created_by, // 8
      this.getObjectValue(supplier.created_by__r, 'name'),               // 9
      supplier.last_modified_time,                                        // 10
      Array.isArray(supplier.last_modified_by) ? supplier.last_modified_by[0] : supplier.last_modified_by, // 11
      this.getObjectValue(supplier.last_modified_by__r, 'name'),         // 12
      supplier.life_status || 'normal',                                   // 13
      supplier.life_status__r || null,                                    // 14
      supplier.lock_status || '0',                                        // 15
      supplier.lock_status__r || null,                                    // 16
      supplier.is_deleted || false,                                       // 17
      supplier.record_type || 'default__c',                               // 18
      supplier.version || null,                                           // 19
      Array.isArray(supplier.data_own_department) ? supplier.data_own_department[0] : supplier.data_own_department, // 20
      this.getObjectValue(supplier.data_own_department__r, 'deptName'),   // 21
      Array.isArray(supplier.relevant_team) ? JSON.stringify(supplier.relevant_team) : null,  // 22
      supplier.total_num || null,                                         // 23
      supplier.create_time,                                                // 24
      supplier.last_modified_time,                                        // 25
      0                                                                  // 26
    ).run();
  }

  /**
   * 綁定案場(浴櫃)數據
   */
  bindSiteCabinetData(stmt, siteCabinet) {
    // 27 個值對應 27 個欄位
    return stmt.bind(
      siteCabinet._id,                                                        // 1
      siteCabinet.name,                                                       // 2
      Array.isArray(siteCabinet.owner) ? siteCabinet.owner[0] : siteCabinet.owner,     // 3
      this.getObjectValue(siteCabinet.owner__r, 'name'),                     // 4
      siteCabinet.owner_department_id || null,                               // 5
      siteCabinet.owner_department || null,                                  // 6
      siteCabinet.create_time,                                               // 7
      Array.isArray(siteCabinet.created_by) ? siteCabinet.created_by[0] : siteCabinet.created_by, // 8
      this.getObjectValue(siteCabinet.created_by__r, 'name'),               // 9
      siteCabinet.last_modified_time,                                        // 10
      Array.isArray(siteCabinet.last_modified_by) ? siteCabinet.last_modified_by[0] : siteCabinet.last_modified_by, // 11
      this.getObjectValue(siteCabinet.last_modified_by__r, 'name'),         // 12
      siteCabinet.life_status || 'normal',                                   // 13
      siteCabinet.life_status__r || null,                                    // 14
      siteCabinet.lock_status || '0',                                        // 15
      siteCabinet.lock_status__r || null,                                    // 16
      siteCabinet.is_deleted || false,                                       // 17
      siteCabinet.record_type || 'default__c',                               // 18
      siteCabinet.version || null,                                           // 19
      Array.isArray(siteCabinet.data_own_department) ? siteCabinet.data_own_department[0] : siteCabinet.data_own_department, // 20
      this.getObjectValue(siteCabinet.data_own_department__r, 'deptName'),   // 21
      Array.isArray(siteCabinet.relevant_team) ? JSON.stringify(siteCabinet.relevant_team) : null,  // 22
      siteCabinet.total_num || null,                                         // 23
      siteCabinet.modification_record__c || null,                            // 24
      siteCabinet.create_time,                                                // 25
      siteCabinet.last_modified_time,                                        // 26
      0                                                                  // 27
    ).run();
  }

  /**
   * 綁定進度管理公告數據
   */
  bindProgressAnnouncementData(stmt, progressAnnouncement) {
    // 26 個值對應 26 個欄位
    return stmt.bind(
      progressAnnouncement._id,                                                        // 1
      progressAnnouncement.name,                                                       // 2
      Array.isArray(progressAnnouncement.owner) ? progressAnnouncement.owner[0] : progressAnnouncement.owner,     // 3
      this.getObjectValue(progressAnnouncement.owner__r, 'name'),                     // 4
      progressAnnouncement.owner_department_id || null,                               // 5
      progressAnnouncement.owner_department || null,                                  // 6
      progressAnnouncement.create_time,                                               // 7
      Array.isArray(progressAnnouncement.created_by) ? progressAnnouncement.created_by[0] : progressAnnouncement.created_by, // 8
      this.getObjectValue(progressAnnouncement.created_by__r, 'name'),               // 9
      progressAnnouncement.last_modified_time,                                        // 10
      Array.isArray(progressAnnouncement.last_modified_by) ? progressAnnouncement.last_modified_by[0] : progressAnnouncement.last_modified_by, // 11
      this.getObjectValue(progressAnnouncement.last_modified_by__r, 'name'),         // 12
      progressAnnouncement.life_status || 'normal',                                   // 13
      progressAnnouncement.life_status__r || null,                                    // 14
      progressAnnouncement.lock_status || '0',                                        // 15
      progressAnnouncement.lock_status__r || null,                                    // 16
      progressAnnouncement.is_deleted || false,                                       // 17
      progressAnnouncement.record_type || 'default__c',                               // 18
      progressAnnouncement.version || null,                                           // 19
      Array.isArray(progressAnnouncement.data_own_department) ? progressAnnouncement.data_own_department[0] : progressAnnouncement.data_own_department, // 20
      this.getObjectValue(progressAnnouncement.data_own_department__r, 'deptName'),   // 21
      Array.isArray(progressAnnouncement.relevant_team) ? JSON.stringify(progressAnnouncement.relevant_team) : null,  // 22
      progressAnnouncement.total_num || null,                                         // 23
      progressAnnouncement.create_time,                                                // 24
      progressAnnouncement.last_modified_time,                                        // 25
      0                                                                  // 26
    ).run();
  }

  /**
   * 綁定案場數據
   */
  bindSiteData(stmt, site) {
    try {
      // 安全地處理數組字段
      const owner = Array.isArray(site.owner) ? site.owner[0] : site.owner;
      const created_by = Array.isArray(site.created_by) ? site.created_by[0] : site.created_by;
      const last_modified_by = Array.isArray(site.last_modified_by) ? site.last_modified_by[0] : site.last_modified_by;
      const data_own_department = Array.isArray(site.data_own_department) ? site.data_own_department[0] : site.data_own_department;
      // 修復：確保 field_23Z5i__c 在欄位不存在時返回 null 而不是 undefined
      const field_23Z5i__c = site.field_23Z5i__c ? 
        (Array.isArray(site.field_23Z5i__c) ? site.field_23Z5i__c[0] : site.field_23Z5i__c) : 
        null;
      
      // 安全地處理可能為 null 的字段
      const relevant_team = site.relevant_team ? JSON.stringify(site.relevant_team) : null;
      
      // 45 個值對應 45 個欄位
      return stmt.bind(
        site._id,                                                        // 1
        site.name,                                                       // 2
        owner,                                                           // 3
        this.getObjectValue(site.owner__r, 'name'),                    // 4
        site.owner_department_id || null,                               // 5
        site.owner_department || null,                                  // 6
        site.create_time,                                               // 7
        created_by,                                                      // 8
        this.getObjectValue(site.created_by__r, 'name'),               // 9
        site.last_modified_time,                                        // 10
        last_modified_by,                                                // 11
        this.getObjectValue(site.last_modified_by__r, 'name'),         // 12
        site.life_status || 'normal',                                  // 13
        site.life_status__r || null,                                   // 14
        site.lock_status || '0',                                       // 15
        site.lock_status__r || null,                                   // 16
        site.is_deleted || false,                                      // 17
        site.record_type || 'default__c',                              // 18
        site.version || null,                                          // 19
        data_own_department,                                             // 20
        this.getObjectValue(site.data_own_department__r, 'deptName'),  // 21
        relevant_team,                                                   // 22
        site.total_num || null,                                        // 23
        site.field_k7e6q__c || null,                                   // 24
        site.field_k7e6q__c__r || null,                                // 25
        site.field_k7e6q__c__relation_ids || null,                     // 26
        site.field_1P96q__c || null,                                   // 27
        site.field_1P96q__c__r || null,                                // 28
        site.field_1P96q__c__relation_ids || null,                     // 29
        site.field_npLvn__c || null,                                   // 30
        site.field_npLvn__c__r || null,                                // 31
        site.field_npLvn__c__relation_ids || null,                     // 32
        site.field_WD7k1__c || null,                                   // 33
        site.field_XuJP2__c || null,                                   // 34
        site.field_i2Q1g__c || null,                                   // 35
        site.field_tXAko__c || null,                                   // 36
        site.field_Q6Svh__c || null,                                   // 37
        field_23Z5i__c,                                                  // 38
        site.field_23Z5i__c__r || null,                                // 39
        site.field_dxr31__c || null,                                   // 40
        site.field_dxr31__c__r || null,                                // 41
        site.modification_record__c || null,                           // 42
        site.create_time,                                               // 43
        site.last_modified_time,                                        // 44
        0                                                               // 45
      ).run();
    } catch (error) {
      console.error(`綁定案場數據失敗 (ID: ${site._id}):`, error);
      console.error(`問題數據:`, {
        _id: site._id,
        name: site.name,
        owner: site.owner,
        created_by: site.created_by,
        field_23Z5i__c: site.field_23Z5i__c
      });
      throw error;
    }
  }

  /**
   * 獲取對象值
   */
  getObjectValue(obj, key) {
    if (!obj) return null;
    if (typeof obj === 'string') return obj;
    return obj[key] || null;
  }

  /**
   * 獲取最後同步時間
   */
  async getLastSyncTime(entityType) {
    const result = await this.db.prepare(`
      SELECT MAX(completed_at) as last_sync
      FROM sync_logs
      WHERE entity_type = ? AND status = 'COMPLETED'
    `).bind(entityType).first();
    
    if (result?.last_sync) {
      // FX API 期望時間戳格式（毫秒）
      const timestamp = new Date(result.last_sync).getTime();
      console.log(`[getLastSyncTime] 實體類型: ${entityType}, 最後同步時間: ${result.last_sync}, 時間戳: ${timestamp}`);
      return timestamp;
    }
    
    console.log(`[getLastSyncTime] 實體類型: ${entityType}, 沒有找到同步記錄`);
    return null;
  }

  /**
   * 保存同步進度（用於斷點續傳）
   */
  async saveSyncProgress(entityType, offset) {
    try {
      await this.db.prepare(`
        INSERT INTO sync_progress (entity_type, current_offset, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(entity_type) DO UPDATE SET
          current_offset = excluded.current_offset,
          updated_at = excluded.updated_at
      `).bind(entityType, offset, new Date().toISOString()).run();
      console.log(`[saveSyncProgress] 保存進度: ${entityType} offset=${offset}`);
    } catch (error) {
      console.error(`[saveSyncProgress] 保存進度失敗:`, error);
    }
  }

  /**
   * 獲取同步進度
   */
  async getSyncProgress(entityType) {
    try {
      const result = await this.db.prepare(`
        SELECT current_offset as offset, updated_at
        FROM sync_progress
        WHERE entity_type = ?
      `).bind(entityType).first();
      
      if (result) {
        console.log(`[getSyncProgress] 讀取進度: ${entityType} offset=${result.offset}`);
        return result;
      }
    } catch (error) {
      // 表可能不存在，忽略錯誤
      console.log(`[getSyncProgress] 無保存的進度: ${entityType}`);
    }
    return null;
  }

  /**
   * 清除同步進度
   */
  async clearSyncProgress(entityType) {
    try {
      await this.db.prepare(`
        DELETE FROM sync_progress WHERE entity_type = ?
      `).bind(entityType).run();
      console.log(`[clearSyncProgress] 清除進度: ${entityType}`);
    } catch (error) {
      console.error(`[clearSyncProgress] 清除進度失敗:`, error);
    }
  }

  /**
   * 記錄同步開始
   */
  async logSyncStart(syncId, entityType, startTime) {
    await this.db.prepare(`
      INSERT INTO sync_logs (
        sync_id, entity_type, action, status, started_at
      ) VALUES (?, ?, 'SYNC', 'IN_PROGRESS', ?)
    `).bind(syncId, entityType, startTime.toISOString()).run();
  }

  /**
   * 記錄同步完成
   */
  async logSyncComplete(syncId, entityType, stats) {
    // 使用台北時間 (UTC+8)
    const taipeiTime = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    
    await this.db.prepare(`
      UPDATE sync_logs
      SET status = 'COMPLETED',
          completed_at = ?,
          records_count = ?,
          error_count = ?,
          details = ?
      WHERE sync_id = ?
    `).bind(
      taipeiTime,
      stats.records_count,
      stats.error_count,
      JSON.stringify(stats),
      syncId
    ).run();
  }

  /**
   * 記錄同步錯誤
   */
  async logSyncError(syncId, entityType, error) {
    // 使用台北時間 (UTC+8)
    const taipeiTime = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    
    await this.db.prepare(`
      UPDATE sync_logs
      SET status = 'FAILED',
          completed_at = ?,
          details = ?
      WHERE sync_id = ?
    `).bind(
      taipeiTime,
      JSON.stringify({ error: error.message, stack: error.stack }),
      syncId
    ).run();
  }

  /**
   * 保存商機連絡人到D1資料庫
   */
  async saveOpportunityContact(contact) {
    const stmt = this.db.prepare(`
      INSERT INTO newopportunitycontactsobj (
        _id, name,
        new_opportunity_id, new_opportunity_id__r, new_opportunity_id__relation_ids,
        contact_id, contact_id__r, contact_id__relation_ids,
        field_ck71r__c, field_ck71r__c__r, field_ck71r__c__relation_ids,
        owner, owner__r, owner_department_id, owner_department,
        create_time, created_by, created_by__r,
        last_modified_time, last_modified_by, last_modified_by__r,
        life_status, life_status__r, lock_status, lock_status__r,
        is_deleted, record_type, version,
        data_own_department, data_own_department__r,
        total_num, extend_obj_data_id,
        fx_created_at, fx_updated_at, sync_version
      ) VALUES (
        ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10,
        ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20,
        ?21, ?22, ?23, ?24, ?25, ?26, ?27, ?28, ?29, ?30,
        ?31, ?32, ?33, ?34, ?35
      )
      ON CONFLICT(_id) DO UPDATE SET
        name = excluded.name,
        new_opportunity_id = excluded.new_opportunity_id,
        new_opportunity_id__r = excluded.new_opportunity_id__r,
        contact_id = excluded.contact_id,
        contact_id__r = excluded.contact_id__r,
        field_ck71r__c = excluded.field_ck71r__c,
        field_ck71r__c__r = excluded.field_ck71r__c__r,
        owner = excluded.owner,
        owner__r = excluded.owner__r,
        last_modified_time = excluded.last_modified_time,
        last_modified_by = excluded.last_modified_by,
        last_modified_by__r = excluded.last_modified_by__r,
        life_status = excluded.life_status,
        lock_status = excluded.lock_status,
        is_deleted = excluded.is_deleted,
        fx_updated_at = excluded.fx_updated_at,
        sync_version = sync_version + 1,
        sync_time = CURRENT_TIMESTAMP
    `);

    // 處理數據
    const ownerValue = Array.isArray(contact.owner) ? contact.owner[0] : contact.owner;
    const ownerName = this.getObjectValue(contact.owner__r, 'name');
    const createdByValue = Array.isArray(contact.created_by) ? contact.created_by[0] : contact.created_by;
    const createdByName = this.getObjectValue(contact.created_by__r, 'name');
    const lastModifiedByValue = Array.isArray(contact.last_modified_by) ? contact.last_modified_by[0] : contact.last_modified_by;
    const lastModifiedByName = this.getObjectValue(contact.last_modified_by__r, 'name');

    // 執行插入
    try {
      return stmt.bind(
        contact._id,                                                          // 1
        contact.name || '',                                                   // 2
        contact.new_opportunity_id || null,                                   // 3
        contact.new_opportunity_id__r || null,                               // 4
        contact.new_opportunity_id__relation_ids || null,                     // 5
        contact.contact_id || null,                                           // 6
        contact.contact_id__r || null,                                        // 7
        contact.contact_id__relation_ids || null,                             // 8
        contact.field_ck71r__c || null,                                       // 9
        contact.field_ck71r__c__r || null,                                    // 10
        contact.field_ck71r__c__relation_ids || null,                         // 11
        ownerValue,                                                           // 12
        ownerName,                                                            // 13
        contact.owner_department_id || null,                                  // 14
        contact.owner_department || null,                                     // 15
        contact.create_time,                                                  // 16
        createdByValue,                                                       // 17
        createdByName,                                                        // 18
        contact.last_modified_time,                                           // 19
        lastModifiedByValue,                                                  // 20
        lastModifiedByName,                                                   // 21
        contact.life_status || 'normal',                                      // 22
        contact.life_status__r || null,                                       // 23
        contact.lock_status || '0',                                           // 24
        contact.lock_status__r || null,                                       // 25
        contact.is_deleted || false,                                          // 26
        contact.record_type || 'default__c',                                  // 27
        contact.version || null,                                              // 28
        Array.isArray(contact.data_own_department) ? contact.data_own_department[0] : contact.data_own_department, // 29
        this.getObjectValue(contact.data_own_department__r, 'deptName'),      // 30
        contact.total_num || null,                                            // 31
        contact.extend_obj_data_id || null,                                   // 32
        contact.create_time,                                                  // 33
        contact.last_modified_time,                                           // 34
        0                                                                     // 35
      ).run();
    } catch (error) {
      console.error(`保存商機連絡人失敗 (ID: ${contact._id}):`, error);
      throw error;
    }
  }
}