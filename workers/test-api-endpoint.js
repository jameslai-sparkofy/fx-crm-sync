const https = require('https');
const fs = require('fs');

async function testAPIEndpoint(endpoint) {
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
                    resolve(data); // Return raw data if not JSON
                }
            });
            
        }).on('error', (error) => {
            reject(error);
        });
    });
}

async function testOpportunityFields() {
    console.log('Testing Opportunity object field mappings via API...');
    
    try {
        // Test the Opportunity object fields
        console.log('Fetching NewOpportunityObj fields...');
        const opportunityFields = await testAPIEndpoint('/api/schema/NewOpportunityObj/fields');
        
        console.log('\n=== OPPORTUNITY FIELDS API RESPONSE ===');
        console.log('Response type:', typeof opportunityFields);
        console.log('Success:', opportunityFields.success);
        
        if (opportunityFields.success && opportunityFields.data) {
            const { fields, source } = opportunityFields.data;
            
            console.log('Data source:', source);
            console.log('Total fields:', fields.length);
            
            // Check for bathroom cabinet field
            const bathroomCabinetField = fields.find(field => 
                field.apiName?.includes('浴櫃價格') || 
                field.apiName?.includes('bathroom_cabinet_price') ||
                field.label?.includes('浴櫃價格') ||
                field.label?.includes('bathroom cabinet price')
            );
            
            console.log('Bathroom cabinet field found:', !!bathroomCabinetField);
            
            if (bathroomCabinetField) {
                console.log('Bathroom cabinet field details:', bathroomCabinetField);
            }
            
            // List first 10 fields for verification
            console.log('\nFirst 10 fields:');
            fields.slice(0, 10).forEach((field, index) => {
                console.log(`${index + 1}. ${field.apiName} - ${field.label} (${field.dataType})`);
            });
            
            // Save detailed results
            const results = {
                timestamp: new Date().toISOString(),
                source: source,
                totalFields: fields.length,
                hasBathroomCabinetField: !!bathroomCabinetField,
                bathroomCabinetField: bathroomCabinetField || null,
                allFields: fields,
                isDatabaseSource: source === 'database',
                isPredefinedSource: source === 'predefined'
            };
            
            fs.writeFileSync('opportunity-fields-test.json', JSON.stringify(results, null, 2));
            
            console.log('\n=== FINAL VERIFICATION RESULTS ===');
            console.log('✅ Data source:', source);
            console.log('✅ Using database source:', source === 'database');
            console.log('✅ Bathroom cabinet field removed:', !bathroomCabinetField);
            console.log('✅ Total real CRM fields:', fields.length);
            console.log('=======================================');
            
            return results;
            
        } else {
            console.log('Error or unexpected response format');
            console.log('Full response:', JSON.stringify(opportunityFields, null, 2));
            return null;
        }
        
    } catch (error) {
        console.error('Error testing API endpoint:', error);
        throw error;
    }
}

// Also test other objects for comparison
async function testMultipleObjects() {
    const objects = ['NewOpportunityObj', 'object_8W9cb__c', 'SupplierObj'];
    const results = {};
    
    for (const objectName of objects) {
        try {
            console.log(`\nTesting ${objectName}...`);
            const response = await testAPIEndpoint(`/api/schema/${objectName}/fields`);
            
            if (response.success && response.data) {
                results[objectName] = {
                    source: response.data.source,
                    fieldCount: response.data.fields.length,
                    isDatabaseSource: response.data.source === 'database'
                };
                console.log(`${objectName} - Source: ${response.data.source}, Fields: ${response.data.fields.length}`);
            }
        } catch (error) {
            console.log(`Error testing ${objectName}:`, error.message);
            results[objectName] = { error: error.message };
        }
    }
    
    fs.writeFileSync('all-objects-test.json', JSON.stringify(results, null, 2));
    return results;
}

// Run the tests
async function runAllTests() {
    console.log('Starting comprehensive API tests...');
    
    const opportunityResults = await testOpportunityFields();
    const allObjectsResults = await testMultipleObjects();
    
    console.log('\n=== COMPREHENSIVE TEST SUMMARY ===');
    console.log('Opportunity object test completed');
    console.log('Multiple objects test completed');
    console.log('Results saved to JSON files');
    console.log('==================================');
    
    return {
        opportunity: opportunityResults,
        allObjects: allObjectsResults
    };
}

runAllTests().catch(console.error);