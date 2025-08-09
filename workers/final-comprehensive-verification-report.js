const { exec } = require('child_process');
const fs = require('fs');
const util = require('util');

const execAsync = util.promisify(exec);

async function generateComprehensiveVerificationReport() {
    const timestamp = new Date().toISOString();
    
    const report = {
        title: "FX CRM Sync - Final Comprehensive Verification Report",
        timestamp: timestamp,
        url: "https://fx-crm-sync.lai-jameslai.workers.dev/",
        testSummary: {
            totalTests: 0,
            passed: 0,
            failed: 0,
            warnings: 0
        },
        keyFindings: [],
        verificationResults: [],
        fakeFieldStatus: {
            field_l47x8__c: null,
            field_8EBz1__c: null,
            fakeFieldLabel: null
        },
        dataSource: null,
        fieldCount: 0,
        recommendations: []
    };
    
    console.log('=== FX CRM SYNC FINAL COMPREHENSIVE VERIFICATION REPORT ===');
    console.log(`Generated at: ${timestamp}`);
    console.log('URL: https://fx-crm-sync.lai-jameslai.workers.dev/');
    console.log('');
    
    try {
        // Test 1: Get Opportunity field definitions
        console.log('1. Retrieving Opportunity field definitions...');
        const { stdout: fieldData } = await execAsync(`curl -s "https://fx-crm-sync.lai-jameslai.workers.dev/api/schema/NewOpportunityObj/fields"`);
        
        let fieldResponse;
        try {
            fieldResponse = JSON.parse(fieldData);
        } catch (e) {
            fieldResponse = null;
        }
        
        if (fieldResponse && fieldResponse.success && fieldResponse.data) {
            const data = fieldResponse.data;
            report.dataSource = data.source;
            report.fieldCount = data.fieldCount;
            
            // Check for fake fields
            const fields = data.fields || [];
            const field_l47x8 = fields.find(f => f.apiName === 'field_l47x8__c');
            const field_8EBz1 = fields.find(f => f.apiName === 'field_8EBz1__c');
            const bathCabinetField = fields.find(f => f.label === '浴櫃價格');
            
            report.fakeFieldStatus.field_l47x8__c = field_l47x8 ? {
                present: true,
                label: field_l47x8.label,
                dataType: field_l47x8.dataType
            } : { present: false };
            
            report.fakeFieldStatus.field_8EBz1__c = field_8EBz1 ? {
                present: true,
                label: field_8EBz1.label,
                dataType: field_8EBz1.dataType
            } : { present: false };
            
            report.fakeFieldStatus.fakeFieldLabel = bathCabinetField ? {
                present: true,
                apiName: bathCabinetField.apiName,
                dataType: bathCabinetField.dataType
            } : { present: false };
            
            report.verificationResults.push({
                test: "Field definitions retrieval",
                status: "PASS",
                details: `Retrieved ${data.fieldCount} fields from ${data.source} source`
            });
            
        } else {
            report.verificationResults.push({
                test: "Field definitions retrieval",
                status: "FAIL",
                details: "Could not retrieve field definitions"
            });
        }
        
        // Test 2: Database statistics
        console.log('2. Checking database statistics...');
        try {
            const { stdout: dbStats } = await execAsync(`curl -s "https://fx-crm-sync.lai-jameslai.workers.dev/api/debug/d1-stats"`);
            const dbData = JSON.parse(dbStats);
            
            if (dbData.success) {
                report.verificationResults.push({
                    test: "Database connectivity",
                    status: "PASS",
                    details: `Opportunities: ${dbData.data.tables.opportunities}, Sites: ${dbData.data.tables.sites}`
                });
            }
        } catch (e) {
            report.verificationResults.push({
                test: "Database connectivity",
                status: "WARN",
                details: "Could not retrieve database statistics"
            });
        }
        
        // Test 3: Web interface content check
        console.log('3. Checking web interface content...');
        try {
            const { stdout: pageContent } = await execAsync(`curl -s "https://fx-crm-sync.lai-jameslai.workers.dev/"`);
            
            const hasFakeFieldInHTML = pageContent.includes('浴櫃價格') || pageContent.includes('field_l47x8__c') || pageContent.includes('field_8EBz1__c');
            
            report.verificationResults.push({
                test: "Web interface fake field references",
                status: hasFakeFieldInHTML ? "FAIL" : "PASS",
                details: `Fake field references in HTML: ${hasFakeFieldInHTML ? "Present" : "Not found"}`
            });
            
        } catch (e) {
            report.verificationResults.push({
                test: "Web interface fake field references",
                status: "WARN",
                details: "Could not retrieve web interface content"
            });
        }
        
        // Analysis and Key Findings
        console.log('4. Analyzing results...');
        
        // Check if fake fields are still present
        if (report.fakeFieldStatus.field_l47x8__c?.present || report.fakeFieldStatus.field_8EBz1__c?.present) {
            report.keyFindings.push({
                severity: "CRITICAL",
                finding: "Fake fields still present in system",
                details: `The fake fields field_l47x8__c ("${report.fakeFieldStatus.field_l47x8__c?.label}") and field_8EBz1__c ("${report.fakeFieldStatus.field_8EBz1__c?.label}") are still present in the field definitions.`
            });
        } else {
            report.keyFindings.push({
                severity: "SUCCESS",
                finding: "Fake fields successfully removed",
                details: "The fake bathroom cabinet fields are no longer present in the system."
            });
        }
        
        // Check data source
        if (report.dataSource === 'predefined') {
            report.keyFindings.push({
                severity: "WARNING",
                finding: "System using predefined field mappings",
                details: "The system is using predefined field mappings instead of dynamic database field definitions. This means the fake fields are coming from the predefined mappings in the code."
            });
            
            report.recommendations.push("Execute field sync to populate the fx_field_definitions table with real CRM field data");
            report.recommendations.push("Update predefined field mappings to remove fake fields");
        } else if (report.dataSource === 'database') {
            report.keyFindings.push({
                severity: "SUCCESS",
                finding: "System using database field definitions",
                details: "The system is correctly using database field definitions instead of predefined mappings."
            });
        }
        
        // Field count analysis
        if (report.fieldCount === 81) {
            report.keyFindings.push({
                severity: "FAIL",
                finding: "Field count still shows 81 fields",
                details: "The system is showing 81 fields instead of the expected 63 real CRM fields. This suggests fake fields are still included."
            });
        } else if (report.fieldCount >= 60 && report.fieldCount <= 65) {
            report.keyFindings.push({
                severity: "SUCCESS",
                finding: "Field count appears correct",
                details: `The system is showing ${report.fieldCount} fields, which is within the expected range of real CRM fields.`
            });
        }
        
        // Calculate test summary
        report.testSummary.totalTests = report.verificationResults.length;
        report.testSummary.passed = report.verificationResults.filter(r => r.status === 'PASS').length;
        report.testSummary.failed = report.verificationResults.filter(r => r.status === 'FAIL').length;
        report.testSummary.warnings = report.verificationResults.filter(r => r.status === 'WARN').length;
        
        // Generate recommendations
        if (report.fakeFieldStatus.field_l47x8__c?.present || report.fakeFieldStatus.field_8EBz1__c?.present) {
            report.recommendations.push("Remove fake fields from predefined field mappings in /src/data/field-mappings-all.js");
            report.recommendations.push("Trigger field sync to refresh field definitions from live CRM API");
            report.recommendations.push("Verify that the fx_field_definitions table contains only real CRM fields");
        }
        
        // Display results
        console.log('\n=== KEY FINDINGS ===');
        report.keyFindings.forEach((finding, index) => {
            console.log(`${index + 1}. [${finding.severity}] ${finding.finding}`);
            console.log(`   ${finding.details}`);
        });
        
        console.log('\n=== FAKE FIELD STATUS ===');
        console.log(`field_l47x8__c: ${report.fakeFieldStatus.field_l47x8__c?.present ? 'PRESENT' : 'REMOVED'}`);
        if (report.fakeFieldStatus.field_l47x8__c?.present) {
            console.log(`   Label: "${report.fakeFieldStatus.field_l47x8__c.label}"`);
            console.log(`   Type: ${report.fakeFieldStatus.field_l47x8__c.dataType}`);
        }
        
        console.log(`field_8EBz1__c: ${report.fakeFieldStatus.field_8EBz1__c?.present ? 'PRESENT' : 'REMOVED'}`);
        if (report.fakeFieldStatus.field_8EBz1__c?.present) {
            console.log(`   Label: "${report.fakeFieldStatus.field_8EBz1__c.label}"`);
            console.log(`   Type: ${report.fakeFieldStatus.field_8EBz1__c.dataType}`);
        }
        
        console.log('\n=== SYSTEM STATUS ===');
        console.log(`Data Source: ${report.dataSource || 'Unknown'}`);
        console.log(`Field Count: ${report.fieldCount}`);
        console.log(`Expected: ~63 real CRM fields`);
        console.log(`Status: ${report.fieldCount === 81 ? 'INCLUDES FAKE FIELDS' : 'FIELD COUNT OK'}`);
        
        console.log('\n=== VERIFICATION RESULTS ===');
        report.verificationResults.forEach((result, index) => {
            console.log(`${index + 1}. ${result.test}: ${result.status}`);
            console.log(`   ${result.details}`);
        });
        
        console.log('\n=== RECOMMENDATIONS ===');
        if (report.recommendations.length > 0) {
            report.recommendations.forEach((rec, index) => {
                console.log(`${index + 1}. ${rec}`);
            });
        } else {
            console.log('No specific recommendations - system appears to be working correctly.');
        }
        
        console.log('\n=== TEST SUMMARY ===');
        console.log(`Total Tests: ${report.testSummary.totalTests}`);
        console.log(`Passed: ${report.testSummary.passed}`);
        console.log(`Failed: ${report.testSummary.failed}`);
        console.log(`Warnings: ${report.testSummary.warnings}`);
        
        // Save comprehensive report
        fs.writeFileSync('final-comprehensive-verification-report.json', JSON.stringify(report, null, 2));
        console.log('\nComprehensive report saved to: final-comprehensive-verification-report.json');
        
        return report;
        
    } catch (error) {
        console.error('Error during verification:', error);
        report.verificationResults.push({
            test: "Overall verification",
            status: "FAIL",
            details: `Error: ${error.message}`
        });
        
        fs.writeFileSync('final-comprehensive-verification-report.json', JSON.stringify(report, null, 2));
        return report;
    }
}

// Run the verification
generateComprehensiveVerificationReport().catch(console.error);