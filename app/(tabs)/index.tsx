import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@clerk/clerk-expo';
import { router } from 'expo-router';

const { width, height } = Dimensions.get('window');

const GetStartedScreen = () => {
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    console.log('Auth Status:', { isLoaded, isSignedIn });
    try {
      if (isSignedIn) {
        console.log('Redirecting to /Home');
        router.replace('/Home');
      }
    } catch (error) {
      console.error('Redirect Error:', error);
    }
  }, [isSignedIn, isLoaded]);

  if (!isLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF8000" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Image
        style={styles.logo}
        source={require('../../assets/images/Devtales.png')}
        resizeMode="contain"
      />
      <Text style={styles.title}>Welcome to</Text>
      <Text style={styles.slogan}>"Legends of Bharat, Retold."</Text>

      <Image
        style={styles.thought}
        source={require('../../assets/images/thought.png')}
        resizeMode="contain"
      />
      <Image
        style={styles.avtarImage}
        source={require('../../assets/images/avtar-removebg.png')}
        resizeMode="contain"
      />

      <TouchableOpacity
        style={styles.getStartedBtn}
        onPress={() => {
          console.log('Navigating to /auth');
          router.replace('/auth');
        }}
      >
        <LinearGradient
          colors={['#FF8000', '#9ECA6F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          <Text style={styles.getStartedText}>Get Started</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
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
    fontWeight: '600',
    marginTop: 10,
  },
  logo: {
    height: height * 0.15,
    width: height * 0.15,
    position: 'absolute',
    top: height * 0.045,
    right: width * 0.05,
  },
  title: {
    color: '#fff',
    position: 'absolute',
    top: height * 0.07,
    left: width * 0.04,
    fontSize: height * 0.034,
    fontWeight: '900',
  },
  slogan: {
    color: '#fff',
    position: 'absolute',
    top: height * 0.14,
    left: width * 0.08,
    fontSize: height * 0.014,
    fontStyle: 'italic',
    fontWeight: '600',
  },
  thought: {
    height: height * 0.35,
    width: width * 0.75,
    position: 'absolute',
    top: height * 0.37,
  },
  avtarImage: {
    height: height * 0.35,
    width: height * 0.35,
    position: 'absolute',
    bottom: height * 0.1,
  },
  getStartedBtn: {
    position: 'absolute',
    bottom: height * 0.05,
    width: width * 0.85,
    height: height * 0.065,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    height: '100%',
    width: '100%',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  getStartedText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: height * 0.025,
  },
});

export default GetStartedScreen;