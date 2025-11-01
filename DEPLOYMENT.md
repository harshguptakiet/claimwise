# Claims Management System - Complete Setup & Deployment Guide

## 📋 Quick Overview

This is a full-stack application with:

- **Frontend**: React 18 + TypeScript + Vite (SPA mode)
- **Backend**: Express.js with mock data
- **Database**: Currently using mock data (ready for real DB integration)
- **Deployment**: Works on Fly.io, Vercel, Netlify, Render, Railway, etc.

---

## 🚀 Local Development Setup

### Prerequisites

- Node.js 18+ or 20+
- pnpm 10.14.0 (or npm/yarn)

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Run Development Server

```bash
pnpm dev
```

This command:

- Starts Vite dev server on `http://localhost:8080`
- Integrates Express middleware for API routes
- Enables hot reload for both frontend and backend
- Makes API calls via `/api/*` (relative URLs)

**Access the app**: Open `http://localhost:8080` in your browser

### 3. Test API Endpoints

Check that the API is working:

```bash
# Test API health
curl http://localhost:8080/api/health

# Get demo endpoint
curl http://localhost:8080/api/demo

# Get all claims
curl http://localhost:8080/api/claims

# Get available queues
curl http://localhost:8080/api/queues
```

---

## 🔧 Configuration Files Explained

### `.env` (Global Default)

```env
VITE_API_BASE_URL=          # Empty = same domain, or set to /api, or https://api.example.com
PORT=8080                    # Server port for production
NODE_ENV=development         # development or production
```

### `.env.development` (Local Dev)

```env
VITE_API_BASE_URL=/api       # API endpoints at /api/claims, /api/queues, etc
PORT=8080
NODE_ENV=development
```

### `.env.production` (Deployed)

```env
VITE_API_BASE_URL=/api       # Same as dev - frontend and backend on same domain
PORT=8080                    # Will be overridden by hosting platform (Fly.io uses PORT)
NODE_ENV=production
```

### Key Configuration Points

| Config File             | Purpose                            | When Used                        |
| ----------------------- | ---------------------------------- | -------------------------------- |
| `vite.config.ts`        | Frontend build config + dev server | npm run dev, npm run build       |
| `vite.config.server.ts` | Backend build config               | npm run build:server             |
| `.env` files            | Environment variables              | All commands (sourced by dotenv) |
| `package.json`          | Scripts and dependencies           | npm/pnpm commands                |
| `tsconfig.json`         | TypeScript settings                | Type checking                    |

---

## 📦 Build Commands

### Build for Production

```bash
# Builds both frontend and backend
pnpm build

# This runs:
# - pnpm build:client  (creates dist/spa/)
# - pnpm build:server  (creates dist/server/)
```

### Build Output Structure

```
dist/
├── spa/                    # Frontend (React SPA)
│   ├── index.html
│   ├── assets/
│   └── ...
└── server/
    └── node-build.mjs      # Backend (Express)
```

### Start Production Server

```bash
pnpm start

# This runs: node dist/server/node-build.mjs
# Server listens on PORT (default 8080)
# Serves frontend from dist/spa/
# Serves API from /api/*
```

---

## 🌐 Deployment Guides

### Deploy to Fly.io (Recommended)

#### 1. Install Fly CLI

```bash
# macOS with Homebrew
brew install flyctl

# Or visit https://fly.io/docs/getting-started/installing-flyctl/
```

#### 2. Initialize Fly App

```bash
fly launch

# Follow the prompts:
# - App name: (enter your app name)
# - Region: (select closest region)
# - Database: (skip for now, using mock data)
# - Redis: (skip)
# - Deploy now: no (we'll customize first)
```

#### 3. Configure `fly.toml`

```toml
app = "your-app-name"
primary_region = "us-west"

[build]
  builder = "paketobuildpacks"

[env]
  NODE_ENV = "production"
  VITE_API_BASE_URL = "/api"

[[services]]
  internal_port = 8080
  processes = ["app"]

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
```

#### 4. Deploy

```bash
fly deploy

# Check logs
fly logs

# View app
fly open
```

---

### Deploy to Vercel

#### 1. Push to GitHub

```bash
git push origin main
```

#### 2. Go to Vercel Dashboard

- Import your repository
- Select "Other" as framework
- Configure build settings:
  - **Build Command**: `pnpm build`
  - **Output Directory**: `dist/spa`

