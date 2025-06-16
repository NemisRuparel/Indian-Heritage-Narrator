import { useAuth } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

export default function HomeScreen() {
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    console.log('Home Auth Status:', { isLoaded, isSignedIn });
    if (!isSignedIn) {
      console.log('Unauthorized access to /Home, redirecting to /auth');
      router.replace('/auth');
    }
  }, [isSignedIn, isLoaded]);

  if (!isLoaded || !isSignedIn) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF8000" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Home!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#FF8000',
    fontSize: 18,
    marginTop: 10,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
});