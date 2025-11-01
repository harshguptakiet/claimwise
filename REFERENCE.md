# Complete Reference & Troubleshooting Guide

## 🔍 Understanding the Architecture

### Development Flow

```
┌─────────────────────────────────────────────────────┐
│  Your Browser (http://localhost:8080)               │
│  └─ Loads React SPA (from Vite dev server)         │
│  └─ Calls /api/claims (proxied to Express)         │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  Vite Dev Server (port 8080)                        │
│  └─ Serves React frontend                           │
│  └─ Proxies /api/* to Express middleware            │
│  └─ Hot reload enabled                              │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  Express App (middleware in Vite)                   │
│  └─ Handles /api/claims                             │
│  └─ Handles /api/queues                             │
│  └─ Returns JSON responses                          │
└─────────────────────────────────────────────────────┘
```

### Production Flow

```
┌───────���──────────────────────────────┐
│  User Browser                        │
│  (https://your-app.example.com)      │
└──────────────────────────────────────┘
                  ↓
┌──────────────────────────────────────────────────────┐
│  Hosting Platform (Fly.io, Vercel, etc.)             │
│  ├─ Serves dist/spa/ (React frontend)                │
│  ├─ Runs dist/server/ (Express backend)              │
│  └─ Both on same domain (no CORS issues)             │
└──────────────────────────────────────────────────────┘
```

---

## 📊 Port & URL Reference

### Local Development

| Service         | URL                   | Port   | Purpose              |
| --------------- | --------------------- | ------ | -------------------- |
| Vite Dev Server | http://localhost:8080 | 8080   | Frontend + API proxy |
| Express API     | (integrated)          | (same) | API routes           |
| Browser         | http://localhost:8080 | 8080   | Access the app       |

**All running on same port!** Vite integrates Express as middleware.

### Production

| Service  | URL                                     | Purpose      |
| -------- | --------------------------------------- | ------------ |
| Frontend | https://your-app.example.com            | React SPA    |
| API      | https://your-app.example.com/api        | Express API  |
| Health   | https://your-app.example.com/api/health | Status check |

**Same domain!** No separate API server needed.

---

## 🔐 Environment Variables Reference

### File: `.env` (Default, committed)

```bash
# API base URL
VITE_API_BASE_URL=                      # Empty = same domain
# Can also be:
# VITE_API_BASE_URL=/api                 # Relative path
# VITE_API_BASE_URL=https://api.example.com  # Absolute URL

# Server configuration
PORT=8080                               # Server port
NODE_ENV=development                    # Environment mode
VITE_API_TIMEOUT=30000                  # API timeout (ms)
```

### File: `.env.development` (Local dev, committed)

```bash
VITE_API_BASE_URL=/api
PORT=8080
NODE_ENV=development
VITE_API_TIMEOUT=30000
```

### File: `.env.production` (Production, committed)

```bash
VITE_API_BASE_URL=/api
PORT=8080
NODE_ENV=production
VITE_API_TIMEOUT=30000
```

### File: `.env.local` (Personal overrides, NOT committed)

```bash
# Add any local overrides here
# Not tracked by git
# Use for sensitive data or local testing
```

### Runtime Environment Variables

For Fly.io/Render/Railway, set via platform:

```bash
fly secrets set DATABASE_URL="postgresql://..."
fly secrets set JWT_SECRET="your-secret-key"
```

For Vercel/Netlify, set in dashboard Settings → Environment Variables

---

## 🔌 API Endpoints Detailed Reference

### Claims Management

#### List All Claims

```bash
GET /api/claims
GET /api/claims?limit=25&offset=0
GET /api/claims?severity=High&queue=Auto%20Claims
GET /api/claims?search=John

# Response:
{
  "id": "CLM-2024-001",
  "claimant": "John Smith",
  "policy_no": "POL-2024-12345",
  "loss_type": "Auto Accident",
  "created_at": "2024-01-15T10:30:00Z",
  "severity": "High",
  "confidence": 0.87,
  "queue": "Auto Claims",
  "status": "Processing"
}
```

#### Get Claim Details

```bash
GET /api/claims/:id

# Example:
GET /api/claims/CLM-2024-001

# Response:
{
  "id": "CLM-2024-001",
  "claimant": "John Smith",
  "email": "john@example.com",
  "policy_no": "POL-2024-12345",
  "description": "Multi-vehicle collision...",
  "rationale": "High severity because...",
  "evidence": [
    {
      "source": "police_report.pdf",
      "page": 2,
      "span": "driver reports broken leg..."
    }
  ],
  "attachments": [
    {
      "filename": "police_report.pdf",
      "url": "/files/police_report.pdf",
      "size": "1.8 MB"
    }
  ],
  "status": "Processing"
}
```

