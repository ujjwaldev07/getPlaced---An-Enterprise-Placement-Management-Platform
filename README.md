# getPlaced — Full-Stack Placement Management Platform

A production-style placement management platform inspired by the supplied UI reference.

## Stack
- Frontend: React + TypeScript + Vite + Tailwind CSS
- UI: Glassmorphism, responsive SaaS dashboard, animations
- Backend: Node.js + Express + TypeScript
- Database: MongoDB + Mongoose
- Auth: JWT + bcrypt
- Security: Helmet, CORS, rate limiting, validation, HTTP-only cookie support
- Charts: Recharts
- Icons: Lucide React

## Features

### Student/User
- Signup/Login
- JWT authentication
- Dashboard analytics
- Profile
- Placement drives
- Apply to drives
- My applications
- Interviews
- Notifications
- Resources
- Settings
- Logout

### Admin
- Admin signup using an invite code
- Admin dashboard analytics
- Student management
- Company management
- Placement drive CRUD
- Application overview/status updates
- Interview scheduling
- Notifications
- Resources
- Settings

## Run locally

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal.

## MongoDB
Set `MONGODB_URI` in `backend/.env`. A local MongoDB URI works, or use MongoDB Atlas.

## Environment
Backend `.env`:
```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/getplaced
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
ADMIN_INVITE_CODE=GETPLACED-ADMIN-2026
NODE_ENV=development
```

Frontend `.env`:
```env
VITE_API_URL=http://localhost:3000/api
```

## Demo admin
Admin signup is available from the signup screen. Use the `ADMIN_INVITE_CODE` configured in your backend `.env`.

## Production
- Set a strong `JWT_SECRET`.
- Set the real frontend URL in `CLIENT_URL`.
- Use HTTPS.
- Use secure cookie settings.
- Use MongoDB Atlas or another managed MongoDB deployment.
- Restrict CORS to trusted origins.
