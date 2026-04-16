# Bantaysp Deployment Guide

## Overview
This guide covers deploying Bantaysp to:
- **Frontend**: Netlify (React + Vite)
- **Backend**: Render (Node.js Express server)
- **Database**: Supabase (managed PostgreSQL with hosted functions)

---

## Prerequisites

1. **Accounts**:
   - Netlify account (free tier available)
   - Render account (free tier available)
   - Supabase project already configured
   - SendGrid account for email service
   - Cloudinary account for image uploads

2. **Local Setup**:
   - Git repository connected to GitHub
   - All secrets removed from `.env.local` (committed during previous fix)
   - `.env.example` with template variables

---

## Part 1: Frontend Deployment (Netlify)

### Step 1: Connect GitHub to Netlify

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click **"New site from Git"**
3. Select **GitHub** as provider
4. Authorize Netlify to access your repositories
5. Select the `Bantaysp` repository
6. Click **Deploy**

### Step 2: Configure Build Settings

Netlify should auto-detect:
- **Build command**: `npm run build:frontend`
- **Publish directory**: `dist`

If not, manually set them:
1. Go to **Site settings > Build & deploy > Build settings**
2. Update:
   - Build command: `npm run build:frontend`
   - Publish directory: `dist`

### Step 3: Set Environment Variables

1. Go to **Site settings > Build & deploy > Environment**
2. Add the following variables:

```
VITE_SUPABASE_URL = https://cepefukwfszkgosnjmbc.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (your actual key)
VITE_API_URL = https://your-render-backend-url.onrender.com
```

3. Click **Save**

### Step 4: Verify Deployment

1. Click **Deploy** manually or wait for GitHub webhook trigger
2. Check deployment status in **Deployments** tab
3. Visit the generated URL (e.g., `https://bantaysp.netlify.app`)

---

## Part 2: Backend Deployment (Render)

### Step 1: Create a New Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New** > **Web Service**
3. Connect your GitHub repository
4. Select the `Bantaysp` repository

### Step 2: Configure Web Service

Fill in the configuration form:

- **Name**: `bantaysp-backend`
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm run start:server`
- **Instance Type**: Free (or paid for production)

### Step 3: Set Environment Variables

After creating the service, go to **Environment** tab and add:

```
NODE_ENV = production
PORT = (auto-assigned by Render, leave blank or use 3000)
FRONTEND_URL = https://your-netlify-domain.netlify.app

# Supabase
SUPABASE_URL = https://cepefukwfszkgosnjmbc.supabase.co
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (your service key)

# SendGrid
SENDGRID_API_KEY = SG.your-api-key-here

# Cloudinary
CLOUDINARY_CLOUD_NAME = dzqtdl5aa
CLOUDINARY_API_KEY = 829735821883862
CLOUDINARY_API_SECRET = jp8xklrseBVvN13Jba7zPJ7BXPc
```

### Step 4: Deploy

1. Render will auto-detect the service and start building
2. Monitor the **Logs** tab for any errors
3. Once deployed, you'll get a URL like: `https://bantaysp-backend.onrender.com`

### Step 5: Health Check

Test the backend endpoint:

```bash
curl https://your-render-backend-url.onrender.app/health
```

Should return:
```json
{ "status": "ok", "timestamp": "2026-04-16T12:00:00Z" }
```

---

## Part 3: Update Frontend to Connect to Backend

### Step 1: Update Environment Variables

After backend deployment, update Netlify environment:

1. Go back to **Netlify Dashboard > Site settings > Build & deploy > Environment**
2. Update `VITE_API_URL` to your Render backend URL

### Step 2: Verify Frontend Code Uses API URL

In your frontend code, ensure API calls use the environment variable:

```typescript
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Example API call
const response = await fetch(`${apiUrl}/health`);
```

### Step 3: Redeploy Frontend

1. Netlify will auto-redeploy on GitHub push, or
2. Manually trigger deployment on Netlify dashboard

---

## Part 4: Monitoring & Debugging

### Netlify

- **Logs**: Build logs in **Deployments** tab
- **Analytics**: Traffic and performance in **Analytics** tab
- **Functions**: Edge functions (if using)

### Render

- **Logs**: Real-time logs in **Logs** tab
- **Metrics**: CPU, memory usage in **Metrics** tab
- **Health Check**: Automatic restarts if health check fails

### Supabase

- **Database**: Direct SQL queries in SQL Editor
- **Logs**: Edge function logs in **Edge Functions** tab
- **Monitoring**: Database performance metrics

---

## Part 5: Production Checklist

- [ ] Environment variables set in both Netlify and Render
- [ ] CORS configured correctly (frontend domain in backend)
- [ ] Email service (SendGrid) tested
- [ ] Image uploads (Cloudinary) tested
- [ ] Database backups configured in Supabase
- [ ] Monitoring alerts set up (optional but recommended)
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active (auto on Netlify & Render)
- [ ] Password-protected admin routes enforced
- [ ] Rate limiting implemented
- [ ] Error logging configured (e.g., Sentry)

---

## Part 6: Troubleshooting

### Frontend won't load
- Check Netlify build logs
- Verify environment variables are set
- Check browser console for errors

### Backend 502 errors
- Check Render logs for startup errors
- Verify environment variables (especially Supabase)
- Test health endpoint: `GET /health`

### CORS errors
- Verify `FRONTEND_URL` is set correctly in Render
- Check frontend is making requests to correct backend URL
- See `local-server.ts` CORS configuration

### Email not sending
- Verify `SENDGRID_API_KEY` is set
- Check SendGrid account has enough credits
- See server logs for SendGrid API errors

### Database connection issues
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Check Supabase project is active
- Test connection manually via `supabase-js` CLI

---

## Part 7: Local Development vs Production

### Local Development
```bash
# Frontend
npm run dev

# Backend
npm run dev:server

# Both use http://localhost URLs
```

### Production
```bash
# Frontend: Built to static files, served by Netlify CDN
npm run build:frontend

# Backend: Running on Render.com servers
# Accessible via HTTPS at your-render-url.onrender.com
```

---

## Support & Additional Resources

- **Netlify Docs**: https://docs.netlify.com/
- **Render Docs**: https://render.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Express.js**: https://expressjs.com/
- **Vite**: https://vitejs.dev/

---

**Last Updated**: April 16, 2026
**Version**: 1.0