#### Upload New Claim

```bash
POST /api/claims/upload
Content-Type: multipart/form-data

# Form fields:
name: "John Smith"
email: "john@example.com"
policy_no: "POL-2024-12345"
date_of_loss: "2024-01-15"
claim_type: "auto"
description: "Multi-vehicle collision..."
acord: <file>
police: <file>
survey: <file>
supporting: <file>

# Response:
{
  "id": "CLM-2024-NEW"
}
```

#### Reassign Claim

```bash
POST /api/claims/:id/reassign
Content-Type: application/json

{
  "queue": "auto-claims",
  "assignee": "John Johnson",
  "note": "Reassigning due to complexity"
}

# Response:
{
  "success": true,
  "message": "Claim reassigned successfully"
}
```

### Queue Management

#### List All Queues

```bash
GET /api/queues

# Response:
[
  {
    "id": "auto-claims",
    "name": "Auto Claims",
    "assignees": ["John Johnson", "Sarah Williams"]
  },
  {
    "id": "property-damage",
    "name": "Property Damage",
    "assignees": ["Emily Brown", "Robert Wilson"]
  }
]
```

### Health & Status

#### Health Check

```bash
GET /health
GET /api/health

# Response:
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Ping

```bash
GET /api/ping

# Response:
{
  "message": "pong"
}
```

---

## 🐛 Troubleshooting by Symptom

### Symptom: "Failed to fetch" in Production

**Check these in order:**

1. **Verify API endpoint responding**

   ```bash
   # Replace with your deployed URL
   curl https://your-app.example.com/api/health

   # Should return 200 with JSON
   ```

2. **Check environment variables**

   ```bash
   # For Fly.io
   fly env display

   # Should show VITE_API_BASE_URL=/api
   ```

3. **Check browser Network tab**
   - Open DevTools → Network
   - Try to load claims page
   - Look for failed requests
   - Check request URL (should be `/api/claims`, not `http://localhost:8000`)

4. **Check server logs**

   ```bash
   # For Fly.io
   fly logs

   # Look for errors or missing routes
   ```

5. **Verify build output**

   ```bash
   # Ensure frontend env vars in build
   grep "VITE_API" dist/spa/assets/*.js

   # Should show /api in the output
   ```

### Symptom: "CORS error" or "No 'Access-Control-Allow-Origin'"

**Solutions:**

1. **For same domain (recommended)**
   - Set `VITE_API_BASE_URL=/api`
   - Frontend and backend both on same domain
   - No CORS headers needed

2. **For different domains**
   - Check `server/index.ts` CORS config
   - Update `ALLOWED_ORIGINS` env var:
     ```bash
     ALLOWED_ORIGINS="https://frontend.example.com,https://www.example.com"
     ```

3. **For development**
   - CORS should allow all (`*`)
   - Check Vite proxy config in `vite.config.ts`

### Symptom: Port Already in Use

**Solution:**

```bash
# Find and kill process on port 8080
lsof -ti:8080 | xargs kill -9

# On Windows:
netstat -ano | findstr :8080
taskkill /PID <PID> /F
```

### Symptom: API Works in Dev, Fails in Production

**Common causes and fixes:**

| Issue                    | Check                            | Fix                              |
| ------------------------ | -------------------------------- | -------------------------------- |
| Hardcoded localhost URL  | `grep localhost client/api/*.ts` | Use relative URLs `/api`         |
| Wrong API base URL       | `.env.production`                | Set `VITE_API_BASE_URL=/api`     |
| Missing routes in server | `server/routes/`                 | Ensure all routes are registered |
| Frontend not built       | `ls -la dist/spa/`               | Run `pnpm build`                 |
| Backend not starting     | `fly logs`                       | Check for errors in logs         |

### Symptom: TypeScript Errors

**Solution:**

```bash
# See all errors
pnpm typecheck

# Fix errors in reported files
# Common ones:
# - Import path issues → check tsconfig.json paths
# - Type mismatches → check shared/api.ts types
# - Missing imports → import the missing types
```

### Symptom: Hot Reload Not Working

**Solution:**

