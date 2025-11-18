# 🔍 Debug Logging Guide for WebSocket Issues

## Overview

The application now includes comprehensive debug logging to help diagnose WebSocket connection issues. This guide explains what each log means and how to interpret them.

## How to View Logs

1. Open your application in production
2. Open Browser DevTools (F12 or Right-click → Inspect)
3. Go to the **Console** tab
4. Look for logs with emoji prefixes

---

## Log Categories

### 🚀 Initialization Logs

#### `🚀 [LUMINA] Initializing collaboration system...`
- **When**: Application starts
- **Meaning**: The collaboration system is beginning to initialize
- **Action**: This should always appear first

### 📡 Configuration Logs

#### `📡 [CONFIG] Signaling Server: wss://...`
- **What to check**: The URL should be `wss://signaling-server.solar2004.deno.net`
- **Problem**: If it shows `undefined` or wrong URL → Environment variables not loaded

#### `🔑 [CONFIG] Password Set: Yes (lor***469)`
- **What to check**: Should show `Yes` with masked password
- **Problem**: If shows `No` → Password not configured

#### `🌍 [ENV] import.meta.env.VITE_SIGNALING_SERVER: ...`
- **Expected**: Should show the WSS URL
- **Problem**: If `undefined` → **Environment variables NOT set in production**

#### `🌍 [ENV] import.meta.env.VITE_SIGNALING_PASSWORD: SET`
- **Expected**: Should show `SET`
- **Problem**: If shows `NOT SET` → **Password environment variable missing**

#### `🌍 [ENV] MODE: production` / `DEV: false` / `PROD: true`
- **What to check**: MODE should be `production`, DEV should be `false`, PROD should be `true`
- **Use**: Helps confirm you're running in production mode

### 🏠 Room Logs

#### `🏠 [ROOM] Room Name: lumina-main-room`
- **Meaning**: Shows which collaboration room you're joining
- **Normal**: Different users need the same room name to collaborate

### 🔌 WebRTC Provider Logs

#### `🔌 [WEBRTC] Creating WebrtcProvider...`
- **Meaning**: Starting to create the WebRTC connection provider
- **Problem**: If you never see this → Check for JavaScript errors above

