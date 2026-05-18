import os

content = """import { useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, FlatList, StyleSheet, SafeAreaView, Alert } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { supabase, getUserSessions, createSession } from '../lib/supabase'

const STATUS_LABEL = { in_progress: 'In Progress', completed: 'Completed' }
const STATUS_COLOR = { in_progress: '#E8D87C', completed: '#87C9A0' }

export default function HomeScreen({ navigation, route }) {
  const userId = route.params?.userId
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)

  const loadSessions = useCallback(async () => {
    try { const data = await getUserSessions(userId); setSessions(data) }
    catch (e) { console.error(e) }
  }, [userId])

  useFocusEffect(useCallback(() => { loadSessions() }, [loadSessions]))

  const startNew = async () => {
    setLoading(true)
    try { const session = await createSession(userId); navigation.navigate('Interview', { sessionId: session.id }) }
    catch (e) { Alert.alert('Error', e.message) }
    setLoading(false)
  }

  const openSession = (session) => {
    if (session.status === 'completed') { navigation.navigate('Report', { sessionId: session.id }) }
    else { navigation.navigate('Interview', { sessionId: session.id }) }
  }

  const deleteSession = (sessionId) => {
    Alert.alert('Delete Session', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await supabase.from('lc_sessions').delete().eq('id', sessionId)
          setSessions(prev => prev.filter(s => s.id !== sessionId))
        } catch (e) { Alert.alert('Error', e.message) }
      }}
    ])
  }

  const signOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ])
  }

  const formatDate = (iso) => {
    const d = new Date(iso)
    return d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const renderSession = ({ item }) => (
    <View style={styles.sessionRow}>
      <TouchableOpacity style={styles.sessionCard} onPress={() => openSession(item)}>
        <View>
          <Text style={styles.sessionDate}>{formatDate(item.created_at)}</Text>
          <View style={[styles.statusBadge, { borderColor: STATUS_COLOR[item.status] + '50' }]}>
            <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] }]}>
              {STATUS_LABEL[item.status]}
            </Text>
          </View>
        </View>
        <Text style={styles.sessionArrow}>-></Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteSession(item.id)}>
        <Text style={styles.deleteBtnText}>X</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>LIFE DESIGN STUDIO</Text>
          <Text style={styles.headerTitle}>Life <Text style={styles.accent}>Compass</Text></Text>
        </View>
        <TouchableOpacity onPress={signOut}>
          <Text style={styles.signOut}>Sign Out</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.newBtnContainer}>
        <TouchableOpacity style={[styles.newBtn, loading && styles.newBtnDisabled]} onPress={startNew} disabled={loading}>
          <Text style={styles.newBtnText}>{loading ? 'Creating...' : '+ Begin New Session'}</Text>
        </TouchableOpacity>
        <Text style={styles.newBtnHint}>8 sections  |  auto-saved after every section</Text>
      </View>
      <View style={styles.historyHeader}>
        <Text style={styles.historyLabel}>PAST SESSIONS</Text>
        <View style={styles.historyDivider} />
      </View>
      {sessions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>O</Text>
          <Text style={styles.emptyText}>No sessions yet. Begin your first inquiry above.</Text>
        </View>
      ) : (
        <FlatList data={sessions} keyExtractor={item => item.id} renderItem={renderSession}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }} />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0e17' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  headerLabel: { fontSize: 9, letterSpacing: 5, color: 'rgba(232,168,124,0.45)', marginBottom: 4 },
  headerTitle: { fontSize: 28, color: '#e8e4dc', fontWeight: '300' },
  accent: { color: '#E8A87C', fontStyle: 'italic' },
  signOut: { fontSize: 12, color: 'rgba(232,228,220,0.3)' },
  newBtnContainer: { padding: 24, paddingBottom: 16 },
  newBtn: { backgroundColor: '#E8A87C', borderRadius: 4, padding: 18, alignItems: 'center' },
  newBtnDisabled: { opacity: 0.5 },
  newBtnText: { color: '#0b0e17', fontSize: 14, letterSpacing: 2, fontWeight: '700' },
  newBtnHint: { fontSize: 11, color: 'rgba(232,228,220,0.25)', textAlign: 'center', marginTop: 8 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, marginBottom: 12 },
  historyLabel: { fontSize: 9, letterSpacing: 4, color: 'rgba(232,228,220,0.25)', marginRight: 12 },
  historyDivider: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  sessionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  sessionCard: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.025)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 16 },
  sessionDate: { fontSize: 15, color: '#e8e4dc', marginBottom: 6 },
  statusBadge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 10, letterSpacing: 2 },
  sessionArrow: { fontSize: 18, color: 'rgba(232,228,220,0.25)' },
  deleteBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(232,100,100,0.1)', borderWidth: 1, borderColor: 'rgba(232,100,100,0.2)', alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { color: '#E87C7C', fontSize: 14, fontWeight: '700' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 36, color: 'rgba(232,228,220,0.15)', marginBottom: 16 },
  emptyText: { fontSize: 15, color: 'rgba(232,228,220,0.3)', textAlign: 'center', lineHeight: 22 },
})
"""

with open('src/screens/HomeScreen.js', 'w') as f:
    f.write(content)
print('Done')