```bash
# Restart dev server
# Kill with Ctrl+C
pnpm dev

# Or manually:
killall node
pnpm dev
```

---

## 📋 Configuration Comparison

### Environment Variable Differences

| Setting             | Development | Production       | Why                             |
| ------------------- | ----------- | ---------------- | ------------------------------- |
| `NODE_ENV`          | development | production       | Affects error messages, logging |
| `VITE_API_BASE_URL` | `/api`      | `/api`           | Same in both (relative)         |
| CORS                | Allow all   | Specific origins | Security                        |
| Error logging       | Verbose     | Minimal          | Performance, security           |
| Build output        | Source maps | Minified         | Size, speed                     |

### API Base URL Options

```typescript
// Option 1: Empty (recommended for same domain)
VITE_API_BASE_URL=
// Calls: fetch('/api/claims')
// Works in: Local dev, same domain production

// Option 2: Relative path
VITE_API_BASE_URL=/api
// Calls: fetch('/api' + '/api/claims') ← WRONG, double /api
// Don't use this option!

// Option 3: Absolute URL (different domain)
VITE_API_BASE_URL=https://api.example.com
// Calls: fetch('https://api.example.com' + '/api/claims')
// Works in: Separate API server
```

**Best Practice**: Use empty string or relative path, not absolute.

---

## 🚀 Platform-Specific Setup

### Fly.io

**Key differences**:

- `PORT` env var is set automatically
- Environment variables via `fly secrets set`
- Access logs with `fly logs`
- Deploy with `fly deploy`

**Important files**:

- `fly.toml` - Fly configuration
- No special build steps needed

### Vercel

**Key differences**:

- Static frontend only (no backend)
- Need separate backend service or serverless functions
- Environment vars in dashboard
- Auto-deploy on git push

**Better approach**: Use full-stack deployment like Fly.io instead

### Netlify

**Key differences**:

- Similar to Vercel (static focus)
- Netlify Functions for backend (optional)
- Environment vars in dashboard
- Auto-deploy on git push

**Better approach**: Use full-stack deployment like Fly.io instead

### Render / Railway

**Key differences**:

- Full Node.js support
- `PORT` env var respected
- Deploy via git or CLI
- Environment vars in dashboard

**Setup**: Same as Fly.io, minimal changes needed

---

## 📈 Performance Optimization

### Frontend

- Built with Vite (fast bundling)
- React 18 with optimizations
- Async code splitting enabled
- CSS minified in production

### Backend

- Express with middleware (fast)
- No ORM overhead (mock data)
- Compression enabled
- CORS configured for performance

### Network

- Relative URLs (no redirects)
- Single domain (no DNS lookups)
- Keep-alive enabled
- Caching headers can be added

---

## 🔐 Security Checklist

### Before Production

- [ ] `VITE_API_BASE_URL` set to relative path (not hardcoded domain)
- [ ] `.env.local` and secrets NOT committed to git
- [ ] `ALLOWED_ORIGINS` set appropriately for production domain
- [ ] No console.log of sensitive data
- [ ] Error messages don't expose stack traces (set `isDev` check)
- [ ] HTTPS enabled on hosting platform
- [ ] Environment variables use platform's secret management
- [ ] No hardcoded API keys in code

### In Production

- [ ] Monitor error logs regularly
- [ ] Set up rate limiting if needed
- [ ] Enable request logging for debugging
- [ ] Regular backups (when using real database)
- [ ] Keep dependencies updated

---

## 📞 Getting Help

### Debug Information to Provide

When reporting issues, include:

```bash
# Node version
node -v

# npm/pnpm version
pnpm -v

# Build output
pnpm build 2>&1 | tail -50

# Dev server logs
pnpm dev 2>&1 | head -20

# Browser console errors
# (Screenshot or copy from DevTools → Console)

# Network request details
# (DevTools → Network tab, click failed request, copy full URL)
```

### Useful Commands for Debugging

```bash
# Check if port is in use
lsof -i :8080

# View current env vars
env | grep VITE_

# View built frontend
head -20 dist/spa/index.html

# Test API directly
curl -v http://localhost:8080/api/health

# View server logs
tail -f logs.txt
```

---

## 📚 Additional Resources

- [Express.js Docs](https://expressjs.com/)
- [Vite Docs](https://vitejs.dev/)
- [React Docs](https://react.dev/)
- [Fly.io Docs](https://fly.io/docs/)
- [MDN Web Docs](https://developer.mozilla.org/)
