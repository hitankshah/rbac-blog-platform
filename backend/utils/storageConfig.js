// Supabase storage configuration with S3 credentials
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Regular client for normal operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Admin client for operations that need to bypass RLS
const adminSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// S3 storage configuration
const storageConfig = {
  bucketName: process.env.STORAGE_BUCKET || 'blog-images',
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
  }
};

// Function to upload a file to S3 storage
const uploadFileToStorage = async (file, filePath) => {
  try {
    const { data, error } = await adminSupabase
      .storage
      .from(storageConfig.bucketName)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) {
      console.error('Storage upload error:', error);
      throw error;
    }

    // Get the public URL
    const { data: urlData } = adminSupabase
      .storage
      .from(storageConfig.bucketName)
      .getPublicUrl(filePath);

    return {
      path: filePath,
      url: urlData.publicUrl,
      contentType: file.mimetype,
      fileName: file.originalname
    };
  } catch (error) {
    console.error('File upload failed:', error);
    throw error;
  }
};

// Function to ensure the bucket exists
const ensureBucketExists = async () => {
  try {
    const { data: buckets, error: bucketsError } = await adminSupabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
      return false;
    }
    
    if (!buckets.find(b => b.name === storageConfig.bucketName)) {
      console.log(`Creating bucket: ${storageConfig.bucketName}`);
      const { error: createError } = await adminSupabase.storage.createBucket(storageConfig.bucketName, {
        public: true,
        fileSizeLimit: 10485760 // 10MB
      });
      
      if (createError) {
        console.error('Error creating bucket:', createError);
        return false;
      }
      
      console.log(`Bucket ${storageConfig.bucketName} created successfully`);
    } else {
      console.log(`Bucket ${storageConfig.bucketName} already exists`);
    }
    
    return true;
  } catch (error) {
    console.error('Error checking/creating bucket:', error);
    return false;
  }
};

module.exports = {
  supabase,
  adminSupabase,
  storageConfig,
  uploadFileToStorage,
  ensureBucketExists
};