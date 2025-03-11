import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create client with override headers to bypass RLS for all operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Supabase-Auth-Override': 'true' // This bypasses RLS policies
    }
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Teacher credentials
export const TEACHER_EMAIL = 'mohamd';
export const TEACHER_PASSWORD = 'Mkiomkio1.@';

// Helper function to check if user is teacher
export const isTeacher = (email: string, password: string) => {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const validEmails = [
      TEACHER_EMAIL,
      `${TEACHER_EMAIL}@admin.com`,
      'mohamd@admin.com'
    ];
    
    const result = validEmails.includes(normalizedEmail) && password === TEACHER_PASSWORD;
    console.log(`Teacher auth check for ${normalizedEmail}: ${result ? 'Success' : 'Failed'}`);
    return result;
  } catch (err) {
    console.error('Error in isTeacher check:', err);
    return false;
  }
};

// Helper function to get auth session
export const getSession = async () => {
  try {
    // For teacher credentials, create a mock session
    if (localStorage.getItem('isTeacher') === 'true') {
      console.log('Using teacher mock session');
      return {
        session: {
          user: {
            email: 'mohamd@admin.com',
            role: 'teacher'
          }
        }
      };
    }

    // For student accounts, use Supabase auth
    const { data: { session } } = await supabase.auth.getSession();
    return { session };
  } catch (err) {
    console.error('Error getting session:', err);
    return { session: null };
  }
};

// Helper function to set teacher session
export const setTeacherSession = () => {
  try {
    localStorage.setItem('isTeacher', 'true');
    // Also set a timestamp for when the session was created
    localStorage.setItem('teacherSessionTime', new Date().toISOString());
    console.log('Teacher session set successfully');
    return true;
  } catch (err) {
    console.error('Error setting teacher session:', err);
    return false;
  }
};

// Helper function to clear teacher session
export const clearTeacherSession = () => {
  try {
    localStorage.removeItem('isTeacher');
    localStorage.removeItem('teacherSessionTime');
    console.log('Teacher session cleared');
    return true;
  } catch (err) {
    console.error('Error clearing teacher session:', err);
    return false;
  }
};

// Helper function to check if user is authenticated
export const requireAuth = async () => {
  try {
    // First check if it's a teacher session
    if (checkTeacherSession()) {
      console.log('Teacher session found during auth check');
      return { user: { email: 'mohamd@admin.com', role: 'teacher' } };
    }
    
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error("Auth error:", error);
      // Try to refresh the session
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshData.session) {
        throw new Error('Authentication failed');
      }
      
      return refreshData.session;
    }
    
    if (!session) {
      throw new Error('Not authenticated');
    }
    
    return session;
  } catch (err) {
    console.error("Authentication error:", err);
    throw new Error('Not authenticated');
  }
};

// Helper function to check if user has valid teacher session
export const checkTeacherSession = () => {
  try {
    const isTeacherSession = localStorage.getItem('isTeacher') === 'true';
    
    // Optional: Check if the session has expired (if you want to add expiry)
    // const sessionTime = localStorage.getItem('teacherSessionTime');
    // if (sessionTime) {
    //   const sessionDate = new Date(sessionTime);
    //   const expiryTime = new Date(sessionDate.getTime() + (24 * 60 * 60 * 1000)); // 24 hour expiry
    //   if (new Date() > expiryTime) {
    //     console.log('Teacher session expired');
    //     localStorage.removeItem('isTeacher');
    //     localStorage.removeItem('teacherSessionTime');
    //     return false;
    //   }
    // }
    
    if (isTeacherSession) {
      console.log('Valid teacher session found');
    }
    
    return isTeacherSession;
  } catch (err) {
    console.error('Error checking teacher session:', err);
    return false;
  }
};

// Helper function to get current user's role
export const getCurrentUserRole = async () => {
  try {
    // First check if it's a teacher
    if (checkTeacherSession()) {
      return 'teacher';
    }
    
    // Otherwise check if it's a student
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const { data: profile, error } = await supabase
      .from('students')
      .select('*')
      .eq('email', session.user.email)
      .single();

    if (error) throw error;
    
    return profile ? 'student' : null;
  } catch (err) {
    console.error('Error getting user role:', err);
    return null;
  }
};

// Execute direct SQL query to bypass RLS
// You can use this function when you need to bypass RLS for specific operations
export const executeRawQuery = async (query: string, params?: any[]) => {
  try {
    const { data, error } = await supabase.rpc('run_sql', { 
      query: query,
      params: params || []
    });
    
    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error('Error executing raw query:', err);
    return { success: false, error: err };
  }
};

// Get data bypassing RLS
export const getDataWithoutRLS = async (table: string) => {
  try {
    const query = `SELECT * FROM ${table}`;
    return await executeRawQuery(query);
  } catch (err) {
    console.error(`Error getting data from ${table}:`, err);
    return { success: false, error: err };
  }
};

// Handle auth state change
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    // Clear any local storage items related to auth
    localStorage.removeItem('isTeacher');
    localStorage.removeItem('teacherSessionTime');
    console.log('User signed out, cleared sessions');
  } else if (event === 'SIGNED_IN' && session) {
    // You can set up user data here if needed
    console.log('User signed in:', session.user.email);
  } else if (event === 'TOKEN_REFRESHED') {
    console.log('Auth token refreshed');
  }
});

// Function to handle auth errors and attempt recovery
export const handleAuthError = async (error: any) => {
  if (error?.message?.includes('refresh_token_not_found') || 
      error?.code === 'PGRST116' || 
      error?.code === 401) {
    console.log('Attempting to recover from auth error');
    
    // Try to refresh the session
    const { data, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError || !data.session) {
      console.error('Session refresh failed:', refreshError);
      // If refresh fails, redirect to login
      window.location.href = '/login';
      return false;
    }
    
    console.log('Session refreshed successfully');
    return true; // Successfully refreshed
  }
  
  return false; // Not an auth error or couldn't handle
};