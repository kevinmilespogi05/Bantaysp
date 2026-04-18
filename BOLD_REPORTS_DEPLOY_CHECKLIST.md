# Bold Reports Deployment Checklist

## Step 1: Prepare Render Account

- [ ] Go to https://render.com/dashboard
- [ ] Ensure you're logged in
- [ ] Have your GitHub repository ready (push changes first)

## Step 2: Deploy Bold Reports Service

### Option A: Manual Deployment via Dashboard (Easiest for First-Time)

1. **Create New Web Service:**
   - Click "New +" → "Web Service"
   - Connect to your GitHub repository (Bantaysp)
   - Service name: `bantaysp-bold-reports`
   - Environment: Docker
   - Dockerfile path: `./Dockerfile.boldreports`
   - Plan: Free (or Starter if you need better performance)
   - Region: Singapore (to match your Bantaysp backend)

2. **Set Environment Variables:**
   - `REPORT_SERVICE_PORT`: `3001`
   - (Skip `BOLD_LICENSE_KEY` for Community Edition)

3. **Deploy:**
   - Click "Create Web Service"
   - Wait for deployment (2-5 minutes)
   - Note the service URL: `https://bantaysp-bold-reports.onrender.com`

### Option B: Automatic via render.yaml (Advanced)

1. Commit `render.yaml` changes to GitHub:
   ```bash
   git add render.yaml Dockerfile.boldreports
   git commit -m "Add Bold Reports deployment config"
   git push origin main
   ```

2. Go to Render dashboard and link to your GitHub repo:
   - Render will auto-detect `render.yaml`
   - Automatically deploy both services

## Step 3: Verify Deployment

1. **Check Bold Reports Health:**
   ```
   curl https://bantaysp-bold-reports.onrender.com/health
   ```
   Should return: `OK` or similar

2. **Monitor Logs:**
   - Go to service dashboard
   - Click "Logs" tab
   - Look for: "Bold Reports server running"

## Step 4: Configure Bantaysp Backend

Once Bold Reports is deployed:

1. **Get the URL:**
   - From Render dashboard → bantaysp-bold-reports service
   - URL format: `https://bantaysp-bold-reports.onrender.com`

2. **Update Bantaysp Backend Environment Variables:**
   - Go to Render dashboard → bantaysp-backend service → Environment
   - Add new variables:
     ```
     BOLD_REPORTS_API_URL=https://bantaysp-bold-reports.onrender.com
     BOLD_REPORTS_TIMEOUT_MS=60000
     BOLD_REPORTS_MAX_RECORDS=10000
     ```

3. **Restart Backend:**
   - Backend will auto-restart with new env vars (or manually trigger)

## Step 5: Test Integration

1. **Local Test (Development):**
   ```bash
   npm run start:server
   # Should see: "🚀 Local registration server running at http://localhost:3000"
   ```

2. **Admin Dashboard Export:**
   - Go to Admin Dashboard
   - Click "Export" button
   - Select filters
   - Verify preview count shows reports
   - Click "Export as PDF"
   - Should trigger download

## Troubleshooting

### Bold Reports Service Shows as "Failed" or "Crashed"

**Possible Causes:**
- Docker image not found (network issue)
- Port conflict
- Resource exhaustion (free tier)

**Solutions:**
1. Check logs: Service Dashboard → Logs
2. Restart service: Dashboard → "Restart" button
3. Check region: Ensure it's `singapore` (or your region)
4. Upgrade plan: Free tier has limited resources

### Export Says "Bold Reports Unavailable"

**Possible Causes:**
- `BOLD_REPORTS_API_URL` not set correctly
- Bold Reports service not responding
- Network connectivity issue

**Solutions:**
1. Verify env var: `BOLD_REPORTS_API_URL=https://bantaysp-bold-reports.onrender.com`
2. Test endpoint: `curl https://bantaysp-bold-reports.onrender.com/health`
3. Check logs in Bold Reports service
4. Restart backend service

### Logs Show "Port Already in Use"

**Solution:**
- Render automatically assigns port 3001
- Clear any port conflicts
- Restart service from dashboard

## Cost & Performance Notes

### Community Edition (Free)
- ✅ Free
- ✅ Suitable for MVP/testing
- ❌ Max ~100 renders/day
- ❌ Limited support
- ⚠️ Free tier: may have slower response times

### Scaling Up

If exports exceed 100/day:
1. **Upgrade Render Plan:** Free → Starter ($7/month) → higher tiers
2. **Upgrade Bold Reports:** Community → Enterprise (contact Bold Software)

## Next Steps

Once verified:
1. ✅ Bold Reports deployed
2. ✅ Backend configured with correct API URL
3. → Proceed to **Step 3: Configure Environment Variables** in main guide
