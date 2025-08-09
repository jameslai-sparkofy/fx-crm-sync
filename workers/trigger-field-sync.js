const https = require('https');
const fs = require('fs');

async function makePostRequest(endpoint, payload = {}) {
    return new Promise((resolve, reject) => {
        const url = `https://fx-crm-sync.lai-jameslai.workers.dev${endpoint}`;
        const data = JSON.stringify(payload);
        
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };
        
        const req = https.request(url, options, (response) => {
            let responseData = '';
            
            response.on('data', (chunk) => {
                responseData += chunk;
            });
            
            response.on('end', () => {
                try {
                    const jsonData = JSON.parse(responseData);
                    resolve(jsonData);
                } catch (error) {
                    resolve(responseData);
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.write(data);
        req.end();
    });
}

async function makeGetRequest(endpoint) {
    return new Promise((resolve, reject) => {
        const url = `https://fx-crm-sync.lai-jameslai.workers.dev${endpoint}`;
        
        https.get(url, (response) => {
            let data = '';
            
            response.on('data', (chunk) => {
                data += chunk;
            });
            
            response.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve(jsonData);
                } catch (error) {
                    resolve(data);
                }
            });
        }).on('error', (error) => {
            reject(error);
        });
    });
}

async function triggerFieldSyncAndTest() {
    console.log('=== TRIGGERING FIELD SYNC FOR NEWOPPORTUNITYOBJ ===\\n');
    
    try {
        // 1. First, check current state
        console.log('1. Checking current field state...');
        const currentFields = await makeGetRequest('/api/schema/NewOpportunityObj/fields');
        console.log('Current source:', currentFields.data?.source);
        console.log('Current field count:', currentFields.data?.fieldCount);
        
        const hasBathroomCabinetBefore = currentFields.data?.fields?.some(f => 
            f.apiName?.includes('浴櫃價格') || f.label?.includes('浴櫃價格') || 
            f.apiName === 'field_l47x8__c'
        );
        console.log('Has bathroom cabinet field (before):', hasBathroomCabinetBefore);
        
        // 2. Trigger field sync for NewOpportunityObj
        console.log('\\n2. Triggering field sync for NewOpportunityObj...');
        const syncResponse = await makePostRequest('/api/field-sync/NewOpportunityObj');
        console.log('Field sync response:');
        console.log('- Success:', syncResponse.success);
        if (syncResponse.success) {
            console.log('- Object:', syncResponse.data.displayName);
            console.log('- CRM fields found:', syncResponse.data.comparison?.crmFields?.length || 0);
            console.log('- Fields to add:', syncResponse.data.comparison?.fieldsToAdd || 0);
            console.log('- Fields to update:', syncResponse.data.comparison?.fieldsToUpdate || 0);
            console.log('- Changes made:', syncResponse.data.changes?.length || 0);
        } else {
            console.log('- Error:', syncResponse.error);
        }
        
        // 3. Wait a moment then check the field sync endpoint
        console.log('\\n3. Checking field sync database endpoint...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        
        const syncFields = await makeGetRequest('/api/field-sync/NewOpportunityObj/fields');
        console.log('Field sync endpoint response:');
        console.log('- Success:', syncFields.success);
        if (syncFields.success) {
            console.log('- Source:', syncFields.data?.source);
            console.log('- Field count:', syncFields.data?.fieldCount);
        } else {
            console.log('- Error:', syncFields.error);
        }
        
        // 4. Check the schema endpoint again
        console.log('\\n4. Re-checking schema endpoint...');
        const updatedFields = await makeGetRequest('/api/schema/NewOpportunityObj/fields');
        console.log('Updated schema response:');
        console.log('- Success:', updatedFields.success);
        console.log('- Source:', updatedFields.data?.source);
        console.log('- Field count:', updatedFields.data?.fieldCount);
        
        const hasBathroomCabinetAfter = updatedFields.data?.fields?.some(f => 
            f.apiName?.includes('浴櫃價格') || f.label?.includes('浴櫃價格') || 
            f.apiName === 'field_l47x8__c'
        );
        console.log('- Has bathroom cabinet field (after):', hasBathroomCabinetAfter);
        
        // 5. Summary
        console.log('\\n=== FIELD SYNC RESULTS SUMMARY ===');
        console.log('✅ Field sync triggered:', syncResponse.success);
        console.log('✅ Data source changed:', currentFields.data?.source !== updatedFields.data?.source);
        console.log('✅ Now using database source:', updatedFields.data?.source === 'database');
        console.log('✅ Bathroom cabinet field removed:', hasBathroomCabinetBefore && !hasBathroomCabinetAfter);
        console.log('✅ Field count changed:', currentFields.data?.fieldCount !== updatedFields.data?.fieldCount);
        console.log('=====================================');
        
        // Save detailed results
        const results = {
            timestamp: new Date().toISOString(),
            before: {
                source: currentFields.data?.source,
                fieldCount: currentFields.data?.fieldCount,
                hasBathroomCabinet: hasBathroomCabinetBefore
            },
            syncResponse: syncResponse,
            after: {
                source: updatedFields.data?.source,
                fieldCount: updatedFields.data?.fieldCount,
                hasBathroomCabinet: hasBathroomCabinetAfter
            },
            summary: {
                fieldSyncTriggered: syncResponse.success,
                dataSourceChanged: currentFields.data?.source !== updatedFields.data?.source,
                nowUsingDatabase: updatedFields.data?.source === 'database',
                bathroomCabinetRemoved: hasBathroomCabinetBefore && !hasBathroomCabinetAfter,
                fieldCountChanged: currentFields.data?.fieldCount !== updatedFields.data?.fieldCount
            }
        };
        
        fs.writeFileSync('field-sync-results.json', JSON.stringify(results, null, 2));
        console.log('\\nDetailed results saved to field-sync-results.json');
        
        return results;
        
    } catch (error) {
        console.error('Error during field sync process:', error);
        throw error;
    }
}

triggerFieldSyncAndTest().catch(console.error);