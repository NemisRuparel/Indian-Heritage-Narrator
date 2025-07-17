import { Tabs } from 'expo-router';
import { ThemeProvider } from './ThemeContext';

export default function TabLayout() {
  return (
    <ThemeProvider>
    <Tabs
      screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      initialRouteName="index"
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="auth" />
      <Tabs.Screen name="Home" />
    </Tabs>
    </ThemeProvider>
  );
}