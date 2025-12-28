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
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    // Wait for data to load
    await page.waitForSelector('table', { timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000)); // Extra wait for JS rendering
    
    // Extract data from Token Purchases table
    const data = await page.evaluate(() => {
      const tables = document.querySelectorAll('table');
      let purchases = [];
      
      tables.forEach(table => {
        const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent?.toLowerCase() || '');
        const isTokenPurchases = headers.some(h => h.includes('amount') || h.includes('usd'));
        
        if (isTokenPurchases) {
          const rows = table.querySelectorAll('tbody tr');
          rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            cells.forEach(cell => {
              const text = cell.textContent || '';
              // Match USD amounts
              const match = text.match(/\$?([\d,]+\.?\d*)/);
              if (match) {
                const amount = parseFloat(match[1].replace(/,/g, ''));
                if (amount > 0 && amount < 100000000) { // Sanity check
                  purchases.push(amount);
                }
              }
            });
          });
        }
      });
      
      // Also try to find any revenue numbers displayed
      const bodyText = document.body.innerText;
      const revenueMatch = bodyText.match(/(?:total|revenue|fees?)[\s:]*\$?([\d,]+\.?\d*)\s*(?:m|million)?/i);
      
      return {
        purchases,
        bodyText: bodyText.substring(0, 5000), // For debugging
        revenueMatch: revenueMatch ? revenueMatch[1] : null,
      };
    });
    
    console.log('PUMP data found:', data.purchases.length, 'purchases');
    
    // Calculate weekly revenue
    let weeklyRevenue = 3000000; // Default
    if (data.purchases.length > 0) {
      const total = data.purchases.reduce((sum, a) => sum + a, 0);
      // Assume the visible data represents recent activity
      weeklyRevenue = total > 100000 ? total : 3000000;
    }
    
    await page.close();
    
    return {
      symbol: 'PUMP',
      weeklyRevenue,
      annualRevenue: weeklyRevenue * 52,
      weeklyEarnings: weeklyRevenue, // 100% accrues
      annualEarnings: weeklyRevenue * 52,
      revenueAccrualPct: 1.0,
      source: data.purchases.length > 0 ? 'live' : 'estimated',
    };
  } catch (error) {
    console.error('PUMP scraping error:', error.message);
    if (page) await page.close();
    
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
  console.log('Scraping RLB from rollbit.com/rlb/buy-and-burn...');
  let page;
  try {
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    await page.goto('https://rollbit.com/rlb/buy-and-burn', { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    await new Promise(r => setTimeout(r, 5000)); // Wait for JS rendering
    
    // Try to click 30d filter
    try {
      const buttons = await page.$$('button');
      for (const button of buttons) {
        const text = await page.evaluate(el => el.textContent, button);
        if (text && (text.includes('30') || text.toLowerCase().includes('month'))) {
          await button.click();
          await new Promise(r => setTimeout(r, 3000));
          break;
        }
      }
    } catch (e) {
      console.log('Could not click filter:', e.message);
    }
    
    // Extract revenue data
    const data = await page.evaluate(() => {
      const text = document.body.innerText;
      
      // Look for revenue breakdown
      const patterns = {
        casino: /casino[:\s]*\$?([\d,]+\.?\d*)\s*(k|m)?/i,
        futures: /(?:crypto\s*)?futures[:\s]*\$?([\d,]+\.?\d*)\s*(k|m)?/i,
        sports: /sports[:\s]*\$?([\d,]+\.?\d*)\s*(k|m)?/i,
        total: /total[:\s]*\$?([\d,]+\.?\d*)\s*(k|m)?/i,
      };
      
      const parseAmount = (match) => {
        if (!match) return 0;
        let amount = parseFloat(match[1].replace(/,/g, ''));
        if (match[2]?.toLowerCase() === 'k') amount *= 1000;
        if (match[2]?.toLowerCase() === 'm') amount *= 1000000;
        return amount;
      };
      
      return {
        casino: parseAmount(text.match(patterns.casino)),
        futures: parseAmount(text.match(patterns.futures)),
        sports: parseAmount(text.match(patterns.sports)),
        total: parseAmount(text.match(patterns.total)),
        bodyText: text.substring(0, 5000),
      };
    });
    
    console.log('RLB data:', data.casino, data.futures, data.sports, data.total);
    
    // Calculate revenue (assume 30-day data)
    let monthlyRevenue = data.total || (data.casino + data.futures + data.sports);
    let weeklyRevenue = monthlyRevenue > 0 ? monthlyRevenue / 4.33 : 1500000;
    
    // Calculate earnings: 10% casino + 30% futures + 20% sports
    let monthlyEarnings = (data.casino * 0.10) + (data.futures * 0.30) + (data.sports * 0.20);
    let weeklyEarnings = monthlyEarnings > 0 ? monthlyEarnings / 4.33 : 255000;
    
    const accrualPct = weeklyRevenue > 0 ? weeklyEarnings / weeklyRevenue : 0.17;
    
    await page.close();
    
    return {
      symbol: 'RLB',
      weeklyRevenue,
      annualRevenue: weeklyRevenue * 52,
      weeklyEarnings,
      annualEarnings: weeklyEarnings * 52,
      revenueAccrualPct: accrualPct,
      source: monthlyRevenue > 0 ? 'live' : 'estimated',
    };
  } catch (error) {
    console.error('RLB scraping error:', error.message);
    if (page) await page.close();
    
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

// Scrape HYPE revenue from Artemis Analytics
async function scrapeHYPE(browser) {
  console.log('Scraping HYPE from Artemis Analytics...');
  let page;
  try {
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    await page.goto('https://app.artemisanalytics.com/asset/hyperliquid?from=assets', { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    await new Promise(r => setTimeout(r, 8000)); // Wait longer for this SPA
    
    // Extract revenue data
    const data = await page.evaluate(() => {
      const text = document.body.innerText;
      
      // Look for annualized revenue/fees
      const patterns = [
        /annualized[:\s]*\$?([\d,]+\.?\d*)\s*(k|m|b)?/i,
        /annual[:\s]*revenue[:\s]*\$?([\d,]+\.?\d*)\s*(k|m|b)?/i,
        /fees[:\s]*\$?([\d,]+\.?\d*)\s*(k|m|b)?/i,
        /revenue[:\s]*\$?([\d,]+\.?\d*)\s*(k|m|b)?/i,
      ];
      
      let annualRevenue = 0;
      
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          annualRevenue = parseFloat(match[1].replace(/,/g, ''));
          if (match[2]?.toLowerCase() === 'k') annualRevenue *= 1000;
          if (match[2]?.toLowerCase() === 'm') annualRevenue *= 1000000;
          if (match[2]?.toLowerCase() === 'b') annualRevenue *= 1000000000;
          if (annualRevenue > 10000000) break; // Found a reasonable number
        }
      }
      
      return {
        annualRevenue,
        bodyText: text.substring(0, 5000),
      };
    });
    
    console.log('HYPE annual revenue:', data.annualRevenue);
    
    const annualRevenue = data.annualRevenue > 0 ? data.annualRevenue : 130000000;
    const weeklyRevenue = annualRevenue / 52;
    
    await page.close();
    
    return {
      symbol: 'HYPE',
      weeklyRevenue,
      annualRevenue,
      weeklyEarnings: weeklyRevenue, // 100% accrues
      annualEarnings: annualRevenue,
      revenueAccrualPct: 1.0,
      source: data.annualRevenue > 0 ? 'live' : 'estimated',
    };
  } catch (error) {
    console.error('HYPE scraping error:', error.message);
    if (page) await page.close();
    
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
}

// Main scraping function
async function scrapeAll() {
  console.log('Starting scrape at', new Date().toISOString());
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });
  
  try {
    const [pump, rlb, hype] = await Promise.all([
      scrapePUMP(browser),
      scrapeRLB(browser),
      scrapeHYPE(browser),
    ]);
    
    await browser.close();
    
    return { pump, rlb, hype };
  } catch (error) {
    await browser.close();
    throw error;
  }
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
    res.status(500).json({
      success: false,
      error: error.message,
      data: cache.data || [],
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Revenue scraper running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api/revenue`);
});

