const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testWebInterface() {
    console.log('Starting Puppeteer test for fx-crm-sync web interface...');
    
    const browser = await puppeteer.launch({
        headless: 'new', // Use new headless mode
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
        ]
    });
    
    try {
        const page = await browser.newPage();
        
        // Set viewport
        await page.setViewport({ width: 1920, height: 1080 });
        
        console.log('Navigating to https://fx-crm-sync.lai-jameslai.workers.dev/...');
        
        // Navigate to the URL
        await page.goto('https://fx-crm-sync.lai-jameslai.workers.dev/', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        // Wait a bit for the page to fully load
        await page.waitForTimeout(3000);
        
        // Take initial screenshot
        console.log('Taking initial screenshot...');
        await page.screenshot({ 
            path: 'initial-page-screenshot.png',
            fullPage: true 
        });
        
        // Look for Opportunity object or 商機 object
        console.log('Looking for Opportunity (商機) object...');
        
        // Wait for any potential dynamic content to load
        await page.waitForTimeout(2000);
        
        // Try to find elements containing "Opportunity" or "商機"
        const opportunityElements = await page.$$eval('*', elements => {
            const results = [];
            elements.forEach(el => {
                const text = el.textContent || el.innerText || '';
                if (text.includes('Opportunity') || text.includes('商機')) {
                    results.push({
                        tagName: el.tagName,
                        text: text.substring(0, 200), // Truncate for readability
                        className: el.className,
                        id: el.id
                    });
                }
            });
            return results;
        });
        
        console.log('Found Opportunity/商機 elements:', opportunityElements);
        
        // Look for field mappings or data source indicators
        console.log('Checking for data source indicators...');
        
        const dataSourceElements = await page.$$eval('*', elements => {
            const results = [];
            elements.forEach(el => {
                const text = el.textContent || el.innerText || '';
                if (text.includes('database') || text.includes('predefined') || 
                    text.includes('資料來源') || text.includes('data source')) {
                    results.push({
                        tagName: el.tagName,
                        text: text.substring(0, 200),
                        className: el.className,
                        id: el.id
                    });
                }
            });
            return results;
        });
        
        console.log('Found data source elements:', dataSourceElements);
        
        // Look for the problematic field "浴櫃價格" or "bathroom cabinet price"
        console.log('Checking for 浴櫃價格 or bathroom cabinet price fields...');
        
        const bathroomCabinetElements = await page.$$eval('*', elements => {
            const results = [];
            elements.forEach(el => {
                const text = el.textContent || el.innerText || '';
                if (text.includes('浴櫃價格') || text.includes('bathroom cabinet price')) {
                    results.push({
                        tagName: el.tagName,
                        text: text.substring(0, 200),
                        className: el.className,
                        id: el.id
                    });
                }
            });
            return results;
        });
        
        console.log('Found bathroom cabinet elements:', bathroomCabinetElements);
        
        // Try to click on Opportunity object if it exists
        try {
            const opportunityLink = await page.$x("//a[contains(text(), 'Opportunity') or contains(text(), '商機')]");
            if (opportunityLink.length > 0) {
                console.log('Clicking on Opportunity/商機 link...');
                await opportunityLink[0].click();
                await page.waitForTimeout(3000);
                
                // Take screenshot of Opportunity object details
                console.log('Taking screenshot of Opportunity object details...');
                await page.screenshot({ 
                    path: 'opportunity-object-details.png',
                    fullPage: true 
                });
            } else {
                console.log('No clickable Opportunity/商機 link found');
            }
        } catch (error) {
            console.log('Error clicking on Opportunity link:', error.message);
        }
        
        // Get all text content of the page for analysis
        const pageText = await page.evaluate(() => document.body.textContent);
        
        // Save page text to file for analysis
        fs.writeFileSync('page-content.txt', pageText);
        
        // Get page HTML for detailed analysis
        const pageHTML = await page.content();
        fs.writeFileSync('page-content.html', pageHTML);
        
        console.log('Test completed successfully!');
        
        // Analysis results
        const results = {
            opportunityElements,
            dataSourceElements,
            bathroomCabinetElements,
            pageContainsBathroomCabinet: pageText.includes('浴櫃價格') || pageText.includes('bathroom cabinet price'),
            pageContainsDatabase: pageText.includes('database'),
            pageContainsPredefined: pageText.includes('predefined')
        };
        
        console.log('\n=== ANALYSIS RESULTS ===');
        console.log('Bathroom cabinet fields found:', results.pageContainsBathroomCabinet);
        console.log('Database indicator found:', results.pageContainsDatabase);
        console.log('Predefined indicator found:', results.pageContainsPredefined);
        console.log('========================\n');
        
        // Save results to JSON file
        fs.writeFileSync('test-results.json', JSON.stringify(results, null, 2));
        
    } catch (error) {
        console.error('Error during test:', error);
        throw error;
    } finally {
        await browser.close();
    }
}

// Run the test
testWebInterface().catch(console.error);