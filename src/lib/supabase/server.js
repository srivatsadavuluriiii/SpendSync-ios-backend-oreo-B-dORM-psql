/**
 * Supabase Server Client
 * 
 * Server-side Supabase client for authentication and database operations
 */

const { createClient: createSupabaseClient } = require('@supabase/supabase-js');
const config = require('../../api-gateway/config');

/**
 * Create a Supabase client for server-side operations
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Supabase client
 */
function createClient(req, res) {
  const supabaseUrl = config.security.supabase.url;
  const supabaseKey = config.security.supabase.serviceRoleKey;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration');
  }

  // Create client with service role key for server operations
  const supabase = createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // If we have an authorization header, try to set the user context
  if (req && req.headers.authorization) {
    const token = req.headers.authorization.replace('Bearer ', '');
    if (token) {
      // Set the auth token for this request
      supabase.auth.setSession({
        access_token: token,
        refresh_token: null
      });
    }
  }

  return supabase;
}

/**
 * Create a Supabase client with anon key for public operations
 * @returns {Object} Supabase client
 */
function createAnonClient() {
  const supabaseUrl = config.security.supabase.url;
  const supabaseKey = config.security.supabase.anonKey;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createSupabaseClient(supabaseUrl, supabaseKey);
}

module.exports = {
  createClient,
  createAnonClient
}; 