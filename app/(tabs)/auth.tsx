import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSignUp, useSignIn, useOAuth } from '@clerk/clerk-expo';
import { router } from 'expo-router';

export default function AuthScreen() {
  const [isSignIn, setIsSignIn] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
  const [username, setUsername] = useState('');
  const [pendingSignUp, setPendingSignUp] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const { signUp, setActive } = useSignUp();
  const { signIn } = useSignIn();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });

  const handleEmailAuth = async () => {
    if (isLoading) return;
    setIsLoading(true);

    if (isSignIn) {
      try {
        if (!signIn) {
          Alert.alert('Error', 'Sign-in is not initialized.');
          setIsLoading(false);
          return;
        }
        if (!email || !password) {
          Alert.alert('Error', 'Please fill in all fields.');
          setIsLoading(false);
          return;
        }
        const signInResponse = await signIn.create({
          identifier: email,
          password,
        });
        if (signInResponse.status === 'complete') {
          setActive && await setActive({ session: signInResponse.createdSessionId });
          Alert.alert('Success', 'Signed in successfully!');
          router.replace('/Home');
        } else {
          Alert.alert('Error', 'Sign-in failed. Please check your credentials.');
        }
      } catch (err) {
        Alert.alert('Error', `Sign-in failed: ${err.message || 'Unknown error'}`);
        console.log('Sign-in Error:', JSON.stringify(err, null, 2));
      } finally {
        setIsLoading(false);
      }
    } else if (!showVerification) {
      if (password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match.');
        setIsLoading(false);
        return;
      }
      if (!fullName || !email || !password) {
        Alert.alert('Error', 'Please fill in all fields.');
        setIsLoading(false);
        return;
      }
      try {
        if (!signUp) {
          Alert.alert('Error', 'Sign-up is not initialized.');
          setIsLoading(false);
          return;
        }
        const signUpResponse = await signUp.create({
          firstName: fullName.split(' ')[0],
          lastName: fullName.split(' ').slice(1).join(' ') || '',
          emailAddress: email,
          password,
        });
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        Alert.alert('Success', 'Verification email sent. Please enter the code below.');
        setShowVerification(true);
      } catch (err) {
        Alert.alert('Error', `Sign-up failed: ${err.message || 'Unknown error'}`);
        console.log('Sign-up Error:', JSON.stringify(err, null, 2));
      } finally {
        setIsLoading(false);
      }
    } else {
      try {
        if (!verificationCode) {
          Alert.alert('Error', 'Please enter the verification code.');
          setIsLoading(false);
          return;
        }
        const completeSignUp = await signUp.attemptEmailAddressVerification({ code: verificationCode });
        if (completeSignUp.status === 'complete') {
          await setActive({ session: completeSignUp.createdSessionId });
          Alert.alert('Success', 'Account verified and signed in!');
          router.replace('/Home');
        } else {
          Alert.alert('Error', 'Verification failed. Please try again.');
        }
      } catch (err) {
        Alert.alert('Error', `Verification failed: ${err.message || 'Unknown error'}`);
        console.log('Verification Error:', JSON.stringify(err, null, 2));
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    if (isLoading) return;
    setIsLoading(true);

    if (showUsernamePrompt && pendingSignUp) {
      try {
        if (!username) {
          Alert.alert('Error', 'Please enter a username.');
          setIsLoading(false);
          return;
        }
        await pendingSignUp.update({ username });
        const completeSignUp = await pendingSignUp.create();
        if (completeSignUp.status === 'complete') {
          await setActive({ session: completeSignUp.createdSessionId });
          Alert.alert('Success', 'Signed up with Google successfully!');
          setShowUsernamePrompt(false);
          setPendingSignUp(null);
          router.replace('/Home');
        } else {
          Alert.alert('Error', 'Failed to complete signup. Please try again.');
        }
      } catch (err) {
        Alert.alert('Error', `Signup completion failed: ${err.message || 'Unknown error'}`);
        console.error('Signup Completion Error:', JSON.stringify(err, null, 2));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    try {
      const oAuthResponse = await startOAuthFlow();
      console.log('OAuth Response:', JSON.stringify(oAuthResponse, null, 2));
      const { createdSessionId, setActive, authSessionResult, signUp: signUpResponse } = oAuthResponse;
      if (createdSessionId) {
        setActive && await setActive({ session: createdSessionId });
        Alert.alert('Success', 'Signed in with Google successfully!');
        router.replace('/Home');
      } else {
        const resultDetails = authSessionResult ? JSON.stringify(authSessionResult, null, 2) : 'No auth session result';
        if (signUpResponse.status === 'missing_requirements' && signUpResponse.missingFields.includes('username')) {
          setPendingSignUp(signUpResponse);
          setShowUsernamePrompt(true);
          Alert.alert('Action Required', 'Please provide a username to complete signup.');
        } else {
          Alert.alert('Error', `Google Sign-In failed: No session ID returned.\nDetails: ${resultDetails}`);
          console.error('No Session ID:', resultDetails);
        }
      }
    } catch (err) {
      const errorMessage = err.message || 'Unknown error';
      const clerkErrors = err.errors ? JSON.stringify(err.errors, null, 2) : 'No additional error details';
      Alert.alert('Error', `Google Sign-In failed: ${errorMessage}\nDetails: ${clerkErrors}`);
      console.error('Google Sign-In Error:', JSON.stringify(err, null, 2));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.appTitle}>{isSignIn ? 'Welcome Back' : 'Create Account'}</Text>
        <Text style={styles.subTitle}>
          {isSignIn ? 'Sign in to continue your journey' : 'Join us today'}
        </Text>
      </View>

      <View style={styles.form}>
        {!isSignIn && !showVerification && !showUsernamePrompt && (
          <TextInput
            placeholder="Full Name"
            style={styles.input}
            placeholderTextColor="#666"
            value={fullName}
            onChangeText={setFullName}
          />
        )}
        {!showVerification && !showUsernamePrompt && (
          <TextInput
            placeholder="Email Address"
            keyboardType="email-address"
            style={styles.input}
            placeholderTextColor="#666"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />
        )}
        {!showVerification && !showUsernamePrompt && (
          <View style={styles.passwordContainer}>
            <TextInput
              placeholder="Password"
              secureTextEntry={!showPassword}
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholderTextColor="#666"
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.icon} onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color="#FF9933" />
            </TouchableOpacity>
          </View>
        )}
        {!isSignIn && !showVerification && !showUsernamePrompt && (
          <View style={styles.passwordContainer}>
            <TextInput
              placeholder="Confirm Password"
              secureTextEntry={!showConfirm}
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholderTextColor="#666"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.icon} onPress={() => setShowConfirm(!showConfirm)}>
              <Ionicons name={showConfirm ? 'eye-off' : 'eye'} size={24} color="#FF9933" />
            </TouchableOpacity>
          </View>
        )}
        {showVerification && (
          <TextInput
            placeholder="Verification Code"
            style={styles.input}
            placeholderTextColor="#666"
            value={verificationCode}
            onChangeText={setVerificationCode}
            keyboardType="numeric"
          />
        )}
        {showUsernamePrompt && (
          <TextInput
            placeholder="Username"
            style={styles.input}
            placeholderTextColor="#666"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        )}
        <TouchableOpacity
          style={[styles.primaryButton, isLoading && styles.disabledButton]}
          onPress={showUsernamePrompt ? handleGoogleSignIn : handleEmailAuth}
          disabled={isLoading}
        >
          <Text style={styles.primaryButtonText}>
            {isLoading
              ? 'Loading...'
              : isSignIn
              ? 'Sign In'
              : showVerification
              ? 'Verify Code'
              : showUsernamePrompt
              ? 'Complete Sign Up'
              : 'Sign Up'}
          </Text>
        </TouchableOpacity>
        {!showVerification && !showUsernamePrompt && (
          <>
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.or}>OR</Text>
              <View style={styles.divider} />
            </View>
            <TouchableOpacity
              style={[styles.googleButton, isLoading && styles.disabledButton]}
              onPress={handleGoogleSignIn}
              disabled={isLoading}
            >
              <Text style={styles.googleText}>Continue with Google</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsSignIn(!isSignIn)} disabled={isLoading}>
              <Text style={styles.switchText}>
                {isSignIn ? "Don't have an account? " : 'Already have an account? '}
                <Text style={styles.switchAction}>{isSignIn ? 'Sign Up' : 'Sign In'}</Text>
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#000',
    paddingVertical: 60,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appTitle: {
    color: '#FF9933',
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1,
  },
  subTitle: {
    color: '#CCC',
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
    fontWeight: '400',
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    color: '#fff',
    marginBottom: 20,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
  },
  icon: {
    paddingHorizontal: 12,
  },
  primaryButton: {
    backgroundColor: '#FF9933',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 30,
    shadowColor: '#FF9933',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  disabledButton: {
    backgroundColor: '#FF9933',
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#FF9933',
  },
  or: {
    textAlign: 'center',
    color: '#FF9933',
    marginHorizontal: 15,
    fontSize: 16,
    fontWeight: '600',
  },
  googleButton: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  googleText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  switchText: {
    color: '#FF9933',
    fontSize: 16,
    textAlign: 'center',
  },
  switchAction: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});