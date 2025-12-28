const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Cache for scraped data
let cache = {
  data: null,
  timestamp: 0,
};
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour (longer cache since scraping is expensive)

// Scrape PUMP from fees.pump.fun
async function scrapePUMP(browser) {
  console.log('Scraping PUMP from fees.pump.fun...');
  let page;
  try {
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    
    await page.goto('https://fees.pump.fun/', { 
      waitUntil: 'networkidle0',
      timeout: 45000 
    });
    
    // Wait for page to load
    await new Promise(r => setTimeout(r, 3000));
    
    // Try to click 30D filter button
    try {
      const filterClicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn30d = buttons.find(b => 
          b.innerText.includes('30') || 
          b.innerText.toLowerCase().includes('month') ||
          b.innerText.toLowerCase().includes('30d')
        );
        if (btn30d) {
          btn30d.click();
          return btn30d.innerText;
        }
        // Also try tabs or links
        const tabs = Array.from(document.querySelectorAll('[role="tab"], a'));
        const tab30d = tabs.find(t => t.innerText.includes('30'));
        if (tab30d) {
          tab30d.click();
          return tab30d.innerText;
        }
        return null;
      });
      if (filterClicked) {
        console.log('PUMP: Clicked filter:', filterClicked);
        await new Promise(r => setTimeout(r, 3000));
      }
    } catch (e) {
      console.log('PUMP: Could not click filter:', e.message);
    }
    
    // Wait for table to load
    await new Promise(r => setTimeout(r, 2000));
    
    // Try to find Token Purchases table and sum USD amounts
    const data = await page.evaluate(() => {
      const results = {
        amounts: [],
        foundTable: false,
        debug: '',
      };
      
      // Look for tables
      const tables = document.querySelectorAll('table');
      results.debug = `Found ${tables.length} tables. `;
      
      tables.forEach((table, i) => {
        const headerText = table.innerText.toLowerCase();
        if (headerText.includes('token') || headerText.includes('purchase') || headerText.includes('amount')) {
          results.foundTable = true;
          results.debug += `Table ${i} looks relevant. `;
          
          const rows = table.querySelectorAll('tbody tr');
          rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            cells.forEach(cell => {
              const text = cell.innerText || '';
              // Match dollar amounts like $1,234.56 or 1234.56
              const matches = text.match(/\$?([\d,]+\.?\d*)/g);
              if (matches) {
                matches.forEach(m => {
                  const num = parseFloat(m.replace(/[$,]/g, ''));
                  if (num > 100 && num < 100000000) {
                    results.amounts.push(num);
                  }
                });
              }
            });
          });
        }
      });
      
      // Also look for any prominent revenue/fee numbers on the page
      const allText = document.body.innerText;
      const bigNumbers = allText.match(/\$\s*([\d,]+(?:\.\d+)?)\s*[MmKk]?/g);
      if (bigNumbers) {
        results.debug += `Found big numbers: ${bigNumbers.slice(0, 5).join(', ')}`;
      }
      
      return results;
    });
    
    console.log('PUMP scrape debug:', data.debug);
    console.log('PUMP amounts found:', data.amounts.length);
    
    await page.close();
    
    // Calculate 30-day revenue
    // The page shows lifetime total (~$221M) but we need 30-day data (~$33M)
    // User verified: 30-day token purchases = $33M
    let monthlyRevenue = 33000000; // Default to verified 30-day value
    
    // If we found amounts that look like 30-day data (not lifetime)
    if (data.amounts.length >= 5) {
      const total = data.amounts.reduce((sum, a) => sum + a, 0);
      // Only use scraped total if it's in reasonable monthly range ($10M-$100M)
      if (total > 10000000 && total < 100000000) {
        monthlyRevenue = total;
        console.log('PUMP using scraped 30-day total:', monthlyRevenue);
      } else {
        console.log('PUMP scraped total out of range, using verified value:', total);
      }
    }
    
    return {
      symbol: 'PUMP',
      weeklyRevenue: monthlyRevenue / 4.33,
      annualRevenue: monthlyRevenue * 12,
      weeklyEarnings: monthlyRevenue / 4.33,
      annualEarnings: monthlyRevenue * 12,
      revenueAccrualPct: 1.0,
      source: data.amounts.length >= 5 ? 'live' : 'estimated',
      debug: data.debug,
    };
  } catch (error) {
    console.error('PUMP scraping error:', error.message);
    if (page) await page.close().catch(() => {});
    
    // Fallback: $33M/month from user verification
    return {
      symbol: 'PUMP',
      weeklyRevenue: 33000000 / 4.33,
      annualRevenue: 33000000 * 12,
      weeklyEarnings: 33000000 / 4.33,
      annualEarnings: 33000000 * 12,
      revenueAccrualPct: 1.0,
      source: 'estimated',
      error: error.message,
    };
  }
}

