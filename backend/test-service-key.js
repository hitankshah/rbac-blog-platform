// Script to test if the service key is working correctly
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testServiceKey() {
  console.log('Testing Supabase Service Key');
  console.log('--------------------------');
  
  // Check if key is defined
  console.log('Service key exists in env:', !!process.env.SUPABASE_SERVICE_KEY);
  
  // Create a client with the service key
  const adminSupabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  
  try {
    // Test by creating a blog post
    const { data, error } = await adminSupabase
      .from('blog_posts')
      .insert({
        title: 'Test post via service key',
        content: 'This is a test post created using the service key',
        user_id: '00000000-0000-0000-0000-000000000000' // You may need to replace with a valid UUID
      })
      .select();
      
    if (error) {
      console.log('❌ Test failed - Error:', error);
    } else {
      console.log('✅ Test successful!');
      console.log('Created post:', data);
      
      // Clean up - delete test post
      const { error: deleteError } = await adminSupabase
        .from('blog_posts')
        .delete()
        .eq('id', data[0].id);
        
      if (deleteError) {
        console.log('⚠️ Warning: Could not delete test post:', deleteError);
      } else {
        console.log('✅ Test post deleted successfully');
      }
    }
  } catch (err) {
    console.log('❌ Test failed with exception:', err);
  }
}

testServiceKey();
