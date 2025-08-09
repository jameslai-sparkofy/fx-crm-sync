const { exec } = require('child_process');
const fs = require('fs');
const util = require('util');

const execAsync = util.promisify(exec);

async function finalVisualTest() {
    console.log('=== FINAL VISUAL TEST: What Users See ===\n');
    
    try {
        // Test 1: Main page
        console.log('1. Testing main page...');
        const { stdout: mainPage } = await execAsync(`curl -s "https://fx-crm-sync.lai-jameslai.workers.dev/"`);
        
        // Check if Opportunity object is selectable
        const hasOpportunitySelect = mainPage.includes('NewOpportunityObj') || mainPage.includes('Opportunity') || mainPage.includes('商機');
        console.log(`   Opportunity object available: ${hasOpportunitySelect ? 'YES' : 'NO'}`);
        
        // Test 2: Field data when user selects Opportunity
        console.log('\n2. Testing field data (what users see when they select Opportunity)...');
        const { stdout: fieldData } = await execAsync(`curl -s "https://fx-crm-sync.lai-jameslai.workers.dev/api/schema/NewOpportunityObj/fields"`);
        
        let fieldResponse = JSON.parse(fieldData);
        
        if (fieldResponse.success) {
            const data = fieldResponse.data;
            console.log(`   Data Source: ${data.source}`);
            console.log(`   Total Fields: ${data.fieldCount}`);
            
            // Check for the fake fields specifically
            const fakeField1 = data.fields.find(f => f.apiName === 'field_l47x8__c');
            const fakeField2 = data.fields.find(f => f.apiName === 'field_8EBz1__c');
            const fakeFieldByLabel = data.fields.find(f => f.label === '浴櫃價格');
            
            console.log(`   Contains field_l47x8__c: ${fakeField1 ? 'YES ❌' : 'NO ✅'}`);
            console.log(`   Contains field_8EBz1__c: ${fakeField2 ? 'YES ❌' : 'NO ✅'}`);
            console.log(`   Contains "浴櫃價格" label: ${fakeFieldByLabel ? 'YES ❌' : 'NO ✅'}`);
            
            if (fakeField1) {
                console.log(`      -> field_l47x8__c label: "${fakeField1.label}" (${fakeField1.dataType})`);
            }
            if (fakeField2) {
                console.log(`      -> field_8EBz1__c label: "${fakeField2.label}" (${fakeField2.dataType})`);
            }
            
            // Show first 10 and last 10 fields for context
            console.log('\n   First 10 fields:');
            data.fields.slice(0, 10).forEach((field, i) => {
                console.log(`      ${i+1}. ${field.apiName} - "${field.label}"`);
            });
            
            console.log('\n   Last 10 fields:');
            data.fields.slice(-10).forEach((field, i) => {
                console.log(`      ${data.fieldCount - 9 + i}. ${field.apiName} - "${field.label}"`);
            });
            
            // Look for fake fields in the middle
            const fakeFieldPositions = [];
            data.fields.forEach((field, i) => {
                if (field.apiName === 'field_l47x8__c' || field.apiName === 'field_8EBz1__c') {
                    fakeFieldPositions.push({position: i+1, ...field});
                }
            });
            
            if (fakeFieldPositions.length > 0) {
                console.log('\n   ❌ FAKE FIELDS FOUND AT POSITIONS:');
                fakeFieldPositions.forEach(field => {
                    console.log(`      Position ${field.position}: ${field.apiName} - "${field.label}" (${field.dataType})`);
                });
            } else {
                console.log('\n   ✅ No fake fields found in the field list');
            }
        }
        
        // Test 3: Summary
        console.log('\n=== FINAL SUMMARY ===');
        
        if (fieldResponse.success && fieldResponse.data) {
            const stillHasFakeFields = fieldResponse.data.fields.some(f => 
                f.apiName === 'field_l47x8__c' || f.apiName === 'field_8EBz1__c' || f.label === '浴櫃價格'
            );
            
            console.log(`Status: ${stillHasFakeFields ? '❌ FAKE FIELDS STILL PRESENT' : '✅ FAKE FIELDS REMOVED'}`);
            console.log(`Data Source: ${fieldResponse.data.source} ${fieldResponse.data.source === 'predefined' ? '(using hardcoded mappings)' : '(from database)'}`);
            console.log(`Field Count: ${fieldResponse.data.fieldCount} ${fieldResponse.data.fieldCount === 81 ? '(includes fake fields)' : fieldResponse.data.fieldCount > 60 && fieldResponse.data.fieldCount < 70 ? '(looks correct)' : '(unexpected count)'}`);
            
            if (stillHasFakeFields) {
                console.log('\n❌ VERIFICATION FAILED:');
                console.log('   The fake bathroom cabinet fields are still visible to users');
                console.log('   The system is showing 81 fields instead of ~63 real fields');
                console.log('   This indicates the database table updates did not work');
                console.log('   The system is falling back to predefined field mappings');
            } else {
                console.log('\n✅ VERIFICATION PASSED:');
                console.log('   Fake fields have been successfully removed');
                console.log('   Users will no longer see the bathroom cabinet fields');
                console.log('   Field count matches expected real CRM fields');
            }
            
        } else {
            console.log('❌ Could not retrieve field data for verification');
        }
        
        // Save a user-friendly summary
        const summary = {
            testDate: new Date().toISOString(),
            website: 'https://fx-crm-sync.lai-jameslai.workers.dev/',
            status: fieldResponse.success && fieldResponse.data ? 
                (fieldResponse.data.fields.some(f => f.apiName === 'field_l47x8__c' || f.apiName === 'field_8EBz1__c') ? 'FAKE_FIELDS_PRESENT' : 'FAKE_FIELDS_REMOVED') : 'ERROR',
            dataSource: fieldResponse.data?.source || 'unknown',
            totalFields: fieldResponse.data?.fieldCount || 0,
            fakeFieldsFound: fieldResponse.data?.fields.filter(f => f.apiName === 'field_l47x8__c' || f.apiName === 'field_8EBz1__c') || [],
            recommendedAction: fieldResponse.data?.source === 'predefined' ? 'Update predefined field mappings or enable database field sync' : 'No action needed'
        };
        
        fs.writeFileSync('user-facing-verification.json', JSON.stringify(summary, null, 2));
        console.log('\nUser-facing verification saved to: user-facing-verification.json');
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

finalVisualTest();