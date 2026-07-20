import { createClient } from '@supabase/supabase-js'

// Lecture des variables d'environnement de production définies dans votre fichier .env local
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "⚠️ [LOG TRANSGABON-CONNECT] : Les variables d'environnement Supabase (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) ne sont pas configurées dans votre fichier .env."
  )
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

