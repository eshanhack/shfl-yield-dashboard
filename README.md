# SHFL Yield Dashboard

A Bloomberg Terminal-style dashboard for tracking SHFL token staking profitability and lottery yields on Shuffle.com.

![Terminal](https://img.shields.io/badge/Style-Bloomberg_Terminal-8A2BE2)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)

## Features

### 📊 Real-Time Data
- Live SHFL/USDC price ticker with 24h change
- Countdown timer to next lottery draw
- Auto-refreshing every 60 seconds

### 📈 Yield Analytics
- **Global APY** - 4-week moving average annual percentage yield
- **NGR vs Price Chart** - 12-month historical comparison
- **Yield Sensitivity Matrix** - APY projections based on NGR and price fluctuations

### 🧮 Personal Calculator
- Input your SHFL stake amount
- View weekly/monthly/annual expected returns
- Historical backfill showing what you would have earned in past draws

### 📋 Lottery History
- Complete draw history with pool sizes
- Yield per 1,000 SHFL for each draw
- Average yield calculations

## SHFL Lottery Mechanics

| Metric | Value |
|--------|-------|
| SHFL per Ticket | 50 SHFL |
| Prize Pool | 15% of Weekly NGR |
| Draw Frequency | Weekly (Sundays) |
| Prize Tiers | 8 Levels |

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Data**: CoinGecko API (price), Mock data (NGR)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
shfl-yield-dashboard/
├── app/
│   ├── globals.css       # Global styles & Bloomberg aesthetic
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Main page
├── components/
│   ├── Calculator.tsx    # Personal yield calculator modal
│   ├── Dashboard.tsx     # Main dashboard container
│   ├── Header.tsx        # Price ticker & countdown
│   ├── KPICard.tsx       # Metric display cards
│   ├── LotteryHistoryTable.tsx
│   ├── SensitivityTable.tsx
│   └── YieldChart.tsx    # NGR vs Price chart
├── lib/
│   ├── api.ts            # Data fetching utilities
│   ├── calculations.ts   # Yield calculation logic
│   └── utils.ts          # Helper utilities
└── ...config files
```

## Design System

### Colors
- **Background**: `#000000` (Pure Black)
- **Card**: `#0d0d0d`
- **Text Primary**: `#FFFFFF`
- **Text Secondary**: `#A0A0A0`
- **Accent**: `#8A2BE2` (Purple)
- **Positive**: `#00FF88`
- **Negative**: `#FF4444`

### Typography
- **Font**: JetBrains Mono (monospaced)
- **Style**: Bloomberg Terminal aesthetic

## API Integration

### CoinGecko (SHFL Price)
- Endpoint: `/api/v3/simple/price`
- Coin ID: `shuffle-2`
- Refresh: Every 60 seconds

### Shuffle.com (NGR Data)
- Currently using mock data
- In production, integrate with Shuffle.com API for real NGR data

## Yield Calculation

```typescript
// Weekly expected yield
const weeklyPoolUSD = weeklyNGR * 0.15; // 15% of NGR
const userTickets = Math.floor(shflStaked / 50);
const userShare = userTickets / totalTickets;
const weeklyExpected = weeklyPoolUSD * userShare;

// Annual APY
const annualExpected = weeklyExpected * 52;
const apy = (annualExpected / stakingValueUSD) * 100;
```

## License

MIT

---

Built with 💜 for the SHFL community
