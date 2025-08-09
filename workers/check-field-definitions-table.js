const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

async function checkFieldDefinitionsTable() {
    console.log('Checking field definitions table in database...');
    
    try {
        // Check if the table exists and has data for Opportunity
        const response = await execAsync(`curl -s "https://fx-crm-sync.lai-jameslai.workers.dev/api/debug/check-field-definitions"`);
        console.log('API Response:', response.stdout);
        
        // If that doesn't work, let's create our own debug endpoint check
        const curlCmd = `
            curl -s -X POST "https://fx-crm-sync.lai-jameslai.workers.dev/api/debug/sql-query" \\
            -H "Content-Type: application/json" \\
            -d '{"query":"SELECT COUNT(*) as count FROM fx_field_definitions WHERE object_api_name = \\"NewOpportunityObj\\""}'
        `;
        
        console.log('Trying SQL query...');
        try {
            const sqlResponse = await execAsync(curlCmd);
            console.log('SQL Response:', sqlResponse.stdout);
        } catch (e) {
            console.log('SQL query endpoint not available');
        }
        
        // Check what tables exist
        const tablesCmd = `
            curl -s "https://fx-crm-sync.lai-jameslai.workers.dev/api/debug/list-tables"
        `;
        
        try {
            const tablesResponse = await execAsync(tablesCmd);
            console.log('Tables response:', tablesResponse.stdout);
        } catch (e) {
            console.log('Tables endpoint not available');
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

// Run the check
checkFieldDefinitionsTable();