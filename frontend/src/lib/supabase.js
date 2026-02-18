import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: localStorage,
  },
});

// Helper function to get current user
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

// Helper function to get user profile with role
export const getUserProfile = async () => {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return null;
  
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  if (profileError) {
    console.error('Error fetching profile:', profileError);
    return null;
  }
  
  return { ...user, ...profile };
};

// Helper function for signing in
export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
};

// Helper function for signing out
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

// Helper function for signing up
export const signUp = async (email, password, metadata = {}) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  });
  
  if (error) throw error;
  return data;
};

// Subscribe to auth state changes
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange(callback);
};
