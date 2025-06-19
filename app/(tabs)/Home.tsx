import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, TextInput, Alert, useWindowDimensions, Animated, Modal } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import axios from 'axios';
import { useClerk, useUser } from '@clerk/clerk-expo';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import Voice from '@react-native-voice/voice';

// Colors configuration with enhanced Hindu-themed palette
const COLORS = {
  black: '#000000',
  saffron: '#FF9933',
  saffronLight: '#FFB266',
  saffronDark: '#B3541E',
  white: '#FFFFFF',
  softWhite: '#F5F5F5',
  darkGray: '#1A1A1A',
  lightGray: '#2A2A2A',
  goldGradientStart: '#FFD700',
  goldGradientEnd: '#FFA500',
  grayText: '#B0B0B0',
  accentGold: '#F4C430',
  shadowGray: 'rgba(0, 0, 0, 0.6)',
  lightBackground: '#FFF8E7',
  deepMaroon: '#4A0E0E',
  lotusPink: '#FF99CC',
  emeraldGreen: '#2E8B57',
  turmericYellow: '#E8B923',
  templeRed: '#A81818',
};

// ModernTabBar Component
function ModernTabBar({ state, descriptors, navigation }) {
  const { width } = useWindowDimensions();
  const tabWidth = (width - 48) / (state.routes.length + 1);
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const iconAnimations = useRef(state.routes.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    Animated.spring(slideAnimation, {
      toValue: state.index * tabWidth,
      useNativeDriver: true,
      bounciness: 10,
      speed: 16,
    }).start();

    iconAnimations.forEach((anim, i) => {
      if (i !== state.index) {
        anim.setValue(1);
      }
    });

    iconAnimations[state.index].setValue(0.9);
    Animated.spring(iconAnimations[state.index], {
      toValue: 1.2,
      friction: 4,
      tension: 120,
      useNativeDriver: true,
    }).start(() => {
      Animated.spring(iconAnimations[state.index], {
        toValue: 1,
        friction: 6,
        tension: 100,
        useNativeDriver: true,
      }).start();
    });
  }, [state.index, tabWidth]);

  const handleRandomStory = async () => {
    try {
      const response = await axios.get('http://192.168.16.65:3000/api/stories');
      const stories = response.data;
      if (stories.length > 0) {
        const randomStory = stories[Math.floor(Math.random() * stories.length)];
        navigation.navigate('HomeTab', { screen: 'StoryDetail', params: { story: randomStory } });
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to load a random story.');
    }
  };

  return (
    <View style={modernTabStyles.tabBarPosition}>
      <BlurView intensity={120} tint="dark" style={modernTabStyles.tabBarContainer}>
        <Animated.View
          style={[
            modernTabStyles.activeTabPillWrapper,
            { width: tabWidth, transform: [{ translateX: slideAnimation }] },
          ]}
        >
          <LinearGradient
            colors={[COLORS.turmericYellow, COLORS.accentGold, COLORS.goldGradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={modernTabStyles.activeTabPillGradient}
          />
        </Animated.View>

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel !== undefined
            ? String(options.tabBarLabel)
            : route.name === 'HomeTab' ? 'Home' : route.name;

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

          const getTabBarIconName = options.tabBarIconName;

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={[modernTabStyles.tabButton, { width: tabWidth }]}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={`Navigate to ${label}`}
            >
              <Animated.View
                style={[
                  modernTabStyles.iconAndLabelContainer,
                  { transform: [{ scale: iconAnimations[index] }] },
                ]}
              >
                <LinearGradient
                  colors={isFocused ? [COLORS.lotusPink, COLORS.turmericYellow] : ['transparent', 'transparent']}
                  style={modernTabStyles.iconGlow}
                >
                  <Ionicons
                    name={getTabBarIconName ? getTabBarIconName(isFocused) : 'help-circle-outline'}
                    size={30}
                    color={isFocused ? COLORS.templeRed : COLORS.softWhite}
                  />
                </LinearGradient>
                {isFocused && (
                  <Text style={modernTabStyles.tabLabel}>{label}</Text>
                )}
              </Animated.View>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={modernTabStyles.fab}
          onPress={handleRandomStory}
          accessibilityRole="button"
          accessibilityLabel="Open a random story"
        >
          <LinearGradient
            colors={[COLORS.turmericYellow, COLORS.lotusPink]}
            style={modernTabStyles.fabGradient}
          >
            <Ionicons name="shuffle" size={32} color={COLORS.black} />
          </LinearGradient>
        </TouchableOpacity>
      </BlurView>
    </View>
  );
}

const modernTabStyles = StyleSheet.create({
  tabBarPosition: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    height: 90,
    shadowColor: COLORS.shadowGray,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 30,
  },
  tabBarContainer: {
    flexDirection: 'row',
    height: '100%',
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 2.5,
    borderColor: COLORS.turmericYellow,
    alignItems: 'center',
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
  },
  activeTabPillWrapper: {
    position: 'absolute',
    height: '85%',
    top: '7.5%',
    left: 10,
    borderRadius: 28,
    overflow: 'hidden',
  },
  activeTabPillGradient: {
    flex: 1,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: COLORS.emeraldGreen,
  },
  tabButton: {
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  iconAndLabelContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    gap: 6,
  },
  iconGlow: {
    padding: 10,
    borderRadius: 24,
  },
  tabLabel: {
    color: COLORS.softWhite,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontFamily: 'Georgia',
  },
  fab: {
    position: 'absolute',
    top: -35,
    alignSelf: 'center',
    width: 70,
    height: 70,
    borderRadius: 35,
    shadowColor: COLORS.turmericYellow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 20,
  },
  fabGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 35,
    borderWidth: 2.5,
    borderColor: COLORS.emeraldGreen,
  },
});

