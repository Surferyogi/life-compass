import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator
} from 'react-native'
import { getSession } from '../lib/supabase'

const PLAN_COLORS = ['#E8A87C', '#7CB9E8', '#C9A0DC']
const PLAN_LABELS = ['Plan A — The Obvious Path', 'Plan B — The Pivot', 'Plan C — The Wild Card']

function SectionBlock({ title, icon, color, children }) {
  return (
    <View style={s.block}>
      <View style={s.blockHeader}>
        <Text style={[s.blockIcon, { color }]}>{icon}</Text>
        <Text style={s.blockTitle}>{title}</Text>
        <View style={[s.blockLine, { backgroundColor: color + '20' }]} />
      </View>
      {children}
    </View>
  )
}

function Quadrant({ label, color, text }) {
  return (
    <View style={[s.quadrant, { borderColor: color + '25', backgroundColor: color + '08' }]}>
      <Text style={[s.quadrantLabel, { color }]}>{label.toUpperCase()}</Text>
      <Text style={s.quadrantText}>{text}</Text>
    </View>
  )
}

function Bar({ label, value, color }) {
  return (
    <View style={s.barBlock}>
      <View style={s.barRow}>
        <Text style={s.barLabel}>{label}</Text>
        <Text style={[s.barValue, { color }]}>{value}/10</Text>
      </View>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${value * 10}%`, backgroundColor: color }]} />
      </View>
    </View>
  )
}

function OdysseyCard({ plan, index }) {
  const c = PLAN_COLORS[index]
  return (
    <View style={[s.odysseyCard, { borderColor: c + '25', backgroundColor: c + '08' }]}>
      <Text style={[s.odysseyPlanLabel, { color: c + 'AA' }]}>{PLAN_LABELS[index]}</Text>
      <Text style={s.odysseyTitle}>{plan.title}</Text>
      <Text style={s.odysseyTagline}>{plan.tagline}</Text>

      <Text style={[s.subhead, { color: c + '80' }]}>5-Year Picture</Text>
      <Text style={s.bodyText}>{plan['5_year_picture']}</Text>

      <Text style={[s.subhead, { color: c + '80' }]}>Key Moves</Text>
      {(plan.key_moves || []).map((m, i) => (
        <View key={i} style={s.moveRow}>
          <Text style={[s.moveArrow, { color: c }]}>→</Text>
          <Text style={s.moveText}>{m}</Text>
        </View>
      ))}

      <View style={s.assessBox}>
        <Text style={s.assessLabel}>HONEST ASSESSMENT</Text>
        <Text style={s.assessText}>{plan.honest_assessment}</Text>
      </View>

      <Text style={[s.subhead, { color: c + '80' }]}>Confidence Dashboard</Text>
      <Bar label="Resources and Readiness" value={plan.confidence_dashboard?.resources ?? 5} color={c} />
      <Bar label="Self-Belief"             value={plan.confidence_dashboard?.belief    ?? 5} color={c} />
      <Bar label="Interest and Engagement" value={plan.confidence_dashboard?.interest  ?? 5} color={c} />
    </View>
  )
}

export default function ReportScreen({ navigation, route }) {
  const { sessionId, reportData } = route.params
  const [report, setReport] = useState(reportData || null)
  const [loading, setLoading] = useState(!reportData)

  useEffect(() => {
    if (!reportData) {
      getSession(sessionId).then(session => {
        setReport(session.report)
        setLoading(false)
      })
    }
  }, [])

  if (loading) {
    return (
      <View style={[s.container, s.centered]}>
        <ActivityIndicator color="#E8A87C" size="large" />
      </View>
    )
  }

  if (!report) {
    return (
      <View style={[s.container, s.centered]}>
        <Text style={s.errorText}>Report not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.backLink}>Go back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>

        <TouchableOpacity style={s.homeBtn} onPress={() => navigation.navigate('Home')}>
          <Text style={s.homeBtnText}>Home</Text>
        </TouchableOpacity>

        <Text style={s.reportLabel}>YOUR REPORT</Text>
        <Text style={s.reportTitle}>Life Compass{'\n'}<Text style={s.accent}>Synthesis</Text></Text>
        <View style={s.divider} />

        <SectionBlock title="Ikigai — Your Reason for Being" icon="◈" color="#E8A87C">
          <View style={s.quadrantGrid}>
            <Quadrant label="What You Love"            color="#E8A87C" text={report.ikigai_synthesis?.love_core} />
            <Quadrant label="What You're Good At"      color="#7CB9E8" text={report.ikigai_synthesis?.strength_core} />
            <Quadrant label="What the World Needs"     color="#87C9A0" text={report.ikigai_synthesis?.world_need} />
            <Quadrant label="What You Can Be Paid For" color="#C9A0DC" text={report.ikigai_synthesis?.value_core} />
          </View>
          <View style={s.ikigaiBox}>
            <Text style={s.ikigaiLabel}>YOUR IKIGAI</Text>
            <Text style={s.ikigaiText}>"{report.ikigai_synthesis?.ikigai_statement}"</Text>
          </View>
        </SectionBlock>

        <SectionBlock title="Wheel of Life — Tensions and Opportunities" icon="◉" color="#7CE8C9">
          <Text style={s.bodyText}>{report.wheel_insights}</Text>
        </SectionBlock>

        <SectionBlock title="Odyssey Plans — Three Possible Lives" icon="↝" color="#E8D87C">
          {(report.odyssey_plans || []).map((plan, i) => (
            <OdysseyCard key={i} plan={plan} index={i} />
          ))}
        </SectionBlock>

        <SectionBlock title="Values Compass" icon="⚡" color="#E87C7C">
          <View style={s.valuesRow}>
            {(report.values_compass || []).map((v, i) => (
              <View key={i} style={s.valueBadge}>
                <Text style={s.valueBadgeText}>{v}</Text>
              </View>
            ))}
          </View>
        </SectionBlock>

        <SectionBlock title="The North Star Question" icon="♡" color="#C9A0DC">
          <View style={s.northBox}>
            <Text style={s.northText}>"{report.north_star_question}"</Text>
          </View>
        </SectionBlock>

        <SectionBlock title="Prototype Experiments" icon="→" color="#87C9A0">
          {(report.immediate_experiments || []).map((exp, i) => (
            <View key={i} style={s.expRow}>
              <Text style={s.expTimeline}>{exp.timeline}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.expTitle}>{exp.experiment}</Text>
                <Text style={s.expPurpose}>{exp.purpose}</Text>
              </View>
            </View>
          ))}
        </SectionBlock>

        <SectionBlock title="Coach's Observation" icon="◎" color="#7CB9E8">
          <View style={s.coachBox}>
            <Text style={s.coachText}>{report.coach_observation}</Text>
          </View>
        </SectionBlock>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0e17' },
  centered: { alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 22, paddingTop: 16 },
  homeBtn: { marginBottom: 20 },
  homeBtnText: { fontSize: 13, color: 'rgba(232,228,220,0.35)' },
  reportLabel: { fontSize: 9, letterSpacing: 6, color: 'rgba(232,168,124,0.4)', marginBottom: 6 },
  reportTitle: { fontSize: 36, color: '#e8e4dc', fontWeight: '300', lineHeight: 42 },
  accent: { color: '#E8A87C', fontStyle: 'italic' },
  divider: { width: 36, height: 1, backgroundColor: '#E8A87C', marginVertical: 20, marginBottom: 32 },
  block: { marginBottom: 36 },
  blockHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  blockIcon: { fontSize: 16 },
  blockTitle: { fontSize: 16, fontWeight: '500', color: '#e8e4dc' },
  blockLine: { flex: 1, height: 1 },
  bodyText: { fontSize: 14, color: 'rgba(232,228,220,0.65)', lineHeight: 22 },
  quadrantGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  quadrant: { width: '48%', borderWidth: 1, borderRadius: 8, padding: 14 },
  quadrantLabel: { fontSize: 8, letterSpacing: 2, marginBottom: 6 },
  quadrantText: { fontSize: 12, color: 'rgba(232,228,220,0.7)', lineHeight: 18 },
  ikigaiBox: {
    backgroundColor: 'rgba(232,168,124,0.06)', borderWidth: 1,
    borderColor: 'rgba(232,168,124,0.22)', borderRadius: 8, padding: 18, alignItems: 'center',
  },
  ikigaiLabel: { fontSize: 8, letterSpacing: 4, color: 'rgba(232,168,124,0.45)', marginBottom: 10 },
  ikigaiText: { fontSize: 15, fontStyle: 'italic', color: '#E8A87C', lineHeight: 22, textAlign: 'center' },
  odysseyCard: { borderWidth: 1, borderRadius: 10, padding: 18, marginBottom: 14 },
  odysseyPlanLabel: { fontSize: 8, letterSpacing: 3, marginBottom: 4 },
  odysseyTitle: { fontSize: 17, color: '#e8e4dc', fontWeight: '500', marginBottom: 4 },
  odysseyTagline: { fontSize: 13, fontStyle: 'italic', color: 'rgba(232,228,220,0.45)', marginBottom: 16 },
  subhead: { fontSize: 8, letterSpacing: 3, marginBottom: 8, marginTop: 4 },
  moveRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  moveArrow: { fontSize: 13, marginTop: 1 },
  moveText: { fontSize: 13, color: 'rgba(232,228,220,0.65)', flex: 1, lineHeight: 19 },
  assessBox: { backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 6, padding: 12, marginVertical: 12 },
  assessLabel: { fontSize: 8, letterSpacing: 3, color: 'rgba(220,100,100,0.5)', marginBottom: 4 },
  assessText: { fontSize: 12, color: 'rgba(232,228,220,0.45)', lineHeight: 18 },
  barBlock: { marginBottom: 8 },
  barRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barLabel: { fontSize: 11, color: 'rgba(232,228,220,0.4)' },
  barValue: { fontSize: 11, fontWeight: '600' },
  barTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2 },
  barFill: { height: '100%', borderRadius: 2 },
  valuesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  valueBadge: {
    backgroundColor: 'rgba(232,124,124,0.08)', borderWidth: 1,
    borderColor: 'rgba(232,124,124,0.2)', borderRadius: 4, paddingHorizontal: 14, paddingVertical: 7,
  },
  valueBadgeText: { fontSize: 13, color: '#E87C7C' },
  northBox: {
    backgroundColor: 'rgba(201,160,220,0.06)', borderWidth: 1,
    borderColor: 'rgba(201,160,220,0.2)', borderRadius: 8, padding: 20,
  },
  northText: { fontSize: 17, fontStyle: 'italic', color: '#C9A0DC', lineHeight: 24, textAlign: 'center' },
  expRow: {
    flexDirection: 'row', gap: 16,
    backgroundColor: 'rgba(135,201,160,0.04)', borderWidth: 1,
    borderColor: 'rgba(135,201,160,0.12)', borderRadius: 8, padding: 14, marginBottom: 10,
  },
  expTimeline: { fontSize: 9, letterSpacing: 2, color: '#87C9A0', minWidth: 58, paddingTop: 2 },
  expTitle: { fontSize: 14, color: '#e8e4dc', marginBottom: 4 },
  expPurpose: { fontSize: 12, color: 'rgba(232,228,220,0.4)' },
  coachBox: { borderLeftWidth: 2, borderLeftColor: '#7CB9E8', paddingLeft: 16 },
  coachText: { fontSize: 14, fontStyle: 'italic', color: 'rgba(232,228,220,0.65)', lineHeight: 22 },
  errorText: { fontSize: 15, color: 'rgba(232,228,220,0.4)', marginBottom: 16 },
  backLink: { fontSize: 14, color: '#E8A87C' },
})
