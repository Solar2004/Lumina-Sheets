# 🚀 Deployment Configuration Guide

## Environment Variables Required for Production

When deploying Lumina Sheets to production, you **MUST** configure the following environment variables in your deployment platform:

### Required Variables

```env
GEMINI_API_KEY=your_gemini_api_key_here
VITE_SIGNALING_SERVER=wss://signaling-server.solar2004.deno.net
VITE_SIGNALING_PASSWORD=lorianthelaw1469
```

---

## Platform-Specific Instructions

### 🔷 Vercel

1. Go to your project settings: `https://vercel.com/[your-username]/[project-name]/settings/environment-variables`
2. Add each variable:
   - **Name**: `GEMINI_API_KEY` → **Value**: `your_gemini_api_key_here`
   - **Name**: `VITE_SIGNALING_SERVER` → **Value**: `wss://signaling-server.solar2004.deno.net`
   - **Name**: `VITE_SIGNALING_PASSWORD` → **Value**: `lorianthelaw1469`
3. Select which environments (Production, Preview, Development)
4. Click "Save"
5. **Redeploy** your project

### 🟢 Netlify

1. Go to: `Site settings → Build & deploy → Environment`
2. Click "Edit variables"
3. Add the three variables listed above
4. Click "Save"
5. **Trigger a new deploy**

### ☁️ Cloudflare Pages

1. Go to: `Settings → Environment variables`
2. Add variables for "Production" and "Preview" environments
3. Add the three variables
4. **Redeploy** the project

### 🐙 GitHub Pages / Static Hosting

Since GitHub Pages doesn't support environment variables, you have two options:

**Option A**: Create a separate build with hardcoded values for production
**Option B**: Use a backend proxy to inject environment variables

### 🎯 Deno Deploy / Other Platforms

1. Navigate to your project's environment variables section
2. Add all three variables
3. Redeploy

---

## ✅ Verification

After setting environment variables and redeploying:

1. Open browser DevTools (F12) → Console
2. Check for WebSocket connection logs
3. If you see: `WebSocket connection to 'wss://signaling-server.solar2004.deno.net/' failed`, the variables are NOT set
4. If connection succeeds, you should see no errors and the collaboration features will work

### Health Check

Visit your signaling server health endpoint:
```
https://signaling-server.solar2004.deno.net/health
```

Expected response:
```json
{
  "status": "ok",
  "totalRooms": 0,
  "totalClients": 0,
  "rooms": {},
  "uptime": 92.67
}
```

---

## ⚠️ Common Issues

### Issue 1: "WebSocket connection failed"
**Cause**: Environment variables not set in production
**Solution**: Follow the platform-specific instructions above and **redeploy**

### Issue 2: "404 Not Found"
**Cause**: Wrong URL or server is down
**Solution**: Verify the health endpoint works: `https://signaling-server.solar2004.deno.net/health`

### Issue 3: Variables work locally but not in production
**Cause**: Vite requires explicit `define` configuration or platform env vars
**Solution**: This is now fixed in `vite.config.ts` - just set the env vars and redeploy

---

## 🔒 Security Notes

- **NEVER** commit `.env.local` to Git (it's already in `.gitignore`)
- Keep your `GEMINI_API_KEY` secure
- The signaling password should be rotated periodically for security
- Consider using different passwords for staging vs production environments

---

## 📝 Quick Deploy Checklist

- [ ] Set `GEMINI_API_KEY` in deployment platform
- [ ] Set `VITE_SIGNALING_SERVER` in deployment platform
- [ ] Set `VITE_SIGNALING_PASSWORD` in deployment platform
- [ ] Trigger new deployment
- [ ] Verify WebSocket connection in browser console
- [ ] Test real-time collaboration with multiple users
- [ ] Check signaling server health endpoint

---

**Need help?** Check your platform's documentation:
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)
- [Cloudflare Pages Environment Variables](https://developers.cloudflare.com/pages/configuration/build-configuration/#environment-variables)
