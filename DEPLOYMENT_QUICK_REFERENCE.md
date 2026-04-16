# Quick Deployment Reference

## Summary
- **Frontend**: Deployed on Netlify (auto-deploys on GitHub push)
- **Backend**: Deployed on Render (Node.js Express server)
- **Database**: Supabase (no changes needed)

## URLs After Deployment
```
Frontend:  https://bantaysp.netlify.app (or your custom domain)
Backend:   https://bantaysp-backend.onrender.com (backend service URL)
Database:  Supabase (no direct frontend URL)
```

## Essential Environment Variables

### Netlify (Frontend)
```
VITE_SUPABASE_URL=https://cepefukwfszkgosnjmbc.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_API_URL=https://bantaysp-backend.onrender.com
```

### Render (Backend)
```
NODE_ENV=production
FRONTEND_URL=https://bantaysp.netlify.app
SUPABASE_URL=https://cepefukwfszkgosnjmbc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-key>
SENDGRID_API_KEY=<your-sendgrid-key>
CLOUDINARY_CLOUD_NAME=<your-cloudinary>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>
```

## 3-Step Deployment

### Step 1: Connect Frontend to Netlify
1. Netlify Dashboard → **New site from Git**
2. Select `Bantaysp` repo
3. Build command: `npm run build:frontend`
4. Publish directory: `dist`
5. Add environment variables (see above)

### Step 2: Deploy Backend to Render
1. Render Dashboard → **New Web Service**
2. Select `Bantaysp` repo
3. Build command: `npm install`
4. Start command: `npm run start:server`
5. Add environment variables (see above)

### Step 3: Update Frontend with Backend URL
1. Copy Render backend URL
2. Add to Netlify environment as `VITE_API_URL`
3. Redeploy frontend (or wait for manual trigger)

## Testing Deployment
```bash
# Frontend is live at Netlify URL
curl https://bantaysp.netlify.app

# Backend health check
curl https://bantaysp-backend.onrender.com/health

# Response should include status: "ok"
```

## Common Issues

| Issue | Solution |
|-------|----------|
| Build fails on Netlify | Check `npm run build:frontend` works locally |
| Backend 502 error | Check Render logs, verify env vars |
| CORS errors | Verify `FRONTEND_URL` in Render matches Netlify domain |
| Email not working | Verify `SENDGRID_API_KEY` is set in Render |
| Database errors | Check Supabase keys in `.env.local` (not committed) |

## Git Workflow After Deployment

```bash
# Regular development
git add .
git commit -m "Feature: xyz"
git push origin main

# Netlify auto-deploys when you push to main
# No additional steps needed!
```

## File Reference

- `netlify.toml` - Netlify build config
- `render.yaml` - Render deployment config (reference only)
- `local-server.ts` - Backend Express server
- `package.json` - Scripts: `build:frontend`, `start:server`
- `.env.example` - Template for environment variables

## Useful Links

- See `DEPLOY.md` for detailed steps
- Netlify dashboard: https://app.netlify.com
- Render dashboard: https://dashboard.render.com
- Supabase dashboard: https://app.supabase.com
