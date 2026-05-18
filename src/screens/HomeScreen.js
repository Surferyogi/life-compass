import { useState, useCallback } from 'react'
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

  const devTest = async () => {
    setLoading(true)
    try {
      const session = await createSession(userId)
      const a = {
        love_1:'I lose track of time when exploring cities with my camera or on the golf course.',
        love_2:'I would spend a month snowboarding in Japan and photographing remote landscapes.',
        love_3:'I read about energy transition, AI, and how technology can solve climate change.',
        love_4:'Korea was the most alive - founding a subsidiary from scratch gave me full ownership.',
        good_1:'I uniquely combine deep technical knowledge with cultural fluency across Asia and Europe.',
        good_2:'I build trust across cultures and turn around struggling organisations.',
        good_3:'During COVID I kept operations running with zero disruption while competitors struggled.',
        good_4:'I speak Japanese and Korean which almost no Western executives do.',
        world_1:'The energy transition needs leaders who understand both the science and the business.',
        world_2:'There is a massive gap in APAC for CEO-level leaders who understand deep tech.',
        world_3:'I want to be remembered as someone who helped accelerate clean energy transition in Asia.',
        world_4:'I feel a strong pull toward Singapore and Japan as bases for impact.',
        paid_1:'I am open to CEO roles, board positions, and potentially my own venture.',
        paid_2:'I have enough saved. I want impact and legacy over maximising salary.',
        paid_3:'My combination of PhD, operational scale, and Asian market knowledge is extremely rare.',
        paid_4:'My network across Air Liquide, Korean industry, and Japanese corporates is unmatched.',
        ody_1:'Plan A is CEO of a large industrial or energy company in APAC within 2 years.',
        ody_2:'Plan B is launching a climate tech venture fund focused on APAC energy transition.',
        ody_3:'Plan C is buying a small boutique hotel in a remote location and running it with Sophia.',
        ody_4:'The common thread is impact at scale, cultural richness, and freedom to lead my own way.',
        energy_1:'Last week in Tokyo I had dinner with researchers and felt completely energised by ideas.',
        energy_2:'Corporate politics and slow decisions drain me. I would eliminate bureaucracy first.',
        energy_3:'My top 3 are Deep Impact, Independence, and Adventure. Status matters less now.',
        energy_4:'I want to be based in Singapore with freedom to travel 30 percent of the time.',
        con_1:'Sophia and my health are non-negotiable. Any future must honour our partnership.',
        con_2:'Sophia and I decide together. She wants stability but supports my ambition.',
        con_3:'I am ready to move within 12 months when the right opportunity appears.',
        con_4:'My secret fear is that I have been optimising for the wrong things and time is running out.',
      }
      const w = { wl_career:6, wl_health:8, wl_family:7, wl_finance:8, wl_social:7, wl_growth:5, wl_fun:6, wl_spirit:4 }
      await supabase.from('lc_sessions').update({ answers: a, wheel_ratings: w, current_section: 7 }).eq('id', session.id)
      navigation.navigate('Interview', { sessionId: session.id })
    } catch(e) { Alert.alert('Error', e.message) }
    setLoading(false)
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
        <TouchableOpacity style={{marginTop:10, padding:10, alignItems:'center'}} onPress={devTest}>
          <Text style={{fontSize:11, color:'rgba(232,228,220,0.25)'}}>DEV: Test Synthesis</Text>
        </TouchableOpacity>
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
