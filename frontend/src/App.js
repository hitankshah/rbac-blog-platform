import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layout components
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';

// Public pages
import Home from './components/home/HomePage';
import BlogList from './components/blog/BlogList';
import BlogDetail from './components/blog/BlogDetail';
import About from './components/pages/About';
import Contact from './components/pages/Contact';
import NotFound from './components/layout/NotFound';

// Authentication pages
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';

// User pages
import Profile from './components/user/Profile';

// Admin pages
import AdminLayout from './components/admin/AdminLayout';
import Dashboard from './components/admin/Dashboard';
import UserManagement from './components/admin/UserManagement';
import PostForm from './components/admin/PostForm';

// Protected route component
const ProtectedRoute = ({ element, requiredRole }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && currentUser.role !== requiredRole) {
    // Redirect non-admin users to home page
    return <Navigate to="/" replace />;
  }

  return element;
};

// Main application routes
const AppRoutes = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // Auto-redirect logged in users based on role
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'admin' && window.location.pathname === '/login') {
        navigate('/admin/dashboard');
      }
    }
  }, [currentUser]);

  return (
    <>
      <Header />
      <main className="main-content">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/blog" element={<BlogList />} />
          <Route path="/blog/:id" element={<BlogDetail />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* User Routes */}
          <Route 
            path="/profile" 
            element={<ProtectedRoute element={<Profile />} />} 
          />
          
          {/* Admin Routes with AdminLayout */}
          <Route 
            path="/admin" 
            element={<ProtectedRoute element={<AdminLayout />} requiredRole="admin" />}
          >
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="posts" element={<PostForm />} />
            <Route path="posts/:id" element={<PostForm />} />
            {/* Default redirect for /admin */}
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
          </Route>
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
