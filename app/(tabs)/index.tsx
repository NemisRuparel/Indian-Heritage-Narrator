import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// Consistent with Home.tsx
const Colors = {
  background: '#0D0D0D',
  cardBackground: '#1C1C1C',
  primaryAccent: '#8B6F47',
  secondaryAccent: '#6B4E31',
  textPrimary: '#F5F5F5',
  textSecondary: '#B0B0B0',
  border: '#404040',
  error: '#CF2A27',
  success: '#00C4B4',
  shadow: 'rgba(0,0,0,0.5)',
  like: '#ff0770',
};

const Fonts = {
  heading: Platform.OS === 'ios' ? 'PlayfairDisplay-Bold' : 'serif',
  subheading: Platform.OS === 'ios' ? 'Inter-SemiBold' : 'sans-serif-medium',
  body: Platform.OS === 'ios' ? 'Inter-Regular' : 'sans-serif',
  button: Platform.OS === 'ios' ? 'Inter-Bold' : 'sans-serif',
};

const GetStartedScreen = () => {
  const { isSignedIn, isLoaded } = useAuth();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      router.replace('/Home');
    }
  }, [isSignedIn, isLoaded]);

  useEffect(() => {
    StatusBar.setHidden(false);
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor(Colors.background);
  }, [insets]);

  if (!isLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primaryAccent} />
        <Text style={styles.loadingText}>Loading application...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[Colors.background, Colors.cardBackground]}
        style={styles.backgroundGradient}
      >
        <View style={styles.contentContainer}>
          <View style={styles.header}>
            {/* <Text style={styles.headerTitle}>DevTales</Text> */}
            <Image
              source={require('../../assets/images/Devtales.png')}
              style={[styles.headerTitle]}
              
              />
          </View>

          <View style={styles.welcomeCard}>
            <Text style={styles.welcomeText}>Welcome to</Text>
            <Text style={styles.appName}>DevTales</Text>
            <Text style={styles.tagline}>Legends of Bharat, Retold</Text>
            <View style={styles.divider} />
            <Text style={styles.description}>
              Discover and share timeless stories from Indian mythology, epics, and folklore.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.getStartedButton}
            onPress={() => router.replace('/Home')}
          >
            <LinearGradient
              colors={[Colors.primaryAccent, Colors.secondaryAccent]}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={24} color={Colors.textPrimary} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backgroundGradient: {
    flex: 1,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    color: Colors.textPrimary,
    marginTop: 10,
    fontSize: 16,
    fontFamily: Fonts.body,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    
    
    marginBottom: 40,
    paddingHorizontal: 15,
     width: 160, 
    height: 160,
    borderRadius: 80, 
    borderWidth: 2,   
    borderColor: Colors.secondaryAccent, 
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
  width: 150,
  height: 150,
  borderRadius: 75, 
  },
  welcomeCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 15,
    padding: 25,
    marginHorizontal: 15,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  welcomeText: {
    fontSize: 20,
    fontFamily: Fonts.subheading,
    color: Colors.textSecondary,
    marginBottom: 5,
  },
  appName: {
    fontSize: 32,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  tagline: {
    fontSize: 18,
    fontFamily: Fonts.subheading,
    color: Colors.primaryAccent,
    fontStyle: 'italic',
    marginBottom: 15,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 15,
  },
  description: {
    fontSize: 16,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 20,
  },
  getStartedButton: {
    borderRadius: 10,
    overflow: 'hidden',
    marginHorizontal: 15,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  buttonText: {
    color: Colors.textPrimary,
    fontFamily: Fonts.button,
    fontSize: 18,
    marginRight: 10,
  },
});

export default GetStartedScreen;