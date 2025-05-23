const { createServerClient } = require('@supabase/ssr');

async function updateSession(req, res, next) {
  const supabase = createServerClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          // Get all cookies from request
          const cookies = req.headers.cookie;
          if (!cookies) return [];
          
          return cookies.split(';').map(cookie => {
            const [name, value] = cookie.trim().split('=');
            return { name, value };
          });
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Set cookies in response
            const cookieOptions = {
              httpOnly: options?.httpOnly || true,
              secure: options?.secure || process.env.NODE_ENV === 'production',
              sameSite: options?.sameSite || 'lax',
              maxAge: options?.maxAge,
              path: options?.path || '/'
            };
            
            res.cookie(name, value, cookieOptions);
          });
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  try {
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    if (error) {
      console.warn('Supabase auth error:', error.message);
    }

    // Attach user and supabase client to request
    req.user = user;
    req.supabase = supabase;
    
    next();
  } catch (error) {
    console.error('Session update error:', error);
    req.user = null;
    req.supabase = supabase;
    next();
  }
}

module.exports = { updateSession }; 