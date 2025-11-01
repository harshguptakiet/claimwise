# Quick Start Guide

## ⚡ Get Running in 5 Minutes

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Backend URL (Optional)

Create a `.env` file in the root directory:

```env
VITE_API_BASE_URL=http://localhost:8000
```

**Note**: The frontend defaults to `http://localhost:8000` for the FastAPI backend. Update this when your backend is ready.

### 3. Start Development Server

```bash
pnpm dev
```

Open browser to: **http://localhost:8080**

That's it! 🎉

---

## ✅ Verify Everything Works

### Check the App Loads

- [ ] Landing page shows "Transform Claims Chaos" heading
- [ ] Two CTA buttons: "User" and "Team"
- [ ] No errors in browser console

### Check API Works

The frontend is configured to connect to a FastAPI backend. Make sure your backend is running on `http://localhost:8000` (or update `VITE_API_BASE_URL` in `.env`).

Test your backend API directly:

```bash
# Test API health (adjust URL to match your backend)
curl http://localhost:8000/api/health

# Test getting claims
curl http://localhost:8000/api/claims

# Test getting queues
curl http://localhost:8000/api/queues
```

You should see JSON responses from your FastAPI backend.

---

## 🗺️ Navigation

| URL                    | Purpose                 |
| ---------------------- | ----------------------- |
| `/`                    | Landing page            |
| `/upload`              | User claim form         |
| `/upload-confirmation` | Success page            |
| `/team`                | Team claims list        |
| `/team/claims/:id`     | Claim details           |
| `/dashboard`           | Dashboard (placeholder) |

---

## 📝 File Structure

```
client/                          # Frontend React app
├── pages/                        # Route pages
│   ├── LandingPage.tsx
│   ├── UploadPage.tsx
│   ├── TeamClaimsPage.tsx
│   └── ClaimDetailPage.tsx
├── components/                   # Reusable components
│   ├── claims/                   # Claims-specific
│   ├── shared/                   # Shared UI components
│   └── ui/                       # Pre-built UI library
├── api/                          # API wrappers
│   ├── claims.ts                 # Claims API calls
│   ├── queues.ts                 # Queues API calls
│   ├── rules.ts                  # Rules API calls
│   └── config.ts                 # API configuration
└── App.tsx                       # Main app router

shared/                          # Shared code
└── api.ts                        # Shared types

.env                             # Backend configuration (optional)
```

---

## 🔧 Common Commands

| Command           | Purpose                       |
| ----------------- | ----------------------------- |
| `pnpm dev`        | Start dev server (hot reload) |
| `pnpm build`      | Build for production          |
| `pnpm preview`    | Preview production build      |
| `pnpm typecheck`  | Check TypeScript              |
| `pnpm test`       | Run tests                     |
| `pnpm format.fix` | Format code                   |

---

## 🚀 Deploy to Production

### Quick Deploy to Fly.io

```bash
# 1. Install Fly CLI (first time only)
brew install flyctl

# 2. Initialize (creates fly.toml)
fly launch

# 3. Deploy
fly deploy

# 4. View logs
fly logs
```

For other platforms (Vercel, Netlify, Render, Railway), see `DEPLOYMENT.md`

---

## 🆘 Troubleshooting

### "Failed to fetch" errors?

- Check that your FastAPI backend is running on `http://localhost:8000` (or your configured URL)
- Check browser Network tab to see what URL is being called
- Verify `VITE_API_BASE_URL` in `.env` matches your backend URL
- Test backend directly: `curl http://localhost:8000/api/health`

### Port 8080 already in use?

```bash
# Kill process on port 8080
lsof -ti:8080 | xargs kill -9
```

### TypeScript errors?

```bash
pnpm typecheck
# Fix any errors shown
```

### Can't install dependencies?

```bash
# Clear node_modules and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

---

## 📚 Learn More

- **Full setup guide**: See `DEPLOYMENT.md`
- **Configuration details**: See `CONFIG_SUMMARY.md`
- **API reference**: Check `server/routes/` files
- **Type definitions**: Check `shared/api.ts`

---

## 💡 Next Steps

1. ✅ Get frontend running locally (you are here!)
2. 🔗 Connect to FastAPI backend (update `VITE_API_BASE_URL` in `.env`)
3. 🗄️ Implement API endpoints in your FastAPI backend
4. 🔐 Add authentication (implement JWT or OAuth)
5. 🚀 Deploy frontend to production (see deployment docs)

---

## 🎯 Key Points

- **Frontend Only**: This is a React frontend that connects to an external FastAPI backend
- **Configurable Backend**: Set `VITE_API_BASE_URL` in `.env` to point to your backend
- **API Endpoints**: All API calls are configured in `client/api/` directory
- **Hot Reload**: Code changes auto-reload in dev mode
- **Production Ready**: Can deploy to any static hosting service (Vercel, Netlify, etc.)

---

Happy coding! 🚀
