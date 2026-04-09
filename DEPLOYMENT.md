# Deploying to Hetzner via Coolify

This application is a full-stack Node.js app using Express and Vite. It can be easily deployed to a Hetzner server using Coolify.

## Prerequisites
1. A GitHub repository containing this code.
2. A Coolify instance running on your Hetzner server.
3. A Firebase project (for the database and authentication).
4. A Google Gemini API Key.

## Coolify Configuration

1. **Create a new resource** in Coolify and select your GitHub repository.
2. **Build Pack**: Choose `Nixpacks` or `Dockerfile`. Nixpacks will automatically detect the Node.js environment.
3. **Install Command**: `npm install`
4. **Build Command**: `npm run build`
5. **Start Command**: `npm run start`
6. **Port**: Set the exposed port to `3000`.

## Environment Variables

You must configure the following environment variables in your Coolify project settings:

- `GEMINI_API_KEY`: Your valid Google Gemini API key (Required for AI features).
- `NODE_ENV`: Set to `production`.

### Firebase Configuration
Since this app uses Firebase, you must pass the Firebase configuration via environment variables. The app has been updated to read these from the environment instead of a static file.

Add the following variables to your Coolify environment (you can find these values in your Firebase Console under Project Settings):

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIRESTORE_DATABASE_ID` (If using the default database, this is usually `(default)`)

## Troubleshooting

- **API key not valid**: If you see an error saying "API key not valid", it means your `GEMINI_API_KEY` environment variable is either missing, set to a placeholder (like "your_api_key_here"), or the key itself has been revoked. Ensure you paste a valid key from Google AI Studio into your Coolify environment variables.
- **Database Connection Issues**: Ensure your Firebase security rules allow your domain, or that your `firebase-applet-config.json` is correctly deployed with your code.
