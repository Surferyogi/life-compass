import 'react-native-url-polyfill/auto'
import { useEffect, useState } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StatusBar } from 'expo-status-bar'
import { supabase } from './src/lib/supabase'
import AuthScreen from './src/screens/AuthScreen'
import HomeScreen from './src/screens/HomeScreen'
import InterviewScreen from './src/screens/InterviewScreen'
import ReportScreen from './src/screens/ReportScreen'

const Stack = createNativeStackNavigator()

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return null

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0b0e17' },
          animation: 'slide_from_right',
        }}
      >
        {session ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} initialParams={{ userId: session.user.id }} />
            <Stack.Screen name="Interview" component={InterviewScreen} />
            <Stack.Screen name="Report" component={ReportScreen} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
