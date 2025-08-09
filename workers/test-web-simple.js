const https = require('https');
const fs = require('fs');

async function fetchWebContent() {
    console.log('Fetching content from fx-crm-sync web interface...');
    
    return new Promise((resolve, reject) => {
        const url = 'https://fx-crm-sync.lai-jameslai.workers.dev/';
        
        https.get(url, (response) => {
            let data = '';
            
            response.on('data', (chunk) => {
                data += chunk;
            });
            
            response.on('end', () => {
                resolve(data);
            });
            
        }).on('error', (error) => {
            reject(error);
        });
    });
}

async function analyzeWebInterface() {
    try {
        console.log('Fetching web content...');
        const htmlContent = await fetchWebContent();
        
        // Save HTML content to file
        fs.writeFileSync('page-content.html', htmlContent);
        
        // Extract text content (simple approach)
        const textContent = htmlContent
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
            .replace(/<[^>]*>/g, ' ') // Remove HTML tags
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
        
        fs.writeFileSync('page-content.txt', textContent);
        
        // Analysis
        console.log('\n=== ANALYSIS RESULTS ===');
        
        // Check for Opportunity/商機
        const hasOpportunity = htmlContent.includes('Opportunity') || htmlContent.includes('商機');
        console.log('Contains Opportunity/商機:', hasOpportunity);
        
        // Check for bathroom cabinet field
        const hasBathroomCabinet = htmlContent.includes('浴櫃價格') || htmlContent.includes('bathroom cabinet price');
        console.log('Contains 浴櫃價格/bathroom cabinet price:', hasBathroomCabinet);
        
        // Check for data source indicators
        const hasDatabase = htmlContent.includes('database');
        const hasPredefined = htmlContent.includes('predefined');
        console.log('Contains "database":', hasDatabase);
        console.log('Contains "predefined":', hasPredefined);
        
        // Look for field mappings or object data
        const hasFieldMappings = htmlContent.includes('field') || htmlContent.includes('mapping') || htmlContent.includes('欄位');
        console.log('Contains field mappings:', hasFieldMappings);
        
        // Find specific patterns for Opportunity object
        const opportunityMatches = htmlContent.match(/Opportunity|商機/gi) || [];
        console.log('Opportunity/商機 matches:', opportunityMatches.length);
        
        // Find bathroom cabinet mentions
        const bathroomMatches = htmlContent.match(/浴櫃價格|bathroom cabinet price/gi) || [];
        console.log('Bathroom cabinet matches:', bathroomMatches.length);
        
        // Extract any JSON data that might contain field definitions
        const jsonMatches = htmlContent.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g) || [];
        console.log('JSON objects found:', jsonMatches.length);
        
        // Save analysis results
        const results = {
            hasOpportunity,
            hasBathroomCabinet,
            hasDatabase,
            hasPredefined,
            hasFieldMappings,
            opportunityMatches: opportunityMatches.length,
            bathroomMatches: bathroomMatches.length,
            jsonObjectsFound: jsonMatches.length,
            htmlLength: htmlContent.length,
            textLength: textContent.length
        };
        
        fs.writeFileSync('analysis-results.json', JSON.stringify(results, null, 2));
        
        console.log('========================');
        console.log('\nKey findings:');
        console.log('- Bathroom cabinet field removed:', !hasBathroomCabinet);
        console.log('- Using database source:', hasDatabase && !hasPredefined);
        console.log('- Opportunity object present:', hasOpportunity);
        
        // If JSON data found, try to parse and analyze
        if (jsonMatches.length > 0) {
            console.log('\nAnalyzing JSON data...');
            jsonMatches.forEach((jsonStr, index) => {
                try {
                    const jsonObj = JSON.parse(jsonStr);
                    console.log(`JSON object ${index + 1}:`, JSON.stringify(jsonObj, null, 2).substring(0, 200) + '...');
                } catch (e) {
                    // Not valid JSON, skip
                }
            });
        }
        
        return results;
        
    } catch (error) {
        console.error('Error analyzing web interface:', error);
        throw error;
    }
}

// Run the analysis
analyzeWebInterface().catch(console.error);