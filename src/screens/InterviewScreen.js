import { useState, useEffect, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, Alert, ActivityIndicator
} from 'react-native'
import Slider from '@react-native-community/slider'
import { SECTIONS } from '../constants/sections'
import { getSession, saveSessionProgress, saveSessionReport, synthesiseReport } from '../lib/supabase'

const MIN_LENGTH = 20

export default function InterviewScreen({ navigation, route }) {
  const { sessionId } = route.params
  const scrollRef = useRef(null)

  const [currentSection, setCurrentSection] = useState(0)
  const [answers, setAnswers] = useState({})
  const [wheelRatings, setWheelRatings] = useState({})
  const [saving, setSaving] = useState(false)
  const [synthesising, setSynthesising] = useState(false)
  const [loadingSession, setLoadingSession] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const session = await getSession(sessionId)
        if (session.answers) setAnswers(session.answers)
        if (session.wheel_ratings) setWheelRatings(session.wheel_ratings)
        if (session.current_section) setCurrentSection(session.current_section)
        if (session.status === 'completed' && session.report) {
          navigation.replace('Report', { sessionId, reportData: session.report })
        }
      } catch (e) {
        Alert.alert('Error', e.message)
      }
      setLoadingSession(false)
    }
    load()
  }, [sessionId])

  const section = SECTIONS[currentSection]

  const isComplete = () => {
    if (section.sliders) return section.sliders.every(s => wheelRatings[s.id] !== undefined)
    return section.questions.every(q => (answers[q.id] || '').trim().length >= MIN_LENGTH)
  }

  const saveProgress = async (nextIndex) => {
    setSaving(true)
    try {
      await saveSessionProgress(sessionId, { answers, wheelRatings, currentSection: nextIndex })
    } catch (e) {
      console.error('Save error:', e.message)
    }
    setSaving(false)
  }

  const goNext = async () => {
    const nextIndex = currentSection + 1
    await saveProgress(nextIndex)
    if (currentSection < SECTIONS.length - 1) {
      setCurrentSection(nextIndex)
      scrollRef.current?.scrollTo({ y: 0, animated: true })
    } else {
      await handleSynthesis()
    }
  }

  const goPrev = () => {
    if (currentSection > 0) {
      setCurrentSection(c => c - 1)
      scrollRef.current?.scrollTo({ y: 0, animated: true })
    }
  }

  const handleSynthesis = async () => {
    setSynthesising(true)
    try {
      const report = await synthesiseReport({ answers, wheelRatings, sections: SECTIONS })
      await saveSessionReport(sessionId, report)
      navigation.replace('Report', { sessionId, reportData: report })
    } catch (e) {
      setSynthesising(false)
      Alert.alert(
        'Synthesis Error',
        e.message + '\n\nYour answers are saved. You can retry.',
        [
          { text: 'Retry', onPress: handleSynthesis },
          { text: 'Exit', onPress: () => navigation.navigate('Home') },
        ]
      )
    }
  }

  if (loadingSession) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#E8A87C" size="large" />
        <Text style={styles.loadingText}>Loading your session...</Text>
      </View>
    )
  }

  if (synthesising) {
    return (
      <View style={styles.centered}>
        <Text style={styles.synthIcon}>◎</Text>
        <Text style={styles.synthTitle}>Synthesising your Life Compass...</Text>
        <Text style={styles.synthSub}>Reading across all 8 dimensions</Text>
      </View>
    )
  }

  const progress = (currentSection / SECTIONS.length) * 100

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: section.color }]} />
      </View>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => Alert.alert('Save and Exit?', 'Your progress is saved.', [
          { text: 'Stay', style: 'cancel' },
          { text: 'Exit', onPress: () => navigation.navigate('Home') },
        ])}>
          <Text style={styles.exitBtn}>✕</Text>
        </TouchableOpacity>
        <View style={styles.dots}>
          {SECTIONS.map((s, i) => (
            <View key={i} style={[
              styles.dot,
              {
                backgroundColor: i === currentSection ? s.color : i < currentSection ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)',
                width: i === currentSection ? 16 : 5,
              }
            ]} />
          ))}
        </View>
        <Text style={styles.saveHint}>{saving ? 'Saving...' : ''}</Text>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardDismissMode="on-drag">
        <View style={styles.sectionHeader}>
          <View style={[styles.iconCircle, { borderColor: section.color + '40' }]}>
            <Text style={[styles.sectionIcon, { color: section.color }]}>{section.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.partLabel, { color: section.color + 'AA' }]}>
              Part {currentSection + 1} of {SECTIONS.length}
            </Text>
            <Text style={styles.sectionTitle}>{section.label}</Text>
          </View>
        </View>
        <Text style={styles.sectionDesc}>{section.description}</Text>

        {section.questions && section.questions.map((q, qi) => (
          <View key={q.id} style={styles.questionBlock}>
            <Text style={styles.questionText}>
              <Text style={[styles.qNum, { color: section.color }]}>{qi + 1}.  </Text>
              {q.text}
            </Text>
            <TextInput
              style={[
                styles.textInput,
                (answers[q.id] || '').length >= MIN_LENGTH && { borderColor: section.color + '60' }
              ]}
              value={answers[q.id] || ''}
              onChangeText={val => setAnswers(prev => ({ ...prev, [q.id]: val }))}
              placeholder="Be honest. Be specific. This is for you."
              placeholderTextColor="rgba(232,228,220,0.2)"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>
              {(answers[q.id] || '').length} chars
              {(answers[q.id] || '').length >= MIN_LENGTH && (
                <Text style={{ color: section.color }}> ✓</Text>
              )}
            </Text>
          </View>
        ))}

        {section.sliders && (
          <View>
            <Text style={styles.sliderHint}>Rate each domain. 1 = deeply unsatisfied  |  10 = thriving</Text>
            {section.sliders.map(s => (
              <View key={s.id} style={styles.sliderBlock}>
                <View style={styles.sliderRow}>
                  <Text style={styles.sliderLabel}>{s.label}</Text>
                  <Text style={[styles.sliderValue, { color: section.color }]}>
                    {wheelRatings[s.id] ?? 5}
                  </Text>
                </View>
                <Slider
                  style={{ width: '100%', height: 36 }}
                  minimumValue={1}
                  maximumValue={10}
                  step={1}
                  value={wheelRatings[s.id] ?? 5}
                  onValueChange={val => setWheelRatings(prev => ({ ...prev, [s.id]: val }))}
                  minimumTrackTintColor={section.color}
                  maximumTrackTintColor="rgba(255,255,255,0.08)"
                  thumbTintColor={section.color}
                />
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.navBar}>
        <TouchableOpacity
          style={[styles.backBtn, currentSection === 0 && { opacity: 0.2 }]}
          onPress={goPrev}
          disabled={currentSection === 0}
        >
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.completeHint}>
          {isComplete()
            ? <Text style={{ color: section.color }}>Complete ✓</Text>
            : 'Fill all fields'}
        </Text>

        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: isComplete() ? section.color : 'rgba(255,255,255,0.04)' }]}
          onPress={goNext}
          disabled={!isComplete()}
        >
          <Text style={[styles.nextBtnText, { color: isComplete() ? '#0b0e17' : 'rgba(232,228,220,0.15)' }]}>
            {currentSection === SECTIONS.length - 1 ? 'Generate' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0e17' },
  centered: { flex: 1, backgroundColor: '#0b0e17', alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText: { color: 'rgba(232,228,220,0.4)', marginTop: 16, fontSize: 14 },
  synthIcon: { fontSize: 40, color: '#E8A87C', marginBottom: 24 },
  synthTitle: { fontSize: 20, color: '#e8e4dc', fontStyle: 'italic', marginBottom: 10, textAlign: 'center' },
  synthSub: { fontSize: 13, color: 'rgba(232,228,220,0.35)', textAlign: 'center' },
  progressTrack: { height: 2, backgroundColor: 'rgba(255,255,255,0.04)' },
  progressFill: { height: '100%' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  exitBtn: { fontSize: 18, color: 'rgba(232,228,220,0.35)', padding: 4 },
  dots: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot: { height: 5, borderRadius: 3 },
  saveHint: { fontSize: 10, color: 'rgba(232,228,220,0.25)', minWidth: 48, textAlign: 'right' },
  content: { paddingHorizontal: 24, paddingTop: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 },
  iconCircle: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionIcon: { fontSize: 20 },
  partLabel: { fontSize: 9, letterSpacing: 4, marginBottom: 2 },
  sectionTitle: { fontSize: 22, color: '#e8e4dc', fontWeight: '400' },
  sectionDesc: { fontSize: 13, color: 'rgba(232,228,220,0.35)', lineHeight: 18, marginBottom: 28 },
  questionBlock: { marginBottom: 26 },
  questionText: { fontSize: 15, color: 'rgba(232,228,220,0.85)', lineHeight: 22, marginBottom: 10 },
  qNum: { fontSize: 13 },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8, padding: 14,
    color: '#e8e4dc', fontSize: 15, lineHeight: 22, minHeight: 110,
  },
  charCount: { fontSize: 10, color: 'rgba(232,228,220,0.18)', textAlign: 'right', marginTop: 4 },
  sliderHint: { fontSize: 12, color: 'rgba(232,228,220,0.3)', marginBottom: 20, lineHeight: 18 },
  sliderBlock: { marginBottom: 20 },
  sliderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  sliderLabel: { fontSize: 14, color: '#e8e4dc' },
  sliderValue: { fontSize: 16, fontWeight: '600' },
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
    backgroundColor: '#0b0e17',
  },
  backBtn: { padding: 10 },
  backBtnText: { fontSize: 13, color: 'rgba(232,228,220,0.5)', letterSpacing: 1 },
  completeHint: { fontSize: 11, color: 'rgba(232,228,220,0.2)' },
  nextBtn: { borderRadius: 4, paddingHorizontal: 20, paddingVertical: 12 },
  nextBtnText: { fontSize: 13, letterSpacing: 1, fontWeight: '700' },
})
