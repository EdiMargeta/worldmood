# 🌍 WorldMood — Global Sentiment Map

A live, interactive world map where users anonymously vote on countries,
creating a real-time global mood map designed for virality and engagement.

## Features

- 🗺️ **Interactive World Map** — color-coded by sentiment (green = positive, red = negative)
- 🗳️ **Anonymous Voting** — one vote per country per 24h via browser fingerprinting
- 📈 **Trending System** — tracks rising/falling/most-voted countries
- ⚡ **Live Activity Feed** — real-time vote stream via Supabase Realtime
- 🏆 **Leaderboards** — most loved, most disliked, most controversial
- ❓ **Daily Question** — daily country poll to drive retention
- 🤖 **Vote Simulation** — seed realistic activity with configurable parameters
- ⚙️ **Admin Dashboard** — `/admin` for full control, no auth needed
- 📱 **Mobile-first** — bottom sheet panels, responsive layout throughout

---

## Quick Start

### 1. Clone & Install

```bash
git clone <your-repo>
cd world-sentiment-map
npm install
```

### 2. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to **SQL Editor** and paste + run the contents of `docs/migrations.sql`
3. Copy your project credentials from **Settings > API**

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Fill in your `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deployment (Vercel)

### One-click deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Manual deploy

```bash
npm install -g vercel
vercel login
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel deploy --prod
```

The `vercel.json` includes a cron job that fires `/api/simulation/run` every minute.
The simulation only runs votes when **enabled** in the admin dashboard.

---

## Admin Dashboard

Visit `/admin` — no authentication required.

- Toggle simulation on/off
- Tune votes per interval, like probability, cooldown hours
- Run simulation immediately with "Run Now"
- See live vote counts and top countries

---

## Architecture

```
Browser
  └─► Next.js App Router (Vercel)
        ├─ React components (Client Components)
        ├─ Route Handlers (/api/*)
        └─► Supabase PostgreSQL
              ├─ countries table
              ├─ votes table
              ├─ simulation_settings table
              ├─ daily_questions + daily_question_votes
              └─ Realtime (postgres_changes on votes)
```

### Key files

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Homepage with map |
| `src/app/rankings/page.tsx` | Full rankings table |
| `src/app/admin/page.tsx` | Admin dashboard |
| `src/components/map/WorldMap.tsx` | react-simple-maps map |
| `src/components/panels/CountryPanel.tsx` | Click-to-vote panel |
| `src/components/feed/ActivityFeed.tsx` | Live vote stream |
| `src/lib/fingerprint.ts` | Browser fingerprinting |
| `src/lib/simulation.ts` | Vote simulation engine |
| `src/lib/trending.ts` | Trending algorithm |
| `docs/migrations.sql` | Full DB schema + seed |

---

## Anti-Spam

1. **Browser fingerprint** — SHA-256 hash of browser properties, stored in localStorage
2. **Server-side cooldown check** — votes table queried before insert
3. **IP rate limiting** — 50 votes/IP/hour (in-memory; use Redis for production scale)
4. **Simulated vote flagging** — `is_simulated` column separates organic from seeded votes

---

## Scaling Notes

For production at scale (>100k users/day):

- Add **Redis/Upstash** for IP rate limiting instead of in-memory map
- Add a **materialized view** or **pg_cron** job to pre-compute daily_stats
- Move simulation to a **Supabase Edge Function** for reliability
- Add **Cloudflare Turnstile** for lightweight bot protection
- Cache `/api/countries` response in **Vercel KV** or **Redis**

---

## Growth Features Roadmap

- [ ] Embeddable widget (iframe)
- [ ] Weekly email digest
- [ ] OG image generation per country
- [ ] Mobile apps (React Native)
- [ ] Historical sentiment archive
- [ ] Premium insights API

---

## License

MIT
