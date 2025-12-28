# SHFL Revenue Scraper

A dedicated scraping server that fetches live revenue data for PUMP, RLB, and HYPE tokens.

## Endpoints

- `GET /` - Service info
- `GET /api/health` - Health check
- `GET /api/revenue` - Get scraped revenue data (cached for 30 min)
- `GET /api/revenue?refresh=true` - Force refresh

## Local Development

```bash
npm install
npm start
```

Server runs on `http://localhost:3001`

## Deployment Options

### Option 1: Render.com (Recommended - Free)

1. Create a new Web Service on [render.com](https://render.com)
2. Connect your GitHub repo
3. Set root directory to `scraper`
4. Build command: `npm install`
5. Start command: `npm start`
6. Add env var: `PORT=10000`

### Option 2: Railway.app

1. Create new project on [railway.app](https://railway.app)
2. Connect GitHub repo
3. Set root directory to `/scraper`
4. Deploy!

### Option 3: Docker (Any VPS)

```bash
docker build -t shfl-scraper .
docker run -p 3001:3001 shfl-scraper
```

### Option 4: DigitalOcean/Linode VPS

```bash
# On Ubuntu 22.04
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs chromium-browser

# Clone and run
git clone <repo>
cd shfl-yield/scraper
npm install
PORT=3001 node server.js

# Use PM2 to keep running
npm install -g pm2
pm2 start server.js --name scraper
pm2 save
pm2 startup
```

## After Deployment

Add to your Vercel environment variables:
```
SCRAPER_URL=https://your-scraper-url.render.com
```

The main app will fetch from this URL to get live revenue data.

## Data Sources

- **PUMP**: [fees.pump.fun](https://fees.pump.fun/)
- **RLB**: [rollbit.com/rlb/buy-and-burn](https://rollbit.com/rlb/buy-and-burn)
- **HYPE**: [Artemis Analytics](https://app.artemisanalytics.com/asset/hyperliquid)

