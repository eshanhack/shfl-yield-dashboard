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
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Scrape PUMP from fees.pump.fun
// Strategy: Find "Token Purchases" table, extract "Amount (USD)" column, sum rows
async function scrapePUMP(browser) {
  console.log('=== Scraping PUMP from fees.pump.fun ===');
  let page;
  try {
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    
    await page.goto('https://fees.pump.fun/', { 
      waitUntil: 'networkidle0',
      timeout: 60000 
    });
    
    // Wait for data to load
    await new Promise(r => setTimeout(r, 5000));
    
    // Extract daily USD amounts from Token Purchases table
    const data = await page.evaluate(() => {
      const results = {
        dailyAmounts: [],
        debug: '',
      };
      
      // Find all tables
      const tables = document.querySelectorAll('table');
      results.debug = `Found ${tables.length} tables. `;
      
      for (const table of tables) {
        const headerRow = table.querySelector('thead tr, tr:first-child');
        if (!headerRow) continue;
        
        const headers = Array.from(headerRow.querySelectorAll('th, td')).map(h => h.innerText.toLowerCase().trim());
        results.debug += `Headers: ${headers.join(', ')}. `;
        
        // Find "amount" column index (looking for "Amount (USD)" or similar)
        const amountIndex = headers.findIndex(h => h.includes('amount') && h.includes('usd'));
        const altAmountIndex = headers.findIndex(h => h.includes('amount'));
        const finalAmountIndex = amountIndex !== -1 ? amountIndex : altAmountIndex;
        
        if (finalAmountIndex === -1) continue;
        
        results.debug += `Amount column at index ${finalAmountIndex}. `;
        
        // Get all data rows
        const rows = table.querySelectorAll('tbody tr');
        results.debug += `Found ${rows.length} data rows. `;
        
        rows.forEach((row, i) => {
          const cells = row.querySelectorAll('td');
          if (cells.length > finalAmountIndex) {
            const amountText = cells[finalAmountIndex].innerText;
            // Parse amount - remove $ and , then parse
            const amount = parseFloat(amountText.replace(/[$,]/g, ''));
            if (!isNaN(amount) && amount > 0) {
              results.dailyAmounts.push(amount);
            }
          }
        });
        
        // If we found amounts, break (we found the right table)
        if (results.dailyAmounts.length > 0) {
          results.debug += `Extracted ${results.dailyAmounts.length} daily amounts. `;
          break;
        }
      }
      
      return results;
    });
    
    console.log('PUMP debug:', data.debug);
    console.log('PUMP daily amounts (first 10):', data.dailyAmounts.slice(0, 10));
    
    await page.close();
    
    // Calculate revenues
    // Rows are already sorted latest to oldest
    const weeklyRevenue = data.dailyAmounts.slice(0, 7).reduce((sum, a) => sum + a, 0);
    const monthlyRevenue = data.dailyAmounts.slice(0, 30).reduce((sum, a) => sum + a, 0);
    const annualRevenue = monthlyRevenue * 12;
    
    console.log('PUMP calculated - weekly:', weeklyRevenue, 'monthly:', monthlyRevenue, 'annual:', annualRevenue);
    
    if (data.dailyAmounts.length >= 7 && weeklyRevenue > 100000) {
      return {
        symbol: 'PUMP',
        weeklyRevenue,
        annualRevenue,
        weeklyEarnings: weeklyRevenue, // 100% to token
        annualEarnings: annualRevenue,
        revenueAccrualPct: 1.0,
        source: 'live',
        dataPoints: data.dailyAmounts.length,
      };
    }
    
    throw new Error('Not enough data extracted');
    
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

// Scrape RLB from rollshare.io/buyback
// Strategy: Click "Day" dropdown, select "Year (365d)", extract "365 Days Combined Revenue"
async function scrapeRLB(browser) {
  console.log('=== Scraping RLB from rollshare.io/buyback ===');
  let page;
  try {
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    
    await page.goto('https://rollshare.io/buyback', { 
      waitUntil: 'networkidle0',
      timeout: 60000 
    });
    
    // Wait for page to load
    await new Promise(r => setTimeout(r, 3000));
    
    // Click the dropdown that says "Day" and select "Year (365d)"
    try {
      await page.evaluate(() => {
        // Find dropdown/select element
        const selects = document.querySelectorAll('select');
        for (const select of selects) {
          const options = Array.from(select.options);
          const yearOption = options.find(o => o.text.includes('365') || o.text.includes('Year'));
          if (yearOption) {
            select.value = yearOption.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
        }
        
        // Try clicking a dropdown button
        const buttons = document.querySelectorAll('button, [role="button"]');
        for (const btn of buttons) {
          if (btn.innerText.includes('Day') || btn.innerText.includes('1 Day')) {
            btn.click();
            return 'clicked dropdown';
          }
        }
        return false;
      });
      
      await new Promise(r => setTimeout(r, 2000));
      
      // Try to select Year option if dropdown opened
      await page.evaluate(() => {
        const options = document.querySelectorAll('[role="option"], li, a');
        for (const opt of options) {
          if (opt.innerText.includes('365') || opt.innerText.includes('Year')) {
            opt.click();
            return true;
          }
        }
        return false;
      });
      
      await new Promise(r => setTimeout(r, 3000));
      
    } catch (e) {
      console.log('RLB: Error with dropdown:', e.message);
    }
    
    // Extract the combined revenue number
    const data = await page.evaluate(() => {
      const results = {
        revenue: 0,
        period: '',
        debug: '',
      };
      
      const bodyText = document.body.innerText;
      
      // Look for "X Day(s) Combined Revenue" followed by a dollar amount
      const revenueMatch = bodyText.match(/(\d+)\s*Day\(?s?\)?\s*Combined\s*Revenue[\s\S]*?\$([\d,]+(?:\.\d+)?)/i);
      if (revenueMatch) {
        results.period = revenueMatch[1] + ' days';
        results.revenue = parseFloat(revenueMatch[2].replace(/,/g, ''));
        results.debug = `Found ${results.period} revenue: $${results.revenue}`;
      }
      
      // Also try to find any large revenue number
      const allAmounts = bodyText.match(/\$([\d,]+(?:\.\d+)?)/g);
      if (allAmounts) {
        results.debug += ` All amounts found: ${allAmounts.slice(0, 5).join(', ')}`;
      }
      
      return results;
    });
    
    console.log('RLB debug:', data.debug);
    console.log('RLB revenue:', data.revenue, 'period:', data.period);
    
    await page.close();
    
    // Calculate based on what period we got
    let annualRevenue;
    if (data.period.includes('365')) {
      annualRevenue = data.revenue;
    } else if (data.period.includes('30')) {
      annualRevenue = data.revenue * 12;
    } else if (data.period.includes('7')) {
      annualRevenue = data.revenue * 52;
    } else if (data.period.includes('1')) {
      annualRevenue = data.revenue * 365;
    } else {
      // Default: assume it's daily
      annualRevenue = data.revenue * 365;
    }
    
    const weeklyRevenue = annualRevenue / 52;
    
    // Earnings: 10% casino + 30% futures + 20% sports ≈ 17% average
    const earningsRate = 0.17;
    
    console.log('RLB calculated - annual revenue:', annualRevenue);
    
    if (data.revenue > 100000) {
      return {
        symbol: 'RLB',
        weeklyRevenue,
        annualRevenue,
        weeklyEarnings: weeklyRevenue * earningsRate,
        annualEarnings: annualRevenue * earningsRate,
        revenueAccrualPct: earningsRate,
        source: 'live',
        period: data.period,
      };
    }
    
    throw new Error('Revenue too low or not found');
    
  } catch (error) {
    console.error('RLB scraping error:', error.message);
    if (page) await page.close().catch(() => {});
    
    // Fallback: $19.14M/month from user verification
    const monthlyRevenue = 19137445;
    return {
      symbol: 'RLB',
      weeklyRevenue: monthlyRevenue / 4.33,
      annualRevenue: monthlyRevenue * 12,
      weeklyEarnings: monthlyRevenue * 0.17 / 4.33,
      annualEarnings: monthlyRevenue * 12 * 0.17,
      revenueAccrualPct: 0.17,
      source: 'estimated',
      error: error.message,
    };
  }
}

// HYPE - Use DeFiLlama API (most reliable)
async function fetchHYPE() {
  console.log('=== Fetching HYPE from DeFiLlama API ===');
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
  console.log('\n========================================');
  console.log('Starting scrape at', new Date().toISOString());
  console.log('========================================\n');
  
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
  
  console.log('\n========================================');
  console.log('Scrape complete');
  console.log('========================================\n');
  
  return { pump, rlb, hype };
}

// API Routes
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'SHFL Revenue Scraper',
    version: '4.0',
    endpoints: ['/api/revenue', '/api/health'],
    cacheStatus: cache.data ? `populated (${Math.round((Date.now() - cache.timestamp) / 60000)}m ago)` : 'empty',
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
    
    // Return cached data if available
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
  console.log(`Revenue scraper v4.0 running on port ${PORT}`);
  console.log(`- PUMP: fees.pump.fun (Token Purchases table)`);
  console.log(`- RLB: rollshare.io/buyback (365d Combined Revenue)`);
  console.log(`- HYPE: DeFiLlama API`);
});
