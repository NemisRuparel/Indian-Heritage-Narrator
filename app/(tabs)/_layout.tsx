import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}
      initialRouteName="index"
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="auth" />
      <Tabs.Screen name="Home" />
    </Tabs>
  );
}