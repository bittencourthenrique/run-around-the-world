# Strava Journey Visualization MVP

Transform your Strava running data into a visual geographic journey on a 3D globe map.

## Features

- Connect with Strava via OAuth
- Select starting city and destination
- Visualize progress on a 3D globe
- Track total distance, time, pace, and elevation

## Setup

1. Install dependencies:
   ```bash
   npm run install:all
   ```

2. Create Strava app at https://www.strava.com/settings/api
   - Get Client ID and Client Secret
   - Set redirect URI to `http://localhost:3001/api/auth/strava/callback`

3. Create `.env` file in `backend/`:
   ```env
   STRAVA_CLIENT_ID=your_client_id
   STRAVA_CLIENT_SECRET=your_client_secret
   STRAVA_REDIRECT_URI=http://localhost:3001/api/auth/strava/callback
   PORT=3001
   FRONTEND_URL=http://localhost:3000
   ```

4. Start development servers:
   ```bash
   npm run dev
   ```

   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001

## Project Structure

- `frontend/` - React + TypeScript + Vite frontend
- `backend/` - Express + TypeScript backend
- `backend/src/data/` - JSON file storage (gitignored)

