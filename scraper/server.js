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
    
    // Extract daily USD amounts AND accrual percentages from Token Purchases table
    const data = await page.evaluate(() => {
      const results = {
        dailyAmounts: [],
        accrualPercentages: [],
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
        
        // Find "% of Daily Revenue" column
        const accrualIndex = headers.findIndex(h => h.includes('%') && h.includes('daily'));
        
        if (finalAmountIndex === -1) continue;
        
        results.debug += `Amount column at index ${finalAmountIndex}, Accrual at ${accrualIndex}. `;
        
        // Get all data rows
        const rows = table.querySelectorAll('tbody tr');
        results.debug += `Found ${rows.length} data rows. `;
        
        rows.forEach((row, i) => {
          const cells = row.querySelectorAll('td');
          if (cells.length > finalAmountIndex) {
            // Extract amount
            const amountText = cells[finalAmountIndex].innerText;
            const amount = parseFloat(amountText.replace(/[$,]/g, ''));
            if (!isNaN(amount) && amount > 0) {
              results.dailyAmounts.push(amount);
            }
            
            // Extract accrual percentage if column exists
            if (accrualIndex !== -1 && cells.length > accrualIndex) {
              const accrualText = cells[accrualIndex].innerText;
              const accrual = parseFloat(accrualText.replace(/[%,]/g, ''));
              if (!isNaN(accrual) && accrual > 0 && accrual <= 100) {
                results.accrualPercentages.push(accrual / 100); // Convert to decimal
              }
            }
          }
        });
        
        // If we found amounts, break (we found the right table)
        if (results.dailyAmounts.length > 0) {
          results.debug += `Extracted ${results.dailyAmounts.length} daily amounts, ${results.accrualPercentages.length} accrual values. `;
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
    
    // Calculate average accrual from last 30 days (or whatever we have)
    let accrualPct = 1.0; // Default to 100%
    if (data.accrualPercentages.length > 0) {
      const last30Accruals = data.accrualPercentages.slice(0, 30);
      accrualPct = last30Accruals.reduce((sum, a) => sum + a, 0) / last30Accruals.length;
      console.log('PUMP accrual from scrape:', (accrualPct * 100).toFixed(1) + '%');
    }
    
    console.log('PUMP calculated - weekly:', weeklyRevenue, 'monthly:', monthlyRevenue, 'annual:', annualRevenue, 'accrual:', accrualPct);
    
    if (data.dailyAmounts.length >= 7 && weeklyRevenue > 100000) {
      return {
        symbol: 'PUMP',
        weeklyRevenue,
        annualRevenue,
        weeklyEarnings: weeklyRevenue * accrualPct,
        annualEarnings: annualRevenue * accrualPct,
        revenueAccrualPct: accrualPct,
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

// Scrape RLB from rollshare.io/buyback?days=365
// Strategy: Go directly to 365-day URL, extract "365 Days Combined Revenue"
async function scrapeRLB(browser) {
  console.log('=== Scraping RLB from rollshare.io/buyback?days=365 ===');
  let page;
  try {
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Go directly to 365-day filtered URL
    await page.goto('https://rollshare.io/buyback?days=365', { 
      waitUntil: 'networkidle0',
      timeout: 60000 
    });
    
    // Wait for data to load
    await new Promise(r => setTimeout(r, 3000));
    
    // Extract revenue numbers including breakdown by category
    const data = await page.evaluate(() => {
      const results = {
        annualRevenue: 0,
        casinoRevenue: 0,
        tradingRevenue: 0,
        sportsRevenue: 0,
        debug: '',
      };
      
      const bodyText = document.body.innerText;
      
      // Look for "365 Days Combined Revenue" followed by dollar amount
      const revenueMatch = bodyText.match(/365\s*Days?\s*Combined\s*Revenue[\s\S]*?\$([\d,]+(?:\.\d+)?)/i);
      if (revenueMatch) {
        results.annualRevenue = parseFloat(revenueMatch[1].replace(/,/g, ''));
        results.debug = `Found 365 Days Combined Revenue: $${results.annualRevenue.toLocaleString()}. `;
      }
      
      // Extract individual revenue categories for accurate accrual calculation
      // Casino revenue - 10% accrual
      const casinoMatch = bodyText.match(/Casino[:\s]*\(?\$?([\d,]+(?:\.\d+)?)/i);
      if (casinoMatch) {
        results.casinoRevenue = parseFloat(casinoMatch[1].replace(/,/g, ''));
        results.debug += `Casino: $${results.casinoRevenue.toLocaleString()}. `;
      }
      
      // Trading/Futures revenue - 30% accrual
      const tradingMatch = bodyText.match(/Trading[:\s]*\(?\$?([\d,]+(?:\.\d+)?)/i);
      if (tradingMatch) {
        results.tradingRevenue = parseFloat(tradingMatch[1].replace(/,/g, ''));
        results.debug += `Trading: $${results.tradingRevenue.toLocaleString()}. `;
      }
      
      // Sports revenue - 20% accrual
      const sportsMatch = bodyText.match(/Sportsbook[:\s]*\(?\$?([\d,]+(?:\.\d+)?)/i);
      if (sportsMatch) {
        results.sportsRevenue = parseFloat(sportsMatch[1].replace(/,/g, ''));
        results.debug += `Sports: $${results.sportsRevenue.toLocaleString()}. `;
      }
      
      return results;
    });
    
    console.log('RLB debug:', data.debug);
    console.log('RLB annual revenue:', data.annualRevenue);
    
    await page.close();
    
    if (data.annualRevenue > 1000000) {
      const weeklyRevenue = data.annualRevenue / 52;
      
      // Calculate ACTUAL accrual based on revenue breakdown:
      // Casino: 10%, Trading/Futures: 30%, Sportsbook: 20%
      let annualEarnings = 0;
      let accrualPct = 0.17; // Default weighted average
      
      if (data.casinoRevenue > 0 || data.tradingRevenue > 0 || data.sportsRevenue > 0) {
        annualEarnings = (data.casinoRevenue * 0.10) + (data.tradingRevenue * 0.30) + (data.sportsRevenue * 0.20);
        accrualPct = data.annualRevenue > 0 ? annualEarnings / data.annualRevenue : 0.17;
        console.log('RLB calculated accrual:', (accrualPct * 100).toFixed(1) + '%', 'earnings:', annualEarnings);
      } else {
        annualEarnings = data.annualRevenue * accrualPct;
      }
      
      return {
        symbol: 'RLB',
        weeklyRevenue,
        annualRevenue: data.annualRevenue,
        weeklyEarnings: annualEarnings / 52,
        annualEarnings,
        revenueAccrualPct: accrualPct,
        source: 'live',
      };
    }
    
    throw new Error('Revenue not found or too low');
    
  } catch (error) {
    console.error('RLB scraping error:', error.message);
    if (page) await page.close().catch(() => {});
    
    // Fallback based on rollshare.io Dec 2025 data: $277M annual
    // Breakdown: Casino $213.5M (10%), Trading $34.6M (30%), Sports $29.3M (20%)
    const annualRevenue = 277489012;
    const annualEarnings = (213546803 * 0.10) + (34618572 * 0.30) + (29323636 * 0.20);
    const accrualPct = annualEarnings / annualRevenue;
    
    return {
      symbol: 'RLB',
      weeklyRevenue: annualRevenue / 52,
      annualRevenue,
      weeklyEarnings: annualEarnings / 52,
      annualEarnings,
      revenueAccrualPct: accrualPct,
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
        const earningsRate = 0.99; // 99% accrues to token holders
        
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
    weeklyEarnings: weeklyRevenue * 0.99,
    annualEarnings: weeklyRevenue * 52 * 0.99,
    revenueAccrualPct: 0.99,
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

// Tanzanite cache
let tanzaniteCache = {
  data: null,
  timestamp: 0,
};
const TANZANITE_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Scrape Shuffle deposit volume from Tanzanite
async function scrapeTanzanite(browser, timeframe) {
  console.log(`=== Scraping Tanzanite for ${timeframe} data ===`);
  let page;
  try {
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    
    await page.goto('https://terminal.tanzanite.xyz/overview', { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    // Wait for page to load
    await new Promise(r => setTimeout(r, 3000));
    
    // Click on the correct timeframe tab (Week, Month, Year)
    const timeframeMap = { week: 'Week', month: 'Month', year: 'Year' };
    const tabText = timeframeMap[timeframe] || 'Week';
    
    try {
      // Find and click the timeframe button
      const clicked = await page.evaluate((text) => {
        const buttons = document.querySelectorAll('button, [role="tab"], div[class*="tab"]');
        for (const btn of buttons) {
          if (btn.textContent?.trim().toLowerCase() === text.toLowerCase()) {
            btn.click();
            return true;
          }
        }
        return false;
      }, tabText);
      
      if (clicked) {
        await new Promise(r => setTimeout(r, 2000)); // Wait for data to update
      }
    } catch (e) {
      console.log(`Could not click ${tabText} tab:`, e.message);
    }
    
    // Extract Shuffle data from the Market Breakdown table
    const data = await page.evaluate(() => {
      const result = {
        depositVolume: 0,
        percentChange: 0,
        found: false,
        debug: '',
      };
      
      // Look for Market Breakdown section
      const tables = document.querySelectorAll('table');
      result.debug = `Found ${tables.length} tables. `;
      
      for (const table of tables) {
        const rows = table.querySelectorAll('tr');
        for (const row of rows) {
          const text = row.textContent || '';
          if (text.toLowerCase().includes('shuffle')) {
            result.found = true;
            result.debug += `Found Shuffle row. `;
            
            // Get all cells
            const cells = row.querySelectorAll('td');
            
            // Look for deposit volume (usually a large number with $ or formatted)
            for (const cell of cells) {
              const cellText = cell.textContent || '';
              
              // Parse deposit volume - look for patterns like $1.2M, $500K, etc.
              const volumeMatch = cellText.match(/\$?([\d,.]+)\s*(B|M|K)?/i);
              if (volumeMatch && !result.depositVolume) {
                let value = parseFloat(volumeMatch[1].replace(/,/g, ''));
                const suffix = volumeMatch[2]?.toUpperCase();
                if (suffix === 'B') value *= 1e9;
                else if (suffix === 'M') value *= 1e6;
                else if (suffix === 'K') value *= 1e3;
                
                if (value > 10000) { // Reasonable deposit volume
                  result.depositVolume = value;
                  result.debug += `Volume: ${value}. `;
                }
              }
              
              // Parse percentage change - look for +X% or -X%
              const pctMatch = cellText.match(/([+-]?\d+\.?\d*)%/);
              if (pctMatch && !result.percentChange) {
                result.percentChange = parseFloat(pctMatch[1]);
                result.debug += `Change: ${result.percentChange}%. `;
              }
            }
            
            break;
          }
        }
        if (result.found) break;
      }
      
      // Alternative: scan entire page for Shuffle-related data
      if (!result.found) {
        const bodyText = document.body.innerText;
        const shuffleSection = bodyText.split(/shuffle/i)[1]?.slice(0, 500);
        if (shuffleSection) {
          result.debug += `Found shuffle in text. `;
          
          const volumeMatch = shuffleSection.match(/\$?([\d,.]+)\s*(B|M|K)?/i);
          if (volumeMatch) {
            let value = parseFloat(volumeMatch[1].replace(/,/g, ''));
            const suffix = volumeMatch[2]?.toUpperCase();
            if (suffix === 'B') value *= 1e9;
            else if (suffix === 'M') value *= 1e6;
            else if (suffix === 'K') value *= 1e3;
            result.depositVolume = value;
          }
          
          const pctMatch = shuffleSection.match(/([+-]?\d+\.?\d*)%/);
          if (pctMatch) {
            result.percentChange = parseFloat(pctMatch[1]);
          }
        }
      }
      
      return result;
    });
    
    await page.close();
    console.log(`Tanzanite ${timeframe}:`, data);
    
    return {
      timeframe,
      depositVolume: data.depositVolume,
      percentChange: data.percentChange,
      found: data.found || data.depositVolume > 0,
      debug: data.debug,
    };
    
  } catch (error) {
    console.error(`Tanzanite ${timeframe} error:`, error.message);
    if (page) await page.close().catch(() => {});
    return {
      timeframe,
      depositVolume: 0,
      percentChange: 0,
      found: false,
      error: error.message,
    };
  }
}

// Scrape all Tanzanite timeframes
async function scrapeAllTanzanite() {
  console.log('\n========================================');
  console.log('Starting Tanzanite scrape...');
  console.log('========================================\n');
  
  let browser;
  const results = { week: null, month: null, year: null };
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
      ],
    });
    
    // Scrape each timeframe in sequence
    results.week = await scrapeTanzanite(browser, 'week');
    results.month = await scrapeTanzanite(browser, 'month');
    results.year = await scrapeTanzanite(browser, 'year');
    
    await browser.close();
  } catch (error) {
    console.error('Tanzanite browser error:', error.message);
    if (browser) await browser.close().catch(() => {});
    
    // Return fallback estimates
    results.week = { timeframe: 'week', depositVolume: 15000000, percentChange: 5, found: false, source: 'estimated' };
    results.month = { timeframe: 'month', depositVolume: 60000000, percentChange: 8, found: false, source: 'estimated' };
    results.year = { timeframe: 'year', depositVolume: 700000000, percentChange: 15, found: false, source: 'estimated' };
  }
  
  return results;
}

// Tanzanite API endpoint
app.get('/api/tanzanite', async (req, res) => {
  const forceRefresh = req.query.refresh === 'true';
  
  // Check cache
  if (!forceRefresh && tanzaniteCache.data && Date.now() - tanzaniteCache.timestamp < TANZANITE_CACHE_DURATION) {
    const cacheAge = Math.round((Date.now() - tanzaniteCache.timestamp) / 1000 / 60);
    return res.json({
      success: true,
      data: tanzaniteCache.data,
      cached: true,
      cacheAge: cacheAge + ' minutes',
    });
  }
  
  try {
    const results = await scrapeAllTanzanite();
    
    // Update cache
    tanzaniteCache = { data: results, timestamp: Date.now() };
    
    res.json({
      success: true,
      data: results,
      cached: false,
      scrapedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Tanzanite error:', error);
    
    // Return cached if available
    if (tanzaniteCache.data) {
      return res.json({
        success: true,
        data: tanzaniteCache.data,
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

// ==================== LOTTERY NGR SCRAPER ====================
// Scrapes shuffle.com/lottery to extract prize data and calculate NGR

// Cache for lottery data
let lotteryCache = {
  draws: {},  // drawNumber -> { prizes, timestamp }
  timestamp: 0,
};
const LOTTERY_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

/**
 * Scrape prize data for a specific draw from shuffle.com/lottery
 * @param {object} browser - Puppeteer browser instance
 * @param {number} targetDraw - Draw number to scrape
 * @param {number} currentDraw - Current draw number on page (for navigation)
 * @param {object} page - Existing page to reuse (optional)
 */
async function scrapeLotteryDraw(browser, targetDraw, currentDraw = null, existingPage = null) {
  console.log(`=== Scraping Lottery Draw #${targetDraw} ===`);
  
  let page = existingPage;
  let createdPage = false;
  
  try {
    if (!page) {
      page = await browser.newPage();
      createdPage = true;
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Navigate to lottery results page
      await page.goto('https://shuffle.com/lottery?tab=ticketsPrizes&section=results', { 
        waitUntil: 'networkidle2',
        timeout: 60000 
      });
      
      // Wait for page to load
      await new Promise(r => setTimeout(r, 3000));
    }
    
    // Get current draw number from page if not provided
    if (currentDraw === null) {
      currentDraw = await page.evaluate(() => {
        // Look for "Draw #XX" text
        const text = document.body.innerText;
        const match = text.match(/Draw\s*#\s*(\d+)/i);
        return match ? parseInt(match[1]) : null;
      });
      console.log(`Current draw on page: #${currentDraw}`);
    }
    
    // Navigate to target draw if needed
    if (currentDraw && currentDraw !== targetDraw) {
      const clicksNeeded = currentDraw - targetDraw;
      const buttonText = clicksNeeded > 0 ? 'Prev' : 'Next';
      const numClicks = Math.abs(clicksNeeded);
      
      console.log(`Navigating ${numClicks} draws ${buttonText.toLowerCase()}...`);
      
      for (let i = 0; i < numClicks; i++) {
        // Click the appropriate navigation button
        const clicked = await page.evaluate((btnText) => {
          const buttons = document.querySelectorAll('button');
          for (const btn of buttons) {
            const text = btn.textContent?.toLowerCase() || '';
            if (text.includes(btnText.toLowerCase()) && text.includes('draw')) {
              btn.click();
              return true;
            }
          }
          // Try alternate button patterns
          for (const btn of buttons) {
            if (btn.textContent?.toLowerCase().includes(btnText.toLowerCase())) {
              btn.click();
              return true;
            }
          }
          return false;
        }, buttonText);
        
        if (!clicked) {
          console.log(`Could not find ${buttonText} button`);
          break;
        }
        
        // Wait for data to load
        await new Promise(r => setTimeout(r, 1500));
      }
    }
    
    // Verify we're on the correct draw
    const verifiedDraw = await page.evaluate(() => {
      const text = document.body.innerText;
      const match = text.match(/Draw\s*#\s*(\d+)/i);
      return match ? parseInt(match[1]) : null;
    });
    
    console.log(`Now on Draw #${verifiedDraw}`);
    
    // Extract prize data for all divisions
    const prizeData = await page.evaluate(() => {
      const result = {
        drawNumber: null,
        prizes: [],
        totalPrizes: 0,
        totalPayouts: 0,
        totalWinners: 0,
        debug: '',
      };
      
      // Get draw number
      const drawMatch = document.body.innerText.match(/Draw\s*#\s*(\d+)/i);
      if (drawMatch) {
        result.drawNumber = parseInt(drawMatch[1]);
      }
      
      // Find the prizes table/section
      // Look for division names like "Jackpot", "Division 2", etc.
      const divisions = [
        { name: 'Jackpot', aliases: ['jackpot', 'division 1', 'div 1'] },
        { name: 'Division 2', aliases: ['division 2', 'div 2', '2nd'] },
        { name: 'Division 3', aliases: ['division 3', 'div 3', '3rd'] },
        { name: 'Division 4', aliases: ['division 4', 'div 4', '4th'] },
        { name: 'Division 5', aliases: ['division 5', 'div 5', '5th'] },
        { name: 'Division 6', aliases: ['division 6', 'div 6', '6th'] },
        { name: 'Division 7', aliases: ['division 7', 'div 7', '7th'] },
        { name: 'Division 8', aliases: ['division 8', 'div 8', '8th'] },
        { name: 'Division 9', aliases: ['division 9', 'div 9', '9th'] },
      ];
      
      // Try to find prize tables
      const tables = document.querySelectorAll('table');
      result.debug += `Found ${tables.length} tables. `;
      
      for (const table of tables) {
        const rows = table.querySelectorAll('tr');
        
        for (const row of rows) {
          const cells = row.querySelectorAll('td, th');
          const rowText = row.textContent?.toLowerCase() || '';
          
          // Check if this row contains a division
          for (const div of divisions) {
            const isMatch = div.aliases.some(alias => rowText.includes(alias));
            if (!isMatch) continue;
            
            // Already have this division? Skip
            if (result.prizes.some(p => p.division === div.name)) continue;
            
            // Extract prize amount and winners
            let prizeAmount = 0;
            let winners = 0;
            
            for (const cell of cells) {
              const cellText = cell.textContent || '';
              
              // Look for currency amounts (e.g., $1,234,567.89)
              const amountMatch = cellText.match(/\$?\s*([\d,]+(?:\.\d+)?)\s*(M|K)?/i);
              if (amountMatch && prizeAmount === 0) {
                let value = parseFloat(amountMatch[1].replace(/,/g, ''));
                const suffix = amountMatch[2]?.toUpperCase();
                if (suffix === 'M') value *= 1e6;
                else if (suffix === 'K') value *= 1e3;
                
                // Prize amounts are typically > $100
                if (value > 100) {
                  prizeAmount = value;
                }
              }
              
              // Look for winner count (just a number, typically small)
              const winnerMatch = cellText.match(/^(\d+)$/);
              if (winnerMatch) {
                const num = parseInt(winnerMatch[1]);
                if (num < 10000) { // Winner counts are typically small
                  winners = num;
                }
              }
            }
            
            if (prizeAmount > 0) {
              const payout = winners > 0 ? prizeAmount : 0;
              result.prizes.push({
                division: div.name,
                prizePool: prizeAmount,
                winners: winners,
                payout: payout,
              });
              result.totalPrizes += prizeAmount;
              result.totalPayouts += payout;
              result.totalWinners += winners;
            }
            
            break; // Found this division, move to next row
          }
        }
        
        // If we found prizes, we're done with tables
        if (result.prizes.length > 0) break;
      }
      
      // Alternative: Parse from page text if table parsing failed
      if (result.prizes.length === 0) {
        result.debug += 'Table parsing failed, trying text extraction. ';
        
        // Split page into sections and look for prize data
        const bodyText = document.body.innerText;
        
        // Look for patterns like "Jackpot $1,234,567" or "Division 2 $123,456"
        for (const div of divisions) {
          for (const alias of div.aliases) {
            const regex = new RegExp(`${alias}[^\\d]*\\$?([\\d,]+(?:\\.\\d+)?)`, 'i');
            const match = bodyText.match(regex);
            if (match) {
              const amount = parseFloat(match[1].replace(/,/g, ''));
              if (amount > 100 && !result.prizes.some(p => p.division === div.name)) {
                result.prizes.push({
                  division: div.name,
                  prizePool: amount,
                  winners: 0,
                  payout: 0,
                });
                result.totalPrizes += amount;
              }
              break;
            }
          }
        }
      }
      
      result.debug += `Extracted ${result.prizes.length} divisions. `;
      return result;
    });
    
    console.log(`Draw #${targetDraw} prizes:`, prizeData.prizes.length, 'divisions, total:', prizeData.totalPrizes);
    
    return {
      success: true,
      drawNumber: prizeData.drawNumber || targetDraw,
      prizes: prizeData.prizes,
      totalPrizes: prizeData.totalPrizes,
      totalPayouts: prizeData.totalPayouts,
      totalWinners: prizeData.totalWinners,
      debug: prizeData.debug,
      page: createdPage ? null : page, // Return page for reuse if we created it
      currentPageDraw: verifiedDraw,
    };
    
  } catch (error) {
    console.error(`Error scraping draw #${targetDraw}:`, error.message);
    if (page && createdPage) await page.close().catch(() => {});
    return {
      success: false,
      drawNumber: targetDraw,
      error: error.message,
    };
  }
}

/**
 * Calculate NGR for a draw by comparing with previous draw
 * NGR = Current Draw Prizes - (Previous Draw Prizes - Previous Draw Payouts)
 */
function calculateNGR(currentDraw, previousDraw) {
  if (!currentDraw.success || !previousDraw.success) {
    return {
      success: false,
      error: 'Missing draw data',
    };
  }
  
  const previousRollover = previousDraw.totalPrizes - previousDraw.totalPayouts;
  const ngrAdded = currentDraw.totalPrizes - previousRollover;
  
  return {
    success: true,
    drawNumber: currentDraw.drawNumber,
    ngrAdded: Math.round(ngrAdded),
    currentTotalPrizes: currentDraw.totalPrizes,
    previousTotalPrizes: previousDraw.totalPrizes,
    previousPayouts: previousDraw.totalPayouts,
    previousRollover: previousRollover,
    breakdown: {
      formula: `NGR = ${currentDraw.totalPrizes.toLocaleString()} - (${previousDraw.totalPrizes.toLocaleString()} - ${previousDraw.totalPayouts.toLocaleString()})`,
      result: `NGR = ${currentDraw.totalPrizes.toLocaleString()} - ${previousRollover.toLocaleString()} = ${Math.round(ngrAdded).toLocaleString()}`,
    },
  };
}

/**
 * Scrape NGR for multiple draws
 */
async function scrapeMultipleDrawsNGR(drawNumbers) {
  console.log('\n========================================');
  console.log('Starting Lottery NGR Scrape for draws:', drawNumbers);
  console.log('========================================\n');
  
  let browser;
  const results = [];
  
  try {
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
    
    // Create a single page and reuse it
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Navigate to lottery page
    await page.goto('https://shuffle.com/lottery?tab=ticketsPrizes&section=results', { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    await new Promise(r => setTimeout(r, 3000));
    
    // Get current draw on page
    let currentPageDraw = await page.evaluate(() => {
      const text = document.body.innerText;
      const match = text.match(/Draw\s*#\s*(\d+)/i);
      return match ? parseInt(match[1]) : null;
    });
    
    console.log(`Starting from Draw #${currentPageDraw}`);
    
    // Sort draw numbers descending so we minimize navigation
    const sortedDraws = [...drawNumbers].sort((a, b) => b - a);
    
    // For each target draw, we need it AND the previous draw
    const allDrawsNeeded = new Set();
    for (const draw of sortedDraws) {
      allDrawsNeeded.add(draw);
      allDrawsNeeded.add(draw - 1);
    }
    
    const drawsToScrape = [...allDrawsNeeded].sort((a, b) => b - a);
    const scrapedDraws = {};
    
    // Scrape each draw
    for (const targetDraw of drawsToScrape) {
      // Check cache first
      if (lotteryCache.draws[targetDraw] && 
          Date.now() - lotteryCache.draws[targetDraw].timestamp < LOTTERY_CACHE_DURATION) {
        console.log(`Using cached data for Draw #${targetDraw}`);
        scrapedDraws[targetDraw] = lotteryCache.draws[targetDraw].data;
        continue;
      }
      
      // Navigate to the draw
      const clicksNeeded = currentPageDraw - targetDraw;
      if (clicksNeeded !== 0) {
        const buttonSelector = clicksNeeded > 0 ? 'Prev' : 'Next';
        const numClicks = Math.abs(clicksNeeded);
        
        for (let i = 0; i < numClicks; i++) {
          await page.evaluate((btnText) => {
            const buttons = document.querySelectorAll('button');
            for (const btn of buttons) {
              const text = btn.textContent?.toLowerCase() || '';
              if (text.includes(btnText.toLowerCase())) {
                btn.click();
                return;
              }
            }
          }, buttonSelector);
          await new Promise(r => setTimeout(r, 1200));
        }
        currentPageDraw = targetDraw;
      }
      
      // Extract data
      const drawData = await page.evaluate(() => {
        const result = {
          prizes: [],
          totalPrizes: 0,
          totalPayouts: 0,
        };
        
        // Find the results table - look for structure with divisions
        const allElements = document.querySelectorAll('*');
        
        for (const el of allElements) {
          const text = el.textContent || '';
          
          // Look for jackpot amount pattern
          if (text.toLowerCase().includes('jackpot') && text.includes('$')) {
            // Try to extract amounts from this element's children
            const matches = text.match(/\$([\d,]+(?:\.\d+)?)/g);
            if (matches) {
              // First match is usually the prize pool
              for (const match of matches) {
                const amount = parseFloat(match.replace(/[$,]/g, ''));
                if (amount > 1000) {
                  result.prizes.push({ amount, type: 'found' });
                  result.totalPrizes += amount;
                }
              }
            }
          }
        }
        
        return result;
      });
      
      scrapedDraws[targetDraw] = {
        success: true,
        drawNumber: targetDraw,
        totalPrizes: drawData.totalPrizes,
        totalPayouts: drawData.totalPayouts,
        prizes: drawData.prizes,
      };
      
      // Cache it
      lotteryCache.draws[targetDraw] = {
        data: scrapedDraws[targetDraw],
        timestamp: Date.now(),
      };
    }
    
    await page.close();
    await browser.close();
    
    // Calculate NGR for each requested draw
    for (const targetDraw of sortedDraws) {
      const current = scrapedDraws[targetDraw];
      const previous = scrapedDraws[targetDraw - 1];
      
      if (current && previous) {
        const ngrResult = calculateNGR(current, previous);
        results.push({
          drawNumber: targetDraw,
          ...ngrResult,
          currentDraw: current,
          previousDraw: previous,
        });
      } else {
        results.push({
          drawNumber: targetDraw,
          success: false,
          error: `Missing data for draw ${targetDraw} or ${targetDraw - 1}`,
        });
      }
    }
    
  } catch (error) {
    console.error('Lottery scraping error:', error.message);
    if (browser) await browser.close().catch(() => {});
    return {
      success: false,
      error: error.message,
      results: [],
    };
  }
  
  return {
    success: true,
    results,
    scrapedAt: new Date().toISOString(),
  };
}

// Lottery NGR API endpoint
app.get('/api/lottery-ngr', async (req, res) => {
  const draws = req.query.draws; // e.g., "60,61,62" or "64"
  const forceRefresh = req.query.refresh === 'true';
  
  if (!draws) {
    return res.status(400).json({
      success: false,
      error: 'Missing draws parameter. Usage: /api/lottery-ngr?draws=60,61,62',
      example: '/api/lottery-ngr?draws=64',
    });
  }
  
  // Parse draw numbers
  const drawNumbers = draws.split(',')
    .map(s => parseInt(s.trim()))
    .filter(n => !isNaN(n) && n > 1);
  
  if (drawNumbers.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No valid draw numbers provided',
    });
  }
  
  // Clear cache if force refresh
  if (forceRefresh) {
    for (const draw of drawNumbers) {
      delete lotteryCache.draws[draw];
      delete lotteryCache.draws[draw - 1];
    }
  }
  
  try {
    const results = await scrapeMultipleDrawsNGR(drawNumbers);
    res.json(results);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Single draw prizes endpoint (for debugging/verification)
app.get('/api/lottery-prizes', async (req, res) => {
  const drawNumber = parseInt(req.query.draw);
  
  if (!drawNumber || isNaN(drawNumber)) {
    return res.status(400).json({
      success: false,
      error: 'Missing or invalid draw parameter. Usage: /api/lottery-prizes?draw=64',
    });
  }
  
  // Check cache
  if (lotteryCache.draws[drawNumber] && 
      Date.now() - lotteryCache.draws[drawNumber].timestamp < LOTTERY_CACHE_DURATION) {
    return res.json({
      success: true,
      cached: true,
      data: lotteryCache.draws[drawNumber].data,
    });
  }
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const result = await scrapeLotteryDraw(browser, drawNumber);
    await browser.close();
    
    if (result.success) {
      lotteryCache.draws[drawNumber] = {
        data: result,
        timestamp: Date.now(),
      };
    }
    
    res.json({
      success: result.success,
      cached: false,
      data: result,
    });
  } catch (error) {
    if (browser) await browser.close().catch(() => {});
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Revenue scraper v6.0 running on port ${PORT}`);
  console.log(`Endpoints:`);
  console.log(`  - GET /api/revenue - PUMP, RLB, HYPE revenue data`);
  console.log(`  - GET /api/tanzanite - Shuffle deposit volume`);
  console.log(`  - GET /api/lottery-ngr?draws=60,61,62 - Calculate NGR for draws`);
  console.log(`  - GET /api/lottery-prizes?draw=64 - Get prize data for a draw`);
  console.log(`  - GET /api/health - Health check`);
});
