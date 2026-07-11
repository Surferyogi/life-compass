import { useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, FlatList, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { getConversations, createConversation, deleteConversation, getMindsetProfile } from '../lib/supabase'

const ACCENT = '#7CB9E8'

export default function CoachScreen({ navigation, route }) {
  const userId = route.params?.userId
  const [conversations, setConversations] = useState([])
  const [profileMeta, setProfileMeta] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    try {
      const [convs, prof] = await Promise.all([
        getConversations(userId),
        getMindsetProfile(userId),
      ])
      setConversations(convs)
      setProfileMeta(prof)
    } catch (e) { console.error(e) }
    setLoaded(true)
  }, [userId])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const startSession = async () => {
    setLoading(true)
    try {
      const conv = await createConversation(userId)
      navigation.navigate('CoachChat', { conversationId: conv.id, userId })
    } catch (e) { window.alert('Error: ' + e.message) }
    setLoading(false)
  }

  const removeConversation = async (conversationId) => {
    if (!window.confirm('Delete this coaching session? The transcript is removed. Anything already distilled into your mindset profile is kept.')) return
    try {
      await deleteConversation(conversationId)
      setConversations(prev => prev.filter(c => c.id !== conversationId))
    } catch (e) { console.error(e) }
  }

  const formatDate = (iso) => {
    const d = new Date(iso)
    return d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const hasProfile = profileMeta && profileMeta.profile && Object.keys(profileMeta.profile).length > 0

  const renderConversation = ({ item }) => (
    <View style={styles.convRow}>
      <TouchableOpacity
        style={styles.convCard}
        onPress={() => navigation.navigate('CoachChat', { conversationId: item.id, userId })}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.convTitle} numberOfLines={1}>{item.title || 'Coaching Session'}</Text>
          <Text style={styles.convDate}>{formatDate(item.updated_at)}</Text>
        </View>
        <Text style={styles.convArrow}>{'->'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteBtn} onPress={() => removeConversation(item.id)}>
        <Text style={styles.deleteBtnText}>X</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Text style={styles.backLink}>{'<'} Home</Text>
        </TouchableOpacity>
        <View style={{ marginTop: 14 }}>
          <Text style={styles.headerLabel}>YOUR CORNER</Text>
          <Text style={styles.headerTitle}>The <Text style={styles.accent}>Coach</Text></Text>
        </View>
      </View>

      <View style={styles.profileCard}>
        <Text style={styles.profileLabel}>MINDSET PROFILE</Text>
        {hasProfile ? (
          <Text style={styles.profileText}>
            {profileMeta.sessions_distilled} session{profileMeta.sessions_distilled === 1 ? '' : 's'} distilled · last updated {formatDate(profileMeta.updated_at)}.
            The coach carries this understanding of you into every conversation.
          </Text>
        ) : (
          <Text style={styles.profileText}>
            No profile yet. Your first session runs Deep Discovery — the coach will ask what shapes you: stress patterns, triggers, decision style, your inner critic. Tap Distill at the end to commit it to memory.
          </Text>
        )}
      </View>

      <View style={styles.newBtnContainer}>
        <TouchableOpacity style={[styles.newBtn, loading && { opacity: 0.5 }]} onPress={startSession} disabled={loading}>
          <Text style={styles.newBtnText}>{loading ? 'Opening...' : '+ Start a Session'}</Text>
        </TouchableOpacity>
        <Text style={styles.newBtnHint}>Bring a situation, a stress, a decision — or just talk</Text>
      </View>

      <View style={styles.historyHeader}>
        <Text style={styles.historyLabel}>PAST SESSIONS</Text>
        <View style={styles.historyDivider} />
      </View>

      {!loaded ? (
        <View style={styles.emptyState}><ActivityIndicator color={ACCENT} /></View>
      ) : conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>◆</Text>
          <Text style={styles.emptyText}>No sessions yet. Start your first conversation above.</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={item => item.id}
          renderItem={renderConversation}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0e17' },
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  backLink: { fontSize: 12, color: 'rgba(232,228,220,0.35)' },
  headerLabel: { fontSize: 9, letterSpacing: 5, color: 'rgba(124,185,232,0.45)', marginBottom: 4 },
  headerTitle: { fontSize: 28, color: '#e8e4dc', fontWeight: '300' },
  accent: { color: ACCENT, fontStyle: 'italic' },
  profileCard: { margin: 24, marginBottom: 8, backgroundColor: 'rgba(124,185,232,0.05)', borderWidth: 1, borderColor: 'rgba(124,185,232,0.15)', borderRadius: 8, padding: 16 },
  profileLabel: { fontSize: 9, letterSpacing: 4, color: 'rgba(124,185,232,0.6)', marginBottom: 8 },
  profileText: { fontSize: 13, color: 'rgba(232,228,220,0.65)', lineHeight: 20 },
  newBtnContainer: { padding: 24, paddingTop: 12, paddingBottom: 16 },
  newBtn: { backgroundColor: ACCENT, borderRadius: 4, padding: 18, alignItems: 'center' },
  newBtnText: { color: '#0b0e17', fontSize: 14, letterSpacing: 2, fontWeight: '700' },
  newBtnHint: { fontSize: 11, color: 'rgba(232,228,220,0.25)', textAlign: 'center', marginTop: 8 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, marginBottom: 12 },
  historyLabel: { fontSize: 9, letterSpacing: 4, color: 'rgba(232,228,220,0.25)', marginRight: 12 },
  historyDivider: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  convRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  convCard: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.025)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 16 },
  convTitle: { fontSize: 14, color: '#e8e4dc', marginBottom: 6 },
  convDate: { fontSize: 11, color: 'rgba(232,228,220,0.3)' },
  convArrow: { fontSize: 18, color: 'rgba(232,228,220,0.25)', marginLeft: 12 },
  deleteBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(232,100,100,0.1)', borderWidth: 1, borderColor: 'rgba(232,100,100,0.2)', alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { color: '#E87C7C', fontSize: 14, fontWeight: '700' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 30, color: 'rgba(124,185,232,0.2)', marginBottom: 16 },
  emptyText: { fontSize: 15, color: 'rgba(232,228,220,0.3)', textAlign: 'center', lineHeight: 22 },
})
