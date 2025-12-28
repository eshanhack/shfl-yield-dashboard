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
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Scrape PUMP revenue from fees.pump.fun
async function scrapePUMP(browser) {
  console.log('Scraping PUMP from fees.pump.fun...');
  let page;
  try {
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    await page.goto('https://fees.pump.fun/', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Wait a bit for JS
    await new Promise(r => setTimeout(r, 5000));
    
    // Extract any visible numbers
    const data = await page.evaluate(() => {
      const text = document.body.innerText;
      
      // Look for large USD amounts (millions)
      const amounts = [];
      const matches = text.matchAll(/\$?([\d,]+(?:\.\d+)?)\s*(?:M|million)?/gi);
      for (const match of matches) {
        const num = parseFloat(match[1].replace(/,/g, ''));
        if (num > 100000 && num < 1000000000) {
          amounts.push(num);
        }
      }
      
      // Look for fee/revenue mentions
      const feeMatch = text.match(/(?:fees?|revenue|total)[:\s]*\$?([\d,]+(?:\.\d+)?)\s*(M|K)?/i);
      
      return {
        amounts,
        feeMatch: feeMatch ? feeMatch[0] : null,
        snippet: text.substring(0, 2000),
      };
    });
    
    await page.close();
    
    // Estimate based on recent data: ~$2-4M weekly
    let weeklyRevenue = 3000000;
    if (data.amounts.length > 0) {
      // Use largest reasonable amount as a reference
      const maxAmount = Math.max(...data.amounts.filter(a => a < 50000000));
      if (maxAmount > 500000) {
        weeklyRevenue = maxAmount;
      }
    }
    
    console.log('PUMP scraped, weekly estimate:', weeklyRevenue);
    
    return {
      symbol: 'PUMP',
      weeklyRevenue,
      annualRevenue: weeklyRevenue * 52,
      weeklyEarnings: weeklyRevenue,
      annualEarnings: weeklyRevenue * 52,
      revenueAccrualPct: 1.0,
      source: 'live',
    };
  } catch (error) {
    console.error('PUMP scraping error:', error.message);
    if (page) await page.close().catch(() => {});
    
    return {
      symbol: 'PUMP',
      weeklyRevenue: 3000000,
      annualRevenue: 156000000,
      weeklyEarnings: 3000000,
      annualEarnings: 156000000,
      revenueAccrualPct: 1.0,
      source: 'estimated',
    };
  }
}

// Scrape RLB revenue from rollbit.com/rlb/buy-and-burn
async function scrapeRLB(browser) {
  console.log('Scraping RLB from rollbit.com...');
  let page;
  try {
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    await page.goto('https://rollbit.com/rlb/buy-and-burn', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    await new Promise(r => setTimeout(r, 5000));
    
    // Extract revenue data
    const data = await page.evaluate(() => {
      const text = document.body.innerText;
      
      // Look for revenue breakdown patterns
      const findAmount = (pattern) => {
        const match = text.match(pattern);
        if (!match) return 0;
        let amount = parseFloat(match[1].replace(/,/g, ''));
        if (match[2]?.toLowerCase() === 'k') amount *= 1000;
        if (match[2]?.toLowerCase() === 'm') amount *= 1000000;
        return amount;
      };
      
      return {
        casino: findAmount(/casino[:\s]*\$?([\d,]+\.?\d*)\s*(k|m)?/i),
        futures: findAmount(/(?:crypto\s*)?futures[:\s]*\$?([\d,]+\.?\d*)\s*(k|m)?/i),
        sports: findAmount(/sports[:\s]*\$?([\d,]+\.?\d*)\s*(k|m)?/i),
        total: findAmount(/total[:\s]*\$?([\d,]+\.?\d*)\s*(k|m)?/i),
        snippet: text.substring(0, 2000),
      };
    });
    
    await page.close();
    
    console.log('RLB data:', data.casino, data.futures, data.sports, data.total);
    
    // Calculate from scraped data or use estimates
    let monthlyRevenue = data.total || (data.casino + data.futures + data.sports);
    let weeklyRevenue = monthlyRevenue > 100000 ? monthlyRevenue / 4.33 : 1500000;
    
    // Earnings: 10% casino + 30% futures + 20% sports
    let weeklyEarnings;
    if (data.casino > 0 || data.futures > 0 || data.sports > 0) {
      const monthlyEarnings = (data.casino * 0.10) + (data.futures * 0.30) + (data.sports * 0.20);
      weeklyEarnings = monthlyEarnings / 4.33;
    } else {
      weeklyEarnings = weeklyRevenue * 0.17;
    }
    
    return {
      symbol: 'RLB',
      weeklyRevenue,
      annualRevenue: weeklyRevenue * 52,
      weeklyEarnings,
      annualEarnings: weeklyEarnings * 52,
      revenueAccrualPct: weeklyEarnings / weeklyRevenue,
      source: monthlyRevenue > 100000 ? 'live' : 'estimated',
    };
  } catch (error) {
    console.error('RLB scraping error:', error.message);
    if (page) await page.close().catch(() => {});
    
    return {
      symbol: 'RLB',
      weeklyRevenue: 1500000,
      annualRevenue: 78000000,
      weeklyEarnings: 255000,
      annualEarnings: 13260000,
      revenueAccrualPct: 0.17,
      source: 'estimated',
    };
  }
}

// HYPE - Use DeFiLlama API instead of scraping (more reliable)
async function fetchHYPE() {
  console.log('Fetching HYPE from DeFiLlama API...');
  try {
    // DeFiLlama fees API
    const response = await fetch('https://api.llama.fi/summary/fees/hyperliquid?dataType=dailyFees', {
      headers: { 'Accept': 'application/json' },
      timeout: 10000,
    });
    
    if (response.ok) {
      const data = await response.json();
      
      // Get recent daily fees and annualize
      if (data.totalDataChart && data.totalDataChart.length > 0) {
        // Get last 7 days average
        const recent = data.totalDataChart.slice(-7);
        const avgDaily = recent.reduce((sum, [_, val]) => sum + val, 0) / recent.length;
        const weeklyRevenue = avgDaily * 7;
        const annualRevenue = avgDaily * 365;
        
        console.log('HYPE from DeFiLlama, daily avg:', avgDaily);
        
        return {
          symbol: 'HYPE',
          weeklyRevenue,
          annualRevenue,
          weeklyEarnings: weeklyRevenue,
          annualEarnings: annualRevenue,
          revenueAccrualPct: 1.0,
          source: 'live',
        };
      }
    }
  } catch (error) {
    console.error('HYPE DeFiLlama error:', error.message);
  }
  
  // Fallback estimate based on ~$130M annual
  return {
    symbol: 'HYPE',
    weeklyRevenue: 2500000,
    annualRevenue: 130000000,
    weeklyEarnings: 2500000,
    annualEarnings: 130000000,
    revenueAccrualPct: 1.0,
    source: 'estimated',
  };
}

// Main scraping function
async function scrapeAll() {
  console.log('Starting scrape at', new Date().toISOString());
  
  // Fetch HYPE first (no browser needed)
  const hype = await fetchHYPE();
  
  // Launch browser for PUMP and RLB
  let browser;
  let pump, rlb;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--single-process',
      ],
    });
    
    // Run PUMP and RLB in sequence to save memory
    pump = await scrapePUMP(browser);
    rlb = await scrapeRLB(browser);
    
    await browser.close();
  } catch (error) {
    console.error('Browser error:', error.message);
    if (browser) await browser.close().catch(() => {});
    
    pump = {
      symbol: 'PUMP',
      weeklyRevenue: 3000000,
      annualRevenue: 156000000,
      weeklyEarnings: 3000000,
      annualEarnings: 156000000,
      revenueAccrualPct: 1.0,
      source: 'estimated',
    };
    
    rlb = {
      symbol: 'RLB',
      weeklyRevenue: 1500000,
      annualRevenue: 78000000,
      weeklyEarnings: 255000,
      annualEarnings: 13260000,
      revenueAccrualPct: 0.17,
      source: 'estimated',
    };
  }
  
  return { pump, rlb, hype };
}

