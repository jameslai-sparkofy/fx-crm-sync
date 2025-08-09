const { exec } = require('child_process');
const fs = require('fs');
const util = require('util');

const execAsync = util.promisify(exec);

async function comprehensiveWebTestCurl() {
    const results = {
        timestamp: new Date().toISOString(),
        url: 'https://fx-crm-sync.lai-jameslai.workers.dev/',
        tests: [],
        summary: {
            passed: 0,
            failed: 0,
            total: 0
        }
    };
    
    try {
        console.log('Starting comprehensive web interface test using curl...');
        
        // Test 1: Fetch main page
        console.log('Test 1: Fetching main page...');
        const { stdout: pageContent } = await execAsync(`curl -s -L "https://fx-crm-sync.lai-jameslai.workers.dev/"`);
        
        fs.writeFileSync('final-curl-test-page.html', pageContent);
        
        results.tests.push({
            name: 'Main page fetch',
            status: pageContent.length > 100 ? 'PASS' : 'FAIL',
            details: `Page content length: ${pageContent.length} characters`
        });
        
        // Test 2: Check for Opportunity object references
        console.log('Test 2: Checking for Opportunity object...');
        const hasOpportunity = pageContent.toLowerCase().includes('opportunity') || pageContent.includes('商機');
        results.tests.push({
            name: 'Opportunity object presence',
            status: hasOpportunity ? 'PASS' : 'FAIL',
            details: `Opportunity references: ${hasOpportunity ? 'Found' : 'Not found'}`
        });
        
        // Test 3: Check data source
        console.log('Test 3: Checking data source...');
        const hasDatabaseSource = pageContent.toLowerCase().includes('database');
        const hasPredefinedSource = pageContent.toLowerCase().includes('predefined');
        const correctDataSource = hasDatabaseSource && !hasPredefinedSource;
        
        results.tests.push({
            name: 'Data source verification',
            status: correctDataSource ? 'PASS' : 'FAIL',
            details: `Database: ${hasDatabaseSource ? 'Found' : 'Not found'}, Predefined: ${hasPredefinedSource ? 'Found' : 'Not found'}`
        });
        
        // Test 4: Check for fake field "浴櫃價格"
        console.log('Test 4: Checking for fake field removal...');
        const hasFakeField = pageContent.includes('浴櫃價格');
        results.tests.push({
            name: 'Fake field "浴櫃價格" removal',
            status: !hasFakeField ? 'PASS' : 'FAIL',
            details: `Fake field "浴櫃價格": ${!hasFakeField ? 'Successfully removed' : 'Still present'}`
        });
        
        // Test 5: Check for specific fake field IDs
        console.log('Test 5: Checking for specific fake field IDs...');
        const hasField_l47x8 = pageContent.includes('field_l47x8__c');
        const hasField_8EBz1 = pageContent.includes('field_8EBz1__c');
        
        results.tests.push({
            name: 'Specific fake field IDs removal',
            status: (!hasField_l47x8 && !hasField_8EBz1) ? 'PASS' : 'FAIL',
            details: `field_l47x8__c: ${!hasField_l47x8 ? 'Removed' : 'Present'}, field_8EBz1__c: ${!hasField_8EBz1 ? 'Removed' : 'Present'}`
        });
        
        // Test 6: Count field references
        console.log('Test 6: Counting field references...');
        const fieldMatches = pageContent.match(/field_\w+__c/g) || [];
        const uniqueFields = [...new Set(fieldMatches)];
        const fieldCount = uniqueFields.length;
        
        results.tests.push({
            name: 'Field count verification',
            status: (fieldCount > 50 && fieldCount < 70) ? 'PASS' : 'WARN',
            details: `Found ${fieldCount} unique fields (expected around 63). Fields: ${uniqueFields.slice(0, 10).join(', ')}${uniqueFields.length > 10 ? '...' : ''}`
        });
        
        // Test 7: Check for API endpoints
        console.log('Test 7: Checking for API endpoints...');
        try {
            const { stdout: apiResponse } = await execAsync(`curl -s -L "https://fx-crm-sync.lai-jameslai.workers.dev/api/objects"`);
            fs.writeFileSync('final-curl-api-objects.json', apiResponse);
            
            let apiData;
            try {
                apiData = JSON.parse(apiResponse);
            } catch (e) {
                apiData = null;
            }
            
            results.tests.push({
                name: 'API objects endpoint',
                status: apiData ? 'PASS' : 'FAIL',
                details: `API response: ${apiData ? `Valid JSON with ${Object.keys(apiData).length || 0} objects` : 'Invalid or empty response'}`
            });
            
            // Check specifically for Opportunity in API
            if (apiData && apiData.Opportunity) {
                const oppFields = apiData.Opportunity.fields || {};
                const oppFieldCount = Object.keys(oppFields).length;
                
                results.tests.push({
                    name: 'Opportunity API fields count',
                    status: (oppFieldCount > 50 && oppFieldCount < 70) ? 'PASS' : 'WARN',
                    details: `Opportunity has ${oppFieldCount} fields in API`
                });
                
                // Check for fake fields in API
                const hasApiFakeField = Object.keys(oppFields).some(field => 
                    field.includes('field_l47x8__c') || 
                    field.includes('field_8EBz1__c') ||
                    oppFields[field].label === '浴櫃價格'
                );
                
                results.tests.push({
                    name: 'API fake fields removal',
                    status: !hasApiFakeField ? 'PASS' : 'FAIL',
                    details: `Fake fields in API: ${!hasApiFakeField ? 'Successfully removed' : 'Still present'}`
                });
            }
            
        } catch (error) {
            results.tests.push({
                name: 'API objects endpoint',
                status: 'FAIL',
                details: `API request failed: ${error.message}`
            });
        }
        
        // Test 8: Check admin page
        console.log('Test 8: Checking admin page...');
        try {
            const { stdout: adminContent } = await execAsync(`curl -s -L "https://fx-crm-sync.lai-jameslai.workers.dev/admin"`);
            fs.writeFileSync('final-curl-admin-page.html', adminContent);
            
            const hasAdminContent = adminContent.length > 100;
            results.tests.push({
                name: 'Admin page access',
                status: hasAdminContent ? 'PASS' : 'FAIL',
                details: `Admin page content length: ${adminContent.length} characters`
            });
            
        } catch (error) {
            results.tests.push({
                name: 'Admin page access',
                status: 'FAIL',
                details: `Admin page request failed: ${error.message}`
            });
        }
        
        // Calculate summary
        results.summary.total = results.tests.length;
        results.summary.passed = results.tests.filter(t => t.status === 'PASS').length;
        results.summary.failed = results.tests.filter(t => t.status === 'FAIL').length;
        results.summary.warnings = results.tests.filter(t => t.status === 'WARN').length;
        
        console.log('\n=== TEST RESULTS SUMMARY ===');
        console.log(`Total Tests: ${results.summary.total}`);
        console.log(`Passed: ${results.summary.passed}`);
        console.log(`Failed: ${results.summary.failed}`);
        console.log(`Warnings: ${results.summary.warnings || 0}`);
        
        console.log('\n=== DETAILED RESULTS ===');
        results.tests.forEach((test, index) => {
            console.log(`${index + 1}. ${test.name}: ${test.status}`);
            console.log(`   Details: ${test.details}`);
        });
        
        // Save results
        fs.writeFileSync('final-curl-test-results.json', JSON.stringify(results, null, 2));
        console.log('\nResults saved to final-curl-test-results.json');
        
        return results;
        
    } catch (error) {
        console.error('Error during testing:', error);
        results.tests.push({
            name: 'Test execution',
            status: 'FAIL',
            details: `Error: ${error.message}`
        });
        
        // Save error results
        fs.writeFileSync('final-curl-test-results.json', JSON.stringify(results, null, 2));
        return results;
    }
}

// Run the test
if (require.main === module) {
    comprehensiveWebTestCurl().catch(console.error);
}

module.exports = comprehensiveWebTestCurl;