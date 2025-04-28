const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { verifyToken } = require('../middleware/auth');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
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

// Get admin dashboard stats
router.get('/stats', verifyToken, isAdmin, async (req, res) => {
  try {
    console.log('Fetching admin stats for user:', req.user.id);

    // Get total number of users
    const { count: usersCount, error: usersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (usersError) throw usersError;

    // Get total number of posts
    const { count: postsCount, error: postsError } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true });

    if (postsError) throw postsError;

    // Get new users created in the last week
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastWeekIsoString = lastWeek.toISOString();

    const { count: newUsersCount, error: newUsersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', lastWeekIsoString);

    if (newUsersError) throw newUsersError;

    // Get new posts created in the last week
    const { count: newPostsCount, error: newPostsError } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', lastWeekIsoString);

    if (newPostsError) throw newPostsError;

    // Return stats
    res.status(200).json({
      totalUsers: usersCount,
      totalPosts: postsCount,
      newUsersThisWeek: newUsersCount,
      newPostsThisWeek: newPostsCount,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ 
      message: 'Failed to fetch admin dashboard statistics', 
      error: error.message
    });
  }
});

// Get all users with pagination
router.get('/users', verifyToken, isAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const startIndex = (page - 1) * limit;
    
    let query = supabase
      .from('users')
      .select('*', { count: 'exact' });
    
    // Add search filter if provided
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }
    
    // Add pagination
    query = query.range(startIndex, startIndex + limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    res.status(200).json({
      users: data,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users', error: error.message });
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
