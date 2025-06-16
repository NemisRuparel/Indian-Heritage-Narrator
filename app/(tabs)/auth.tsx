import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  ActivityIndicator,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSignUp, useSignIn, useOAuth } from '@clerk/clerk-expo';
import { router } from 'expo-router';

export default function AuthScreen() {
  // State management for form inputs and UI
  const [isSignIn, setIsSignIn] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [showVerification, setShowVerification] = useState(false);
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
  const [username, setUsername] = useState('');
  const [pendingSignUp, setPendingSignUp] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [toast, setToast] = useState({ message: '', type: '', visible: false });
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const inputRefs = useRef([]);

  // Clerk hooks
  const { signUp, setActive } = useSignUp();
  const { signIn } = useSignIn();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });

  // Toast notification handler
  const showToast = (message, type = 'error') => {
    setToast({ message, type, visible: true });
    Animated.timing(toastOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setTimeout(() => {
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setToast({ message: '', type: '', visible: false }));
    }, 3000);
  };

  // OTP input handlers
  const handleOtpChange = (text, index) => {
    if (!/^\d*$/.test(text)) return; // Only allow digits
    const newCode = [...verificationCode];
    newCode[index] = text;
    setVerificationCode(newCode);
    if (text && index < 5) {
      inputRefs.current[index + 1].focus();
    } else if (!text && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleOtpPaste = (text) => {
    if (text.length === 6 && /^\d{6}$/.test(text)) {
      const newCode = text.split('');
      setVerificationCode(newCode);
      inputRefs.current[5].focus();
    }
  };

  // Main authentication handler
  const handleEmailAuth = async () => {
    if (isLoading) return;
    setIsLoading(true);

    // Sign-in flow
    if (isSignIn && !isForgotPassword) {
      try {
        if (!signIn) {
          showToast('Sign-in service is not initialized.');
          return;
        }
        if (!email || !password) {
          showToast('Please fill in all fields.');
          return;
        }
        const signInResponse = await signIn.create({
          identifier: email,
          password,
        });
        if (signInResponse.status === 'complete') {
          await setActive({ session: signInResponse.createdSessionId });
          showToast('Signed in successfully!', 'success');
          router.replace('/Home');
        } else {
          showToast('Sign-in failed. Please check your credentials.');
        }
      } catch (err) {
        showToast(`Sign-in failed: ${err.message || 'Unknown error'}`);
        console.log('Sign-in Error:', JSON.stringify(err, null, 2));
      } finally {
        setIsLoading(false);
      }
    }
    // Sign-up flow
    else if (!isSignIn && !isForgotPassword) {
      if (!showVerification) {
        if (password !== confirmPassword) {
          showToast('Passwords do not match.');
          setIsLoading(false);
          return;
        }
        if (!fullName || !email || !password) {
          showToast('Please fill in all fields.');
          setIsLoading(false);
          return;
        }
        try {
          if (!signUp) {
            showToast('Sign-up service is not initialized.');
            setIsLoading(false);
            return;
          }
          await signUp.create({
            firstName: fullName.split(' ')[0],
            lastName: fullName.split(' ').slice(1).join(' ') || '',
            emailAddress: email,
            password,
          });
          await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
          showToast('Verification email sent. Please enter the code.', 'success');
          setShowVerification(true);
        } catch (err) {
          showToast(`Sign-up failed: ${err.message || 'Unknown error'}`);
          console.log('Sign-up Error:', JSON.stringify(err, null, 2));
        } finally {
          setIsLoading(false);
        }
      } else {
        const code = verificationCode.join('');
        if (code.length !== 6 || !/^\d{6}$/.test(code)) {
          showToast('Please enter a valid 6-digit code.');
          setIsLoading(false);
          return;
        }
        try {
          const completeSignUp = await signUp.attemptEmailAddressVerification({ code });
          if (completeSignUp.status === 'complete') {
            await setActive({ session: completeSignUp.createdSessionId });
            showToast('Account verified and signed in!', 'success');
            router.replace('/Home');
          } else {
            showToast('Verification failed. Please try again.');
          }
        } catch (err) {
          showToast(`Verification failed: ${err.message || 'Unknown error'}`);
          console.log('Verification Error:', JSON.stringify(err, null, 2));
        } finally {
          setIsLoading(false);
        }
      }
    }
    // Forgot password flow
    else if (isForgotPassword) {
      if (!showVerification) {
        try {
          if (!email) {
            showToast('Please enter your email address.');
            setIsLoading(false);
            return;
          }
          await signIn.create({
            identifier: email,
            strategy: 'reset_password_email_code',
          });
          showToast('Password reset email sent. Please enter the code.', 'success');
          setShowVerification(true);
        } catch (err) {
          showToast(`Password reset failed: ${err.message || 'Unknown error'}`);
          console.log('Password Reset Error:', JSON.stringify(err, null, 2));
        } finally {
          setIsLoading(false);
        }
      } else {
        const code = verificationCode.join('');
        if (code.length !== 6 || !/^\d{6}$/.test(code)) {
          showToast('Please enter a valid 6-digit code.');
          setIsLoading(false);
          return;
        }
        if (!resetPassword || !resetConfirmPassword) {
          showToast('Please fill in all password fields.');
          setIsLoading(false);
          return;
        }
        if (resetPassword !== resetConfirmPassword) {
          showToast('Passwords do not match.');
          setIsLoading(false);
          return;
        }
        try {
          const resetResponse = await signIn.attemptFirstFactor({
            strategy: 'reset_password_email_code',
            code,
            password: resetPassword,
          });
          if (resetResponse.status === 'complete') {
            await setActive({ session: resetResponse.createdSessionId });
            showToast('Password reset successfully!', 'success');
            setIsForgotPassword(false);
            setShowVerification(false);
            setVerificationCode(['', '', '', '', '', '']);
            setResetPassword('');
            setResetConfirmPassword('');
            router.replace('/Home');
          } else {
            showToast('Password reset failed. Please try again.');
          }
        } catch (err) {
          showToast(`Password reset failed: ${err.message || 'Unknown error'}`);
          console.log('Password Reset Verification Error:', JSON.stringify(err, null, 2));
        } finally {
          setIsLoading(false);
        }
      }
    }
  };

  // Google OAuth handler
  const handleGoogleSignIn = async () => {
    if (isLoading) return;
    setIsLoading(true);

    if (showUsernamePrompt && pendingSignUp) {
      try {
        if (!username) {
          showToast('Please enter a username.');
          setIsLoading(false);
          return;
        }
        await pendingSignUp.update({ username });
        const completeSignUp = await pendingSignUp.create();
        if (completeSignUp.status === 'complete') {
          await setActive({ session: completeSignUp.createdSessionId });
          showToast('Signed up with Google successfully!', 'success');
          setShowUsernamePrompt(false);
          setPendingSignUp(null);
          router.replace('/Home');
        } else {
          showToast('Failed to complete signup. Please try again.');
        }
      } catch (err) {
        showToast(`Signup completion failed: ${err.message || 'Unknown error'}`);
        console.error('Signup Completion Error:', JSON.stringify(err, null, 2));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    try {
      const { createdSessionId, setActive, authSessionResult, signUp: signUpResponse } = await startOAuthFlow();
      if (createdSessionId) {
        await setActive({ session: createdSessionId });
        showToast('Signed in with Google successfully!', 'success');
        router.replace('/Home');
      } else {
        if (signUpResponse?.status === 'missing_requirements' && signUpResponse.missingFields.includes('username')) {
          setPendingSignUp(signUpResponse);
          setShowUsernamePrompt(true);
          showToast('Please provide a username to complete signup.', 'info');
        } else {
          showToast('Google Sign-In failed: No session ID returned.');
          console.error('No Session ID:', JSON.stringify(authSessionResult, null, 2));
        }
      }
    } catch (err) {
      showToast(`Google Sign-In failed: ${err.message || 'Unknown error'}`);
      console.error('Google Sign-In Error:', JSON.stringify(err, null, 2));
    } finally {
      setIsLoading(false);
    }
  };

  // Navigation handlers
  const handleForgotPassword = () => {
    setIsForgotPassword(true);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setVerificationCode(['', '', '', '', '', '']);
    setResetPassword('');
    setResetConfirmPassword('');
    setShowVerification(false);
    setShowUsernamePrompt(false);
  };

  const handleBackToSignIn = () => {
    setIsForgotPassword(false);
    setShowVerification(false);
    setVerificationCode(['', '', '', '', '', '']);
    setResetPassword('');
    setResetConfirmPassword('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setShowUsernamePrompt(false);
  };

  return (
    <View style={styles.outerContainer}>
      {toast.visible && (
        <Animated.View
          style={[
            styles.toastContainer,
            { opacity: toastOpacity, backgroundColor: toast.type === 'success' ? '#4CAF50' : toast.type === 'info' ? '#2196F3' : '#F44336' },
          ]}
        >
          <Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>
      )}
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.appTitle}>
            {isForgotPassword ? 'Reset Password' : isSignIn ? 'Welcome Back' : 'Create Account'}
          </Text>
          <Text style={styles.subTitle}>
            {isForgotPassword
              ? 'Enter your email to reset your password'
              : isSignIn
              ? 'Sign in to continue your journey'
              : 'Join us today'}
          </Text>
        </View>

        <View style={styles.form}>
          {!isSignIn && !showVerification && !showUsernamePrompt && !isForgotPassword && (
            <TextInput
              placeholder="Full Name"
              style={styles.input}
              placeholderTextColor="#666"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
          )}
          {(!showVerification || (isForgotPassword && !showVerification)) && !showUsernamePrompt && (
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
          {!showVerification && !showUsernamePrompt && isSignIn && !isForgotPassword && (
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
          {!isSignIn && !showVerification && !showUsernamePrompt && !isForgotPassword && (
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
          {!isSignIn && !showVerification && !showUsernamePrompt && !isForgotPassword && (
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
            <View style={styles.otpContainer}>
              {verificationCode.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  style={styles.otpInput}
                  placeholder="0"
                  placeholderTextColor="#666"
                  value={digit}
                  onChangeText={(text) => handleOtpChange(text, index)}
                  onKeyPress={({ nativeEvent }) => {
                    if (nativeEvent.key === 'Backspace' && !digit && index > 0) {
                      inputRefs.current[index - 1].focus();
                    }
                  }}
                  keyboardType="numeric"
                  maxLength={1}
                  textAlign="center"
                  autoCapitalize="none"
                />
              ))}
            </View>
          )}
          {isForgotPassword && showVerification && (
            <View style={styles.passwordContainer}>
              <TextInput
                placeholder="New Password"
                secureTextEntry={!showResetPassword}
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholderTextColor="#666"
                value={resetPassword}
                onChangeText={setResetPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.icon} onPress={() => setShowResetPassword(!showResetPassword)}>
                <Ionicons name={showResetPassword ? 'eye-off' : 'eye'} size={24} color="#FF9933" />
              </TouchableOpacity>
            </View>
          )}
          {isForgotPassword && showVerification && (
            <View style={styles.passwordContainer}>
              <TextInput
                placeholder="Confirm New Password"
                secureTextEntry={!showResetConfirm}
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholderTextColor="#666"
                value={resetConfirmPassword}
                onChangeText={setResetConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.icon} onPress={() => setShowResetConfirm(!showResetConfirm)}>
                <Ionicons name={showResetConfirm ? 'eye-off' : 'eye'} size={24} color="#FF9933" />
              </TouchableOpacity>
            </View>
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
            {isLoading ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {isForgotPassword
                  ? showVerification
                    ? 'Reset Password'
                    : 'Send Reset Email'
                  : isSignIn
                  ? 'Sign In'
                  : showVerification
                  ? 'Verify Code'
                  : showUsernamePrompt
                  ? 'Complete Sign Up'
                  : 'Sign Up'}
              </Text>
            )}
          </TouchableOpacity>
          {!showVerification && !showUsernamePrompt && isSignIn && !isForgotPassword && (
            <TouchableOpacity onPress={handleForgotPassword} disabled={isLoading}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          )}
          {!showVerification && !showUsernamePrompt && !isForgotPassword && (
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
  <Image
    source={{ uri: 'https://crystalpng.com/wp-content/uploads/2025/05/google-logo.png' }}
    style={styles.googleImage}
  />
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
          {isForgotPassword && (
            <TouchableOpacity onPress={handleBackToSignIn} disabled={isLoading}>
              <Text style={styles.switchText}>Back to Sign In</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
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
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  otpInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    width: 40,
    height: 50,
    textAlign: 'center',
    color: '#fff',
    fontSize: 18,
    borderWidth: 1,
    borderColor: '#1A1A1A',
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
    alignItems: 'center',
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
  googleImage: {
    width: 24,
    height: 24,
    marginRight: 5,
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
  forgotPasswordText: {
    color: '#FF9933',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    textDecorationLine: 'underline',
  },
  toastContainer: {
    position: 'absolute',
    top: 40,
    left: 20,
    right: 20,
    padding: 15,
    borderRadius: 8,
    zIndex: 1000,
  },
  toastText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});