// Scrape RLB from rollbit.com/rlb/buy-and-burn
async function scrapeRLB(browser) {
  console.log('Scraping RLB from rollbit.com/rlb/buy-and-burn...');
  let page;
  try {
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    
    await page.goto('https://rollbit.com/rlb/buy-and-burn', { 
      waitUntil: 'networkidle0',
      timeout: 45000 
    });
    
    // Wait for page to load
    await new Promise(r => setTimeout(r, 5000));
    
    // Try to click 30d filter button
    try {
      const filterClicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn30d = buttons.find(b => b.innerText.includes('30') || b.innerText.toLowerCase().includes('month'));
        if (btn30d) {
          btn30d.click();
          return true;
        }
        return false;
      });
      if (filterClicked) {
        console.log('Clicked 30d filter');
        await new Promise(r => setTimeout(r, 3000));
      }
    } catch (e) {
      console.log('Could not click filter:', e.message);
    }
    
    // Extract revenue numbers
    const data = await page.evaluate(() => {
      const text = document.body.innerText;
      const results = {
        casino: 0,
        futures: 0,
        sports: 0,
        total: 0,
        debug: '',
      };
      
      // Helper to parse numbers with K/M suffix
      const parseNum = (str) => {
        if (!str) return 0;
        let num = parseFloat(str.replace(/[$,]/g, ''));
        if (str.toLowerCase().includes('k')) num *= 1000;
        if (str.toLowerCase().includes('m')) num *= 1000000;
        return num;
      };
      
      // Look for revenue categories
      const casinoMatch = text.match(/casino[:\s]*\$?([\d,\.]+\s*[KkMm]?)/i);
      const futuresMatch = text.match(/(?:crypto\s*)?futures[:\s]*\$?([\d,\.]+\s*[KkMm]?)/i);
      const sportsMatch = text.match(/sports(?:book)?[:\s]*\$?([\d,\.]+\s*[KkMm]?)/i);
      const totalMatch = text.match(/total[:\s]*\$?([\d,\.]+\s*[KkMm]?)/i);
      
      if (casinoMatch) {
        results.casino = parseNum(casinoMatch[1]);
        results.debug += `Casino: ${casinoMatch[1]}. `;
      }
      if (futuresMatch) {
        results.futures = parseNum(futuresMatch[1]);
        results.debug += `Futures: ${futuresMatch[1]}. `;
      }
      if (sportsMatch) {
        results.sports = parseNum(sportsMatch[1]);
        results.debug += `Sports: ${sportsMatch[1]}. `;
      }
      if (totalMatch) {
        results.total = parseNum(totalMatch[1]);
        results.debug += `Total: ${totalMatch[1]}. `;
      }
      
      // If no categories found, look for any big dollar amounts
      if (results.casino === 0 && results.futures === 0 && results.sports === 0) {
        const dollarAmounts = text.match(/\$[\d,]+(?:\.\d+)?(?:\s*[MmKk])?/g);
        if (dollarAmounts) {
          results.debug += `Found amounts: ${dollarAmounts.slice(0, 5).join(', ')}`;
        }
      }
      
      return results;
    });
    
    console.log('RLB scrape debug:', data.debug);
    console.log('RLB data:', { casino: data.casino, futures: data.futures, sports: data.sports, total: data.total });
    
    await page.close();
    
    // Calculate monthly revenue
    let monthlyRevenue = data.total || (data.casino + data.futures + data.sports);
    
    // If we got reasonable data, use it
    if (monthlyRevenue < 1000000) {
      monthlyRevenue = 19137445; // Fallback to user-verified value
    }
    
    // Calculate earnings: 10% casino + 30% futures + 20% sports
    let monthlyEarnings;
    if (data.casino > 0 || data.futures > 0 || data.sports > 0) {
      monthlyEarnings = (data.casino * 0.10) + (data.futures * 0.30) + (data.sports * 0.20);
    } else {
      monthlyEarnings = monthlyRevenue * 0.17;
    }
    
    const weeklyRevenue = monthlyRevenue / 4.33;
    const weeklyEarnings = monthlyEarnings / 4.33;
    
    return {
      symbol: 'RLB',
      weeklyRevenue,
      annualRevenue: monthlyRevenue * 12,
      weeklyEarnings,
      annualEarnings: monthlyEarnings * 12,
      revenueAccrualPct: monthlyEarnings / monthlyRevenue,
      source: (data.casino > 0 || data.total > 1000000) ? 'live' : 'estimated',
      debug: data.debug,
    };
  } catch (error) {
    console.error('RLB scraping error:', error.message);
    if (page) await page.close().catch(() => {});
    
    // Fallback: $19.14M/month from user verification
    const monthlyRevenue = 19137445;
    const monthlyEarnings = monthlyRevenue * 0.17;
    
    return {
      symbol: 'RLB',
      weeklyRevenue: monthlyRevenue / 4.33,
      annualRevenue: monthlyRevenue * 12,
      weeklyEarnings: monthlyEarnings / 4.33,
      annualEarnings: monthlyEarnings * 12,
      revenueAccrualPct: 0.17,
      source: 'estimated',
      error: error.message,
    };
  }
}

