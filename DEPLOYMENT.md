# React Invoice App Deployment Guide

## Overview
This application consists of:
- **Frontend**: React app deployed on Vercel
- **Backend**: Node.js/Express API deployed on Render
- **Database**: SQLite (will be persistent on Render)

## Prerequisites
1. GitHub account
2. Render account (https://render.com)
3. Vercel account (https://vercel.com)

## Deployment Steps

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit - React Invoice App"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. Deploy Backend to Render

1. Go to https://render.com/dashboard
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `invoice-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

5. Add Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `10000` (auto-set by Render)
   - `JWT_SECRET`: Generate a secure random string
   - `DATABASE_URL`: `./database/invoice.db`
   - `FRONTEND_URL`: `https://your-vercel-app-url.vercel.app`
   - Add any other environment variables from your `.env` file

6. Deploy and wait for completion
7. Note the backend URL (e.g., `https://invoice-backend-xyz.onrender.com`)

### 3. Deploy Frontend to Vercel

1. Go to https://vercel.com/dashboard
2. Click "New Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Create React App
   - **Root Directory**: `./` (leave empty)
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`

5. Add Environment Variables:
   - `REACT_APP_API_URL`: `https://your-render-backend-url.onrender.com/api`

6. Deploy and wait for completion

### 4. Update CORS Configuration

After both deployments, update the backend environment variable:
- `FRONTEND_URL`: Set to your actual Vercel URL

## Environment Variables Reference

### Backend (.env)
```
NODE_ENV=production
PORT=10000
JWT_SECRET=your-super-secret-jwt-key
DATABASE_URL=./database/invoice.db
FRONTEND_URL=https://your-vercel-app.vercel.app
STRIPE_SECRET_KEY=your-stripe-secret-key
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### Frontend (Vercel Environment Variables)
```
REACT_APP_API_URL=https://your-render-backend.onrender.com/api
REACT_APP_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
```

## Testing the Deployment

1. Visit your Vercel URL
2. Test user registration/login
3. Test invoice creation and management
4. Verify PDF generation works
5. Test payment processing (if Stripe is configured)

## Troubleshooting

### Common Issues:
1. **CORS Errors**: Ensure `FRONTEND_URL` is correctly set in backend
2. **API Not Found**: Check `REACT_APP_API_URL` in Vercel
3. **Database Issues**: Render free tier has ephemeral storage - consider upgrading for persistent data
4. **Build Failures**: Check build logs in respective platforms

### Logs:
- **Render**: View logs in Render dashboard
- **Vercel**: View function logs in Vercel dashboard

## Production Considerations

1. **Database**: Consider upgrading to Render's paid plan for persistent storage
2. **Security**: Ensure all environment variables are properly set
3. **Monitoring**: Set up error tracking (e.g., Sentry)
4. **Backups**: Implement database backup strategy
5. **SSL**: Both platforms provide SSL by default
