# 🐐 GoatMart — Premium Goat Marketplace

India's most trusted premium livestock marketplace built with Next.js 15, TypeScript, MongoDB Atlas, and Razorpay.

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| State | Zustand (global), React hooks (local) |
| Database | MongoDB Atlas + Mongoose |
| Auth | NextAuth.js (JWT) |
| Payments | Razorpay |
| Real-time | Socket.IO |
| File Upload | Cloudinary |
| Deployment | Vercel |

## 📁 Project Structure

```
bakrawale/
├── src/
│   ├── app/
│   │   ├── (main)/          # Public pages (home, shop, goat, orders...)
│   │   ├── (auth)/          # Login, Register
│   │   ├── admin/           # Admin dashboard
│   │   ├── seller/          # Seller dashboard
│   │   └── api/             # API routes
│   ├── components/          # React components
│   ├── lib/                 # DB, auth, cloudinary, razorpay utils
│   ├── models/              # Mongoose models
│   ├── hooks/               # Custom React hooks
│   ├── store/               # Zustand store
│   └── types/               # TypeScript types
├── server.js                # Socket.IO server
├── vercel.json
└── .env.example
```

## ⚙️ Setup

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/GoatMart.git
cd GoatMart
npm install
```

### 2. Environment Variables

```bash
cp .env.example .env.local
```

Fill in your `.env.local`:

```env
MONGODB_URI=mongodb+srv://...
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_32_char_secret_here
CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=your_secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxx
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Seed Database

```bash
npx ts-node src/lib/seed.ts
```

### 4. Run Development

```bash
# Terminal 1 — Next.js
npm run dev

# Terminal 2 — Socket.IO server
node server.js
```

Visit `http://localhost:3000`

## 🔐 Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@bakrawale.com | BKR@2026#Admin |
| Seller | alnoor@farms.com | seller123 |
| Customer | rahul@gmail.com | customer123 |

## 🌐 Deployment on Vercel

1. Push to GitHub
2. Import repo on [vercel.com](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

For Socket.IO, deploy server.js separately on Railway/Render:
```bash
# On Railway — set start command to:
node server.js
```

## 📱 Features

- 🐐 Goat listings with real images, breed filters, price range
- 🔍 Full-text search with live suggestions
- 🤍 Wishlist (synced with DB)
- 💬 Real-time chat (Socket.IO)
- 💳 Razorpay payment integration
- 📦 Order tracking with timeline
- ⭐ Reviews (purchase-gated)
- 🛡️ Admin dashboard
- 🏪 Seller dashboard
- 🇮🇳 Hindi/English toggle
- 📱 Fully mobile responsive

## 🛠️ API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/goats | List goats (filters, pagination) |
| POST | /api/goats | Create goat (seller only) |
| GET | /api/goats/:id | Get goat detail |
| POST | /api/orders | Create order + Razorpay |
| POST | /api/payment/verify | Verify Razorpay payment |
| GET | /api/chat | Get user chats |
| POST | /api/chat | Start new chat |
| POST | /api/upload | Upload to Cloudinary |
| GET | /api/admin/stats | Admin stats |
| GET | /api/user/wishlist | Get wishlist |
| POST | /api/user/wishlist | Toggle wishlist |

## 📄 License

MIT — Free to use for personal and commercial projects.
