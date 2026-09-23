# Cloudflare Workers Deployment Guide for GoatMart

This guide provides step-by-step instructions for deploying the **GoatMart** Next.js 16 ecommerce platform to **Cloudflare Workers** using `@opennextjs/cloudflare`.

---

## 1. Prerequisites
- **Node.js**: v20.x or v22.x LTS installed.
- **Cloudflare Account**: A free or paid account at [cloudflare.com](https://dash.cloudflare.com/).
- **MongoDB Atlas Database**: Active cluster with IP access enabled (0.0.0.0/0 for Cloudflare Workers egress).
- **Cloudinary Account**: Cloud name, API Key, and API Secret.
- **Razorpay Account**: Key ID and Key Secret.
- **Firebase Project**: Configured for Google Authentication.
- **Render Socket.IO Service**: Running at `https://goatmart-socket.onrender.com/`.

---

## 2. Cloudflare Account & CLI Login
Authenticate your local environment with Cloudflare:

```bash
npx wrangler login
```
This will open your browser to authorize Wrangler with your Cloudflare account.

Verify authentication:
```bash
npx wrangler whoami
```

---

## 3. Required Environment Variables

All sensitive credentials MUST be set as Cloudflare Worker secrets. Public variables can be configured in `.env.local` for build-time embedding or via Wrangler configuration.

### Environment Variable Reference

| Variable | Type | Used For | Cloudflare Location |
| :--- | :--- | :--- | :--- |
| `MONGODB_URI` | Secret | MongoDB Atlas connection string | `wrangler secret put MONGODB_URI` |
| `NEXTAUTH_SECRET` | Secret | JWT signing and session encryption | `wrangler secret put NEXTAUTH_SECRET` |
| `NEXTAUTH_URL` | Secret / Var | Canonical authentication URL | `wrangler secret put NEXTAUTH_URL` |
| `CLOUDINARY_CLOUD_NAME` | Secret / Var | Cloudinary account name | `wrangler secret put CLOUDINARY_CLOUD_NAME` |
| `CLOUDINARY_API_KEY` | Secret | Cloudinary API access key | `wrangler secret put CLOUDINARY_API_KEY` |
| `CLOUDINARY_API_SECRET` | Secret | Cloudinary upload signing secret | `wrangler secret put CLOUDINARY_API_SECRET` |
| `RAZORPAY_KEY_ID` | Secret | Server-side Razorpay Key ID | `wrangler secret put RAZORPAY_KEY_ID` |
| `RAZORPAY_KEY_SECRET` | Secret | Server-side Razorpay Key Secret | `wrangler secret put RAZORPAY_KEY_SECRET` |
| `NEXT_PUBLIC_APP_URL` | Public Var | Frontend base URL | Cloudflare Worker / `.env.local` |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Public Var | Client-side Razorpay Checkout | Cloudflare Worker / `.env.local` |
| `NEXT_PUBLIC_SOCKET_URL` | Public Var | Render Socket.IO server URL | Cloudflare Worker / `.env.local` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Public Var | Firebase Web client API Key | Cloudflare Worker / `.env.local` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`| Public Var | Firebase Auth domain | Cloudflare Worker / `.env.local` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Public Var | Firebase project identifier | Cloudflare Worker / `.env.local` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`| Public Var | Firebase storage bucket | Cloudflare Worker / `.env.local` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`| Public Var| Firebase messaging sender ID | Cloudflare Worker / `.env.local` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Public Var | Firebase App ID | Cloudflare Worker / `.env.local` |

---

## 4. Setting Secrets via Wrangler

Run the following commands in your terminal to securely upload your production secrets to Cloudflare:

```bash
# Database
npx wrangler secret put MONGODB_URI

# NextAuth
npx wrangler secret put NEXTAUTH_SECRET
npx wrangler secret put NEXTAUTH_URL

# Cloudinary
npx wrangler secret put CLOUDINARY_CLOUD_NAME
npx wrangler secret put CLOUDINARY_API_KEY
npx wrangler secret put CLOUDINARY_API_SECRET

# Razorpay
npx wrangler secret put RAZORPAY_KEY_ID
npx wrangler secret put RAZORPAY_KEY_SECRET
```

> [!TIP]
> Generate a strong 32+ character random string for `NEXTAUTH_SECRET`:
> `openssl rand -base64 32`

---

## 5. Build & Deployment Commands

### Step A: Build for Cloudflare Worker
Builds the Next.js app and bundles it for Cloudflare Workers with OpenNext:

```bash
npm run build:worker
```
*(Equivalent to `npx opennextjs-cloudflare build`)*

### Step B: Local Cloudflare Worker Preview
Test your production worker bundle locally before deploying:

```bash
npm run preview:worker
```
*(Runs Wrangler dev server simulating the Cloudflare runtime at `http://localhost:8787`)*

### Step C: Deploy to Cloudflare Workers
Deploy the entire application and static assets:

```bash
npm run deploy:worker
```
*(Or `npx opennextjs-cloudflare build && npx wrangler deploy`)*

Upon successful deployment, Wrangler will output your live URL (e.g. `https://goatmart.<your-subdomain>.workers.dev`).

---

## 6. Custom Domain Setup
To bind a custom domain (e.g., `goatmart.com` or `shop.bakrawale.com`):
1. In Cloudflare Dashboard, go to **Workers & Pages** -> **goatmart** -> **Settings** -> **Domains & Routes**.
2. Click **Add Custom Domain** and enter your domain name.
3. Cloudflare will automatically route DNS and configure SSL certificates.

---

## 7. Firebase Production Domain Configuration
Once you know your live Cloudflare Worker URL or Custom Domain:
1. Go to [Firebase Console](https://console.firebase.google.com/) -> Select your Project.
2. Navigate to **Authentication** -> **Settings** -> **Authorized domains**.
3. Click **Add domain** and enter your Cloudflare domain (e.g., `goatmart.<your-subdomain>.workers.dev` and your custom domain).
4. In Google Cloud Console (APIs & Services -> Credentials -> OAuth 2.0 Client IDs), ensure the authorized redirect URIs include:
   - `https://<your-cloudflare-domain>/api/auth/callback/firebase-google`
   - `https://<your-cloudflare-domain>/api/auth/callback/credentials`

---

## 8. Razorpay Production Configuration
1. Log into your [Razorpay Dashboard](https://dashboard.razorpay.com/).
2. Switch from **Test Mode** to **Live Mode**.
3. Generate Live API Keys (`RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET`).
4. Update secrets on Cloudflare:
   ```bash
   npx wrangler secret put RAZORPAY_KEY_ID
   npx wrangler secret put RAZORPAY_KEY_SECRET
   ```
5. Ensure `NEXT_PUBLIC_RAZORPAY_KEY_ID` is set to your Live Key ID for client checkout.

---

## 9. MongoDB Atlas Production Configuration
Because Cloudflare Workers run on globally distributed edge nodes:
1. In [MongoDB Atlas](https://cloud.mongodb.com/), go to **Network Access**.
2. Ensure IP Access List allows `0.0.0.0/0` (Allow Access from Anywhere) with strong user credentials.
3. Use a standard `mongodb+srv://...` connection string.
4. Set Mongoose connection timeout options (already configured in `src/lib/db.ts`).

---

## 10. Cloudinary Production Configuration
1. Cloudinary upload folders:
   - Goats: `bakrawale/goats`
   - Banners: `bakrawale/banners`
   - Videos: `bakrawale/videos`
2. Keep `CLOUDINARY_API_SECRET` strictly on Cloudflare Workers (never expose in client code).

---

## 11. Socket.IO Backend (Render) Configuration
The real-time chat backend runs independently on Render:
1. URL: `https://goatmart-socket.onrender.com/`
2. In your Cloudflare frontend deployment, set:
   ```bash
   NEXT_PUBLIC_SOCKET_URL=https://goatmart-socket.onrender.com/
   ```
3. In Render Environment variables for the socket server, set:
   ```bash
   NEXT_PUBLIC_APP_URL=https://<your-cloudflare-domain>
   ```
   This ensures Render's Socket.IO CORS whitelist permits connections from your Cloudflare frontend.

---

## 12. Verification Checklist
After deploying, test the following flows on the live Cloudflare Worker URL:
- [ ] **Home page**: Banners load from Cloudinary, breed categories render.
- [ ] **Goat listings**: Browse goats, view `/goat/[id]`, filter and search.
- [ ] **Authentication**:
  - [ ] Customer email/password registration & login.
  - [ ] Seller email/password registration & login.
  - [ ] Firebase Google One-Click Login.
  - [ ] Admin login (`/admin` access check).
- [ ] **Seller Workflow**:
  - [ ] Pending seller banner & approval requirement.
  - [ ] Listing creation with Cloudinary image upload.
- [ ] **Admin Dashboard**:
  - [ ] User role & status management (approve/suspend seller).
  - [ ] 3-slide 16:9 banner upload to Cloudinary.
  - [ ] Analytics & Chat Monitor.
- [ ] **Chat**: Connects to Render Socket.IO server, sends and receives live messages.
- [ ] **Checkout**: Razorpay modal opens with valid order generation.

---

## 13. Rollback Procedure
If an issue occurs in production:
1. List previous deployments:
   ```bash
   npx wrangler deployments list
   ```
2. Rollback to a known healthy deployment:
   ```bash
   npx wrangler rollback <deployment-id>
   ```

---

## 14. Common Issues & Solutions

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| `MongoDB connection timeout` | MongoDB Atlas IP whitelist blocking Workers | Add `0.0.0.0/0` to Atlas Network Access |
| `Firebase auth domain mismatch` | Domain not added in Firebase Console | Add Worker URL to Firebase Authorized Domains |
| `Socket.IO CORS Error` | Render backend missing Cloudflare origin | Set `NEXT_PUBLIC_APP_URL` on Render to your Cloudflare URL |
| `JWT Decryption Error` | `NEXTAUTH_SECRET` missing or mismatched | Set `NEXTAUTH_SECRET` via `wrangler secret put NEXTAUTH_SECRET` |

---

## 15. Future Socket.IO Migration Plan (Durable Objects)
When you are ready to migrate from Render Socket.IO to Cloudflare native WebSockets:
1. Enable Cloudflare Durable Objects in `wrangler.jsonc`.
2. Implement a `ChatRoom` Durable Object class with native `WebSocket` hibernation.
3. Replace `socket.io-client` with native browser `WebSocket` in `src/hooks/useSocket.ts`.
4. Decommission the Render instance.
*(No changes needed right now; your Render setup is fully supported!)*
