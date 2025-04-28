const checkRequiredEnvVars = () => {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_JWT_SECRET'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('ERROR: Missing required environment variables:');
    missing.forEach(key => console.error(`- ${key}`));
    return false;
  }
  
  return true;
};

module.exports = { checkRequiredEnvVars };
