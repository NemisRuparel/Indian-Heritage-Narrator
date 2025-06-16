import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, SafeAreaView, Animated, TouchableOpacity, useWindowDimensions } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useEffect } from 'react';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

// --- Color Theme (Unchanged) ---
const COLORS = {
  black: '#000',
  saffron: '#FF9933',
  white: '#FFFFFF',
  darkGray: '#1A1A1A',
  lightGray: '#2A2A2A',
  goldGradientStart: '#FFD700', // Gold-ish color for gradient
  goldGradientEnd: '#FFA500',   // Orange-ish gold for gradient
};

// --- Reusable Screen Wrapper Component ---
type ScreenWrapperProps = {
  title: string;
};

// --- Reusable Screen Wrapper Component ---
const ScreenWrapper = ({ title }) => {
  return (
    <SafeAreaView style={styles.screenContainer}>
      <LinearGradient
        colors={[COLORS.black, COLORS.darkGray]}
        style={styles.screenGradient}
      >
        {/* New Header View */}
        <View style={styles.topTitleContainer}>
          <Text style={styles.topTitleText}>{title}</Text>
        </View>

        {/* Existing Content Card */}
        <View style={styles.contentCard}>
          <Text style={styles.screenText}>Content for {title}</Text>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

// --- Screen Components (Simplified) ---
function HomeScreen() { return <ScreenWrapper title="Welcome to Home" />; }
function CategoryScreen() { return <ScreenWrapper title="Explore Categories" />; }
function ProfileScreen() { return <ScreenWrapper title="Your Profile" />; }
function SettingsScreen() { return <ScreenWrapper title="Adjust Settings" />; }

const Tab = createBottomTabNavigator();

// --- Modern Animated Tab Bar Component ---
function ModernTabBar({ state, descriptors, navigation }) {
  const { width } = useWindowDimensions();
  const tabWidth = (width - 40) / state.routes.length;
  const slideAnimation = useRef(new Animated.Value(0)).current;

  // Ref to store individual icon animations
  const iconAnimations = useRef(state.routes.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    // Animate the sliding pill
    Animated.spring(slideAnimation, {
      toValue: state.index * tabWidth,
      useNativeDriver: true,
      bounciness: 12,
    }).start();

    // Animate the current active icon's scale
    iconAnimations[state.index].setValue(0.8); // Start slightly smaller
    Animated.spring(iconAnimations[state.index], {
      toValue: 1.1, // Scale up slightly
      friction: 3, // Less bouncy than the pill
      tension: 100,
      useNativeDriver: true,
    }).start(() => {
      // After the bounce up, bring it back to normal size
      Animated.spring(iconAnimations[state.index], {
        toValue: 1, // Back to original size
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }).start();
    });

  }, [state.index, tabWidth]); // Dependency array for useEffect

  return (
    <View style={styles.tabBarPosition}>
      <BlurView intensity={80} tint="dark" style={styles.tabBarContainer}>
        {/* Sliding Pill Indicator with Gradient */}
        <Animated.View
          style={[
            styles.activeTabPillWrapper, // Use a wrapper for gradient
            { width: tabWidth, transform: [{ translateX: slideAnimation }] },
          ]}
        >
          <LinearGradient
            colors={[COLORS.saffron, COLORS.goldGradientEnd]} // Use your desired gradient colors
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.activeTabPillGradient}
          />
        </Animated.View>

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel !== undefined ? options.tabBarLabel : route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={[styles.tabButton, { width: tabWidth }]}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
            >
              <Animated.View
                style={[
                  styles.iconAndLabelContainer,
                  { transform: [{ scale: iconAnimations[index] }] }, // Apply scale animation here
                ]}
              >
                <Ionicons
                  name={options.tabBarIconName(isFocused)}
                  size={24}
                  color={isFocused ? COLORS.white : COLORS.white} // Changed active color to white for better contrast with saffron pill
                />
                {isFocused && (
                  <Text style={styles.tabLabel}>{label}</Text>
                )}
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </BlurView>
    </View>
  );
}

// --- Main App Component ---
export default function App() {
  return (
    <>
      <Tab.Navigator
        tabBar={(props) => <ModernTabBar {...props} />}
        screenOptions={({ route }) => ({
          headerShown: false, // Keep header hidden
          tabBarIconName: (focused) => {
            let iconName;
            if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
            else if (route.name === 'Category') iconName = focused ? 'grid' : 'grid-outline';
            else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
            else if (route.name === 'Settings') iconName = focused ? 'settings' : 'settings-outline';
            return iconName;
          },
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Category" component={CategoryScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
      <StatusBar style="light" backgroundColor={COLORS.black} />
    </>
  );
}

// --- Modernized StyleSheet ---
const styles = StyleSheet.create({
  // Screen Styles (unchanged from last iteration, but added 'Content for X' text)
  screenContainer: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  screenGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  contentCard: {
    backgroundColor: 'rgba(26, 26, 26, 0.85)',
    borderRadius: 20,
    padding: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 153, 51, 0.2)',
    shadowColor: COLORS.saffron,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
    alignSelf: 'stretch', // Make the card stretch horizontally within its parent
    marginHorizontal: 0, // No extra margin needed if parent padding is 20
  },
  screenText: {
    color: COLORS.saffron,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center', // Centered for content, not a header
  },

  // Tab Bar Styles
  tabBarPosition: {
    position: 'absolute',
    bottom: 25,
    left: 10,
    right: 20,
    height: 70,
    // Add subtle shadow to the whole tab bar
    shadowColor: COLORS.saffron,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 15, // For Android
  },
  tabBarContainer: {
    flexDirection: 'row',
    height: '100%',
    // width: 415,
    borderRadius: 20,
    overflow: 'hidden', // Essential to clip the pill
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    backgroundColor: 'transparent', 
  },
  activeTabPillWrapper: { // New wrapper for the gradient
    position: 'absolute',
    height: '80%',
    top: '10%',
    left:5,
    borderRadius: 15, // Match inner gradient border radius
    overflow: 'hidden', // Crucial to clip gradient
  },
  activeTabPillGradient: {
    flex: 1, 
    borderRadius: 15, // Apply border radius here
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)', // A slightly lighter border for the gradient
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    // No specific background, relies on BlurView
  },
  iconAndLabelContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  tabLabel: {
    color: COLORS.white, // Changed label color to white for contrast
    fontSize: 13,
    fontWeight: '600',
  },
});