const https = require('https');
const fs = require('fs');

async function testDatabaseStatus() {
    console.log('Testing database connection and field definitions...');
    
    try {
        // Test database stats endpoint
        console.log('Fetching database stats...');
        const statsResponse = await testAPIEndpoint('/api/sync/database-stats');
        console.log('Database stats:', statsResponse);
        
        // Test specific query for NewOpportunityObj fields in database
        console.log('Testing direct database query via admin interface...');
        const dbQueryResponse = await testAPIEndpoint('/api/debug/fx-field-definitions?object_api_name=NewOpportunityObj');
        console.log('Database query response:', dbQueryResponse);
        
        return {
            stats: statsResponse,
            directQuery: dbQueryResponse
        };
        
    } catch (error) {
        console.error('Error testing database:', error);
        return null;
    }
}

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

// Test if the worker deployment has the latest code
async function testWorkerStatus() {
    console.log('Testing worker deployment status...');
    
    try {
        const response = await testAPIEndpoint('/api/debug/system-info');
        console.log('System info:', response);
        return response;
    } catch (error) {
        console.error('Error getting system info:', error);
        return null;
    }
}

async function runDatabaseTests() {
    console.log('=== DATABASE AND DEPLOYMENT TESTS ===\n');
    
    const dbStatus = await testDatabaseStatus();
    const workerStatus = await testWorkerStatus();
    
    // Also test the field sync endpoints
    console.log('\nTesting field sync endpoints...');
    
    try {
        const fieldSyncStatus = await testAPIEndpoint('/api/field-sync/status');
        console.log('Field sync status:', fieldSyncStatus);
        
        const fieldSyncObjects = await testAPIEndpoint('/api/field-sync/objects');
        console.log('Field sync objects:', fieldSyncObjects);
        
    } catch (error) {
        console.log('Field sync endpoints not available or error:', error.message);
    }
    
    const allResults = {
        timestamp: new Date().toISOString(),
        database: dbStatus,
        worker: workerStatus,
        summary: {
            databaseConnected: !!dbStatus?.stats,
            fieldsInDatabase: dbStatus?.directQuery?.success || false,
            workerResponding: !!workerStatus
        }
    };
    
    fs.writeFileSync('database-test-results.json', JSON.stringify(allResults, null, 2));
    
    console.log('\n=== SUMMARY ===');
    console.log('Database connected:', allResults.summary.databaseConnected);
    console.log('Fields in database:', allResults.summary.fieldsInDatabase);
    console.log('Worker responding:', allResults.summary.workerResponding);
    console.log('\nResults saved to database-test-results.json');
    
    return allResults;
}

runDatabaseTests().catch(console.error);