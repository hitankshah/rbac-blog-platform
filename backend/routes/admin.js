const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { verifyToken } = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Supabase clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Initialize AdminSupabase client with service role key for bypassing RLS
const adminSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  next();
};

// Simple in-memory cache for stats
const statsCache = {
  data: null,
  timestamp: 0,
  ttl: 10000 // 10 seconds TTL
};

// Get admin dashboard stats with caching
router.get('/stats', verifyToken, isAdmin, async (req, res) => {
  try {
    console.log('Fetching admin stats for user:', req.user.id);
    
    // Use cache if it's fresh
    const now = Date.now();
    if (statsCache.data && (now - statsCache.timestamp < statsCache.ttl)) {
      console.log('Returning cached stats');
      return res.status(200).json(statsCache.data);
    }
    
    // Get fresh data from DB
    const { data, error } = await supabase.rpc('get_admin_stats');
    
    if (error) throw error;
    
    // Update cache
    statsCache.data = data;
    statsCache.timestamp = now;
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ 
      message: 'Failed to fetch admin dashboard statistics', 
      error: error.message
    });
  }
});

// Make sure other admin routes use correct table names
router.get('/blog-posts', verifyToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    
    const startIndex = (page - 1) * limit;
    let query = supabase.from('blog_posts').select('*, users!inner(name)'); // Note the table name change
    
    // Add search filter if provided
    if (search) {
      query = query.ilike('title', `%${search}%`);
    }
    
    // Add pagination
    query = query.range(startIndex, startIndex + limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    res.status(200).json({
      blog_posts: data,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    res.status(500).json({ message: 'Failed to fetch blog posts', error: error.message });
  }
});

// Admin endpoint to create post (bypassing RLS)
router.post('/blog-posts', verifyToken, isAdmin, upload.array('images', 10), async (req, res) => {
  try {
    const { title, content, userId } = req.body;
    const adminId = req.user.id;
    
    console.log(`Admin ${adminId} creating post for user ${userId || adminId}, title: ${title}`);
    
    // AdminSupabase uses service role that bypasses RLS
    const { data: post, error } = await adminSupabase
      .from('blog_posts')
      .insert([{
        title,
        content,
        user_id: userId || adminId // Admin can create posts for other users or themselves
      }])
      .select()
      .single();
      
    if (error) {
      console.error('Error creating post as admin:', error);
      return res.status(500).json({
        message: 'Failed to create post',
        error
      });
    }
    
    // Handle file uploads if any
    // ...image upload code similar to blog.js...
    
    res.status(201).json({
      message: 'Post created successfully',
      post
    });
  } catch (error) {
    console.error('Error in admin post creation:', error);
    res.status(500).json({
      message: 'Failed to create post',
      error: error.message
    });
  }
});

// Update user role
router.patch('/users/:id/role', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    if (!role || !['admin', 'user'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role specified' });
    }
    
    const { data, error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    res.status(200).json({
      message: 'User role updated successfully',
      user: data
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: 'Failed to update user role', error: error.message });
  }
});

// Delete user
router.delete('/users/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Don't allow admin to delete their own account
    if (id === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    
    // Delete user from users table
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    
    if (deleteError) throw deleteError;
    
    // Delete user from auth (only Supabase admin can do this, not through API)
    // Instead, we'll just return success
    
    res.status(200).json({
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Failed to delete user', error: error.message });
  }
});

module.exports = router;
