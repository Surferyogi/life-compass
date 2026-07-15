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

// ─────────────────────────────────────────────
// Coach module (v2026:07:11-09:42) — additive only
// ─────────────────────────────────────────────

export async function getConversations(userId) {
  const { data, error } = await supabase
    .from('lc_coach_conversations')
    .select('id, title, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createConversation(userId) {
  const { data, error } = await supabase
    .from('lc_coach_conversations')
    .insert({ user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteConversation(conversationId) {
  const { error } = await supabase
    .from('lc_coach_conversations')
    .delete()
    .eq('id', conversationId)
  if (error) throw error
}

export async function updateConversationTitle(conversationId, title) {
  const { error } = await supabase
    .from('lc_coach_conversations')
    .update({ title })
    .eq('id', conversationId)
  if (error) throw error
}

export async function getMessages(conversationId) {
  const { data, error } = await supabase
    .from('lc_coach_messages')
    .select('id, role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function saveMessage(conversationId, userId, role, content) {
  const { data, error } = await supabase
    .from('lc_coach_messages')
    .insert({ conversation_id: conversationId, user_id: userId, role, content })
    .select()
    .single()
  if (error) throw error
  try {
    await supabase
      .from('lc_coach_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)
  } catch (_) { /* non-critical */ }
  return data
}

export async function getMindsetProfile(userId) {
  const { data, error } = await supabase
    .from('lc_mindset_profile')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data // null if no profile yet
}

export async function saveMindsetProfile(userId, profile, sessionsDistilled) {
  const { error } = await supabase
    .from('lc_mindset_profile')
    .upsert({
      user_id: userId,
      profile,
      sessions_distilled: sessionsDistilled,
      updated_at: new Date().toISOString(),
    })
  if (error) throw error
}

export async function getLatestReport(userId) {
  const { data, error } = await supabase
    .from('lc_sessions')
    .select('report')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('updated_at', { ascending: false })
    .limit(1)
  if (error) throw error
  return data?.[0]?.report ?? null
}

// Supabase's client discards the Edge Function's response body on non-2xx
// and throws a generic "Edge Function returned a non-2xx status code"
// wrapper instead. This reads the real message our function actually sent
// back, so failures are diagnosable instead of opaque.
async function extractFunctionErrorMessage(error) {
  try {
    if (error?.context && typeof error.context.json === 'function') {
      const body = await error.context.json()
      if (body?.error) return body.error
    }
  } catch (_) { /* fall through to generic message below */ }
  return error?.message || 'Unknown error calling lc-coach'
}

export async function coachChat({ messages, profile, report, context }) {
  const { data, error } = await supabase.functions.invoke('lc-coach', {
    body: { mode: 'chat', messages, profile, report, context },
  })
  if (error) throw new Error(await extractFunctionErrorMessage(error))
  if (data.error) throw new Error(data.error)
  return data.reply
}

// ─────────────────────────────────────────────
// Session context: date/time + optional geolocation, captured
// once when a coaching session opens. Never fabricated — if
// geolocation is denied/unavailable, we say so explicitly and
// let the coach know not to guess. No third-party geocoding
// service is used; raw coordinates are sent to Claude directly,
// which infers approximate location itself.
// ─────────────────────────────────────────────

function getLocalTimeContext() {
  const now = new Date()
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || null
  const localDateTime = now.toLocaleString('en-SG', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  })
  return { localDateTime, timeZone }
}

function getGeolocationContext(timeoutMs = 6000) {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({ status: 'unsupported' })
      return
    }
    const timer = setTimeout(() => resolve({ status: 'timeout' }), timeoutMs)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer)
        resolve({
          status: 'granted',
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyMeters: Math.round(pos.coords.accuracy),
        })
      },
      (err) => {
        clearTimeout(timer)
        resolve({ status: err.code === 1 ? 'denied' : 'unavailable' })
      },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 300000 }
    )
  })
}

export async function getSessionContext() {
  const time = getLocalTimeContext()
  const geo = await getGeolocationContext()
  return { ...time, geo }
}

export async function coachReflect({ messages, profile }) {
  const { data, error } = await supabase.functions.invoke('lc-coach', {
    body: { mode: 'reflect', messages, profile },
  })
  if (error) throw new Error(await extractFunctionErrorMessage(error))
  if (data.error) throw new Error(data.error)
  return data.profile
}
