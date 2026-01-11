# Setup Instructions

## Prerequisites

- Node.js 18+ installed
- A Strava account
- Strava API credentials (see below)

## Step 1: Get Strava API Credentials

1. Go to https://www.strava.com/settings/api
2. Click "Create App"
3. Fill in:
   - **Application Name**: Strava Journey (or any name)
   - **Category**: Website
   - **Website**: http://localhost:3000
   - **Authorization Callback Domain**: localhost
4. Copy your **Client ID** and **Client Secret**

## Step 2: Install Dependencies

```bash
cd strava-journey-app
npm run install:all
```

This will install dependencies for both frontend and backend.

## Step 3: Configure Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
cd backend
cp .env.example .env
```

Edit `.env` and add your Strava credentials:

```env
STRAVA_CLIENT_ID=your_client_id_here
STRAVA_CLIENT_SECRET=your_client_secret_here
STRAVA_REDIRECT_URI=http://localhost:3001/api/auth/strava/callback
PORT=3001
FRONTEND_URL=http://localhost:3000
```

## Step 4: Start Development Servers

From the root directory:

```bash
npm run dev
```

This will start both:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

Or start them separately:

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

## Step 5: Use the App

1. Open http://localhost:3000 in your browser
2. Click "Connect with Strava"
3. Authorize the app
4. Select your starting city
5. Choose a destination from the suggestions
6. View your journey on the 3D globe!

## Troubleshooting

### Port Already in Use

If port 3000 or 3001 is already in use, you can change them:

- Frontend: Edit `frontend/vite.config.ts` and change the `port` value
- Backend: Edit `backend/.env` and change the `PORT` value

### Strava OAuth Errors

- Make sure your redirect URI in Strava settings matches exactly: `http://localhost:3001/api/auth/strava/callback`
- Check that your Client ID and Secret are correct in `.env`

### Data Not Syncing

- Click the "Sync Activities" button to fetch new activities from Strava
- The app syncs activities since your last sync (or all activities if first time)