#### 3. Add Environment Variables

In Vercel dashboard → Settings → Environment Variables:

```
VITE_API_BASE_URL = /api
NODE_ENV = production
```

#### 4. Deploy

Vercel will automatically deploy on push

**Note**: This approach only deploys the frontend. You need a separate backend service.

---

### Deploy to Netlify

#### 1. Connect GitHub

- Go to Netlify
- Create new site from Git
- Select your repository

#### 2. Configure Build Settings

In Site Settings → Build & Deploy:

- **Build command**: `pnpm build && pnpm build:server`
- **Publish directory**: `dist/spa`
- **Functions directory**: (leave empty or use `netlify/functions`)

#### 3. Add Environment Variables

Site Settings → Build Environment:

```
VITE_API_BASE_URL = /api
NODE_ENV = production
```

#### 4. Deploy

Push to GitHub and Netlify will auto-deploy

---

### Deploy to Render.com

#### 1. Create New Web Service

- Dashboard → Create → Web Service
- Connect GitHub repository

#### 2. Configure Service

- **Environment**: Node
- **Build Command**: `pnpm install && pnpm build`
- **Start Command**: `pnpm start`

#### 3. Add Environment Variables

Settings → Environment:

```
NODE_ENV = production
VITE_API_BASE_URL = /api
PORT = 8080 (Render will override this)
```

#### 4. Deploy

Click Deploy - Render will build and start the app

---

### Deploy to Railway.app

#### 1. Create New Project

- New Project → GitHub Repo
- Select your repository

#### 2. Configure

Railway auto-detects Node.js:

- **Start Command**: `pnpm start`
- **Build Command**: `pnpm build`

#### 3. Add Variables

Variables tab:

```
NODE_ENV = production
VITE_API_BASE_URL = /api
PORT = 8080
```

#### 4. Deploy

Railway auto-deploys

---

## 🔌 API Integration

### Available Endpoints

All endpoints are relative URLs (assuming same domain):

#### Claims

```
GET    /api/claims                    # List all claims
GET    /api/claims?limit=25&offset=0  # With pagination
GET    /api/claims/:id                # Get claim details
POST   /api/claims/upload             # Upload new claim
POST   /api/claims/:id/reassign       # Reassign claim
```

#### Queues

```
GET    /api/queues                    # List all queues
```

#### Health Checks

```
GET    /health                        # Server health
GET    /api/health                    # API health
GET    /api/ping                      # Ping endpoint
```

### Frontend API Configuration

**File**: `client/api/claims.ts`

```typescript
// Automatically uses:
// - /api in production (same domain)
// - /api in development (via Vite proxy)

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

// API calls are made as:
fetch(`${API_BASE_URL}/api/claims`); // Results in /api/claims
```

### Example: Adding Real Database

Replace mock data in `server/routes/claims.ts`:

```typescript
// Before (mock)
const mockClaims: ClaimDetailResponse[] = [...]

// After (with real DB)
import db from "@/db";  // Your database

export const fetchClaims: RequestHandler = async (req, res) => {
  const claims = await db.claims.findMany({...})
  res.json(claims);
}
```

---

## 🔐 Environment Variables Reference

### Required Variables

| Variable            | Description               | Example                             |
| ------------------- | ------------------------- | ----------------------------------- |
| `NODE_ENV`          | Production or development | `production`                        |
| `VITE_API_BASE_URL` | API base URL              | `/api` or `https://api.example.com` |
| `PORT`              | Server port               | `8080`                              |

### Optional Variables

| Variable          | Description                    | Default |
| ----------------- | ------------------------------ | ------- |
| `ALLOWED_ORIGINS` | CORS origins (comma-separated) | `*`     |
| `PING_MESSAGE`    | Message for /api/ping          | `pong`  |
| `DATABASE_URL`    | Database connection            | (none)  |
| `JWT_SECRET`      | JWT signing key                | (none)  |

### Adding Sensitive Variables (Production)

For Fly.io:

```bash
fly secrets set DATABASE_URL="postgresql://..."
fly secrets set JWT_SECRET="your-secret-key"
```

For Vercel/Netlify:

```
Settings → Environment Variables → (add your secrets)
```

---

## ⚠️ Troubleshooting

### Issue: "Failed to fetch" errors in production

**Cause**: Frontend is trying to call wrong API URL

