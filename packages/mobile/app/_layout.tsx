import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: '#0f1b2d' },
          headerTintColor: '#3ecf8e',
          tabBarStyle: { backgroundColor: '#172033', borderTopColor: '#1e3050' },
          tabBarActiveTintColor: '#3ecf8e',
          tabBarInactiveTintColor: '#94a3b8',
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: 'Dashboard', headerTitle: 'Islamic Dashboard' }}
        />
        <Tabs.Screen
          name="quran"
          options={{ title: 'Quran', headerTitle: 'Quran Reader' }}
        />
        <Tabs.Screen
          name="reminders"
          options={{ title: 'Reminders', headerTitle: 'Reminders' }}
        />
      </Tabs>
    </>
  );
}
