const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { 
  supabase,
  adminSupabase, 
  uploadFileToStorage, 
  ensureBucketExists 
} = require('../utils/storageConfig');

// Initialize the storage bucket on server startup
ensureBucketExists().then(success => {
  if (success) {
    console.log('Storage bucket ready for use');
  } else {
    console.error('Failed to ensure storage bucket exists, uploads may not work correctly');
  }
});

// Create a new blog post
router.post('/', verifyToken, upload.array('images', 10), async (req, res) => {
  try {
    // Debug request information
    console.log('POST /api/blog');
    console.log('Request body type:', typeof req.body);
    console.log('Request Content-Type:', req.get('Content-Type'));
    console.log('Request body keys:', Object.keys(req.body));
    console.log('User ID:', req.user?.id);
    console.log('User role:', req.user?.role);
    console.log('Files received:', req.files?.length || 0);
    
    // Extract data from request
    const { title, content } = req.body;
    
    // Check required fields
    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }
    
    // Direct database insert approach with service role client
    const { data: post, error: insertError } = await adminSupabase
      .from('blog_posts')
      .insert({
        title,
        content,
        user_id: req.user.id
      })
      .select('*')
      .single();
    
    // Handle insert error
    if (insertError) {
      console.error('Database insert error:', insertError);
      return res.status(500).json({ 
        message: 'Failed to create post',
        error: insertError
      });
    }
    
    console.log('Post created with ID:', post.id);
    
    // Process images if any
    const uploadedImages = [];
    if (req.files && req.files.length > 0) {
      console.log(`Processing ${req.files.length} images`);
      
      for (const file of req.files) {
        try {
          const fileExt = file.originalname.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
          const filePath = `${post.id}/${fileName}`;
          
          // Use the utility function to upload the file
          const imageData = await uploadFileToStorage(file, filePath);
          
          // Insert image record in database
          const { data: dbImage, error: imageError } = await adminSupabase
            .from('blog_images')
            .insert({
              post_id: post.id,
              file_name: file.originalname,
              file_path: filePath,
              url: imageData.url,
              content_type: file.mimetype
            })
            .select()
            .single();
            
          if (imageError) {
            console.error('Image database record error:', imageError);
            continue;
          }
          
          uploadedImages.push(dbImage);
        } catch (fileError) {
          console.error('Error processing file:', fileError);
        }
      }
    }
    
    return res.status(201).json({
      message: 'Post created successfully',
      post: {
        ...post,
        images: uploadedImages
      }
    });
  } catch (error) {
    console.error('Unhandled error in post creation:', error);
    return res.status(500).json({
      message: 'An unexpected error occurred',
      error: error.message || String(error)
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
    let imagesToDelete = [];
    
    // Check if there are images to delete
    if (req.body.imagesToDelete) {
      try {
        imagesToDelete = JSON.parse(req.body.imagesToDelete);
        if (!Array.isArray(imagesToDelete)) {
          imagesToDelete = [];
        }
      } catch (e) {
        console.error('Error parsing imagesToDelete:', e);
      }
    }
    
    console.log(`PUT /blog/${id} - Update post`);
    console.log('Images to delete:', imagesToDelete);
    console.log('New images to upload:', req.files?.length || 0);
    
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
    
    // Delete the selected images if any
    if (imagesToDelete.length > 0) {
      // First get the file paths so we can delete from storage
      const { data: imagesToRemove, error: fetchError } = await client
        .from('blog_images')
        .select('id, file_path')
        .in('id', imagesToDelete);
      
      if (!fetchError && imagesToRemove?.length > 0) {
        // Delete the files from storage
        for (const img of imagesToRemove) {
          const { error: storageError } = await adminSupabase
            .storage
            .from('blog-images')
            .remove([img.file_path]);
            
          if (storageError) {
            console.error(`Error deleting image file ${img.file_path}:`, storageError);
          }
        }
        
        // Delete the database records
        const { error: deleteImagesError } = await client
          .from('blog_images')
          .delete()
          .in('id', imagesToDelete);
          
        if (deleteImagesError) {
          console.error('Error deleting image records:', deleteImagesError);
        }
      }
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
    
    // Process new images if any
    const newImages = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const fileExt = file.originalname.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
          const filePath = `${id}/${fileName}`;
          
          // Use the utility function to upload the file
          const imageData = await uploadFileToStorage(file, filePath);
          
          // Insert image record in database
          const { data: dbImage, error: imageError } = await adminSupabase
            .from('blog_images')
            .insert({
              post_id: id,
              file_name: file.originalname,
              file_path: filePath,
              url: imageData.url,
              content_type: file.mimetype
            })
            .select()
            .single();
            
          if (imageError) {
            console.error('Image database record error:', imageError);
            continue;
          }
          
          newImages.push(dbImage);
        } catch (fileError) {
          console.error('Error processing file:', fileError);
        }
      }
    }
    
    // Get all current images for the post after updates
    const { data: currentImages, error: imagesError } = await client
      .from('blog_images')
      .select('*')
      .eq('post_id', id);
    
    res.status(200).json({
      message: 'Post updated successfully',
      post: {
        ...updatedPost,
        images: currentImages || []
      },
      newImages
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