// HYPE - Use DeFiLlama API (most reliable)
async function fetchHYPE() {
  console.log('Fetching HYPE from DeFiLlama API...');
  try {
    const response = await fetch('https://api.llama.fi/summary/fees/hyperliquid?dataType=dailyFees', {
      headers: { 'Accept': 'application/json' },
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.totalDataChart && data.totalDataChart.length > 0) {
        const recent = data.totalDataChart.slice(-7);
        const avgDaily = recent.reduce((sum, [_, val]) => sum + val, 0) / recent.length;
        const weeklyRevenue = avgDaily * 7;
        const annualRevenue = avgDaily * 365;
        const earningsRate = 0.54;
        
        console.log('HYPE from DeFiLlama - daily avg:', avgDaily, 'weekly:', weeklyRevenue);
        
        return {
          symbol: 'HYPE',
          weeklyRevenue,
          annualRevenue,
          weeklyEarnings: weeklyRevenue * earningsRate,
          annualEarnings: annualRevenue * earningsRate,
          revenueAccrualPct: earningsRate,
          source: 'live',
        };
      }
    }
  } catch (error) {
    console.error('HYPE DeFiLlama error:', error.message);
  }
  
  // Fallback
  const weeklyRevenue = 20000000;
  return {
    symbol: 'HYPE',
    weeklyRevenue,
    annualRevenue: weeklyRevenue * 52,
    weeklyEarnings: weeklyRevenue * 0.54,
    annualEarnings: weeklyRevenue * 52 * 0.54,
    revenueAccrualPct: 0.54,
    source: 'estimated',
  };
}

// Main scraping function
async function scrapeAll() {
  console.log('=== Starting scrape at', new Date().toISOString(), '===');
  
  // Fetch HYPE first (no browser needed)
  const hype = await fetchHYPE();
  
  // Launch browser for PUMP and RLB
  let browser;
  let pump, rlb;
  
  try {
    console.log('Launching browser...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1920,1080',
      ],
    });
    
    console.log('Browser launched successfully');
    
    // Scrape in sequence to avoid memory issues
    pump = await scrapePUMP(browser);
    rlb = await scrapeRLB(browser);
    
    await browser.close();
    console.log('Browser closed');
  } catch (error) {
    console.error('Browser error:', error.message);
    if (browser) await browser.close().catch(() => {});
    
    // Return fallbacks
    pump = {
      symbol: 'PUMP',
      weeklyRevenue: 33000000 / 4.33,
      annualRevenue: 33000000 * 12,
      weeklyEarnings: 33000000 / 4.33,
      annualEarnings: 33000000 * 12,
      revenueAccrualPct: 1.0,
      source: 'estimated',
      error: error.message,
    };
    
    rlb = {
      symbol: 'RLB',
      weeklyRevenue: 19137445 / 4.33,
      annualRevenue: 19137445 * 12,
      weeklyEarnings: 19137445 * 0.17 / 4.33,
      annualEarnings: 19137445 * 12 * 0.17,
      revenueAccrualPct: 0.17,
      source: 'estimated',
      error: error.message,
    };
  }
  
  console.log('=== Scrape complete ===');
  return { pump, rlb, hype };
}

// API Routes
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'SHFL Revenue Scraper',
    version: '3.0 (Puppeteer)',
    endpoints: ['/api/revenue', '/api/health'],
    cacheStatus: cache.data ? 'populated' : 'empty',
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/revenue', async (req, res) => {
  const forceRefresh = req.query.refresh === 'true';
  
  // Check cache
  if (!forceRefresh && cache.data && Date.now() - cache.timestamp < CACHE_DURATION) {
    const cacheAge = Math.round((Date.now() - cache.timestamp) / 1000 / 60);
    return res.json({
      success: true,
      data: cache.data,
      cached: true,
      cacheAge: cacheAge + ' minutes',
      nextRefresh: (60 - cacheAge) + ' minutes',
    });
  }
  
  try {
    const results = await scrapeAll();
    const data = [results.pump, results.rlb, results.hype];
    
    // Update cache
    cache = { data, timestamp: Date.now() };
    
    const liveCount = data.filter(d => d.source === 'live').length;
    
    res.json({
      success: true,
      data,
      cached: false,
      liveCount: `${liveCount}/${data.length}`,
      scrapedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Scraping error:', error);
    
    // Return cached data if available, otherwise fallbacks
    if (cache.data) {
      return res.json({
        success: true,
        data: cache.data,
        cached: true,
        error: error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Revenue scraper v3.0 running on port ${PORT}`);
  console.log(`Puppeteer enabled for PUMP and RLB scraping`);
});
