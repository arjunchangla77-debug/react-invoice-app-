/**
 * EnamelPure Lune Laser Management System
 * Main Application Component
 * 
 * This is the root component that sets up routing, authentication,
 * theme management, and global application state.
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Context Providers for global state management
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';

// Global utilities and message handling
import { patchGlobalMessages } from './utils/globalMessagePatch';
import MessageSuppressor from './components/MessageSuppressor';

// Layout and core components
import Layout from './components/Layout';

// Authentication components
import Login from './components/Login';
import Register from './components/Register';
import ResetPassword from './components/ResetPassword';
import EmailSent from './components/EmailSent';

// Main application pages
import Dashboard from './components/Dashboard';
import CreateOffice from './components/CreateOffice';
import OfficeDetail from './components/OfficeDetail';
import LuneDetail from './components/LuneDetail';
import AdminPanel from './components/AdminPanel';
import AddLune from './components/AddLune';
import DentalOffices from './components/DentalOffices';
import LuneMachines from './components/LuneMachines';

// Invoice management components
import Invoices from './components/Invoices';
import CreateInvoice from './components/CreateInvoice';
import GenerateUsageInvoice from './components/GenerateUsageInvoice';
import ProfessionalInvoice from './components/ProfessionalInvoice';
import InvoiceViewer from './components/InvoiceViewer';

// User and payment components
import Profile from './components/Profile';
import StripePayment from './components/StripePayment';
import PaymentSuccess from './components/PaymentSuccess';
import PaymentCancel from './components/PaymentCancel';
import PublicPayment from './components/PublicPayment';

// Custom hooks
import useThemeSync from './hooks/useThemeSync';

/**
 * Theme Sync Component
 * Handles automatic theme synchronization across the application
 */
const ThemeSync = () => {
  useThemeSync();
  return null; // This component doesn't render anything, just handles theme sync
};

/**
 * Protected Route Component
 * Wraps routes that require authentication
 * Redirects to login if user is not authenticated
 * Shows loading spinner while authentication state is being determined
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  // Show loading spinner while checking authentication status
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

/**
 * Public Route Component
 * Wraps routes that should only be accessible when NOT authenticated
 * Redirects to dashboard if user is already logged in
 */
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  // Show loading spinner while checking authentication status
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  // Redirect to dashboard if already authenticated, otherwise show the public route
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

/**
 * Main App Component
 * Sets up the application with all necessary providers and routing
 */
function App() {
  // Initialize global message patch for notification handling
  React.useEffect(() => {
    patchGlobalMessages();
  }, []);

  return (
    // Wrap the entire app with context providers for global state management
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <MessageSuppressor>
            <Router>
              <div className="App">
                {/* Theme synchronization component */}
                <ThemeSync />
                <Routes>
                  {/* ===== PUBLIC ROUTES (accessible without authentication) ===== */}
                  {/* User Authentication Routes */}
                  <Route 
                    path="/login" 
                    element={
                      <PublicRoute>
                        <Login />
                      </PublicRoute>
                    } 
                  />
                  <Route 
                    path="/register" 
                    element={
                      <PublicRoute>
                        <Register />
                      </PublicRoute>
                    } 
                  />
                <Route 
                  path="/reset-password" 
                  element={
                    <PublicRoute>
                      <ResetPassword />
                    </PublicRoute>
                  } 
                />
                <Route 
                  path="/email-sent" 
                  element={
                    <PublicRoute>
                      <EmailSent />
                    </PublicRoute>
                  } 
                />
                
                {/* Public Payment Route (no authentication required) */}
                <Route 
                  path="/pay/:invoiceId" 
                  element={<PublicPayment />} 
                />
                
                {/* Protected Routes with Layout */}
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Dashboard />
                      </Layout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/create-office" 
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <CreateOffice />
                      </Layout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/office/:id" 
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <OfficeDetail />
                      </Layout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/lune/:id" 
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <LuneDetail />
                      </Layout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/add-lune/:officeId" 
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <AddLune />
                      </Layout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin" 
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <AdminPanel />
                      </Layout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/offices" 
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <DentalOffices />
                      </Layout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/lunes" 
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <LuneMachines />
                      </Layout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/invoices" 
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Invoices />
                      </Layout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/generate-invoice/:officeId" 
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <CreateInvoice />
                      </Layout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/generate-usage-invoice/:officeId" 
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <GenerateUsageInvoice />
                      </Layout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/professional-invoice/:officeId" 
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <ProfessionalInvoice />
                      </Layout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/profile" 
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Profile />
                      </Layout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/payment/:invoiceId" 
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <StripePayment />
                      </Layout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/payment/success" 
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <PaymentSuccess />
                      </Layout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/payment/cancel" 
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <PaymentCancel />
                      </Layout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/invoice/:invoiceId" 
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <InvoiceViewer />
                      </Layout>
                    </ProtectedRoute>
                  } 
                />
                
                {/* Default Route */}
                <Route path="/" element={<Navigate to="/login" replace />} />
                
                {/* Catch-all Route */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </div>
          </Router>
          </MessageSuppressor>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
