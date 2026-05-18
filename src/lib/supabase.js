import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

export async function createSession(userId) {
  const { data, error } = await supabase
    .from('lc_sessions')
    .insert({ user_id: userId, status: 'in_progress' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function saveSessionProgress(sessionId, { answers, wheelRatings, currentSection }) {
  const { error } = await supabase
    .from('lc_sessions')
    .update({ answers, wheel_ratings: wheelRatings, current_section: currentSection })
    .eq('id', sessionId)
  if (error) throw error
}

export async function saveSessionReport(sessionId, report) {
  const { error } = await supabase
    .from('lc_sessions')
    .update({ report, status: 'completed' })
    .eq('id', sessionId)
  if (error) throw error
}

export async function getUserSessions(userId) {
  const { data, error } = await supabase
    .from('lc_sessions')
    .select('id, created_at, updated_at, status, current_section')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getSession(sessionId) {
  const { data, error } = await supabase
    .from('lc_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()
  if (error) throw error
  return data
}

export async function synthesiseReport({ answers, wheelRatings, sections }) {
  const { data, error } = await supabase.functions.invoke('lc-synthesize', {
    body: { answers, wheelRatings, sections },
  })
  if (error) throw error
  if (data.error) throw new Error(data.error)
  return data.report
}
