# EnamelPure Invoice Management System

A modern, full-stack React application for managing invoices with authentication and dark/light theme support.

## Quick Start

### Prerequisites
- Node.js v14 or higher
- npm or yarn package manager

### Installation

1. Clone the repository and navigate to the project directory:
```bash
git clone <repository-url>
cd react-invoice-app
```

2. Install all dependencies (frontend + backend):
```bash
npm run install-all
```

3. Set up environment files:
```bash
# Frontend
cp .env.example .env

# Backend
cp backend/.env.example backend/.env
```

4. Configure environment variables:
   - Update `backend/.env` with your database and email settings
   - The default frontend `.env` should work for local development

5. Start the application:
```bash
npm start
```

This will start:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`

## Available Commands

From the root directory:
- `npm start` - Start both frontend and backend
- `npm run client` - Start only the frontend
- `npm run server` - Start only the backend
- `npm run build` - Build frontend for production

## Features

- User authentication (register, login, password reset)
- Invoice management with search
- Dark/light theme support
- Export to PDF/CSV
- Responsive design
- `GET /health` - Server health status

## 🎨 Theme System

The application features a global theme system with:

- **Persistent Storage**: Theme preference saved in localStorage
- **System Detection**: Automatic dark/light mode based on system preference
- **Global Context**: Theme state shared across all components
- **Smooth Transitions**: 300ms transition animations
- **Consistent Styling**: Unified dark/light mode across all pages

## 📱 Pages & Components

### Authentication Pages
- **Login Page**: Sign in with theme toggle
- **Registration**: Create new account
- **Password Reset**: Forgot password flow

### Main Application
- **Dashboard**: Invoice overview with search and theme toggle
- **Invoice Detail**: Complete invoice information with export options

### Key Components
- **AuthContext**: Global authentication state management
- **ThemeContext**: Global theme state management
- **ProtectedRoute**: Route protection for authenticated users
- **PublicRoute**: Route handling for non-authenticated users

## 🔧 Development

### Available Scripts

#### Frontend
```bash
npm start          # Start development server
npm run build      # Build for production
npm test           # Run tests
npm run eject      # Eject from Create React App
```

#### Backend
```bash
npm start          # Start server with nodemon
npm run dev        # Development mode with auto-restart
npm test           # Run tests (if configured)
```

### Code Structure
```
react-invoice-app/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── database/
│   ├── middleware/
│   ├── routes/
│   ├── scripts/
│   └── server.js
├── src/
│   ├── components/
│   ├── context/
│   ├── services/
│   └── App.js
├── public/
└── package.json
```

##  Deployment

### Backend Deployment
1. Set environment variables for production
2. Configure database path
3. Set up email service credentials
4. Deploy to your preferred hosting service (Heroku, Railway, etc.)

### Frontend Deployment
1. Update `REACT_APP_API_URL` to production backend URL
2. Build the application: `npm run build`
3. Deploy the `build` folder to hosting service (Netlify, Vercel, etc.)

##  Security Features

- **JWT Authentication** with secure token handling
- **Password Hashing** with bcrypt
- **Rate Limiting** to prevent abuse
- **CORS Protection** for cross-origin requests
- **Security Headers** with Helmet middleware
- **Input Validation** and sanitization
- **Protected Routes** with authentication checks

##  License

This project is licensed under the MIT License.

##  Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

**Built with using React, Node.js, and modern web technologies**
