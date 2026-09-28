import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error("Variable d'environnement VITE_SUPABASE_URL manquante ou vide.")
}
if (!supabaseAnonKey) {
  throw new Error("Variable d'environnement VITE_SUPABASE_ANON_KEY manquante ou vide.")
}

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
