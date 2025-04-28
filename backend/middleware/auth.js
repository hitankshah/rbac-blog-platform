const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

exports.verifyToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required: No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required: Invalid token format' });
    }
    
    try {
      // Create a new authenticated client with the token
      const authenticatedClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: false,
          },
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        }
      );
      
      // Verify the token by getting the user
      const { data, error } = await authenticatedClient.auth.getUser();
      
      if (error) {
        console.error("Token verification failed:", error);
        return res.status(401).json({ 
          message: 'Invalid or expired token', 
          error: error.message 
        });
      }
      
      if (!data.user) {
        return res.status(401).json({ message: 'User not found' });
      }
      
      const user = data.user;
      
      // Get additional user data from our users table (for the role)
      const { data: userData, error: userError } = await authenticatedClient
        .from('users')
        .select('id, name, email, role, verified')
        .eq('id', user.id)
        .single();
        
      if (userError) {
        console.error("User data fetch error:", userError);
        return res.status(404).json({ message: 'User profile not found' });
      }
      
      // Add user details to request
      req.user = {
        id: user.id,
        email: user.email,
        name: userData.name,
        role: userData.role,
        verified: userData.verified
      };
      
      console.log(`Authenticated user: ${req.user.email}, Role: ${req.user.role}`);
      
      next();
    } catch (supabaseError) {
      console.error('Supabase auth error:', supabaseError);
      return res.status(401).json({ message: 'Authentication error', error: supabaseError.message });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(error.status || 500).json({ 
      message: error.message || 'Authentication failed'
    });
  }
};
