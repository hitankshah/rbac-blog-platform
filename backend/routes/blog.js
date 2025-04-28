const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const multer = require('multer');
const { createClient } = require("@supabase/supabase-js");
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Get all blog posts (public) with pagination
router.get("/", async function(req, res) {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const startIndex = (page - 1) * limit

    // Get total count
    const { count } = await supabase
      .from("blog_posts")
      .select("*", { count: "exact", head: true })

    // Updated query using the correct foreign key relationship
    const { data: posts, error } = await supabase
      .from("blog_posts")
      .select(`
        id,
        title,
        content,
        created_at,
        updated_at,
        users:user_id (
          id,
          name,
          role
        )
      `)
      .order("created_at", { ascending: false })
      .range(startIndex, startIndex + limit - 1)

    if (error) throw error

    const transformedPosts = posts.map(post => ({
      ...post,
      author: post.users,
      users: undefined
    }))

    res.status(200).json({
      posts: transformedPosts,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    })
  } catch (error) {
    console.error("Error:", error)
    res.status(error.status || 500).json({ 
      message: error.message || "Server error",
      code: error.code
    })
  }
})

// Get a single blog post (public)
router.get("/:id", async function(req, res) {
  try {
    const { data: post, error } = await supabase
      .from("blog_posts")
      .select(`
        *,
        author:user_id (
          id,
          name,
          role
        )
      `)
      .eq("id", req.params.id)
      .single();

    if (error) throw error;

    // Get the post's image URLs if any
    const { data: images, error: imageError } = await supabase
      .from("blog_images")
      .select("*")
      .eq("post_id", post.id);

    if (imageError) throw imageError;

    // Add images to the post
    post.images = images || [];

    res.status(200).json(post);
  } catch (error) {
    console.error("Error:", error);
    res.status(error.status || 500).json({ 
      message: error.message || "Server error",
      code: error.code
    });
  }
});

