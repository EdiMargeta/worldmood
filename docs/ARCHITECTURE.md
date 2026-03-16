# World Sentiment Map — Architecture

## System Overview

```
Browser ──► Next.js (Vercel) ──► Supabase (PostgreSQL + Realtime)
                │
                ├─ App Router (RSC + Client)
                ├─ Server Actions / Route Handlers
                ├─ SWR (client polling)
                └─ Supabase Realtime (websocket)
```

## Tech Stack

| Layer        | Technology                                      |
|-------------|------------------------------------------------|
| Frontend     | Next.js 14 App Router, TypeScript, TailwindCSS |
| UI           | shadcn/ui, react-simple-maps                   |
| Data         | SWR for client fetching, RSC for initial data  |
| Database     | Supabase PostgreSQL                             |
| Realtime     | Supabase Realtime (broadcast + postgres_changes)|
| Auth         | None (anonymous fingerprint-based)             |
| Deployment   | Vercel                                         |

## Database Schema

### countries
```sql
CREATE TABLE countries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  iso_code    CHAR(2) UNIQUE NOT NULL,
  continent   TEXT NOT NULL,
  region      TEXT NOT NULL,
  flag_emoji  TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_countries_iso ON countries(iso_code);
```

### votes
```sql
CREATE TABLE votes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id        UUID REFERENCES countries(id) ON DELETE CASCADE,
  vote_type         TEXT CHECK (vote_type IN ('positive', 'negative')) NOT NULL,
  voter_fingerprint TEXT NOT NULL,
  voter_ip_hash     TEXT,
  vote_source       TEXT DEFAULT 'web',
  is_simulated      BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_votes_country_created ON votes(country_id, created_at);
CREATE INDEX idx_votes_fingerprint ON votes(voter_fingerprint, country_id, created_at);
```

### simulation_settings
```sql
CREATE TABLE simulation_settings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled           BOOLEAN DEFAULT FALSE,
  cooldown_hours    INTEGER DEFAULT 24,
  votes_per_interval INTEGER DEFAULT 10,
  like_probability  DECIMAL(3,2) DEFAULT 0.65,
  interval_seconds  INTEGER DEFAULT 30,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO simulation_settings DEFAULT VALUES;
```

### daily_stats (materialized/cached)
```sql
CREATE TABLE daily_stats (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id   UUID REFERENCES countries(id) ON DELETE CASCADE,
  likes_24h    INTEGER DEFAULT 0,
  dislikes_24h INTEGER DEFAULT 0,
  sentiment    DECIMAL(5,4),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(country_id)
);
```

### daily_questions
```sql
CREATE TABLE daily_questions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question    TEXT NOT NULL,
  date        DATE UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE daily_question_votes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id       UUID REFERENCES daily_questions(id),
  country_id        UUID REFERENCES countries(id),
  voter_fingerprint TEXT NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(question_id, voter_fingerprint)
);
```

## API Endpoints

| Method | Path                              | Description                        |
|--------|-----------------------------------|------------------------------------|
| GET    | /api/countries                    | All countries with 24h stats       |
| GET    | /api/countries/[iso]              | Single country details             |
| POST   | /api/votes                        | Cast a vote                        |
| GET    | /api/trending                     | Top trending countries             |
| GET    | /api/feed                         | Live activity feed                 |
| GET    | /api/rankings                     | All countries ranked               |
| GET    | /api/daily-question               | Today's question + results         |
| POST   | /api/daily-question/vote          | Vote on daily question             |
| GET    | /api/admin/stats                  | Admin dashboard stats              |
| POST   | /api/admin/simulation             | Toggle/configure simulation        |
| POST   | /api/simulation/run               | Cron: run simulation tick          |

## Folder Structure

```
src/
├── app/
│   ├── page.tsx                    # Homepage (map + feed)
│   ├── rankings/page.tsx           # Global rankings table
│   ├── country/[iso]/page.tsx      # Country detail page
│   ├── admin/page.tsx              # Admin dashboard
│   ├── api/
│   │   ├── countries/route.ts
│   │   ├── countries/[iso]/route.ts
│   │   ├── votes/route.ts
│   │   ├── trending/route.ts
│   │   ├── feed/route.ts
│   │   ├── rankings/route.ts
│   │   ├── daily-question/route.ts
│   │   └── admin/
│   │       ├── stats/route.ts
│   │       └── simulation/route.ts
│   └── layout.tsx
├── components/
│   ├── map/
│   │   ├── WorldMap.tsx            # react-simple-maps world map
│   │   ├── CountryTooltip.tsx      # Hover tooltip
│   │   └── MapLegend.tsx
│   ├── panels/
│   │   ├── CountryPanel.tsx        # Slide-in detail panel
│   │   └── VoteButtons.tsx
│   ├── feed/
│   │   └── ActivityFeed.tsx        # Live vote feed
│   ├── trending/
│   │   └── TrendingBanner.tsx
│   ├── leaderboard/
│   │   └── Leaderboard.tsx
│   └── sharing/
│       └── ShareCard.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser client
│   │   └── server.ts               # Server client
│   ├── fingerprint.ts              # Browser fingerprinting
│   ├── trending.ts                 # Trending algorithm
│   └── simulation.ts              # Vote simulation
├── hooks/
│   ├── useCountries.ts
│   ├── useVote.ts
│   └── useFeed.ts
└── types/
    └── index.ts
```

## Trending Algorithm

```typescript
// Score = (recent_votes * recency_weight) + (sentiment_delta * 2)
// recency_weight decays: 1.0 (0-2h), 0.7 (2-6h), 0.4 (6-12h), 0.2 (12-24h)
trendingScore = recentVotes * recencyWeight + Math.abs(sentimentDelta) * 2
```

## Anti-Spam

1. Fingerprint locked to 1 vote/country/24h (stored in localStorage + server-side check)
2. IP hash rate limiting: max 50 votes/IP/hour
3. Server validates cooldown before accepting vote
4. Simulated votes flagged separately

## Deployment

1. `vercel env add NEXT_PUBLIC_SUPABASE_URL`
2. `vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. `vercel env add SUPABASE_SERVICE_ROLE_KEY`
4. Run DB migrations in Supabase dashboard
5. `vercel deploy`
6. Set up Vercel Cron: `/api/simulation/run` every 30s (or use Supabase Edge Functions)