**Solution**:

1. Check `.env.production` has `VITE_API_BASE_URL=/api`
2. Verify backend is serving API routes
3. Check browser console for actual request URLs
4. Use browser DevTools → Network tab to inspect requests

```bash
# Test API directly
curl https://your-deployed-app.com/api/health
curl https://your-deployed-app.com/api/claims
```

### Issue: "CORS error" when calling API

**Cause**: CORS not properly configured

**Solution**:

1. Check `server/index.ts` has proper CORS config
2. For development, CORS should allow all (`*`)
3. For production, set `ALLOWED_ORIGINS` env var:

```bash
ALLOWED_ORIGINS="https://your-domain.com,https://another-domain.com"
```

### Issue: API calls work locally but not in production

**Likely Cause**: Hardcoded API URL pointing to localhost

**Check Files**:

- `client/api/claims.ts` - should use `VITE_API_BASE_URL`
- `.env.production` - should set `VITE_API_BASE_URL=/api`

### Issue: Static files not served (404 on refresh)

**Cause**: Express not configured to serve SPA

**Solution**: Verify `server/node-build.ts` has:

```typescript
// Serve static SPA files
app.use(express.static(distPath));

// Handle React Router - serve index.html for all non-API routes
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Not found" });
  }
  res.sendFile(path.join(distPath, "index.html"));
});
```

---

## 📋 Deployment Checklist

### Before Deploying to Production

- [ ] Run `pnpm typecheck` - no TypeScript errors
- [ ] Run `pnpm build` - build succeeds
- [ ] Test locally: `pnpm start` - app runs on port 8080
- [ ] API endpoints respond: curl `/api/health`, `/api/claims`
- [ ] Environment variables configured in deployment platform
- [ ] `.env.production` file is correct
- [ ] No hardcoded localhost URLs in code
- [ ] CORS settings appropriate for production
- [ ] Error handling in place (no console errors in production)

### After Deploying

- [ ] Check deployed app loads without errors
- [ ] API calls work (check browser Network tab)
- [ ] Landing page loads and routing works
- [ ] Can navigate between pages
- [ ] Upload form works (if backend ready)
- [ ] Check server logs for errors
- [ ] Monitor performance and error rates

---

## 🛠️ Development Tips

### Hot Reload

Changes to frontend and backend code automatically reload in dev mode:

```bash
pnpm dev
```

### TypeScript Checking

```bash
pnpm typecheck
# Or in VSCode: Ctrl+Shift+B → Select TypeScript task
```

### Run Tests

```bash
pnpm test
```

### Format Code

```bash
pnpm format.fix
```

### View Server Logs (Fly.io)

```bash
fly logs
fly logs -a your-app-name
```

### SSH into Production App (Fly.io)

```bash
fly ssh console
```

### View Environment Variables (Fly.io)

```bash
fly config show
fly env display
```

---

## 📞 Common Questions

### Q: Can I use a different database?

**A**: Yes! Replace mock data in `server/routes/claims.ts` with your DB queries (PostgreSQL, MongoDB, etc.)

### Q: How do I add authentication?

**A**: Add middleware in `server/index.ts`:

```typescript
app.use("/api/protected", authMiddleware);
```

### Q: How do I enable HTTPS?

**A**: Most platforms (Fly.io, Vercel, Netlify) provide free HTTPS. Just point your domain.

### Q: Can I run frontend and backend separately?

**A**: Yes, set `VITE_API_BASE_URL=https://api.example.com` in `.env.production`

### Q: How do I monitor the app?

**A**:

- Fly.io: `fly logs` and dashboard
- Vercel: Vercel Analytics and dashboard
- Netlify: Netlify Analytics and logs

---

## 🎓 Next Steps

1. **Set up database**: Connect PostgreSQL/MongoDB
2. **Add authentication**: Implement JWT or OAuth
3. **Enable real-time updates**: Use Socket.io or WebSocket library
4. **Add CI/CD**: GitHub Actions for automated testing and deployment
5. **Monitor errors**: Set up Sentry or similar
6. **Performance optimization**: Add caching, CDN, etc.

---

## 📞 Support & Resources

- Fly.io Docs: https://fly.io/docs/
- Vercel Docs: https://vercel.com/docs
- Express Docs: https://expressjs.com/
- Vite Docs: https://vitejs.dev/
- React Docs: https://react.dev/
