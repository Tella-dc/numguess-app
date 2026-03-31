# NumGuess — Multiplayer Number Guessing Game

A real-time multiplayer web app where players challenge each other to guess secret numbers. Built with Next.js 14, Socket.IO, SQLite, and NextAuth.

---

## 1. Stack & Why

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | Full-stack TypeScript in one repo — API routes + pages together |
| Real-time | Socket.IO | Battle-tested, auto-reconnects, room support built-in |
| Database | SQLite + Prisma | Zero setup, zero cost, persists on Railway disk |
| Auth | NextAuth.js (credentials) | Built for Next.js, handles sessions/JWT with one config |
| Styling | Tailwind CSS | Rapid dark-mode UI, no CSS files needed |
| Deployment | Railway.app | Free tier, supports custom Node servers, auto-deploys from Git |

**Why not serverless?** Socket.IO needs a persistent server process. Railway runs a Node.js process, which is perfect. Vercel's serverless functions can't maintain WebSocket connections.

---

## 2. Architecture Overview

```
numguess-app/
├── server.ts          ← Custom Node.js server: boots Next.js + Socket.IO together
├── src/
│   ├── lib/
│   │   ├── socket.ts       ← All Socket.IO server-side event handlers
│   │   ├── socketClient.ts ← React hook for client-side socket usage
│   │   ├── auth.ts         ← NextAuth configuration
│   │   └── prisma.ts       ← Prisma client singleton
│   ├── app/           ← Next.js App Router pages
│   │   ├── page.tsx        ← Lobby (main page after login)
│   │   ├── login/          ← Login page
│   │   ├── game/[roomId]/  ← Game room
│   │   ├── admin/          ← User management
│   │   ├── profile/        ← Stats and match history
│   │   └── api/            ← REST API routes (users, game state, auth)
│   └── components/    ← Shared React components
├── prisma/
│   ├── schema.prisma  ← DB models: User, GameRoom, GameRound, AuditLog
│   └── seed.ts        ← Seeds super_admin "Edward"
└── .env               ← NEXTAUTH_SECRET, DATABASE_URL, PORT
```

**Data flow:**
1. User logs in → NextAuth creates JWT session cookie
2. Browser opens Socket.IO connection → identifies with userId
3. Server tracks online users in memory + updates DB `status`
4. Player A challenges Player B → Socket.IO event chain
5. Both lock secrets → server stores in DB (never sent to opponent)
6. Players alternate guesses → server validates, sends hints
7. When a player guesses correctly → `game:roundResult` broadcast

---

## 3. Local Setup

### Prerequisites
- Node.js 18+
- npm or yarn

### Steps

```bash
# 1. Clone or download the project
cd numguess-app

# 2. Install dependencies
npm install

# 3. Create your .env file
cp .env.example .env
# Edit .env:
#   NEXTAUTH_SECRET=any-long-random-string
#   NEXTAUTH_URL=http://localhost:3000
#   DATABASE_URL="file:./dev.db"

# 4. Set up the database
npx prisma migrate dev --name init

# 5. Seed the super admin (Edward / Myapp2026$)
npm run db:seed

# 6. Start development server
npm run dev
```

Open http://localhost:3000 and log in with:
- **Username:** Edward
- **Password:** Myapp2026$

---

## 4. Railway Deployment (Step by Step)

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial NumGuess app"
# Create a repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/numguess-app.git
git push -u origin main
```

### Step 2: Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click **New Project → Deploy from GitHub repo**
4. Select your `numguess-app` repository

### Step 3: Configure Environment Variables
In Railway dashboard → your service → **Variables** tab, add:

| Variable | Value |
|---|---|
| `NEXTAUTH_SECRET` | Run `openssl rand -base64 32` and paste the output |
| `NEXTAUTH_URL` | `https://YOUR-APP.up.railway.app` (Railway gives you this URL) |
| `DATABASE_URL` | `file:/data/prod.db` |
| `NODE_ENV` | `production` |

### Step 4: Add Persistent Storage for SQLite
1. In Railway dashboard → your service → **Volumes** tab
2. Click **Add Volume**
3. Mount path: `/data`
4. This keeps your SQLite database alive between deploys

### Step 5: Set Start Command
In Railway → your service → **Settings** tab:
- **Start command:** `npm run start`

Or create a `Procfile` in your project root:
```
web: npm run start
```

### Step 6: Run Database Migrations on Deploy
Add this to your `package.json` scripts:
```json
"start": "npx prisma migrate deploy && npx prisma db seed && NODE_ENV=production ts-node --project tsconfig.server.json server.ts"
```

This migrates, seeds (skips if Edward exists), and starts the server.

### Step 7: Deploy
Railway auto-deploys when you push to GitHub. Watch the build logs in the Railway dashboard.

Your app will be live at `https://YOUR-APP.up.railway.app` 🎉

---

## 5. How to Test with 2 Real Users

1. **Create a test account:**
   - Log in as Edward (super admin)
   - Go to `/admin`
   - Create a new user (e.g., username: `Player2`, password: `Test1234!`)

2. **Open two browser tabs/windows:**
   - Tab 1: Log in as **Edward**
   - Tab 2: Open a private/incognito window, log in as **Player2**

3. **Challenge each other:**
   - In Tab 1 (Edward's lobby), you should see Player2 appear online
   - Click **⚔️ Challenge** on Player2's card
   - In Tab 2, a challenge modal will pop up — click **Accept!**

4. **Play the game:**
   - Both players pick a secret number (1-100) and click **Lock In**
   - Once both are locked, the guessing phase begins
   - Enter guesses and watch the higher/lower hints in real time

5. **Share with real friends:**
   - Send them the Railway URL
   - Create an account for them from the admin panel
   - Play from different locations!

---

## 6. Free Platform Limitations

| Limitation | Detail |
|---|---|
| Railway free tier | $5/month credit (usually enough for a hobby app with low traffic) |
| SQLite concurrency | SQLite handles one write at a time — fine for dozens of concurrent users, not for hundreds |
| No horizontal scaling | Socket.IO in-memory state doesn't sync across multiple instances. Railway free tier is single instance, so this is fine |
| Sleep on inactivity | Railway doesn't sleep apps (unlike Render free tier) ✅ |
| Disk persistence | Volumes persist, but free tier has storage limits (~1GB) |

**When you outgrow free tier:** Switch to PostgreSQL (Railway has a managed Postgres addon) and add Redis for Socket.IO adapter to support multiple instances.

---

## 7. Future Improvements

- **Leaderboard** — rank players by win rate or total wins
- **ELO rating system** — skill-based matchmaking
- **Spectator mode** — watch ongoing games
- **Game replay** — review guess history after match
- **Chat** — in-game text chat between players
- **Custom ranges** — let players pick number range (e.g., 1-1000 for hard mode)
- **Time limits** — add a countdown timer per guess
- **PostgreSQL + Redis** — scale to hundreds of concurrent users
- **OAuth login** — Google/GitHub login for easy signup
- **Mobile app** — wrap in Expo/React Native
- **Tournaments** — bracket-style multi-player tournaments
- **Sounds & animations** — audio feedback on hints and wins

---

## Default Credentials

| Username | Password | Role |
|---|---|---|
| Edward | Myapp2026$ | super_admin |

**Change the password after first login** by having a super_admin create a new super_admin (not yet implemented — do it in Prisma Studio: `npx prisma studio`).