// Create a new blog post with image upload (admin only)
router.post("/", auth.verifyToken, roleAuth(["admin"]), upload.array('images', 5), async function(req, res) {
  try {
    const { title, content } = req.body;
    const files = req.files || [];

    if (!title || !content) {
      throw { status: 400, message: "Title and content are required" };
    }

    // Insert the post
    const { data: post, error } = await supabase
      .from("blog_posts")
      .insert([
        {
          title,
          content,
          user_id: req.user.id,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Upload images if any
    const imageRecords = [];
    for (const file of files) {
      const fileExt = path.extname(file.originalname);
      const fileName = `${uuidv4()}${fileExt}`;
      const filePath = `${post.id}/${fileName}`;

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase
        .storage
        .from(process.env.STORAGE_BUCKET)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase
        .storage
        .from(process.env.STORAGE_BUCKET)
        .getPublicUrl(filePath);

      // Add image record
      const { data: imageRecord, error: imageError } = await supabase
        .from("blog_images")
        .insert([
          {
            post_id: post.id,
            file_name: fileName,
            file_path: filePath,
            url: urlData.publicUrl,
            content_type: file.mimetype
          }
        ])
        .select()
        .single();

      if (imageError) throw imageError;
      
      imageRecords.push(imageRecord);
    }

    // Get complete post with author details
    const { data: completePost, error: fetchError } = await supabase
      .from("blog_posts")
      .select(`
        *,
        author:user_id (
          id,
          name,
          role
        )
      `)
      .eq("id", post.id)
      .single();

    if (fetchError) throw fetchError;

    // Add images to the response
    completePost.images = imageRecords;

    res.status(201).json(completePost);
  } catch (error) {
    console.error("Error:", error);
    res.status(error.status || 500).json({ 
      message: error.message || "Server error",
      code: error.code
    });
  }
});

// Update a blog post (admin and author only)
router.put("/:id", auth.verifyToken, upload.array('images', 5), async function(req, res) {
  try {
    const { id } = req.params
    const { title, content } = req.body
    const files = req.files || []

    if (!title || !content) {
      throw { status: 400, message: "Title and content are required" }
    }

    // Check if user is admin or author
    const { data: post } = await supabase
      .from("blog_posts")
      .select("user_id")
      .eq("id", id)
      .single()

    if (!post) {
      throw { status: 404, message: "Post not found" }
    }

    if (req.user.role !== "admin" && post.user_id !== req.user.id) {
      throw { status: 403, message: "Unauthorized to edit this post" }
    }

    // Update the post
    const { data: updatedPost, error } = await supabase
      .from("blog_posts")
      .update({ title, content })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    // Upload new images if any
    const imageRecords = [];
    for (const file of files) {
      const fileExt = path.extname(file.originalname);
      const fileName = `${uuidv4()}${fileExt}`;
      const filePath = `${id}/${fileName}`;

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase
        .storage
        .from(process.env.STORAGE_BUCKET)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase
        .storage
        .from(process.env.STORAGE_BUCKET)
        .getPublicUrl(filePath);

      // Add image record
      const { data: imageRecord, error: imageError } = await supabase
        .from("blog_images")
        .insert([
          {
            post_id: id,
            file_name: fileName,
            file_path: filePath,
            url: urlData.publicUrl,
            content_type: file.mimetype
          }
        ])
        .select()
        .single();

      if (imageError) throw imageError;
      
      imageRecords.push(imageRecord);
    }

    // Get complete updated post with author details
    const { data: completePost, error: fetchError } = await supabase
      .from("blog_posts")
      .select(`
        *,
        author:user_id (
          id,
          name,
          role
        )
      `)
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    // Get existing images
    const { data: existingImages, error: imagesError } = await supabase
      .from("blog_images")
      .select("*")
      .eq("post_id", id);

    if (imagesError) throw imagesError;

    // Add all images to the response
    completePost.images = [...(existingImages || []), ...imageRecords];

    res.status(200).json(completePost)
  } catch (error) {
    console.error("Error:", error)
    res.status(error.status || 500).json({ 
      message: error.message || "Server error",
      code: error.code
    })
  }
})

// Delete an image from a blog post
router.delete("/:postId/images/:imageId", auth.verifyToken, async function(req, res) {
  try {
    const { postId, imageId } = req.params;

    // Check if user is admin or author
    const { data: post } = await supabase
      .from("blog_posts")
      .select("user_id")
      .eq("id", postId)
      .single();

    if (!post) {
      throw { status: 404, message: "Post not found" };
    }

    if (req.user.role !== "admin" && post.user_id !== req.user.id) {
      throw { status: 403, message: "Unauthorized to edit this post" };
    }

    // Get image info
    const { data: image, error: imageError } = await supabase
      .from("blog_images")
      .select("*")
      .eq("id", imageId)
      .eq("post_id", postId)
      .single();

    if (imageError || !image) {
      throw { status: 404, message: "Image not found" };
    }

    // Delete from storage
    const { error: storageError } = await supabase
      .storage
      .from(process.env.STORAGE_BUCKET)
      .remove([image.file_path]);

    if (storageError) throw storageError;

    // Delete from database
    const { error: deleteError } = await supabase
      .from("blog_images")
      .delete()
      .eq("id", imageId);

    if (deleteError) throw deleteError;

    res.status(200).json({ message: "Image deleted successfully" });
  } catch (error) {
    console.error("Error:", error);
    res.status(error.status || 500).json({ 
      message: error.message || "Server error",
      code: error.code
    });
  }
});

// Delete a blog post (admin and author only)
router.delete("/:id", auth.verifyToken, async function(req, res) {
  try {
    const { id } = req.params;

    // Check if user is admin or author
    const { data: post } = await supabase
      .from("blog_posts")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!post) {
      throw { status: 404, message: "Post not found" };
    }

    if (req.user.role !== "admin" && post.user_id !== req.user.id) {
      throw { status: 403, message: "Unauthorized to delete this post" };
    }

    // Get all images
    const { data: images } = await supabase
      .from("blog_images")
      .select("file_path")
      .eq("post_id", id);

    // Delete all images from storage
    if (images && images.length > 0) {
      const filePaths = images.map(img => img.file_path);
      await supabase
        .storage
        .from(process.env.STORAGE_BUCKET)
        .remove(filePaths);
    }

    // Delete all image records
    await supabase
      .from("blog_images")
      .delete()
      .eq("post_id", id);

    // Delete the post
    const { error } = await supabase
      .from("blog_posts")
      .delete()
      .eq("id", id)

    if (error) throw error

    res.status(200).json({ message: "Post deleted successfully" })
  } catch (error) {
    console.error("Error:", error)
    res.status(error.status || 500).json({ 
      message: error.message || "Server error",
      code: error.code
    })
  }
})

module.exports = router;
