/**
 * R2 圖片處理器
 * 用於處理 CRM 中的圖片欄位，將圖片下載並儲存到 Cloudflare R2
 */
export class R2ImageHandler {
  constructor(r2Bucket, fxClient) {
    this.r2Bucket = r2Bucket;
    this.fxClient = fxClient;
  }

  /**
   * 處理記錄中的圖片欄位
   * @param {object} record - CRM 記錄
   * @param {array} imageFields - 圖片欄位列表
   * @returns {object} 更新後的記錄
   */
  async processRecordImages(record, imageFields) {
    const updatedRecord = { ...record };
    
    for (const field of imageFields) {
      const fieldValue = record[field.apiName];
      
      if (!fieldValue) continue;
      
      try {
        // 處理不同格式的圖片欄位
        if (typeof fieldValue === 'string' && fieldValue.startsWith('http')) {
          // 直接的圖片 URL
          const r2Key = await this.uploadImageFromUrl(fieldValue, record._id, field.apiName);
          updatedRecord[`${field.apiName}_r2`] = r2Key;
          
        } else if (Array.isArray(fieldValue)) {
          // 多個圖片
          const r2Keys = [];
          for (let i = 0; i < fieldValue.length; i++) {
            if (fieldValue[i]?.url) {
              const r2Key = await this.uploadImageFromUrl(
                fieldValue[i].url, 
                record._id, 
                `${field.apiName}_${i}`
              );
              r2Keys.push(r2Key);
            }
          }
          updatedRecord[`${field.apiName}_r2`] = JSON.stringify(r2Keys);
          
        } else if (fieldValue?.fileId) {
          // 紛享銷客檔案 ID
          const fileUrl = await this.getFxFileUrl(fieldValue.fileId);
          if (fileUrl) {
            const r2Key = await this.uploadImageFromUrl(fileUrl, record._id, field.apiName);
            updatedRecord[`${field.apiName}_r2`] = r2Key;
          }
        }
        
      } catch (error) {
        console.error(`[R2ImageHandler] 處理圖片欄位 ${field.apiName} 失敗:`, error);
        // 繼續處理其他欄位
      }
    }
    
    return updatedRecord;
  }

  /**
   * 從 URL 下載圖片並上傳到 R2
   * @param {string} imageUrl - 圖片 URL
   * @param {string} recordId - 記錄 ID
   * @param {string} fieldName - 欄位名稱
   * @returns {string} R2 object key
   */
  async uploadImageFromUrl(imageUrl, recordId, fieldName) {
    try {
      console.log(`[R2ImageHandler] 下載圖片: ${imageUrl}`);
      
      // 下載圖片
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`下載失敗: ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const imageData = await response.arrayBuffer();
      
      // 生成 R2 key
      const timestamp = Date.now();
      const extension = this.getExtensionFromContentType(contentType);
      const r2Key = `crm-images/${recordId}/${fieldName}_${timestamp}.${extension}`;
      
      // 上傳到 R2
      await this.r2Bucket.put(r2Key, imageData, {
        httpMetadata: {
          contentType: contentType
        },
        customMetadata: {
          recordId: recordId,
          fieldName: fieldName,
          originalUrl: imageUrl,
          uploadedAt: new Date().toISOString()
        }
      });
      
      console.log(`[R2ImageHandler] 圖片已上傳到 R2: ${r2Key}`);
      return r2Key;
      
    } catch (error) {
      console.error('[R2ImageHandler] 上傳圖片失敗:', error);
      throw error;
    }
  }

  /**
   * 獲取紛享銷客檔案的下載 URL
   * @param {string} fileId - 檔案 ID
   * @returns {string} 檔案 URL
   */
  async getFxFileUrl(fileId) {
    try {
      const response = await this.fxClient.post('/cgi/file/download/getUrl', {
        data: {
          fileId: fileId
        }
      });
      
      if (response.errorCode !== 0) {
        throw new Error(`獲取檔案 URL 失敗: ${response.errorMessage}`);
      }
      
      return response.data?.downloadUrl;
      
    } catch (error) {
      console.error('[R2ImageHandler] 獲取檔案 URL 失敗:', error);
      return null;
    }
  }

  /**
   * 從 Content-Type 獲取檔案副檔名
   */
  getExtensionFromContentType(contentType) {
    const typeMap = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
      'image/bmp': 'bmp'
    };
    
    return typeMap[contentType] || 'jpg';
  }

  /**
   * 獲取 R2 圖片的公開 URL
   * @param {string} r2Key - R2 object key
   * @returns {string} 公開 URL
   */
  getPublicUrl(r2Key) {
    // 需要配置 R2 bucket 的公開訪問域名
    const r2Domain = process.env.R2_PUBLIC_DOMAIN || 'https://your-r2-domain.com';
    return `${r2Domain}/${r2Key}`;
  }

  /**
   * 批量處理記錄中的圖片
   * @param {array} records - CRM 記錄陣列
   * @param {array} imageFields - 圖片欄位列表
   * @returns {array} 更新後的記錄陣列
   */
  async processRecordsImages(records, imageFields) {
    if (!imageFields || imageFields.length === 0) {
      return records;
    }
    
    const processedRecords = [];
    
    // 分批處理避免同時處理太多圖片
    const batchSize = 5;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const processedBatch = await Promise.all(
        batch.map(record => this.processRecordImages(record, imageFields))
      );
      processedRecords.push(...processedBatch);
    }
    
    return processedRecords;
  }
}