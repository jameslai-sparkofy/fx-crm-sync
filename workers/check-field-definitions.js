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

async function checkFieldDefinitionsTable() {
    console.log('Checking fx_field_definitions table status...');
    
    try {
        // Try various endpoints to check field definitions
        const possibleEndpoints = [
            '/api/field-sync/NewOpportunityObj/status',
            '/api/field-sync/objects/NewOpportunityObj',
            '/api/sync/objects',
            '/api/objects',
            '/api/field-sync'
        ];
        
        const results = {};
        
        for (const endpoint of possibleEndpoints) {
            try {
                console.log(`Testing endpoint: ${endpoint}`);
                const response = await makeGetRequest(endpoint);
                results[endpoint] = response;
                console.log(`✓ ${endpoint}: ${response.success ? 'Success' : 'Error/No data'}`);
            } catch (error) {
                console.log(`✗ ${endpoint}: ${error.message}`);
                results[endpoint] = { error: error.message };
            }
        }
        
        // Try to trigger field sync for NewOpportunityObj
        console.log('\nTrying to trigger field sync...');
        try {
            const syncResponse = await makePostRequest('/api/field-sync/NewOpportunityObj/sync');
            console.log('Field sync response:', syncResponse);
            results['field-sync-trigger'] = syncResponse;
        } catch (error) {
            console.log('Field sync trigger failed:', error.message);
            results['field-sync-trigger'] = { error: error.message };
        }
        
        // After potential sync, test the schema endpoint again
        console.log('\nRe-testing schema endpoint after sync attempt...');
        try {
            const schemaResponse = await makeGetRequest('/api/schema/NewOpportunityObj/fields');
            console.log('Schema response after sync:');
            console.log('- Source:', schemaResponse.data?.source);
            console.log('- Field count:', schemaResponse.data?.fieldCount);
            console.log('- Has bathroom cabinet field:', schemaResponse.data?.fields?.some(f => 
                f.apiName?.includes('浴櫃價格') || f.label?.includes('浴櫃價格')
            ));
            results['schema-after-sync'] = schemaResponse;
        } catch (error) {
            console.log('Schema check after sync failed:', error.message);
            results['schema-after-sync'] = { error: error.message };
        }
        
        fs.writeFileSync('field-definitions-check.json', JSON.stringify(results, null, 2));
        
        console.log('\n=== FIELD DEFINITIONS CHECK SUMMARY ===');
        console.log('Results saved to field-definitions-check.json');
        
        return results;
        
    } catch (error) {
        console.error('Error checking field definitions:', error);
        throw error;
    }
}

checkFieldDefinitionsTable().catch(console.error);