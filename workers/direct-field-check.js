const { exec } = require('child_process');
const fs = require('fs');
const util = require('util');

const execAsync = util.promisify(exec);

async function directFieldCheck() {
    console.log('Performing direct field check through the API...');
    
    const results = {
        timestamp: new Date().toISOString(),
        checks: []
    };
    
    try {
        // Check if we can trigger field sync to populate the field definitions table
        console.log('1. Triggering field sync to ensure field definitions are loaded...');
        try {
            const { stdout: syncResult } = await execAsync(`curl -s -X POST "https://fx-crm-sync.lai-jameslai.workers.dev/api/field-sync/trigger" -H "Content-Type: application/json" -d '{"objects":["NewOpportunityObj"]}'`);
            console.log('Field sync result:', syncResult);
            results.checks.push({
                name: 'Field sync trigger',
                result: syncResult,
                success: syncResult.includes('success') || syncResult.includes('started')
            });
            
            // Wait a moment for sync to complete
            console.log('Waiting 5 seconds for field sync to complete...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            
        } catch (error) {
            results.checks.push({
                name: 'Field sync trigger',
                result: `Error: ${error.message}`,
                success: false
            });
        }
        
        // Check field definitions after sync
        console.log('2. Checking field definitions after sync...');
        try {
            const { stdout: fieldResult } = await execAsync(`curl -s "https://fx-crm-sync.lai-jameslai.workers.dev/api/schema/NewOpportunityObj/fields"`);
            console.log('Field definitions result:', fieldResult);
            
            let fieldData;
            try {
                fieldData = JSON.parse(fieldResult);
                results.checks.push({
                    name: 'Field definitions check',
                    result: fieldData,
                    success: fieldData.success && fieldData.data && fieldData.data.fieldCount > 0,
                    fieldCount: fieldData.data?.fieldCount || 0,
                    source: fieldData.data?.source || 'unknown'
                });
            } catch (e) {
                results.checks.push({
                    name: 'Field definitions check',
                    result: fieldResult,
                    success: false,
                    error: 'Invalid JSON response'
                });
            }
            
        } catch (error) {
            results.checks.push({
                name: 'Field definitions check',
                result: `Error: ${error.message}`,
                success: false
            });
        }
        
        // Check if predefined mappings are being used instead
        console.log('3. Checking for predefined field mappings fallback...');
        try {
            // Try to get response even if field count is 0 to see what's happening
            const { stdout: debugResult } = await execAsync(`curl -s "https://fx-crm-sync.lai-jameslai.workers.dev/api/schema/Opportunity/fields"`);
            console.log('Alternative object name result:', debugResult);
            
            let debugData;
            try {
                debugData = JSON.parse(debugResult);
                results.checks.push({
                    name: 'Alternative object name check',
                    result: debugData,
                    success: debugData.success && debugData.data && debugData.data.fieldCount > 0,
                    fieldCount: debugData.data?.fieldCount || 0,
                    source: debugData.data?.source || 'unknown'
                });
            } catch (e) {
                results.checks.push({
                    name: 'Alternative object name check',
                    result: debugResult,
                    success: false,
                    error: 'Invalid JSON response'
                });
            }
            
        } catch (error) {
            results.checks.push({
                name: 'Alternative object name check',
                result: `Error: ${error.message}`,
                success: false
            });
        }
        
        // Check web interface field loading
        console.log('4. Checking web interface field loading through JavaScript execution...');
        try {
            // Get the web page and check if it has field loading logic
            const { stdout: pageContent } = await execAsync(`curl -s "https://fx-crm-sync.lai-jameslai.workers.dev/"`);
            
            // Check for field loading patterns in the JavaScript
            const hasFieldLoading = pageContent.includes('loadFieldMapping') && 
                                   pageContent.includes('/api/schema/') &&
                                   pageContent.includes('fieldMappings');
            
            results.checks.push({
                name: 'Web interface field loading logic',
                result: `Field loading logic present: ${hasFieldLoading}`,
                success: hasFieldLoading,
                details: {
                    hasLoadFieldMapping: pageContent.includes('loadFieldMapping'),
                    hasSchemaAPI: pageContent.includes('/api/schema/'),
                    hasFieldMappingsVar: pageContent.includes('fieldMappings')
                }
            });
            
        } catch (error) {
            results.checks.push({
                name: 'Web interface field loading logic',
                result: `Error: ${error.message}`,
                success: false
            });
        }
        
        // Summary
        const successfulChecks = results.checks.filter(c => c.success).length;
        const totalChecks = results.checks.length;
        
        console.log('\n=== FIELD CHECK SUMMARY ===');
        console.log(`Total checks: ${totalChecks}`);
        console.log(`Successful: ${successfulChecks}`);
        console.log(`Failed: ${totalChecks - successfulChecks}`);
        
        console.log('\n=== DETAILED RESULTS ===');
        results.checks.forEach((check, index) => {
            console.log(`${index + 1}. ${check.name}: ${check.success ? 'SUCCESS' : 'FAILED'}`);
            if (check.fieldCount !== undefined) {
                console.log(`   Field count: ${check.fieldCount}`);
            }
            if (check.source) {
                console.log(`   Source: ${check.source}`);
            }
            if (check.error) {
                console.log(`   Error: ${check.error}`);
            }
        });
        
        // Save results
        fs.writeFileSync('direct-field-check-results.json', JSON.stringify(results, null, 2));
        console.log('\nResults saved to direct-field-check-results.json');
        
        return results;
        
    } catch (error) {
        console.error('Error during field check:', error);
        results.checks.push({
            name: 'Overall execution',
            result: `Error: ${error.message}`,
            success: false
        });
        
        fs.writeFileSync('direct-field-check-results.json', JSON.stringify(results, null, 2));
        return results;
    }
}

// Run the check
directFieldCheck();