// Define types
type Story = {
  _id: string;
  imageUrl: string;
  title: string;
  content: string;
  audioUrl?: string;
  videoUrl?: string;
  category?: string;
  culturalContext?: string;
  glossary?: { term: string; definition: string }[];
};

type Category = {
  name: string;
  icon: string;
};

type RootStackParamList = {
  Home: undefined;
  StoryDetail: { story: Story };
  SignIn: undefined;
  Main: undefined;
};

// Story Preview Modal Component
const StoryPreviewModal = React.memo(({ visible, story, onClose, onRead }: { visible: boolean; story: Story | null; onClose: () => void; onRead: () => void }) => {
  if (!story) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <BlurView intensity={100} tint="dark" style={styles.modalContainer}>
          <LinearGradient
            colors={[COLORS.templeRed, COLORS.deepMaroon]}
            style={styles.modalGradient}
          >
            <Image source={{ uri: story.imageUrl }} style={styles.modalImage} />
            <Text style={styles.modalTitle}>{story.title}</Text>
            <Text style={styles.modalExcerpt} numberOfLines={3}>
              {story.content.slice(0, 100)}...
            </Text>
            {story.culturalContext && (
              <Text style={styles.modalContext} numberOfLines={2}>
                Context: {story.culturalContext.slice(0, 80)}...
              </Text>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButton} onPress={onRead} accessibilityLabel={`Read ${story.title}`}>
                <Text style={styles.modalButtonText}>Read Now</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalCloseButton]} onPress={onClose} accessibilityLabel="Close preview">
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </BlurView>
      </View>
    </Modal>
  );
});

