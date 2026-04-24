# Railway Deployment Verification Guide

## Current Deployment Configuration

Your Caixa360 ERP is configured for Railway deployment with:
- **GitHub Repo:** https://github.com/barikamal086-jpg/salon.erp.git
- **Branch:** master
- **Build Method:** Dockerfile (explicit, not Railpack)
- **Start Command:** `cd backend && node app.js`
- **Port:** 5006 (or environment variable PORT)

---

## 📋 Deployment Checklist

### Step 1: Check GitHub Integration
- [ ] Navigate to https://github.com/barikamal086-jpg/salon.erp
- [ ] Verify latest commit is visible: "Document Phase 1 implementation status..." (83499e2)
- [ ] Check that all files are present:
  - [x] `salon-erp/package.json` (root)
  - [x] `salon-erp/backend/package.json`
  - [x] `salon-erp/backend/app.js`
  - [x] `salon-erp/Dockerfile`
  - [x] `salon-erp/railway.json`
  - [x] `salon-erp/frontend/index.html`

### Step 2: Railway Dashboard Verification
Go to https://railway.app/dashboard

- [ ] Select your project (Caixa360 ERP or salon.erp)
- [ ] Under "Deployments", find the latest deployment
- [ ] Check deployment status:
  - **✅ Green/Success:** Deployment completed successfully
  - **🟡 Yellow/In Progress:** Build is running
  - **❌ Red/Failed:** Build or runtime error - see logs

### Step 3: View Build Logs
If deployment shows red or yellow:

1. Click the deployment row
2. Look for "Build logs" tab
3. Check for errors - common issues:
   - **Missing dependencies:** npm install should have run
   - **SQLite binary error:** Should be fixed (node_modules removed)
   - **Port already in use:** Shouldn't happen on Railway
   - **Frontend not found:** Should be in backend/frontend/
   - **Module not found:** Check package.json dependencies

### Step 4: View Runtime Logs
If build succeeds but app doesn't start:

1. Click the deployment
2. Look for "Logs" tab
3. Check for:
   - **Database connection error:** Check database.js
   - **Express binding error:** Check app.js PORT configuration
   - **Missing files:** Check frontend path

Expected successful start logs should show:
```
✅ Conectado ao SQLite: /app/backend/salon-erp.db
✅ Tabela restaurantes criada/verificada
✅ Tabela tipo_despesa criada/verificada
✅ Tabela "faturamento" pronta
✅ Tabela "notas_fiscais" pronta
🚀 Servidor rodando em http://0.0.0.0:5006
```

### Step 5: Test Deployed Application

Get your Railway deployment URL:
1. In Railway dashboard, click your deployment
2. Look for the public URL (something like `caixa360-prod.up.railway.app`)
3. Copy the URL

Test the app:
- [ ] Open URL in browser: `https://your-railway-url.railway.app`
- [ ] Frontend should load (Caixa360 ERP interface)
- [ ] Try entering some test data
- [ ] Test CMV analysis with Phase 1 restaurant selector
- [ ] Check API directly: `https://your-railway-url.railway.app/api/faturamentos`

### Step 6: Database Persistence
- [ ] Enter test data in deployed app
- [ ] Wait a few seconds for save
- [ ] Refresh browser - data should still be there
- [ ] This verifies SQLite database is persisting

**Note:** Railway's default filesystem is ephemeral. For production, you may need:
- PostgreSQL (managed by Railway)
- OR persistent volumes
- See Phase 2 for migration plan

---

## 🔧 Common Issues & Fixes

### Issue: "Repository not found"
**Cause:** Wrong repo URL or no access
**Fix:** 
- Verify repo is public or Railway app has permission
- Check repo URL: https://github.com/barikamal086-jpg/salon.erp

### Issue: "Build failed - node_modules issue"
**Cause:** SQLite binary incompatibility
**Status:** Already fixed - node_modules removed from git
**Verification:** `git log` should show "Remove node_modules for Railway rebuild"

### Issue: "Cannot find module 'express'"
**Cause:** npm install didn't run
**Fix:** 
- Check that `salon-erp/backend/package.json` has all dependencies
- Verify `salon-erp/package.json` has `"install": "cd backend && npm install"` script
- Trigger rebuild from Railway dashboard

