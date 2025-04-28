import axios from 'axios';

const API_URL = 'http://localhost:5000';

// Create an axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to attach auth token and handle different content types
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      // Prevent sending requests that require auth if token is missing
      if (
        config.url.startsWith('/api/auth/me') ||
        config.url.startsWith('/api/admin/')
      ) {
        throw new axios.Cancel('No auth token, request cancelled');
      }
    }
    
    // Make sure content type is correctly set based on data type
    if (config.data instanceof FormData) {
      // Don't set Content-Type for FormData, browser will set it with the boundary
      delete config.headers['Content-Type'];
    } else if (typeof config.data === 'object' && config.data !== null) {
      config.headers['Content-Type'] = 'application/json';
    }
    
    // For debugging
    console.log(`Request to ${config.url} with Content-Type: ${config.headers['Content-Type']}`);
    if (config.data) {
      console.log('Request body:', config.data);
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for handling auth errors
api.interceptors.response.use(
  (response) => {
    console.log(`Response from ${response.config.url} - Status: ${response.status}`);
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    
    if (error.response) {
      console.error('Error data:', error.response.data);
      
      // If unauthorized due to invalid token, trigger logout
      if (error.response.status === 401 && 
          (error.config.url.includes('/api/auth/me') || error.config.url.includes('/api/admin/'))) {
        console.log('Session invalid, logging out');
        
        // Clear local storage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Redirect to login page if not already there
        if (!window.location.pathname.includes('/login')) {
          // Use a small delay to avoid potential redirect loops
          setTimeout(() => {
            window.location.href = '/login?session=expired';
          }, 100);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authService = {
  login: (email, password) => api.post('/api/auth/login', { email, password }),
  
  register: (userData) => {
    // Ensure userData is correctly formatted
    console.log('Register payload:', userData);
    return api.post('/api/auth/register', userData);
  },
  getCurrentUser: () => api.get('/api/auth/me'),
  sendVerification: (email) => api.post('/api/auth/send-verification', { email }),
  resetPassword: (email) => api.post('/api/auth/reset-password', { email }),
  confirmResetPassword: (token, password) => api.post('/api/auth/reset-password/confirm', { token, password }),
  logout: () => api.post('/api/auth/logout'),
  verifyToken: (token) => api.post('/api/auth/verify-token', { token }),
};

// Blog API
export const blogService = {
  // Changed from getAllPosts to getPosts to be consistent
  getPosts: (page = 1, limit = 10, search = '') => 
    api.get(`/api/blog?page=${page}&limit=${limit}&search=${search}`),
  getPost: (id) => api.get(`/api/blog/${id}`),
  createPost: (postData) => api.post('/api/blog', postData),
  updatePost: (id, postData) => api.put(`/api/blog/${id}`, postData),
  deletePost: (id) => api.delete(`/api/blog/${id}`),
};

// Add debounce utility
const debounce = (fn, delay) => {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay);
  };
};

// Tracking pending requests to avoid duplicates
const pendingRequests = {};

// Admin API with enhanced methods
export const adminService = {
  getStats: (() => {
    let promise = null;
    let lastCallTime = 0;
    
    return async function() {
      // Return existing promise if a request is in progress
      if (promise && Date.now() - lastCallTime < 2000) {
        return promise;
      }
      
      lastCallTime = Date.now();
      promise = api.get('/api/admin/stats');
      
      try {
        const result = await promise;
        return result;
      } finally {
        // Reset after a short delay to allow for component cleanup
        setTimeout(() => {
          promise = null;
        }, 100);
      }
    };
  })(),
  
  // ...other methods with normal implementation
  getUsers: (page = 1, limit = 10, search = '') => 
    api.get(`/api/admin/users?page=${page}&limit=${limit}&search=${search}`),
  updateUserRole: (userId, role) => 
    api.patch(`/api/admin/users/${userId}/role`, { role }),
  deleteUser: (userId) => api.delete(`/api/admin/users/${userId}`),
  createAdmin: (userData) => api.post('/api/admin/create-admin', userData),
  getPosts: (page = 1, limit = 10, search = '') => 
    api.get(`/api/admin/blog-posts?page=${page}&limit=${limit}&search=${search}`),
};

// For backwards compatibility, also export the services under the names used before
export const auth = authService;
export const blog = blogService;
export const admin = adminService;

export default api;