// Story Card Component
const StoryCard = React.memo(({ story, onPress, onLongPress, isBookmarked, toggleBookmark }: { story: Story; onPress: () => void; onLongPress: () => void; isBookmarked: boolean; toggleBookmark: () => void }) => {
  const animation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(animation, {
      toValue: 0.92,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(animation, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[styles.story, { opacity: animation, transform: [{ scale: animation }] }]}>
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityLabel={`Open ${story.title}`}
      >
        <Image source={{ uri: story.imageUrl }} style={styles.image} />
        <LinearGradient
          colors={['transparent', COLORS.templeRed]}
          style={styles.storyGradientOverlay}
        />
        <TouchableOpacity
          style={styles.bookmarkButton}
          onPress={toggleBookmark}
          accessibilityLabel={isBookmarked ? `Remove bookmark for ${story.title}` : `Bookmark ${story.title}`}
        >
          <Ionicons
            name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
            size={26}
            color={COLORS.turmericYellow}
          />
        </TouchableOpacity>
        <Text style={styles.storyTitle}>{story.title}</Text>
        <TouchableOpacity
          style={styles.readBtn}
          onPress={onPress}
        >
          <Text style={styles.readBtnText}>Start Reading</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
});

// Home Screen Component
const HomeScreen = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewStory, setPreviewStory] = useState<Story | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [dailyStory, setDailyStory] = useState<Story | null>(null);
  const navigation = useNavigation<import('@react-navigation/native-stack').NativeStackNavigationProp<RootStackParamList>>();
  const searchInputRef = useRef<TextInput>(null);
  const searchAnimation = useRef(new Animated.Value(0)).current;
  const micAnimation = useRef(new Animated.Value(1)).current;
  const headerAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnimation, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    const loadBookmarks = async () => {
      try {
        const storedBookmarks = await AsyncStorage.getItem('bookmarks');
        if (storedBookmarks) {
          setBookmarkedIds(JSON.parse(storedBookmarks));
        }
      } catch (err) {
        console.error('Failed to load bookmarks:', err);
      }
    };

    axios.get('http://192.168.16.65:3000/api/stories')
      .then((res) => {
        setStories(res.data);
        setDailyStory(res.data[Math.floor(Math.random() * res.data.length)]);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch stories:', err);
        Alert.alert('Error', 'Failed to load stories. Please check your network connection.');
        setLoading(false);
      });

    loadBookmarks();
  }, []);

  useEffect(() => {
    Voice.onSpeechResults = (e: any) => {
      const command = e.value[0]?.toLowerCase();
      if (command) {
        if (command.includes('open')) {
          const storyTitle = command.replace('open ', '');
          const match = stories.find((story) => story.title.toLowerCase().includes(storyTitle));
          if (match) {
            navigation.navigate('StoryDetail', { story: match });
          } else {
            Alert.alert('Story Not Found', `No story found matching "${storyTitle}".`);
          }
        } else if (command.includes('home')) {
          navigation.navigate('HomeTab');
        } else if (command.includes('bookmarks')) {
          navigation.navigate('Bookmarks');
        } else if (command.includes('profile')) {
          navigation.navigate('Profile');
        } else if (command.includes('settings')) {
          navigation.navigate('Settings');
        } else {
          setSearchQuery(command);
        }
      }
      setIsListening(false);
      Animated.timing(micAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    };
    Voice.onSpeechError = (e: any) => {
      console.error('Voice error:', e);
      Alert.alert('Voice Error', 'Failed to recognize voice input. Please try again.');
      setIsListening(false);
      Animated.timing(micAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    };

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, [stories, navigation]);

  const toggleBookmark = useCallback(async (storyId: string) => {
    try {
      const newBookmarkedIds = bookmarkedIds.includes(storyId)
        ? bookmarkedIds.filter((id) => id !== storyId)
        : [...bookmarkedIds, storyId];
      setBookmarkedIds(newBookmarkedIds);
      await AsyncStorage.setItem('bookmarks', JSON.stringify(newBookmarkedIds));
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
      Alert.alert('Error', 'Failed to update bookmark.');
    }
  }, [bookmarkedIds]);

  const toggleSearch = () => {
    setSearchVisible(!searchVisible);
    Animated.timing(searchAnimation, {
      toValue: searchVisible ? 0 : 1,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      if (!searchVisible) {
        searchInputRef.current?.focus();
      } else {
        setSearchQuery('');
      }
    });
  };

  const clearSearch = () => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  const startVoiceRecognition = async () => {
    if (isListening) {
      try {
        await Voice.stop();
        setIsListening(false);
        Animated.timing(micAnimation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      } catch (err) {
        console.error('Failed to stop voice:', err);
      }
      return;
    }

    try {
      setIsListening(true);
      await Voice.start('en-US');
      Animated.loop(
        Animated.sequence([
          Animated.timing(micAnimation, {
            toValue: 1.3,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(micAnimation, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } catch (err) {
      console.error('Failed to start voice:', err);
      Alert.alert('Voice Error', 'Failed to start voice recognition.');
      setIsListening(false);
      Animated.timing(micAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  const filteredStories = stories.filter((story) =>
    story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    story.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCategoryPress = (category: string) => {
    setSearchQuery(category);
    setSearchVisible(true);
    searchInputRef.current?.focus();
  };

  const handleLongPress = (story: Story) => {
    setPreviewStory(story);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Animated.View style={{ transform: [{ rotate: micAnimation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
          <Image
            source={{ uri: 'https://via.placeholder.com/100?text=Mandala' }}
            style={styles.loadingMandala}
          />
        </Animated.View>
        <Text style={styles.loadingText}>Loading sacred tales...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: 'https://via.placeholder.com/500x500?text=Mandala' }}
        style={styles.backgroundPattern}
      />
      <Animated.View style={[styles.headerGradient, { opacity: headerAnimation }]}>
        <LinearGradient
          colors={[COLORS.templeRed, COLORS.deepMaroon]}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <Image
              source={{ uri: 'https://via.placeholder.com/40?text=Om' }}
              style={styles.headerLogo}
            />
            {searchVisible ? (
              <Animated.View style={[styles.searchContainer, { opacity: searchAnimation, transform: [{ translateY: searchAnimation.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }]}>
                <TextInput
                  ref={searchInputRef}
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Say 'open Ramayana' or search stories..."
                  placeholderTextColor={COLORS.grayText}
                  accessibilityLabel="Search stories"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={clearSearch} style={styles.clearButton} accessibilityLabel="Clear search">
                    <Ionicons name="close-circle" size={22} color={COLORS.grayText} />
                  </TouchableOpacity>
                )}
                <Animated.View style={{ transform: [{ scale: micAnimation }] }}>
                  <TouchableOpacity onPress={startVoiceRecognition} style={styles.voiceButton} accessibilityLabel={isListening ? "Stop voice input" : "Start voice input"}>
                    <LinearGradient
                      colors={isListening ? [COLORS.lotusPink, COLORS.turmericYellow] : [COLORS.lightGray, COLORS.lightGray]}
                      style={styles.voiceButtonGradient}
                    >
                      <Ionicons name={isListening ? 'mic' : 'mic-outline'} size={26} color={COLORS.templeRed} />
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              </Animated.View>
            ) : (
              <Text style={styles.title}>HinduTales</Text>
            )}
            <TouchableOpacity onPress={toggleSearch} accessibilityLabel={searchVisible ? "Close search" : "Open search"}>
              <Ionicons
                name={searchVisible ? 'close' : 'search-sharp'}
                style={styles.search}
                size={30}
                color={COLORS.turmericYellow}
              />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>

      <ScrollView contentContainerStyle={styles.mainScrollView}>
        {dailyStory && (
          <>
            <Text style={styles.sectionTitle}>Daily Sacred Tale</Text>
            <LinearGradient
              colors={[COLORS.turmericYellow, COLORS.lotusPink]}
              style={styles.dailyStoryContainer}
            >
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredBadgeText}>Featured</Text>
              </View>
              <StoryCard
                story={dailyStory}
                onPress={() => navigation.navigate('StoryDetail', { story: dailyStory })}
                onLongPress={() => handleLongPress(dailyStory)}
                isBookmarked={bookmarkedIds.includes(dailyStory._id)}
                toggleBookmark={() => toggleBookmark(dailyStory._id)}
              />
            </LinearGradient>
          </>
        )}
        <Text style={styles.sectionTitle}>Explore Sacred Categories</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryContainer}>
          {[
            { name: 'Mythology', icon: 'book' },
            { name: 'Epics', icon: 'flame' },
            { name: 'Folktales', icon: 'leaf' },
            { name: 'Devotional', icon: 'heart' },
            { name: 'Vedas', icon: 'scroll' },
          ].map((category, index) => (
            <TouchableOpacity
              key={index

}
              style={styles.categoryCard}
              onPress={() => handleCategoryPress(category.name)}
              accessibilityLabel={`Filter by ${category.name}`}
            >
              <LinearGradient
                colors={[COLORS.lotusPink, COLORS.turmericYellow]}
                style={styles.categoryCardGradient}
              >
                <Ionicons name={category.icon} size={26} color={COLORS.templeRed} />
              </LinearGradient>
              <Text style={styles.categoryName}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>Continue Your Journey</Text>
        <View style={styles.horizontalRule} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storyContainer}>
          {filteredStories.map((story, index) => (
            <StoryCard
              key={index}
              story={story}
              onPress={() => navigation.navigate('StoryDetail', { story })}
              onLongPress={() => handleLongPress(story)}
              isBookmarked={bookmarkedIds.includes(story._id)}
              toggleBookmark={() => toggleBookmark(story._id)}
            />
          ))}
        </ScrollView>
      </ScrollView>

      <StoryPreviewModal
        visible={!!previewStory}
        story={previewStory}
        onClose={() => setPreviewStory(null)}
        onRead={() => {
          if (previewStory) {
            navigation.navigate('StoryDetail', { story: previewStory });
            setPreviewStory(null);
          }
        }}
      />
    </View>
  );
};

// Bookmarks Screen Component
const BookmarksScreen = () => {
  const [bookmarks, setBookmarks] = useState<Story[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const navigation = useNavigation<import('@react-navigation/native-stack').NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    const loadBookmarks = async () => {
      try {
        const storedBookmarks = await AsyncStorage.getItem('bookmarks');
        if (storedBookmarks) {
          const ids = JSON.parse(storedBookmarks);
          setBookmarkedIds(ids);
          const response = await axios.get('http://192.168.16.65:3000/api/stories');
          const allStories = response.data;
          const bookmarkedStories = allStories.filter((story: Story) => ids.includes(story._id));
          setBookmarks(bookmarkedStories);
        }
      } catch (err) {
        console.error('Failed to load bookmarks:', err);
        Alert.alert('Error', 'Failed to load bookmarks.');
      }
    };
    loadBookmarks();
  }, []);

  const toggleBookmark = useCallback(async (storyId: string) => {
    try {
      const newBookmarkedIds = bookmarkedIds.filter((id) => id !== storyId);
      setBookmarkedIds(newBookmarkedIds);
      setBookmarks(bookmarks.filter((story) => story._id !== storyId));
      await AsyncStorage.setItem('bookmarks', JSON.stringify(newBookmarkedIds));
    } catch (err) {
      console.error('Failed to remove bookmark:', err);
      Alert.alert('Error', 'Failed to remove bookmark.');
    }
  }, [bookmarkedIds, bookmarks]);

  return (
    <View style={styles.screenContainer}>
      <Image
        source={{ uri: 'https://via.placeholder.com/500x500?text=Mandala' }}
        style={styles.backgroundPattern}
      />
      <Text style={styles.screenTitle}>Your Sacred Bookmarks</Text>
      {bookmarks.length === 0 ? (
        <Text style={styles.screenText}>No stories bookmarked yet. Tap the bookmark icon on a story to save it!</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.bookmarkContainer}>
          {bookmarks.map((story, index) => (
            <View key={index} style={styles.bookmarkCard}>
              <TouchableOpacity
                style={styles.bookmarkContent}
                onPress={() => navigation.navigate('StoryDetail', { story })}
                accessibilityLabel={`Open ${story.title}`}
              >
                <Image source={{ uri: story.imageUrl }} style={styles.bookmarkImage} />
                <Text style={styles.bookmarkTitle}>{story.title}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => toggleBookmark(story._id)}
                style={styles.bookmarkRemoveButton}
                accessibilityLabel={`Remove bookmark for ${story.title}`}
              >
                <Ionicons name="trash-outline" size={22} color={COLORS.turmericYellow} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

// Profile Screen Component
const ProfileScreen = () => {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigation = useNavigation<import('@react-navigation/native-stack').NativeStackNavigationProp<RootStackParamList>>();
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState(user?.imageUrl || 'https://via.placeholder.com/100');

  useEffect(() => {
    if (user?.imageUrl) {
      setImageUri(user.imageUrl);
    }
  }, [user]);

  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please grant permission to access the photo library to change your profile picture.');
      return false;
    }
    return true;
  };

  const handleImagePick = async () => {
    if (!user || !isEditing) return;

    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setLoading(true);
      try {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        await user.setProfileImage({ file: base64Image });
        setImageUri(base64Image);
        Alert.alert('Success', 'Profile photo updated successfully.');
      } catch (error: any) {
        console.error('Failed to update profile photo:', error);
        Alert.alert('Error', `Failed to update profile photo: ${error.message || 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    } else if (result.canceled) {
      Alert.alert('Cancelled', 'Image selection was cancelled.');
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await user.update({ firstName, lastName });
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      Alert.alert('Error', `Failed to update profile: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigation.replace('SignIn');
    } catch (error: any) {
      console.error('Failed to sign out:', error);
      Alert.alert('Error', `Failed to sign out: ${error.message || 'Unknown error'}`);
    }
  };

  const handleDeleteProfile = () => {
    Alert.alert(
      'Delete Profile',
      'Are you sure you want to delete your profile? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            setLoading(true);
            try {
              await user.delete();
              navigation.replace('SignIn');
              Alert.alert('Success', 'Profile deleted successfully.');
            } catch (error: any) {
              console.error('Failed to delete profile:', error);
              Alert.alert('Error', `Failed to delete profile: ${error.message || 'Unknown error'}`);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (!user) {
    return (
      <View style={styles.screenContainer}>
        <Image
          source={{ uri: 'https://via.placeholder.com/500x500?text=Mandala' }}
          style={styles.backgroundPattern}
        />
        <Animated.View style={{ transform: [{ rotate: micAnimation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
          <Image
            source={{ uri: 'https://via.placeholder.com/100?text=Mandala' }}
            style={styles.loadingMandala}
          />
        </Animated.View>
        <Text style={[styles.screenText, { marginTop: 12 }]}>Loading user data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <Image
        source={{ uri: 'https://via.placeholder.com/500x500?text=Mandala' }}
        style={styles.backgroundPattern}
      />
      <LinearGradient
        colors={[COLORS.templeRed, COLORS.deepMaroon]}
        style={styles.profileGradient}
      >
        <Text style={styles.screenTitle}>Your Devotee Profile</Text>
        <View style={styles.profileCard}>
          <TouchableOpacity
            onPress={handleImagePick}
            disabled={loading || !isEditing}
            style={styles.profileImageContainer}
            accessibilityLabel="Change profile picture"
          >
            <Image
              source={{ uri: imageUri }}
              style={styles.profileImage}
              onError={() => setImageUri('https://via.placeholder.com/100')}
            />
            {isEditing && (
              <View style={styles.imageEditOverlay}>
                <Ionicons name="camera" size=28 color={COLORS.softWhite} />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.profileLabel}>Email</Text>
          <Text style={styles.profileText}>{user.primaryEmailAddress?.emailAddress || 'No email'}</Text>
          <Text style={styles.profileLabel}>First Name</Text>
          <TextInput
            style={[styles.profileInput, !isEditing && styles.disabledInput]}
            value={firstName}
            onChangeText={setFirstName}
            editable={isEditing}
            placeholder="Enter first name"
            placeholderTextColor={COLORS.grayText}
            accessibilityLabel="First name"
          />
          <Text style={styles.profileLabel}>Last Name</Text>
          <TextInput
            style={[styles.profileInput, !isEditing && styles.disabledInput]}
            value={lastName}
            onChangeText={setLastName}
            editable={isEditing}
            placeholder="Enter last name"
            placeholderTextColor={COLORS.grayText}
            accessibilityLabel="Last name"
          />
          <View style={styles.buttonContainer}>
            {isEditing ? (
              <>
                <TouchableOpacity style={styles.actionBtn} onPress={handleSave} disabled={loading} accessibilityLabel="Save profile">
                  <Text style={styles.actionBtnText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.cancelBtn]}
                  onPress={() => {
                    setFirstName(user.firstName || '');
                    setLastName(user.lastName || '');
                    setIsEditing(false);
                  }}
                  disabled={loading}
                  accessibilityLabel="Cancel editing"
                >
                  <Text style={styles.actionBtnText}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.actionBtn} onPress={() => setIsEditing(true)} disabled={loading} accessibilityLabel="Edit profile">
                <Text style={styles.actionBtnText}>Edit Profile</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.actionBtn, styles.signOutBtn]} onPress={handleSignOut} disabled={loading} accessibilityLabel="Sign out">
              <Text style={styles.actionBtnText}>Sign Out</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={handleDeleteProfile} disabled={loading} accessibilityLabel="Delete profile">
              <Text style={styles.actionBtnText}>Delete Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
        {loading && (
          <Animated.View style={[styles.loadingOverlay, { transform: [{ rotate: micAnimation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}>
            <Image
              source={{ uri: 'https://via.placeholder.com/100?text=Mandala' }}
              style={styles.loadingMandala}
            />
          </Animated.View>
        )}
      </LinearGradient>
    </View>
  );
};

// Settings Screen Component
const SettingsScreen = () => {
  const [isDarkTheme, setIsDarkTheme] = useState(true);

  const handleThemeToggle = () => {
    setIsDarkTheme(!isDarkTheme);
    Alert.alert('Theme', `Switched to ${isDarkTheme ? 'Light' : 'Dark'} theme (not fully implemented).`);
  };

  return (
    <View style={styles.screenContainer}>
      <Image
        source={{ uri: 'https://via.placeholder.com/500x500?text=Mandala' }}
        style={styles.backgroundPattern}
      />
      <LinearGradient
        colors={[COLORS.templeRed, COLORS.deepMaroon]}
        style={styles.profileGradient}
      >
        <Text style={styles.screenTitle}>Sacred Settings</Text>
        <View style={styles.settingsCard}>
          <Text style={styles.settingsLabel}>Theme</Text>
          <View style={styles.themeToggleContainer}>
            <Text style={styles.settingsText}>{isDarkTheme ? 'Dark' : 'Light'} Theme</Text>
            <TouchableOpacity style={styles.themeToggleButton} onPress={handleThemeToggle} accessibilityLabel="Toggle theme">
              <Ionicons
                name={isDarkTheme ? 'moon' : 'sunny'}
                size=26
                color={COLORS.turmericYellow}
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.settingsLabel}>Notifications</Text>
          <Text style={styles.settingsText}>Manage notification preferences (coming soon).</Text>
        </View>
      </LinearGradient>
    </View>
  );
};

// StoryDetail Screen Component
const StoryDetailScreen = ({ route }: { route: { params: { story: Story } } }) => {
  const { story } = route.params;
  const navigation = useNavigation<import('@react-navigation/native-stack').NativeStackNavigationProp<RootStackParamList>>();
  const [scrollOffset, setScrollOffset] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showGlossary, setShowGlossary] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const glossaryAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loadBookmarks = async () => {
      try {
        const storedBookmarks = await AsyncStorage.getItem('bookmarks');
        if (storedBookmarks) {
          setBookmarkedIds(JSON.parse(storedBookmarks));
        }
      } catch (err) {
        console.error('Failed to load bookmarks:', err);
      }
    };
    loadBookmarks();
  }, []);

  const toggleBookmark = async () => {
    try {
      const newBookmarkedIds = bookmarkedIds.includes(story._id)
        ? bookmarkedIds.filter((id) => id !== story._id)
        : [...bookmarkedIds, story._id];
      setBookmarkedIds(newBookmarkedIds);
      await AsyncStorage.setItem('bookmarks', JSON.stringify(newBookmarkedIds));
      Alert.alert('Bookmark', bookmarkedIds.includes(story._id) ? 'Removed from bookmarks' : 'Added to bookmarks');
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
      Alert.alert('Error', 'Failed to update bookmark.');
    }
  };

  const handlePlayStory = () => {
    Alert.alert('Play Story', 'Video playback functionality not implemented yet.');
  };

  const handleListenStory = async () => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      return;
    }

    try {
      setIsSpeaking(true);
      await Speech.speak(story.content, {
        language: 'en-IN',
        pitch: 1.0,
        rate: 0.9,
        onDone: () => setIsSpeaking(false),
        onError: () => {
          setIsSpeaking(false);
          Alert.alert('Error', 'Failed to read the story aloud.');
        },
      });
    } catch (err) {
      console.error('Failed to read story:', err);
      Alert.alert('Error', 'Failed to read the story aloud.');
      setIsSpeaking(false);
    }
  };

  const toggleGlossary = () => {
    const toValue = showGlossary ? 0 : 1;
    setShowGlossary(!showGlossary);
    Animated.timing(glossaryAnimation, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const progress = contentHeight > 0 ? Math.min(scrollOffset / contentHeight, 1) : 0;

  return (
    <View style={styles.detailScreenContainer}>
      <Image
        source={{ uri: 'https://via.placeholder.com/500x500?text=Mandala' }}
        style={styles.backgroundPattern}
      />
      <LinearGradient
        colors={[COLORS.templeRed, COLORS.deepMaroon]}
        style={styles.detailHeaderGradient}
      >
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size=30 color={COLORS.turmericYellow} />
          </TouchableOpacity>
          <Text style={styles.detailTitleHeader}>{story.title}</Text>
          <TouchableOpacity onPress={toggleBookmark} accessibilityLabel={bookmarkedIds.includes(story._id) ? `Remove bookmark for ${story.title}` : `Bookmark ${story.title}`}>
            <Ionicons name={bookmarkedIds.includes(story._id) ? 'bookmark' : 'bookmark-outline'} size=30 color={COLORS.turmericYellow} />
          </TouchableOpacity>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
        </View>
      </LinearGradient>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.detailScrollViewContent}
        onScroll={(event) => setScrollOffset(event.nativeEvent.contentOffset.y)}
        onContentSizeChange={(_, height) => setContentHeight(height)}
        scrollEventThrottle=16
      >
        {story.imageUrl && (
          <Image source={{ uri: story.imageUrl }} style={styles.detailImage} />
        )}
        <LinearGradient
          colors={['transparent', COLORS.templeRed]}
          style={styles.detailImageOverlay}
        />
        <Text style={styles.detailTitle}>{story.title}</Text>
        <Text style={styles.detailContent}>{story.content}</Text>
        {story.culturalContext && (
          <>
            <Text style={styles.sectionTitle}>Cultural Context</Text>
            <Text style={styles.detailContent}>{story.culturalContext}</Text>
          </>
        )}
        {story.glossary && story.glossary.length > 0 && (
          <>
            <TouchableOpacity style={styles.glossaryButton} onPress={toggleGlossary} accessibilityLabel={showGlossary ? "Hide glossary" : "Show glossary"}>
              <Text style={styles.glossaryButtonText}>{showGlossary ? 'Hide Glossary' : 'Show Glossary'}</Text>
            </TouchableOpacity>
            <Animated.View
              style={[
                styles.glossaryContainer,
                {
                  opacity: glossaryAnimation,
                  height: glossaryAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, story.glossary.length * 80],
                  }),
                },
              ]}
            >
              {story.glossary.map((item, index) => (
                <View key={index} style={styles.glossaryItem}>
                  <Text style={styles.glossaryTerm}>{item.term}</Text>
                  <Text style={styles.glossaryDefinition}>{item.definition}</Text>
                </View>
              ))}
            </Animated.View>
          </>
        )}
        <View style={styles.mediaButtonsContainer}>
          {story.videoUrl && (
            <TouchableOpacity style={styles.mediaButton} onPress={handlePlayStory} accessibilityLabel="Play video">
              <Ionicons name="play-circle-outline" size=28 color={COLORS.softWhite} />
              <Text style={styles.mediaButtonText}>Play Story</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.mediaButton} onPress={handleListenStory} accessibilityLabel={isSpeaking ? "Stop reading" : "Read aloud"}>
            <Ionicons name={isSpeaking ? 'stop-circle-outline' : 'headset-outline'} size=28 color={COLORS.softWhite} />
            <Text style={styles.mediaButtonText}>{isSpeaking ? 'Stop Reading' : 'Read Aloud'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

// Navigators
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const HomeStackNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="StoryDetail"
        component={StoryDetailScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

const App = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        tabBar={(props) => <ModernTabBar {...props} />}
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIconName: (focused: boolean) => {
            let iconName: string;
            if (route.name === 'HomeTab') iconName = focused ? 'flower' : 'flower-outline';
            else if (route.name === 'Bookmarks') iconName = focused ? 'book' : 'book-outline';
            else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
            else if (route.name === 'Settings') iconName = focused ? 'settings' : 'settings-outline';
            else iconName = 'help-circle-outline';
            return iconName;
          },
        })}
      >
        <Tab.Screen name="HomeTab" component={HomeStackNavigator} options={{ title: 'Home' }} />
        <Tab.Screen name="Bookmarks" component={BookmarksScreen} options={{ title: 'Bookmarks' }} />
        <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
        <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  backgroundPattern: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.1,
    resizeMode: 'cover',
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 24,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerLogo: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  title: {
    color: COLORS.turmericYellow,
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 1.8,
    fontFamily: 'Georgia',
  },
  search: {
    color: COLORS.softWhite,
    opacity: 0.9,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 18,
    paddingHorizontal: 14,
    borderWidth: 2.5,
    borderColor: COLORS.emeraldGreen,
  },
  searchInput: {
    flex: 1,
    color: COLORS.softWhite,
    fontSize: 17,
    paddingVertical: 14,
    fontFamily: 'Georgia',
  },
  clearButton: {
    padding: 6,
    marginRight: 10,
  },
  voiceButton: {
    padding: 10,
  },
  voiceButtonGradient: {
    padding: 8,
    borderRadius: 20,
  },
  mainScrollView: {
    paddingBottom: 160,
  },
  sectionTitle: {
    color: COLORS.softWhite,
    fontSize: 26,
    fontWeight: '800',
    marginLeft: 24,
    marginTop: 28,
    marginBottom: 20,
    letterSpacing: 1,
    fontFamily: 'Georgia',
  },
  dailyStoryContainer: {
    padding: 16,
    marginHorizontal: 24,
    borderRadius: 28,
    marginBottom: 24,
  },
  featuredBadge: {
    position: 'absolute',
    top: -10,
    right: 10,
    backgroundColor: COLORS.templeRed,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    zIndex: 1,
  },
  featuredBadgeText: {
    color: COLORS.softWhite,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Georgia',
  },
  categoryContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  categoryCard: {
    borderRadius: 24,
    marginRight: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: 140,
    shadowColor: COLORS.shadowGray,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  categoryCardGradient: {
    padding: 18,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    color: COLORS.turmericYellow,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 10,
    textAlign: 'center',
    fontFamily: 'Georgia',
  },
  horizontalRule: {
    borderBottomColor: COLORS.emeraldGreen,
    borderBottomWidth: 2.5,
    width: '90%',
    alignSelf: 'center',
    marginBottom: 28,
  },
  storyContainer: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  story: {
    width: 260,
    backgroundColor: COLORS.darkGray,
    borderRadius: 32,
    padding: 18,
    marginRight: 24,
    alignItems: 'center',
    marginBottom: 28,
    shadowColor: COLORS.shadowGray,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 14,
    borderWidth: 2.5,
    borderColor: COLORS.turmericYellow,
  },
  image: {
    width: '100%',
    height: 360,
    borderRadius: 26,
    marginBottom: 18,
    resizeMode: 'cover',
  },
  storyGradientOverlay: {
    position: 'absolute',
    bottom: 18,
    left: 18,
    right: 18,
    height: 140,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  bookmarkButton: {
    position: 'absolute',
    top: 28,
    right: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 24,
    padding: 12,
  },
  storyTitle: {
    color: COLORS.softWhite,
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '800',
    fontSize: 22,
    lineHeight: 28,
    paddingHorizontal: 12,
    letterSpacing: 1,
    fontFamily: 'Georgia',
  },
  readBtn: {
    backgroundColor: COLORS.emeraldGreen,
    marginTop: 'auto',
    paddingVertical: 20,
    paddingHorizontal: 36,
    borderRadius: 18,
    alignItems: 'center',
    shadowColor: COLORS.shadowGray,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  readBtnText: {
    color: COLORS.softWhite,
    fontWeight: '900',
    fontSize: 17,
    letterSpacing: 1,
    fontFamily: 'Georgia',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 440,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 2.5,
    borderColor: COLORS.emeraldGreen,
  },
  modalGradient: {
    padding: 28,
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: 240,
    borderRadius: 24,
    marginBottom: 24,
  },
  modalTitle: {
    color: COLORS.turmericYellow,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'Georgia',
  },
  modalExcerpt: {
    color: COLORS.softWhite,
    fontSize: 17,
    lineHeight: 26,
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.9,
    fontFamily: 'Georgia',
  },
  modalContext: {
    color: COLORS.grayText,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'Georgia',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 20,
    width: '100%',
    justifyContent: 'center',
  },
  modalButton: {
    backgroundColor: COLORS.emeraldGreen,
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 18,
    flex: 1,
    alignItems: 'center',
  },
  modalCloseButton: {
    backgroundColor: COLORS.lightGray,
  },
  modalButtonText: {
    color: COLORS.softWhite,
    fontWeight: '800',
    fontSize: 17,
    fontFamily: 'Georgia',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.black,
  },
  loadingMandala: {
    width: 90,
    height: 90,
    marginBottom: 20,
  },
  loadingText: {
    color: COLORS.turmericYellow,
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Georgia',
  },
  screenContainer: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  screenTitle: {
    color: COLORS.turmericYellow,
    fontSize: 36,
    fontWeight: '900',
    marginBottom: 48,
    textAlign: 'center',
    letterSpacing: 1.5,
    fontFamily: 'Georgia',
  },
  screenText: {
    color: COLORS.softWhite,
    fontSize: 20,
    textAlign: 'center',
    lineHeight: 30,
    opacity: 0.9,
    fontFamily: 'Georgia',
  },
  bookmarkContainer: {
    paddingHorizontal: 24,
    paddingBottom: 160,
  },
  bookmarkCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.darkGray,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: COLORS.shadowGray,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 2.5,
    borderColor: COLORS.turmericYellow,
  },
  bookmarkContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookmarkImage: {
    width: 100,
    height: 150,
    borderRadius: 18,
    marginRight: 24,
  },
  bookmarkTitle: {
    color: COLORS.softWhite,
    fontSize: 22,
    fontWeight: '800',
    flex: 1,
    fontFamily: 'Georgia',
  },
  bookmarkRemoveButton: {
    padding: 12,
  },
  profileGradient: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    paddingTop: 60,
  },
  profileCard: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 28,
    padding: 36,
    width: '100%',
    maxWidth: 460,
    alignItems: 'center',
    shadowColor: COLORS.shadowGray,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 16,
    borderWidth: 2.5,
    borderColor: COLORS.turmericYellow,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 36,
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 4,
    borderColor: COLORS.turmericYellow,
  },
  imageEditOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 32,
    padding: 14,
    borderWidth: 2.5,
    borderColor: COLORS.emeraldGreen,
  },
  profileLabel: {
    color: COLORS.turmericYellow,
    fontSize: 22,
    fontWeight: '800',
    alignSelf: 'flex-start',
    marginTop: 24,
    marginBottom: 14,
    letterSpacing: 1,
    fontFamily: 'Georgia',
  },
  profileText: {
    color: COLORS.softWhite,
    fontSize: 20,
    alignSelf: 'flex-start',
    marginBottom: 24,
    opacity: 0.9,
    fontFamily: 'Georgia',
  },
  profileInput: {
    backgroundColor: COLORS.lightGray,
    color: COLORS.softWhite,
    fontSize: 20,
    padding: 20,
    borderRadius: 18,
    width: '100%',
    marginBottom: 24,
    borderWidth: 2.5,
    borderColor: COLORS.emeraldGreen,
    fontFamily: 'Georgia',
  },
  disabledInput: {
    opacity: 0.7,
    backgroundColor: COLORS.darkGray,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 32,
    gap: 20,
  },
  actionBtn: {
    backgroundColor: COLORS.emeraldGreen,
    paddingVertical: 20,
    paddingHorizontal: 32,
    borderRadius: 18,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.shadowGray,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  cancelBtn: {
    backgroundColor: COLORS.lightGray,
  },
  signOutBtn: {
    backgroundColor: '#FF6B4A',
  },
  deleteBtn: {
    backgroundColor: '#D32F2F',
  },
  actionBtnText: {
    color: COLORS.softWhite,
    fontWeight: '900',
    fontSize: 17,
    letterSpacing: 1,
    fontFamily: 'Georgia',
  },
  loadingOverlay: {
    position: 'absolute',
    top: '50%',
    alignSelf: 'center',
  },
  settingsCard: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 28,
    padding: 36,
    width: '100%',
    maxWidth: 460,
    shadowColor: COLORS.shadowGray,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 16,
    borderWidth: 2.5,
    borderColor: COLORS.turmericYellow,
  },
  settingsLabel: {
    color: COLORS.turmericYellow,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 24,
    marginBottom: 14,
    letterSpacing: 1,
    fontFamily: 'Georgia',
  },
  settingsText: {
    color: COLORS.softWhite,
    fontSize: 20,
    marginBottom: 24,
    opacity: 0.9,
    fontFamily: 'Georgia',
  },
  themeToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  themeToggleButton: {
    padding: 16,
    backgroundColor: COLORS.lightGray,
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: COLORS.emeraldGreen,
  },
  detailScreenContainer: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  detailHeaderGradient: {
    paddingTop: 60,
    paddingBottom: 24,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  detailTitleHeader: {
    color: COLORS.turmericYellow,
    fontSize: 24,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Georgia',
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: COLORS.lightGray,
    borderRadius: 5,
    marginHorizontal: 24,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.emeraldGreen,
    borderRadius: 5,
  },
  detailScrollViewContent: {
    paddingBottom: 180,
  },
  detailImage: {
    width: '100%',
    height: 340,
    resizeMode: 'cover',
    marginBottom: 36,
    borderRadius: 32,
  },
  detailImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 340,
    borderRadius: 32,
  },
  detailTitle: {
    color: COLORS.turmericYellow,
    fontSize: 34,
    fontWeight: '900',
    marginBottom: 28,
    textAlign: 'center',
    paddingHorizontal: 28,
    letterSpacing: 1.5,
    fontFamily: 'Georgia',
  },
  detailContent: {
    color: COLORS.softWhite,
    fontSize: 20,
    lineHeight: 32,
    marginBottom: 48,
    textAlign: 'justify',
    paddingHorizontal: 28,
    opacity: 0.9,
    fontFamily: 'Georgia',
  },
  glossaryButton: {
    backgroundColor: COLORS.turmericYellow,
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 18,
    alignItems: 'center',
    marginHorizontal: 28,
    marginBottom: 24,
  },
  glossaryButtonText: {
    color: COLORS.black,
    fontSize: 17,
    fontWeight: '800',
    fontFamily: 'Georgia',
  },
  glossaryContainer: {
    marginHorizontal: 28,
    marginBottom: 24,
  },
  glossaryItem: {
    marginBottom: 16,
  },
  glossaryTerm: {
    color: COLORS.turmericYellow,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    fontFamily: 'Georgia',
  },
  glossaryDefinition: {
    color: COLORS.softWhite,
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.9,
    fontFamily: 'Georgia',
  },
  mediaButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 24,
    marginBottom: 36,
    gap: 24,
  },
  mediaButton: {
    backgroundColor: COLORS.emeraldGreen,
    paddingVertical: 20,
    paddingHorizontal: 36,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: COLORS.shadowGray,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 12,
  },
  mediaButtonText: {
    color: COLORS.softWhite,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 1,
    fontFamily: 'Georgia',
  },
});

export default App;