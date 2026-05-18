import re

# Fix HomeScreen - replace Alert.alert with confirm for delete
content = open('src/screens/HomeScreen.js').read()

old_delete = """  const deleteSession = (sessionId) => {
    Alert.alert('Delete Session', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await supabase.from('lc_sessions').delete().eq('id', sessionId)
          setSessions(prev => prev.filter(s => s.id !== sessionId))
        } catch (e) { Alert.alert('Error', e.message) }
      }}
    ])
  }"""

new_delete = """  const deleteSession = async (sessionId) => {
    if (!window.confirm('Delete this session? This cannot be undone.')) return
    try {
      await supabase.from('lc_sessions').delete().eq('id', sessionId)
      setSessions(prev => prev.filter(s => s.id !== sessionId))
    } catch (e) { console.error(e) }
  }"""

content = content.replace(old_delete, new_delete)

old_signout = """  const signOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ])
  }"""

new_signout = """  const signOut = () => {
    if (!window.confirm('Sign out?')) return
    supabase.auth.signOut()
  }"""

content = content.replace(old_signout, new_signout)
open('src/screens/HomeScreen.js', 'w').write(content)
print('HomeScreen fixed')

# Fix InterviewScreen - replace Alert for exit with confirm
content2 = open('src/screens/InterviewScreen.js').read()

old_exit = """        Alert.alert('Save and Exit?', 'Your progress is saved.', [
          { text: 'Stay', style: 'cancel' },
          { text: 'Exit', onPress: () => navigation.navigate('Home') },
        ])"""

new_exit = """        if (window.confirm('Exit? Your progress is saved.')) navigation.navigate('Home')"""

content2 = content2.replace(old_exit, new_exit)

old_retry = """      Alert.alert(
        'Synthesis Error',
        e.message + '\\n\\nYour answers are saved. You can retry.',
        [
          { text: 'Retry', onPress: handleSynthesis },
          { text: 'Exit', onPress: () => navigation.navigate('Home') },
        ]
      )"""

new_retry = """      if (window.confirm('Synthesis error: ' + e.message + '\\n\\nRetry?')) {
        handleSynthesis()
      } else {
        navigation.navigate('Home')
      }"""

content2 = content2.replace(old_retry, new_retry)
open('src/screens/InterviewScreen.js', 'w').write(content2)
print('InterviewScreen fixed')
print('All done')