// API Routes
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'SHFL Revenue Scraper',
    endpoints: ['/api/revenue', '/api/health'],
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/revenue', async (req, res) => {
  const forceRefresh = req.query.refresh === 'true';
  
  // Check cache
  if (!forceRefresh && cache.data && Date.now() - cache.timestamp < CACHE_DURATION) {
    return res.json({
      success: true,
      data: cache.data,
      cached: true,
      cacheAge: Math.round((Date.now() - cache.timestamp) / 1000 / 60) + ' minutes',
      nextRefresh: Math.round((CACHE_DURATION - (Date.now() - cache.timestamp)) / 1000 / 60) + ' minutes',
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
    
    // Return estimates on error
    const fallbackData = [
      { symbol: 'PUMP', weeklyRevenue: 3000000, annualRevenue: 156000000, weeklyEarnings: 3000000, annualEarnings: 156000000, revenueAccrualPct: 1.0, source: 'estimated' },
      { symbol: 'RLB', weeklyRevenue: 1500000, annualRevenue: 78000000, weeklyEarnings: 255000, annualEarnings: 13260000, revenueAccrualPct: 0.17, source: 'estimated' },
      { symbol: 'HYPE', weeklyRevenue: 2500000, annualRevenue: 130000000, weeklyEarnings: 2500000, annualEarnings: 130000000, revenueAccrualPct: 1.0, source: 'estimated' },
    ];
    
    res.json({
      success: true,
      data: cache.data || fallbackData,
      cached: false,
      error: error.message,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Revenue scraper running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api/revenue`);
});