### Issue: "Frontend not found"
**Cause:** Frontend path wrong or not copied
**Status:** Should be fixed - frontend copied to backend/frontend/
**Fix:** Verify structure:
```
salon-erp/
├── backend/
│   ├── app.js
│   ├── frontend/
│   │   ├── index.html
│   │   ├── css/
│   │   └── js/
│   └── package.json
└── Dockerfile
```

### Issue: "EADDRINUSE: port already in use"
**Cause:** Another process on port 5006
**Status:** Shouldn't happen on Railway
**Fix:** Railway assigns port via environment variable, app.js reads `process.env.PORT || 5006`

### Issue: Database file not persisting
**Cause:** Ephemeral filesystem
**Temporary:** This is expected with SQLite on Railway
**Solution:** Phase 2 migration to PostgreSQL for production

---

## 🚀 If Deployment Fails

1. **Collect error information:**
   - [ ] Screenshot build logs
   - [ ] Screenshot runtime logs
   - [ ] Note the exact error message

2. **Check recent commits:**
   - [ ] Verify latest code pushed to GitHub
   - [ ] Check `git log` shows your latest work
   - [ ] Try force rebuild in Railway dashboard

3. **Verify local setup:**
   - [ ] Run `npm install` in backend directory
   - [ ] Start app locally: `PORT=8080 node backend/app.js`
   - [ ] If it works locally, deployment config might be issue
   - [ ] If it fails locally, backend code has issues

4. **Check configuration files:**
   - [ ] `salon-erp/Dockerfile` exists and is correct
   - [ ] `salon-erp/railway.json` exists with `"builder": "dockerfile"`
   - [ ] `salon-erp/package.json` exists at root
   - [ ] `salon-erp/backend/package.json` has all dependencies

---

## 📊 Expected Deployment Sequence

```
1. Code pushed to GitHub ✅
   └─> GitHub webhook triggers Railway build

2. Railway receives webhook
   └─> Clones salon.erp repository
   └─> Reads railway.json (uses Dockerfile)

3. Dockerfile builds image
   └─> FROM node:22-alpine
   └─> COPY . .
   └─> npm install (in backend)
   └─> Expose port 5006

4. Railway starts container
   └─> CMD ["node", "app.js"] (runs in backend directory)
   └─> App binds to 0.0.0.0:PORT (Railway assigns PORT)
   └─> SQLite database creates/opens

5. Public URL assigned
   └─> Something like: https://caixa360-prod.up.railway.app
   └─> App accessible worldwide

6. Your frontend loads ✅
   └─> API calls made to same domain
   └─> /api/faturamentos endpoints work
   └─> CMV analysis functional
```

---

## 🔗 Next Steps After Deployment

Once deployment verified:
1. [ ] Test with 3 sócios (younes, bruno, kamal) on deployed app
2. [ ] Collect feedback on Phase 1 (restaurant selector)
3. [ ] Plan Phase 2 implementation (multi-tenant)
4. [ ] Consider PostgreSQL migration for persistence

---

## 📱 For Each Sócio

Share the deployed URL with:
- **Younes:** "Salão channel works - test presencial sales"
- **Bruno:** "iFood channel works - test delivery orders"
- **Kamal:** "Keeta + 99Food channels work - test all platforms"

They can:
1. Open the URL in browser
2. Enter test data
3. Select their preferred channel
4. View CMV analysis for their channel

---

## 📞 Troubleshooting

If issues persist:
1. Check `git log` - last deploy commit should be pushed
2. Verify GitHub webhook is active (Railway settings)
3. Try manual rebuild from Railway dashboard
4. Check if any secrets/env variables needed (JWT_SECRET, DB_PATH, etc.)
5. Review build logs for exact error message

---

**Deployment Configuration:**
- Root `package.json`: Acts as wrapper/dispatcher ✅
- Dockerfile: Explicit build instructions ✅
- railway.json: Forces Dockerfile builder ✅
- Backend `package.json`: All dependencies listed ✅
- Frontend: Copied to backend/frontend/ ✅
- Database: SQLite with relative path ✅

**Status:** Ready for verification and testing

---

**Last Updated:** 2026-04-24
**Version:** Caixa360 ERP v1.0.0
**Git Ref:** master@83499e2
