const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function comprehensiveWebTest() {
    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: null,
        args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    
    const results = {
        timestamp: new Date().toISOString(),
        url: 'https://fx-crm-sync.lai-jameslai.workers.dev/',
        tests: [],
        screenshots: [],
        summary: {
            passed: 0,
            failed: 0,
            total: 0
        }
    };
    
    try {
        console.log('Starting comprehensive web interface test...');
        
        // Test 1: Navigate to site and take initial screenshot
        console.log('Test 1: Navigating to site...');
        await page.goto('https://fx-crm-sync.lai-jameslai.workers.dev/', { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        
        await page.waitForTimeout(2000);
        const initialScreenshot = `initial-page-${Date.now()}.png`;
        await page.screenshot({ 
            path: initialScreenshot, 
            fullPage: true 
        });
        
        results.screenshots.push(initialScreenshot);
        results.tests.push({
            name: 'Initial page load',
            status: 'PASS',
            details: 'Successfully loaded the main page'
        });
        
        // Test 2: Check for Opportunity object and click it
        console.log('Test 2: Looking for Opportunity object...');
        let opportunityFound = false;
        
        try {
            // Wait for page content to load
            await page.waitForSelector('body', { timeout: 10000 });
            
            // Look for Opportunity text in various forms
            const opportunitySelectors = [
                'a:contains("Opportunity")',
                'button:contains("Opportunity")',
                'div:contains("Opportunity")',
                'span:contains("Opportunity")',
                '*:contains("商機")',
                '*:contains("opportunity")'
            ];
            
            let opportunityElement = null;
            for (const selector of opportunitySelectors) {
                try {
                    await page.waitForFunction(
                        () => {
                            const elements = Array.from(document.querySelectorAll('*'));
                            return elements.some(el => 
                                el.textContent && (
                                    el.textContent.toLowerCase().includes('opportunity') ||
                                    el.textContent.includes('商機')
                                )
                            );
                        },
                        { timeout: 5000 }
                    );
                    
                    opportunityElement = await page.evaluateHandle(() => {
                        const elements = Array.from(document.querySelectorAll('*'));
                        return elements.find(el => 
                            el.textContent && (
                                el.textContent.toLowerCase().includes('opportunity') ||
                                el.textContent.includes('商機')
                            )
                        );
                    });
                    
                    if (opportunityElement) {
                        opportunityFound = true;
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }
            
            if (opportunityFound && opportunityElement) {
                console.log('Found Opportunity element, clicking...');
                await opportunityElement.click();
                await page.waitForTimeout(3000);
                
                // Take screenshot after clicking Opportunity
                const opportunityScreenshot = `opportunity-clicked-${Date.now()}.png`;
                await page.screenshot({ 
                    path: opportunityScreenshot, 
                    fullPage: true 
                });
                results.screenshots.push(opportunityScreenshot);
            }
            
        } catch (error) {
            console.log('Could not find clickable Opportunity element, checking page content...');
        }
        
        // Test 3: Check page content for data source verification
        console.log('Test 3: Checking page content...');
        const pageContent = await page.content();
        const pageText = await page.evaluate(() => document.body.textContent || '');
        
        // Save page content for analysis
        fs.writeFileSync('final-test-page-content.html', pageContent);
        fs.writeFileSync('final-test-page-text.txt', pageText);
        
        // Test 4: Check data source
        console.log('Test 4: Checking data source...');
        const isDatabaseSource = pageText.toLowerCase().includes('database') && !pageText.toLowerCase().includes('predefined');
        results.tests.push({
            name: 'Data source verification',
            status: isDatabaseSource ? 'PASS' : 'FAIL',
            details: `Data source check: ${isDatabaseSource ? 'Found database source' : 'Database source not confirmed'}`
        });
        
        // Test 5: Check for fake field "浴櫃價格"
        console.log('Test 5: Checking for fake field...');
        const hasFakeField = pageText.includes('浴櫃價格');
        results.tests.push({
            name: 'Fake field removal',
            status: !hasFakeField ? 'PASS' : 'FAIL',
            details: `Fake field "浴櫃價格": ${!hasFakeField ? 'Successfully removed' : 'Still present'}`
        });
        
        // Test 6: Check for specific fake field IDs
        console.log('Test 6: Checking for specific fake field IDs...');
        const hasField_l47x8 = pageContent.includes('field_l47x8__c');
        const hasField_8EBz1 = pageContent.includes('field_8EBz1__c');
        
        results.tests.push({
            name: 'Specific fake field IDs removal',
            status: (!hasField_l47x8 && !hasField_8EBz1) ? 'PASS' : 'FAIL',
            details: `field_l47x8__c: ${!hasField_l47x8 ? 'Removed' : 'Present'}, field_8EBz1__c: ${!hasField_8EBz1 ? 'Removed' : 'Present'}`
        });
        
        // Test 7: Count fields mentioned
        console.log('Test 7: Counting fields...');
        // Count field mentions (approximate)
        const fieldMatches = pageText.match(/field_\w+__c/g) || [];
        const uniqueFields = [...new Set(fieldMatches)];
        const fieldCount = uniqueFields.length;
        
        results.tests.push({
            name: 'Field count verification',
            status: (fieldCount > 50 && fieldCount < 70) ? 'PASS' : 'WARN',
            details: `Found ${fieldCount} unique fields (expected around 63)`
        });
        
        // Test 8: Look for search functionality
        console.log('Test 8: Testing search functionality...');
        const hasSearchInput = await page.$('input[type="text"]') || await page.$('input[placeholder*="search"]') || await page.$('input[placeholder*="Search"]');
        
        if (hasSearchInput) {
            try {
                await hasSearchInput.type('opportunity');
                await page.waitForTimeout(1000);
                
                const searchScreenshot = `search-test-${Date.now()}.png`;
                await page.screenshot({ 
                    path: searchScreenshot, 
                    fullPage: true 
                });
                results.screenshots.push(searchScreenshot);
                
                results.tests.push({
                    name: 'Search functionality',
                    status: 'PASS',
                    details: 'Search input found and tested'
                });
            } catch (error) {
                results.tests.push({
                    name: 'Search functionality',
                    status: 'WARN',
                    details: `Search input found but error during testing: ${error.message}`
                });
            }
        } else {
            results.tests.push({
                name: 'Search functionality',
                status: 'INFO',
                details: 'No search input found on current view'
            });
        }
        
        // Test 9: Look for API endpoints or data loading indicators
        console.log('Test 9: Checking for API data loading...');
        const hasApiIndicators = pageText.includes('/api/') || pageText.includes('Loading') || pageText.includes('loading');
        results.tests.push({
            name: 'API data loading indicators',
            status: hasApiIndicators ? 'PASS' : 'INFO',
            details: `API loading indicators: ${hasApiIndicators ? 'Present' : 'Not detected'}`
        });
        
        // Final screenshot
        console.log('Taking final comprehensive screenshot...');
        const finalScreenshot = `final-comprehensive-${Date.now()}.png`;
        await page.screenshot({ 
            path: finalScreenshot, 
            fullPage: true 
        });
        results.screenshots.push(finalScreenshot);
        
        // Calculate summary
        results.summary.total = results.tests.length;
        results.summary.passed = results.tests.filter(t => t.status === 'PASS').length;
        results.summary.failed = results.tests.filter(t => t.status === 'FAIL').length;
        results.summary.warnings = results.tests.filter(t => t.status === 'WARN').length;
        results.summary.info = results.tests.filter(t => t.status === 'INFO').length;
        
        console.log('\n=== TEST RESULTS SUMMARY ===');
        console.log(`Total Tests: ${results.summary.total}`);
        console.log(`Passed: ${results.summary.passed}`);
        console.log(`Failed: ${results.summary.failed}`);
        console.log(`Warnings: ${results.summary.warnings || 0}`);
        console.log(`Info: ${results.summary.info || 0}`);
        
        console.log('\n=== DETAILED RESULTS ===');
        results.tests.forEach((test, index) => {
            console.log(`${index + 1}. ${test.name}: ${test.status}`);
            console.log(`   Details: ${test.details}`);
        });
        
        console.log('\n=== SCREENSHOTS TAKEN ===');
        results.screenshots.forEach((screenshot, index) => {
            console.log(`${index + 1}. ${screenshot}`);
        });
        
    } catch (error) {
        console.error('Error during testing:', error);
        results.tests.push({
            name: 'Test execution',
            status: 'FAIL',
            details: `Error: ${error.message}`
        });
    } finally {
        // Save results to file
        fs.writeFileSync('final-comprehensive-test-results.json', JSON.stringify(results, null, 2));
        
        console.log('\nTest completed. Results saved to final-comprehensive-test-results.json');
        console.log('Page content saved to final-test-page-content.html');
        console.log('Page text saved to final-test-page-text.txt');
        
        await browser.close();
        return results;
    }
}

// Run the test
if (require.main === module) {
    comprehensiveWebTest().catch(console.error);
}

module.exports = comprehensiveWebTest;