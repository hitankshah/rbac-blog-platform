const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { verifyToken } = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Supabase client with anon key (used for public operations)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Create a service role client for admin operations that bypass RLS
const adminSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Create a new blog post
router.post('/', verifyToken, upload.array('images', 10), async (req, res) => {
  try {
    // Log complete request for debugging
    console.log('POST /api/blog - Full request body:', req.body);
    console.log('User from token:', req.user);
    console.log('Files received:', req.files?.length || 0);
    
    // Extract data from request
    const title = req.body.title;
    const content = req.body.content;
    const userId = req.user.id;
    
    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }
    
    console.log('Creating post with title:', title);
    console.log('For user:', userId);
    console.log('User role:', req.user.role);
    
    // For admin users, directly use the REST endpoint without RLS
    if (req.user.role === 'admin') {
      console.log('Using admin bypass for RLS');
      
      // AdminSupabase uses the service role key that bypasses RLS
      const { data: post, error: postError } = await adminSupabase
        .from('blog_posts')
        .insert([{ title, content, user_id: userId }])
        .select()
        .single();
      
      if (postError) {
        console.error('Admin post creation error:', postError);
        return res.status(500).json({ 
          message: 'Failed to create post as admin',
          error: postError 
        });
      }
      
      // Process uploaded files
      // ...existing image handling code...

      return res.status(201).json({
        message: 'Post created successfully by admin',
        post: post
      });
    } 
    // For regular users, use SQL RPC to bypass RLS issues
    else {
      console.log('Using regular user flow with RLS');
      
      // Try inserting with the regular client first (should work if RLS permits)
      const { data: post, error: postError } = await supabase
        .from('blog_posts')
        .insert([{ title, content, user_id: userId }])
        .select()
        .single();
        
      if (postError) {
        console.error('Regular user post creation error:', postError);
        
        // If it fails, try using a stored procedure or direct SQL
        // This would need a stored procedure in your Supabase database
        // that's authorized to insert posts for authenticated users
        const { data: rpcPost, error: rpcError } = await supabase.rpc(
          'create_post_for_user',  // This procedure would need to be created in Supabase
          { 
            p_title: title, 
            p_content: content, 
            p_user_id: userId 
          }
        );
        
        if (rpcError) {
          console.error('RPC post creation error:', rpcError);
          return res.status(500).json({ 
            message: 'Failed to create post via RPC',
            error: rpcError 
          });
        }
        
        // Process uploaded files
        // ...existing image handling code...

        return res.status(201).json({
          message: 'Post created successfully via RPC',
          post: rpcPost
        });
      }
      
      // If original insert worked, continue with that post
      // Process uploaded files
      // ...existing image handling code...

      return res.status(201).json({
        message: 'Post created successfully',
        post: post
      });
    }
  } catch (error) {
    console.error('Error in post creation:', error);
    res.status(500).json({ 
      message: 'Failed to create blog post',
      error: error.message || error
    });
  }
});

// Get blog posts (paginated)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    
    // Calculate pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    // Query posts with pagination and search
    let query = supabase
      .from('blog_posts')
      .select('*, users!inner(name)', { count: 'exact' });
    
    // Add search filter if provided
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }
    
    // Apply pagination
    query = query.range(from, to).order('created_at', { ascending: false });
    
    const { data: posts, error, count } = await query;
    
    if (error) {
      throw error;
    }
    
    // Get images for each post
    const postsWithImages = await Promise.all(posts.map(async (post) => {
      const { data: images, error: imagesError } = await supabase
        .from('blog_images')
        .select('*')
        .eq('post_id', post.id);
        
      if (imagesError) {
        console.error('Error fetching images for post:', post.id, imagesError);
        return { ...post, images: [] };
      }
      
      return { ...post, images: images || [] };
    }));
    
    res.status(200).json({
      posts: postsWithImages,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    res.status(500).json({ 
      message: 'Failed to fetch blog posts',
      error: error.message
    });
  }
});

// Get single blog post by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get post with author info
    const { data: post, error } = await supabase
      .from('blog_posts')
      .select('*, users!inner(name)')
      .eq('id', id)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ message: 'Post not found' });
      }
      throw error;
    }
    
    // Get images for the post
    const { data: images, error: imagesError } = await supabase
      .from('blog_images')
      .select('*')
      .eq('post_id', id);
      
    if (imagesError) {
      console.error('Error fetching post images:', imagesError);
    }
    
    res.status(200).json({
      ...post,
      images: images || []
    });
  } catch (error) {
    console.error('Error fetching blog post:', error);
    res.status(500).json({ 
      message: 'Failed to fetch blog post',
      error: error.message
    });
  }
});

// Update a blog post
router.put('/:id', verifyToken, upload.array('images', 10), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    const userId = req.user.id;
    
    // Choose the appropriate Supabase client based on role
    const client = req.user.role === 'admin' ? adminSupabase : supabase;
    
    // Check if post exists and user has permission
    const { data: existingPost, error: checkError } = await client
      .from('blog_posts')
      .select('user_id')
      .eq('id', id)
      .single();
      
    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return res.status(404).json({ message: 'Post not found' });
      }
      throw checkError;
    }
    
    // For non-admin users, verify ownership
    if (req.user.role !== 'admin' && existingPost.user_id !== userId) {
      return res.status(403).json({ message: 'You do not have permission to update this post' });
    }
    
    // Update the post
    const { data: updatedPost, error: updateError } = await client
      .from('blog_posts')
      .update({ title, content })
      .eq('id', id)
      .select()
      .single();
      
    if (updateError) {
      throw updateError;
    }
    
    // Handle image uploads similar to post creation
    // ...image handling code...
    
    res.status(200).json({
      message: 'Post updated successfully',
      post: updatedPost
    });
  } catch (error) {
    console.error('Error updating blog post:', error);
    res.status(500).json({ 
      message: 'Failed to update blog post',
      error: error.message
    });
  }
});

// Delete a blog post
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Choose the appropriate Supabase client based on role
    const client = req.user.role === 'admin' ? adminSupabase : supabase;
    
    // Check if post exists and user has permission
    const { data: existingPost, error: checkError } = await client
      .from('blog_posts')
      .select('user_id')
      .eq('id', id)
      .single();
      
    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return res.status(404).json({ message: 'Post not found' });
      }
      throw checkError;
    }
    
    // For non-admin users, verify ownership
    if (req.user.role !== 'admin' && existingPost.user_id !== userId) {
      return res.status(403).json({ message: 'You do not have permission to delete this post' });
    }
    
    // Delete the post (will cascade to images due to FK constraint)
    const { error: deleteError } = await client
      .from('blog_posts')
      .delete()
      .eq('id', id);
      
    if (deleteError) {
      throw deleteError;
    }
    
    res.status(200).json({
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting blog post:', error);
    res.status(500).json({ 
      message: 'Failed to delete blog post',
      error: error.message
    });
  }
});

module.exports = router;