#### `✅ [WEBRTC] WebrtcProvider created successfully`
- **Meaning**: Provider object created (doesn't mean connected yet)
- **Problem**: If missing → Check for errors in between

#### `📊 [WEBRTC] Provider details: {...}`
- **What to check**: 
  - `signalingUrls` should have your server URL
  - `hasPassword` should be `true`

### 🔗 Signaling Connection Logs

#### `🔗 [SIGNALING 0] Attempting connection to: wss://...`
- **Meaning**: Attempting to connect to signaling server
- **What to check**: URL should match your server

#### `✅ [SIGNALING 0] Connected successfully!`
- **Meaning**: **SUCCESS!** Connected to signaling server
- **Problem**: If you never see this → Connection is failing

#### `⚠️ [SIGNALING 0] Disconnected`
- **Meaning**: Lost connection to signaling server
- **Possible causes**: 
  - Server went down
  - Network issue
  - Password authentication failed

#### `❌ [SIGNALING 0] Error: ...`
- **Meaning**: **Connection error occurred**
- **What to check**: Read the error message carefully
- **Common errors**:
  - `401` → Wrong password
  - `404` → Wrong server URL
  - `503` → Server is down
  - Connection timeout → Network/firewall issue

### 🔄 Sync Logs

#### `🔄 [SYNC] Sync event fired, synced: true`
- **Meaning**: Data synchronization started
- **Expected**: Should see `synced: true`

#### `📝 [SYNC] First user in room - populating default data`
- **Meaning**: You're the first person in this room, loading default data

#### `📊 [SYNC] Data already exists, rows: 5`
- **Meaning**: Room has existing data from other users

#### `🟢 [STATUS] Connection status set to: connected`
- **Meaning**: **Full success!** Everything is working
- **Result**: Green dot should appear in UI

### 📚 Data Logs

#### `📚 [DATA] Initial state loaded: {...}`
- **Shows**: How many rows, columns, chat messages exist
- **Use**: Verify data loaded correctly

### 👤 Presence Logs

#### `👤 [PRESENCE] Local user set: Anonymous Axolotl`
- **Meaning**: Your user identity has been set

#### `👥 [PRESENCE] Active collaborators: 2 ['Busy Beaver', 'Curious Cat']`
- **Meaning**: Shows other users currently in the room
- **Use**: Test collaboration by opening in multiple tabs

### 💥 Error Logs

#### `💥 [ERROR] Fatal error during initialization: ...`
- **Meaning**: **Critical failure** during setup
- **Action**: Read the error message and stack trace carefully

### 🔌 Cleanup Logs

#### `🔌 [CLEANUP] Disconnecting provider...`
- **Meaning**: Application is shutting down (page closed/refreshed)

---

## Diagnostic Scenarios

### ❌ Scenario 1: ENV Variables Not Set
```
📡 [CONFIG] Signaling Server: wss://signaling-server.solar2004.deno.net
🔑 [CONFIG] Password Set: Yes (lor***469)
🌍 [ENV] import.meta.env.VITE_SIGNALING_SERVER: undefined    ← PROBLEM
🌍 [ENV] import.meta.env.VITE_SIGNALING_PASSWORD: NOT SET    ← PROBLEM
```

**Diagnosis**: Fallback values are being used (hardcoded), but environment variables are NOT set in production

**Solution**: 
1. Go to your deployment platform (Vercel/Netlify/etc.)
2. Add environment variables
3. Redeploy

---

### ❌ Scenario 2: WebSocket Connection Failing
```
🔗 [SIGNALING 0] Attempting connection to: wss://signaling-server.solar2004.deno.net
(no success message appears)
WebSocket connection to 'wss://...' failed    ← Browser error
```

**Diagnosis**: Cannot connect to signaling server

**Possible causes**:
1. **Wrong password** → 401 authentication error
2. **Server is down** → Check https://signaling-server.solar2004.deno.net/health
3. **Network/CORS issue** → Check browser network tab
4. **Firewall blocking WebSocket** → Try different network

**Solution**:
1. Verify server health: `curl https://signaling-server.solar2004.deno.net/health`
2. Check password is correct in environment variables
3. Check browser Network tab for exact error code

---

### ✅ Scenario 3: Everything Working
```
🚀 [LUMINA] Initializing collaboration system...
📡 [CONFIG] Signaling Server: wss://signaling-server.solar2004.deno.net
🔑 [CONFIG] Password Set: Yes (lor***469)
🌍 [ENV] import.meta.env.VITE_SIGNALING_SERVER: wss://signaling-server.solar2004.deno.net
🌍 [ENV] import.meta.env.VITE_SIGNALING_PASSWORD: SET
🏠 [ROOM] Room Name: lumina-main-room
🔌 [WEBRTC] Creating WebrtcProvider...
✅ [WEBRTC] WebrtcProvider created successfully
🔗 [SIGNALING 0] Attempting connection to: wss://signaling-server.solar2004.deno.net
✅ [SIGNALING 0] Connected successfully!    ← SUCCESS!
🔄 [SYNC] Sync event fired, synced: true
🟢 [STATUS] Connection status set to: connected
✅ [LUMINA] Initialization complete!
```

**Result**: Everything is working perfectly! 🎉

---

## Testing Collaboration

Open the app in **two different browser tabs** (or browsers):

### Tab 1:
```
👥 [PRESENCE] Active collaborators: 1 ['Busy Beaver']
```

### Tab 2:
```
👥 [PRESENCE] Active collaborators: 1 ['Anonymous Axolotl']
```

If you see collaborators appearing → **Real-time collaboration is working!**

---

## Quick Troubleshooting Checklist

- [ ] Check environment variables show as `SET` (not `undefined` or `NOT SET`)
- [ ] Verify signaling server URL is correct
- [ ] Look for `✅ [SIGNALING 0] Connected successfully!` message
- [ ] Check server health: https://signaling-server.solar2004.deno.net/health
- [ ] Verify password is correct (check for 401 errors)
- [ ] Test in incognito/private mode to rule out cache issues
- [ ] Check browser console for any red error messages
- [ ] Try different browser to rule out browser-specific issues

---

## Still Having Issues?

Copy the **entire console log** and share it. It will help diagnose the exact problem!
