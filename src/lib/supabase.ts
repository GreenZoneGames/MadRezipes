import { createClient } from '@supabase/supabase-js';


// Initialize Supabase client
// Using direct values from project configuration
const supabaseUrl = 'https://ehtxiuwkizpnwwjmprox.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVodHhpdXdraXpwbnd3am1wcm94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0MDIwNTgsImV4cCI6MjA2Mzk3ODA1OH0.bm7D9zM1JdGgdn2foz0rdf96sYdoNupG0JejZwkadlg';
const supabase = createClient(supabaseUrl, supabaseKey);


export { supabase };