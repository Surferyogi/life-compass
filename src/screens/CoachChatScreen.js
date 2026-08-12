import { useState, useEffect, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native'
import {
  getMessages, saveMessage, coachChat, coachReflect,
  getMindsetProfile, saveMindsetProfile, getLatestReport, updateConversationTitle,
  getSessionContext
} from '../lib/supabase'

const ACCENT = '#7CB9E8'

export default function CoachChatScreen({ navigation, route }) {
  const { conversationId, userId } = route.params
  const scrollRef = useRef(null)

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [thinking, setThinking] = useState(false)
  const [distilling, setDistilling] = useState(false)
  const [profile, setProfile] = useState(null)
  const [report, setReport] = useState(null)
  const [sessionContext, setSessionContext] = useState(null)

  useEffect(() => {
    let active = true
    const init = async () => {
      try {
        const [msgs, prof, rep, ctx] = await Promise.all([
          getMessages(conversationId),
          getMindsetProfile(userId),
          getLatestReport(userId),
          getSessionContext(),
        ])
        if (!active) return
        const p = prof?.profile && Object.keys(prof.profile).length > 0 ? prof.profile : null
        setProfile(p)
        setReport(rep)
        setSessionContext(ctx)
        setMessages(msgs)
        setLoading(false)
        if (msgs.length === 0) {
          setThinking(true)
          const reply = await coachChat({ messages: [], profile: p, report: rep, context: ctx })
          const saved = await saveMessage(conversationId, userId, 'assistant', reply)
          if (!active) return
          setMessages([saved])
          setThinking(false)
        }
      } catch (e) {
        if (!active) return
        setLoading(false)
        setThinking(false)
        setMessages(prev => [...prev, { id: 'err-init', role: 'assistant', content: 'Could not start the session: ' + e.message }])
      }
    }
    init()
    return () => { active = false }
  }, [conversationId])

  const send = async () => {
    const text = input.trim()
    if (!text || thinking || distilling) return
    setInput('')
    const optimistic = { id: 'tmp-' + Date.now(), role: 'user', content: text }
    const history = [...messages, optimistic]
    setMessages(history)
    setThinking(true)
    try {
      const isFirstUserMsg = messages.filter(m => m.role === 'user').length === 0
      const savedUser = await saveMessage(conversationId, userId, 'user', text)
      if (isFirstUserMsg) {
        updateConversationTitle(conversationId, text.slice(0, 60)).catch(() => {})
      }
      const reply = await coachChat({
        messages: history.map(m => ({ role: m.role, content: m.content })),
        profile,
        report,
        context: sessionContext,
      })
      const savedCoach = await saveMessage(conversationId, userId, 'assistant', reply)
      setMessages(prev => [...prev.filter(m => m.id !== optimistic.id), savedUser, savedCoach])
    } catch (e) {
      setMessages(prev => [...prev, { id: 'err-' + Date.now(), role: 'assistant', content: 'Error: ' + e.message + ' — your last message may not be saved. Try sending it again.' }])
    }
    setThinking(false)
  }

  const distill = async () => {
    if (thinking || distilling) return
    if (messages.filter(m => m.role === 'user').length < 3) {
      window.alert('Have a few exchanges first — distilling needs real material to work with.')
      return
    }
    if (!window.confirm('Distill this session into your mindset profile? The coach will carry these insights into every future session.')) return
    setDistilling(true)
    try {
      const newProfile = await coachReflect({
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        profile,
      })
      const prev = await getMindsetProfile(userId)
      const count = (prev?.sessions_distilled || 0) + 1
      await saveMindsetProfile(userId, newProfile, count)
      setProfile(newProfile)
      window.alert('Profile updated — ' + count + ' session' + (count === 1 ? '' : 's') + ' distilled.')
    } catch (e) {
      window.alert('Distill error: ' + e.message)
    }
    setDistilling(false)
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={ACCENT} size="large" />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backLink}>{'<'} Sessions</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Coach</Text>
          <TouchableOpacity
            style={[styles.distillBtn, distilling && { opacity: 0.5 }]}
            onPress={distill}
            disabled={distilling}
          >
            <Text style={styles.distillBtnText}>{distilling ? 'Distilling...' : '◆ Distill'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.messagesContainer}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          keyboardDismissMode="on-drag"
        >
          {messages.map(m => (
            <View
              key={m.id}
              style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.coachBubble]}
            >
              <Text style={m.role === 'user' ? styles.userText : styles.coachText}>{m.content}</Text>
            </View>
          ))}
          {thinking && (
            <View style={[styles.bubble, styles.coachBubble]}>
              <Text style={styles.thinkingText}>Coach is thinking...</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="What's on your mind?"
            placeholderTextColor="rgba(232,228,220,0.25)"
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || thinking) && { opacity: 0.4 }]}
            onPress={send}
            disabled={!input.trim() || thinking}
          >
            <Text style={styles.sendBtnText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0e17' },
  centered: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  backLink: { fontSize: 12, color: 'rgba(232,228,220,0.35)' },
  headerTitle: { fontSize: 15, color: '#e8e4dc', letterSpacing: 2 },
  distillBtn: { borderWidth: 1, borderColor: 'rgba(124,185,232,0.4)', borderRadius: 4, paddingHorizontal: 10, paddingVertical: 6 },
  distillBtnText: { color: ACCENT, fontSize: 11, letterSpacing: 1 },
  messagesContainer: { padding: 20, paddingBottom: 12 },
  bubble: { maxWidth: '86%', borderRadius: 10, padding: 14, marginBottom: 10 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: 'rgba(124,185,232,0.12)', borderWidth: 1, borderColor: 'rgba(124,185,232,0.2)' },
  coachBubble: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  userText: { color: '#e8e4dc', fontSize: 14, lineHeight: 21 },
  coachText: { color: 'rgba(232,228,220,0.9)', fontSize: 14, lineHeight: 22 },
  thinkingText: { color: 'rgba(232,228,220,0.35)', fontSize: 13, fontStyle: 'italic' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 14, gap: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  input: { flex: 1, minHeight: 42, maxHeight: 120, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, color: '#e8e4dc', fontSize: 14 },
  sendBtn: { backgroundColor: ACCENT, borderRadius: 8, paddingHorizontal: 18, paddingVertical: 12 },
  sendBtnText: { color: '#0b0e17', fontSize: 13, fontWeight: '700', letterSpacing: 1 },
})
