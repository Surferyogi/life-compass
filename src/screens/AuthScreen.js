import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native'
import { supabase } from '../lib/supabase'

export default function AuthScreen() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const signIn = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: 'koksum@yahoo.com',
      password: password.trim(),
    })
    setLoading(false)
    if (error) { Alert.alert('Error', error.message) }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.inner}>
        <Text style={styles.label}>LIFE DESIGN STUDIO</Text>
        <Text style={styles.title}>The Life</Text>
        <Text style={styles.titleAccent}>Compass</Text>
        <View style={styles.divider} />
        <Text style={styles.subtitle}>Welcome back, CK.</Text>
        <TextInput style={styles.input} value={password} onChangeText={setPassword}
          placeholder="Password" placeholderTextColor="rgba(232,228,220,0.25)"
          secureTextEntry autoCapitalize="none" autoCorrect={false} />
        <TouchableOpacity style={styles.btn} onPress={signIn}>
          <Text style={styles.btnText}>{loading ? 'Signing in...' : 'Enter'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0e17' },
  inner: { flex: 1, justifyContent: 'center', padding: 32 },
  label: { fontSize: 10, letterSpacing: 6, color: 'rgba(232,168,124,0.5)', marginBottom: 12 },
  title: { fontSize: 44, color: '#e8e4dc', fontWeight: '300' },
  titleAccent: { fontSize: 44, color: '#E8A87C', fontStyle: 'italic', fontWeight: '300', marginBottom: 4 },
  divider: { width: 40, height: 1, backgroundColor: '#E8A87C', marginVertical: 24 },
  subtitle: { fontSize: 15, color: 'rgba(232,228,220,0.55)', lineHeight: 22, marginBottom: 28 },
  input: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 16, color: '#e8e4dc', fontSize: 16, marginBottom: 16 },
  btn: { backgroundColor: '#E8A87C', borderRadius: 4, padding: 16, alignItems: 'center' },
  btnText: { color: '#0b0e17', fontSize: 13, letterSpacing: 2, fontWeight: '700' },
})
