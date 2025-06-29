  import React, { useState, useEffect, useRef } from 'react';
  import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    Image,
    FlatList,
    ScrollView,
    ActivityIndicator,
    TextInput,
    Animated,
    Dimensions,
    Modal,
    Alert,
    Platform,
  } from 'react-native';
  import { Ionicons } from '@expo/vector-icons';
  import { useUser, useAuth } from '@clerk/clerk-expo';
  import axios from 'axios';
  import { Audio } from 'expo-av';
  import * as ImagePicker from 'expo-image-picker';
  import { LinearGradient } from 'expo-linear-gradient';
  import { Picker } from '@react-native-picker/picker'; // For category selection

  // Define the API URL for consistency
  const API_URL = 'http://192.168.113.65:3000'; // Make sure this matches your backend server IP
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  // Predefined Hindu religious categories
  const HINDU_CATEGORIES = [
    'Mythology',
    'Devotion',
    'Epic',
    'Folktale',
    'Philosophy',
    'Puranic',
    'Spirituality',
    'Rituals',
  ];

  // --- Custom Colors for the new professional, clean, understated theme ---
  const Colors = {
    background: '#0D0D0D', // Very Dark Gray/Almost Black
    cardBackground: '#1C1C1C', // Dark gray for cards
    primaryAccent: '#7D5A34', // Muted Gold/Bronze for accents (buttons, active states)
    secondaryAccent: '#5C4328', // Darker Gold/Bronze for subtle highlights
    textPrimary: '#F0F0F0', // Off-white for main text
    textSecondary: '#A0A0A0', // Muted gray for secondary text/placeholders
    border: '#333333', // Darker gray for subtle borders
    error: '#B00020', // Muted Red for errors
    success: '#00B894', // Green for success
    shadow: 'rgba(0,0,0,0.6)', // Stronger shadows on dark theme
  };

  // --- Font Families (make sure these fonts are loaded in your App.js or main entry file) ---
  // Example for loading custom fonts with Expo:
  /*
  import { useFonts } from 'expo-font';
  ...
  const [fontsLoaded] = useFonts({
    'PlayfairDisplay-Bold': require('./assets/fonts/PlayfairDisplay-Bold.ttf'),
    'Inter-SemiBold': require('./assets/fonts/Inter-SemiBold.ttf'),
    'Inter-Regular': require('./assets/fonts/Inter-Regular.ttf'),
    'Inter-Bold': require('./assets/fonts/Inter-Bold.ttf'),
  });
  if (!fontsLoaded) {
    return <AppLoading />;
  }
  */
  const Fonts = {
    heading: Platform.OS === 'ios' ? 'PlayfairDisplay-Bold' : 'serif', // Fallback for Android
    subheading: Platform.OS === 'ios' ? 'Inter-SemiBold' : 'sans-serif',
    body: Platform.OS === 'ios' ? 'Inter-Regular' : 'sans-serif',
    button: Platform.OS === 'ios' ? 'Inter-Bold' : 'sans-serif',
  };

  const App = () => {
    const [activeTab, setActiveTab] = useState('home');
    const [selectedStory, setSelectedStory] = useState(null);
    const animatedValues = useRef({});
    const [stories, setStories] = useState([]);
    const [bookmarkedStories, setBookmarkedStories] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [newStory, setNewStory] = useState({
      title: '',
      content: '',
      category: HINDU_CATEGORIES[0],
      image: null,
      audio: null,
      video: null,
    });
    const [editStory, setEditStory] = useState(null);
    const [commentText, setCommentText] = useState({});
    const [userProfile, setUserProfile] = useState(null);
    const [editProfileModal, setEditProfileModal] = useState(false);
    const [editProfileData, setEditProfileData] = useState({ username: '', bio: '' });
    const [playbackObject, setPlaybackObject] = useState(null);
    const [playingMediaId, setPlayingMediaId] = useState(null);
    const [validationError, setValidationError] = useState(null);

    const { isLoaded, isSignedIn, user } = useUser();
    const { getToken } = useAuth();

    // Navigation items for the bottom tab bar
    const navItems = [
      { name: 'home', label: 'Home', icon: 'home' },
      { name: 'explore', label: 'Discover', icon: 'compass' },
      { name: 'write', label: 'Create', icon: 'create' },
      { name: 'library', label: 'Library', icon: 'bookmark' },
      { name: 'profile', label: 'Profile', icon: 'person' },
    ];

    // Initialize animated values for navigation icons
    navItems.forEach(item => {
      animatedValues.current[item.name] = animatedValues.current[item.name] || new Animated.Value(0);
    });

    // Determine the profile image URI, defaulting to a placeholder
    const profileImageUri = isLoaded && isSignedIn && user?.imageUrl
      ? user.imageUrl
      : 'https://placehold.co/40x40/7D5A34/F0F0F0?text=U'; // Muted gold accent placeholder with off-white text

    // Animation for fading in content
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600, // Slightly longer fade for elegance
        useNativeDriver: true,
      }).start();
    }, [activeTab, selectedStory]); // Restart fade animation on tab or story change

    // Fetch stories from the API
    const fetchStories = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${API_URL}/api/stories`);
        setStories(response.data);
      } catch (err) {
        setError('Failed to get stories. Please try again.');
        console.error('Error fetching stories:', err);
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch user profile from the API
    const fetchUserProfile = async (userId) => {
      if (!userId) return;
      try {
        const response = await axios.get(`${API_URL}/api/users/${userId}`);
        setUserProfile(response.data);
        setEditProfileData({ username: response.data.username, bio: response.data.bio || '' });
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError('Failed to get user profile.');
      }
    };

    // Fetch bookmarked stories
    const fetchBookmarkedStories = async () => {
      if (!isSignedIn) {
        setBookmarkedStories([]);
        return;
      }
      try {
        setIsLoading(true);
        setError(null);
        const token = await getToken();
        const response = await axios.get(`${API_URL}/api/stories/bookmarked`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setBookmarkedStories(response.data);
      } catch (err) {
        console.error('Error fetching bookmarked stories:', err);
        setError('Failed to get your saved stories.');
        setBookmarkedStories([]);
      } finally {
        setIsLoading(false);
      }
    };

    // Handle creating a new story
    const handleCreateStory = async () => {
      if (!isSignedIn) {
        Alert.alert('Sign In First', 'Please sign in to create a story.');
        return;
      }
      if (!newStory.title || !newStory.content) {
        setValidationError('Title and story text are needed.');
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const token = await getToken();
        const formData = new FormData();
        formData.append('title', newStory.title);
        formData.append('content', newStory.content);
        formData.append('category', newStory.category);
        if (newStory.image) {
          formData.append('image', {
            uri: newStory.image.uri,
            name: `image_${Date.now()}.${newStory.image.uri.split('.').pop()}`,
            type: `image/${newStory.image.uri.split('.').pop()}`,
          });
        }
        if (newStory.audio) {
          formData.append('audio', {
            uri: newStory.audio.uri,
            name: `audio_${Date.now()}.${newStory.audio.uri.split('.').pop()}`,
            type: `audio/${newStory.audio.uri.split('.').pop()}`,
          });
        }
        if (newStory.video) {
          formData.append('video', {
            uri: newStory.video.uri,
            name: `video_${Date.now()}.${newStory.video.uri.split('.').pop()}`,
            type: `video/${newStory.video.uri.split('.').pop()}`,
          });
        }

        await axios.post(`${API_URL}/api/stories`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        });
        setNewStory({ title: '', content: '', category: HINDU_CATEGORIES[0], image: null, audio: null, video: null });
        setValidationError(null);
        Alert.alert('Success', 'Story created!');
        setActiveTab('home');
        fetchStories(); // Refresh stories
      } catch (err) {
        Alert.alert('Error', 'Could not create story. Please try again.');
        console.error('Error creating story:', err);
      } finally {
        setIsLoading(false);
      }
    };

    // Effect hook to fetch data based on active tab and user sign-in status
    useEffect(() => {
      if (activeTab === 'home' || activeTab === 'explore') {
        fetchStories();
      } else if (activeTab === 'profile' && isSignedIn && user?.id) {
        fetchUserProfile(user.id);
      } else if (activeTab === 'library') {
        fetchBookmarkedStories();
      }
    }, [activeTab, isSignedIn, user?.id]);

    // Effect hook for navigation icon animations
    useEffect(() => {
      Object.keys(animatedValues.current).forEach(tabName => {
        Animated.timing(animatedValues.current[tabName], {
          toValue: activeTab === tabName ? 1 : 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, [activeTab]);

    // Effect hook to unload audio playback when component unmounts or playback object changes
    useEffect(() => {
      return () => {
        if (playbackObject) {
          playbackObject.unloadAsync();
        }
      };
    }, [playbackObject]);

    // Handle navigation tab press
    const handleNavPress = (tabName) => {
      setActiveTab(tabName);
      setSelectedStory(null);
      if (playbackObject) {
        playbackObject.stopAsync();
        setPlayingMediaId(null);
      }
    };

    // Handle media (audio/video) playback
    const handlePlayMedia = async (url, id) => {
      try {
        if (playbackObject) {
          await playbackObject.unloadAsync();
          setPlaybackObject(null);
        }

        if (playingMediaId === id) {
          setPlayingMediaId(null);
          return;
        }

        const media = new Audio.Sound();
        await media.loadAsync({ uri: url });
        await media.playAsync();
        setPlaybackObject(media);
        setPlayingMediaId(id);
      } catch (err) {
        console.error('Error playing media:', err);
        Alert.alert('Playback Issue', 'Could not play media.');
      }
    };

    // Function to pick media (image, audio, video) with validation
    const pickMedia = async (type) => {
      setValidationError(null);

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Needed',
          'Please allow access to your photos and videos to select files.'
        );
        return;
      }

      let mediaType;
      let errorMessage = '';

      if (type === 'image') {
        mediaType = ImagePicker.MediaType.Images;
        errorMessage = 'Please pick a valid picture file (like jpg, png).';
      } else if (type === 'video') {
        mediaType = ImagePicker.MediaType.Videos;
        errorMessage = 'Please pick a valid video file (like mp4, mov).';
      } else if (type === 'audio') {
        mediaType = ImagePicker.MediaType.All; // Allow all and filter by extension
        errorMessage = 'Please pick a valid sound file (mp3, wav, aac, m4a).';
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mediaType,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        const extension = asset.uri.split('.').pop().toLowerCase();

        if (type === 'audio') {
          const validAudioExtensions = ['mp3', 'wav', 'aac', 'm4a'];
          if (!validAudioExtensions.includes(extension)) {
            setValidationError(errorMessage);
            return;
          }
        }
        else if (type === 'image') {
          const validImageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
          if (!validImageExtensions.includes(extension)) {
            setValidationError(errorMessage);
            return;
          }
        }
        else if (type === 'video') {
          const validVideoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
          if (!validVideoExtensions.includes(extension)) {
            setValidationError(errorMessage);
            return;
          }
        }

        if (editStory) {
          setEditStory({ ...editStory, [type]: asset });
        } else {
          setNewStory({ ...newStory, [type]: asset });
        }
      }
    };

    // Handle liking/unliking a story
    const handleLike = async (storyId) => {
      if (!isSignedIn) {
        Alert.alert('Sign In First', 'Please sign in to like a story.');
        return;
      }
      try {
        const token = await getToken();
        const response = await axios.post(
          `${API_URL}/api/stories/${storyId}/like`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setStories(stories.map(s => (s._id === storyId ? response.data : s)));
        if (selectedStory?._id === storyId) {
          setSelectedStory(response.data);
        }
        setBookmarkedStories(bookmarkedStories.map(s => (s._id === storyId ? response.data : s)));
      } catch (err) {
        Alert.alert('Error', 'Could not like/unlike story.');
        console.error('Error liking story:', err);
      }
    };

    // Handle bookmarking/unbookmarking a story
    const handleBookmark = async (storyId) => {
      if (!isSignedIn) {
        Alert.alert('Sign In First', 'Please sign in to save a story.');
        return;
      }
      try {
        const token = await getToken();
        const response = await axios.post(
          `${API_URL}/api/stories/${storyId}/bookmark`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setStories(stories.map(s => (s._id === storyId ? response.data : s)));
        if (selectedStory?._id === storyId) {
          setSelectedStory(response.data);
        }
        fetchBookmarkedStories();
      } catch (err) {
        Alert.alert('Error', 'Could not save story.');
        console.error('Error bookmarking story:', err);
      }
    };

    // Handle adding a comment to a story
    const handleComment = async (storyId) => {
      if (!isSignedIn) {
        Alert.alert('Sign In First', 'Please sign in to comment.');
        return;
      }
      if (!commentText[storyId] || commentText[storyId].trim() === '') {
        Alert.alert('Empty Comment', 'Please type a comment.');
        return;
      }
      try {
        const token = await getToken();
        const response = await axios.post(
          `${API_URL}/api/stories/${storyId}/comment`,
          { content: commentText[storyId] },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setStories(stories.map(s => (s._id === storyId ? response.data : s)));
        if (selectedStory?._id === storyId) {
          setSelectedStory(response.data);
        }
        setBookmarkedStories(bookmarkedStories.map(s => (s._id === storyId ? response.data : s)));

        setCommentText({ ...commentText, [storyId]: '' });
      } catch (err) {
        Alert.alert('Error', 'Could not add comment.');
        console.error('Error adding comment:', err);
      }
    };

    // Handle deleting a comment from a story
    const handleDeleteComment = async (storyId, commentId) => {
      if (!isSignedIn) {
        Alert.alert('Sign In First', 'Please sign in to delete a comment.');
        return;
      }
      Alert.alert(
        "Delete Comment",
        "Are you sure you want to delete this comment?",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Delete",
            onPress: async () => {
              try {
                const token = await getToken();
                const response = await axios.delete(
                  `${API_URL}/api/stories/${storyId}/comment/${commentId}`,
                  { headers: { Authorization: `Bearer ${token}` } }
                );
                setStories(stories.map(s => (s._id === storyId ? response.data : s)));
                if (selectedStory?._id === storyId) {
                  setSelectedStory(response.data);
                }
                setBookmarkedStories(bookmarkedStories.map(s => (s._id === storyId ? response.data : s)));
                Alert.alert('Done', 'Comment deleted!');
              } catch (err) {
                Alert.alert('Error', 'Could not delete comment.');
                console.error('Error deleting comment:', err);
              }
            },
            style: "destructive"
          }
        ]
      );
    };

    // Handle editing user profile
    const handleEditProfile = async () => {
      if (!isSignedIn) {
        Alert.alert('Sign In First', 'Please sign in to change your profile.');
        return;
      }
      try {
        const token = await getToken();
        await axios.put(
          `${API_URL}/api/users/${user.id}`,
          editProfileData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        fetchUserProfile(user.id);
        setEditProfileModal(false);
        Alert.alert('Done', 'Profile updated!');
      } catch (err) {
        Alert.alert('Error', 'Could not update profile.');
        console.error('Error updating profile:', err);
      }
    };

    // Handle editing an existing story
    const handleEditStory = async () => {
      if (!isSignedIn) {
        Alert.alert('Sign In First', 'Please sign in to edit a story.');
        return;
      }
      if (!editStory.title || !editStory.content) {
        setValidationError('Title and story text are needed.');
        return;
      }
      try {
        const token = await getToken();
        const formData = new FormData();
        formData.append('title', editStory.title);
        formData.append('content', editStory.content);
        formData.append('category', editStory.category);
        if (editStory.image && editStory.image.uri) {
          formData.append('image', {
            uri: editStory.image.uri,
            name: `image_${Date.now()}.${editStory.image.uri.split('.').pop()}`,
            type: `image/${editStory.image.uri.split('.').pop()}`,
          });
        }
        if (editStory.audio && editStory.audio.uri) {
          formData.append('audio', {
            uri: editStory.audio.uri,
            name: `audio_${Date.now()}.${editStory.audio.uri.split('.').pop()}`,
            type: `audio/${editStory.audio.uri.split('.').pop()}`,
          });
        }
        if (editStory.video && editStory.video.uri) {
          formData.append('video', {
            uri: editStory.video.uri,
            name: `video_${Date.now()}.${editStory.video.uri.split('.').pop()}`,
            type: `video/${editStory.video.uri.split('.').pop()}`,
          });
        }
        const response = await axios.put(
          `${API_URL}/api/stories/${editStory._id}`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
          }
        );
        setStories(stories.map(s => (s._id === editStory._id ? response.data : s)));
        if (selectedStory?._id === editStory._id) {
          setSelectedStory(response.data);
        }
        setBookmarkedStories(bookmarkedStories.map(s => (s._id === editStory._id ? response.data : s)));
        setEditStory(null);
        setValidationError(null);
        Alert.alert('Done', 'Story updated!');
        setActiveTab('home');
      } catch (err) {
        Alert.alert('Error', 'Could not update story.');
        console.error('Error updating story:', err);
      }
    };

    // Handle deleting a story
    const handleDeleteStory = async (storyId) => {
      if (!isSignedIn) {
        Alert.alert('Sign In First', 'Please sign in to delete a story.');
        return;
      }
      Alert.alert(
        "Delete Story",
        "Are you sure you want to delete this story? You cannot undo this.",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Delete",
            onPress: async () => {
              try {
                const token = await getToken();
                await axios.delete(`${API_URL}/api/stories/${storyId}`, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                setStories(stories.filter(s => s._id !== storyId));
                setBookmarkedStories(bookmarkedStories.filter(s => s._id !== storyId));
                if (selectedStory?._id === storyId) {
                  setSelectedStory(null);
                  setActiveTab('home');
                }
                Alert.alert('Done', 'Story deleted!');
              } catch (err) {
                Alert.alert('Error', 'Could not delete story.');
                console.error('Error deleting story:', err);
              }
            },
            style: "destructive"
          }
        ]
      );
    };

    // Render a single story card for lists
    const renderStoryCard = (story) => (
      <Animated.View style={{ opacity: fadeAnim }}>
        <TouchableOpacity
          style={styles.storyCard}
          onPress={() => setSelectedStory(story)}
          activeOpacity={0.9}
        >
          <View style={styles.cardHeader}>
            {/* User's profile photo appearing here */}
            <Image
              source={{ uri: story.authorImage || 'https://placehold.co/40x40/1C1C1C/FFFFFF?text=U' }}
              style={styles.cardAuthorImage}
            />
            <View style={styles.cardAuthorInfo}>
              <Text style={styles.cardAuthorName}>{story.author}</Text>
              <Text style={styles.cardDate}>
                {new Date(story.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.bookmarkButton}
              onPress={() => handleBookmark(story._id)}
            >
              <Ionicons
                name={story.bookmarks.includes(user?.id) ? 'bookmark' : 'bookmark-outline'}
                size={24}
                color={story.bookmarks.includes(user?.id) ? Colors.primaryAccent : Colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.storyContentContainer}>
            <Text style={styles.storyTitle}>{story.title}</Text>
            {story.imageUrl && (
              <Image
                source={{ uri: story.imageUrl }}
                style={styles.storyImage}
                onError={() => console.log('Failed to load story image')}
              />
            )}
            <Text style={styles.storyExcerpt} numberOfLines={3}>
              {story.content}
            </Text>
            <TouchableOpacity onPress={() => setSelectedStory(story)}>
              <Text style={styles.readMoreText}>Read more</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.storyFooter}>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>{story.category || 'General'}</Text>
            </View>
            <View style={styles.interactionButtons}>
              <TouchableOpacity
                style={styles.interactionButton}
                onPress={() => handleLike(story._id)}
              >
                <Ionicons
                  name={story.likes.includes(user?.id) ? 'heart' : 'heart-outline'}
                  size={24}
                  color={story.likes.includes(user?.id) ? Colors.primaryAccent : Colors.textSecondary}
                />
                <Text style={styles.interactionCount}>{story.likes.length}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.interactionButton}>
                <Ionicons name="chatbubble-outline" size={24} color={Colors.textSecondary} />
                <Text style={styles.interactionCount}>{story.comments.length}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );

    // Render the detailed view of a selected story
    const renderStoryDetail = (story) => (
      <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
        <ScrollView style={styles.storyDetailContainer} contentContainerStyle={styles.detailScrollContent}>
          <View style={styles.detailHeader}>
            <TouchableOpacity onPress={() => setSelectedStory(null)} style={styles.backButton}>
              <Ionicons name="arrow-back" size={28} color={Colors.primaryAccent} />
              <Text style={styles.backButtonText}>Back to Stories</Text>
            </TouchableOpacity>
            {story.authorId === userProfile?._id && (
              <View style={styles.storyActions}>
                <TouchableOpacity
                  style={styles.storyActionButton}
                  onPress={() => setEditStory(story)}
                >
                  <Ionicons name="pencil" size={24} color={Colors.primaryAccent} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.storyActionButton}
                  onPress={() => handleDeleteStory(story._id)}
                >
                  <Ionicons name="trash" size={24} color={Colors.error} />
                </TouchableOpacity>
              </View>
            )}
          </View>
          <Text style={styles.detailTitle}>{story.title}</Text>
          <View style={styles.detailAuthor}>
            {/* User's profile photo appearing here */}
            <Image
              source={{ uri: story.authorImage || 'https://placehold.co/40x40/1C1C1C/FFFFFF?text=U' }}
              style={styles.detailAuthorImage}
            />
            <View>
              <Text style={styles.detailAuthorName}>{story.author}</Text>
              <Text style={styles.detailDate}>
                {new Date(story.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
          {story.imageUrl && (
            <Image
              source={{ uri: story.imageUrl }}
              style={styles.detailImage}
              onError={() => console.log('Failed to load story image')}
            />
          )}
          <Text style={styles.detailContent}>{story.content}</Text>
          {(story.audioUrl || story.videoUrl) && (
            <View style={styles.mediaControls}>
              {story.audioUrl && (
                <TouchableOpacity
                  style={styles.mediaButton}
                  onPress={() => handlePlayMedia(story.audioUrl, `audio-${story._id}`)}
                >
                  <Ionicons
                    name={playingMediaId === `audio-${story._id}` ? 'pause' : 'play'}
                    size={24}
                    color={Colors.background}
                  />
                  <Text style={styles.mediaButtonText}>Listen</Text>
                </TouchableOpacity>
              )}
              {story.videoUrl && (
                <TouchableOpacity
                  style={styles.mediaButton}
                  onPress={() => handlePlayMedia(story.videoUrl, `video-${story._id}`)}
                >
                  <Ionicons
                    name={playingMediaId === `video-${story._id}` ? 'pause' : 'play'}
                    size={24}
                    color={Colors.background}
                  />
                  <Text style={styles.mediaButtonText}>Watch</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          <View style={styles.detailFooter}>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>{story.category || 'General'}</Text>
            </View>
            <View style={styles.interactionButtons}>
              <TouchableOpacity
                style={styles.interactionButton}
                onPress={() => handleLike(story._id)}
              >
                <Ionicons
                  name={story.likes.includes(user?.id) ? 'heart' : 'heart-outline'}
                  size={24}
                  color={story.likes.includes(user?.id) ? Colors.primaryAccent : Colors.textSecondary}
                />
                <Text style={styles.interactionCount}>{story.likes.length}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.interactionButton}>
                <Ionicons name="chatbubble-outline" size={24} color={Colors.textSecondary} />
                <Text style={styles.interactionCount}>{story.comments.length}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.commentSection}>
            <Text style={styles.commentsTitle}>Comments ({story.comments.length})</Text>
            {story.comments.map((comment, index) => (
              <View key={index} style={styles.comment}>
                <Text style={styles.commentUser}>{comment.username}</Text>
                <Text style={styles.commentContent}>{comment.content}</Text>
                {comment.userId === userProfile?._id && (
                  <TouchableOpacity
                    style={styles.deleteCommentButton}
                    onPress={() => handleDeleteComment(story._id, comment._id)}
                  >
                    <Ionicons name="trash-outline" size={20} color={Colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {isSignedIn && (
              <View style={styles.commentInputContainer}>
                <Image
                  source={{ uri: profileImageUri }}
                  style={styles.commentUserImage}
                />
                <TextInput
                  style={styles.commentInput}
                  placeholder="Add a comment..."
                  placeholderTextColor={Colors.textSecondary}
                  value={commentText[story._id] || ''}
                  onChangeText={text => setCommentText({ ...commentText, [story._id]: text })}
                />
                <TouchableOpacity
                  style={styles.commentButton}
                  onPress={() => handleComment(story._id)}
                >
                  <Ionicons name="send" size={24} color={Colors.primaryAccent} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </Animated.View>
    );

    // Render the Home tab content (list of recent stories)
    const renderHome = () => (
      <ScrollView style={styles.content} contentContainerStyle={styles.homeScrollContent}>
        {isLoading ? (
          <ActivityIndicator size="large" color={Colors.primaryAccent} style={styles.loading} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <>
            <View style={styles.welcomeBanner}>
              <Text style={styles.welcomeText}>Hello there,</Text>
              <Text style={styles.welcomeName}>
                {isSignedIn && user?.firstName ? user.firstName : 'Explorer'}!
              </Text>
              <Text style={styles.welcomeMessage}>Discover timeless tales.</Text>
            </View>

            <View style={styles.headerSection}>
              <Text style={styles.sectionTitle}>Top Picks</Text>
              <Text style={styles.sectionSubtitle}>Stories everyone's loving</Text>
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={[...stories].sort((a, b) => (b.likes.length + b.comments.length) - (a.likes.length + a.comments.length)).slice(0, 5)}
              keyExtractor={item => item._id}
              renderItem={({ item }) => (
                <Animated.View style={{ opacity: fadeAnim, marginRight: 20 }}>
                  <TouchableOpacity
                    style={styles.featuredStoryCard}
                    onPress={() => setSelectedStory(item)}
                    activeOpacity={0.9}
                  >
                    <Image
                      source={{ uri: item.imageUrl || 'https://placehold.co/200x120/1C1C1C/BBBBBB?text=Top' }}
                      style={styles.featuredStoryImage}
                    />
                    <LinearGradient
                      colors={['transparent', Colors.cardBackground]}
                      style={styles.featuredStoryGradient}
                    >
                      <View style={styles.featuredStoryInfo}>
                        <Text style={styles.featuredStoryTitle} numberOfLines={2}>{item.title}</Text>
                        <Text style={styles.featuredStoryAuthor}>{item.author}</Text>
                        <View style={styles.categoryPillFeatured}>
                          <Text style={styles.categoryText}>{item.category || 'General'}</Text>
                        </View>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              )}
              ListEmptyComponent={() => (
                <View style={styles.emptyStateHorizontal}>
                  <Ionicons name="trending-up-outline" size={40} color={Colors.primaryAccent} />
                  <Text style={styles.emptyTextSmall}>No top stories yet</Text>
                </View>
              )}
              contentContainerStyle={styles.featuredStoriesList}
              // FIX: Disable scrolling for nested FlatList
              scrollEnabled={false}
            />

            <View style={styles.headerSection}>
              <Text style={styles.sectionTitle}>Recently Added</Text>
              <Text style={styles.sectionSubtitle}>Newest tales to explore</Text>
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={[...stories].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5)}
              keyExtractor={item => item._id}
              renderItem={({ item }) => (
                <Animated.View style={{ opacity: fadeAnim, marginRight: 20 }}>
                  <TouchableOpacity
                    style={styles.featuredStoryCard}
                    onPress={() => setSelectedStory(item)}
                    activeOpacity={0.9}
                  >
                    <Image
                      source={{ uri: item.imageUrl || 'https://placehold.co/200x120/1C1C1C/BBBBBB?text=New' }}
                      style={styles.featuredStoryImage}
                    />
                    <LinearGradient
                      colors={['transparent', Colors.cardBackground]}
                      style={styles.featuredStoryGradient}
                    >
                      <View style={styles.featuredStoryInfo}>
                        <Text style={styles.featuredStoryTitle} numberOfLines={2}>{item.title}</Text>
                        <Text style={styles.featuredStoryAuthor}>{item.author}</Text>
                        <View style={styles.categoryPillFeatured}>
                          <Text style={styles.categoryText}>{item.category || 'General'}</Text>
                        </View>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              )}
              ListEmptyComponent={() => (
                <View style={styles.emptyStateHorizontal}>
                  <Ionicons name="time-outline" size={40} color={Colors.primaryAccent} />
                  <Text style={styles.emptyTextSmall}>No new stories yet</Text>
                </View>
              )}
              contentContainerStyle={styles.featuredStoriesList}
              // FIX: Disable scrolling for nested FlatList
              scrollEnabled={false}
            />


            <View style={styles.headerSection}>
              <Text style={styles.sectionTitle}>All Stories</Text>
              <Text style={styles.sectionSubtitle}>Dive into our full collection</Text>
            </View>
            <FlatList
              data={stories}
              keyExtractor={item => item._id}
              contentContainerStyle={styles.storiesList}
              ListEmptyComponent={() => (
                <View style={styles.emptyState}>
                  <Ionicons name="book-outline" size={50} color={Colors.primaryAccent} />
                  <Text style={styles.emptyText}>No stories available yet.</Text>
                  <Text style={styles.emptyTextSmall}>Be the first to create one!</Text>
                  <TouchableOpacity style={styles.createButtonEmpty} onPress={() => handleNavPress('write')}>
                    <Text style={styles.createButtonTextEmpty}>Add New Story</Text>
                  </TouchableOpacity>
                </View>
              )}
              // FIX: Disable scrolling for nested FlatList
              scrollEnabled={false}
            />
            />
          </>
        )}
      </ScrollView>
    );

    // Render the Explore tab content (search and categories)
    const renderExplore = () => (
      <ScrollView style={styles.content} contentContainerStyle={styles.exploreScrollContent}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={24} color={Colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search stories by title or author..."
            placeholderTextColor={Colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchButton}>
              <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.headerSection}>
          <Text style={styles.sectionTitle}>Browse Categories</Text>
          <Text style={styles.sectionSubtitle}>Find tales by genre</Text>
        </View>
        <View style={styles.categoryGrid}>
          {HINDU_CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category}
              style={styles.categoryGridItem}
              onPress={() => {
                // Implement category filter logic here,
                // for now, it can just set the search query to the category
                setSearchQuery(category);
                Alert.alert('Filter by Category', `Filtering for "${category}" stories.`);
              }}
            >
              <Text style={styles.categoryGridText}>{category}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.headerSection}>
          <Text style={styles.sectionTitle}>Search Results</Text>
          <Text style={styles.sectionSubtitle}>Stories matching your query</Text>
        </View>
        {isLoading ? (
          <ActivityIndicator size="large" color={Colors.primaryAccent} style={styles.loading} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <FlatList
            data={stories.filter(story =>
              story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              story.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
              story.category.toLowerCase().includes(searchQuery.toLowerCase())
            )}
            keyExtractor={item => item._id}
            renderItem={({ item }) => renderStoryCard(item)}
            contentContainerStyle={styles.storiesList}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={50} color={Colors.primaryAccent} />
                <Text style={styles.emptyText}>No stories found.</Text>
                <Text style={styles.emptyTextSmall}>Try a different search term or category.</Text>
              </View>
            )}
            // FIX: Disable scrolling for nested FlatList
            scrollEnabled={false}
          />
        )}
      </ScrollView>
    );

    // Render the Write tab content (form to create/edit stories)
    const renderWrite = () => (
      <ScrollView style={styles.content} contentContainerStyle={styles.writeScrollContent}>
        <Text style={styles.modalTitle}>{editStory ? 'Edit Your Story' : 'Create a New Story'}</Text>
        {validationError && <Text style={styles.validationErrorText}>{validationError}</Text>}

        <TextInput
          style={styles.input}
          placeholder="Story Title"
          placeholderTextColor={Colors.textSecondary}
          value={editStory ? editStory.title : newStory.title}
          onChangeText={text => (editStory ? setEditStory({ ...editStory, title: text }) : setNewStory({ ...newStory, title: text }))}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Write your story here..."
          placeholderTextColor={Colors.textSecondary}
          multiline
          numberOfLines={10}
          value={editStory ? editStory.content : newStory.content}
          onChangeText={text => (editStory ? setEditStory({ ...editStory, content: text }) : setNewStory({ ...newStory, content: text }))}
        />

        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={editStory ? editStory.category : newStory.category}
            style={styles.picker}
            itemStyle={styles.pickerItem}
            onValueChange={(itemValue) =>
              (editStory ? setEditStory({ ...editStory, category: itemValue }) : setNewStory({ ...newStory, category: itemValue }))
            }
          >
            {HINDU_CATEGORIES.map((cat, index) => (
              <Picker.Item key={index} label={cat} value={cat} />
            ))}
          </Picker>
        </View>

        <TouchableOpacity style={styles.mediaUploadButton} onPress={() => pickMedia('image')}>
          <Ionicons name="image-outline" size={24} color={Colors.primaryAccent} />
          <Text style={styles.mediaUploadButtonText}>
            {editStory?.image?.uri || newStory.image?.uri ? 'Change Image' : 'Add Image'}
          </Text>
          {(editStory?.image?.uri || newStory.image?.uri) && (
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} style={{ marginLeft: 'auto' }} />
          )}
        </TouchableOpacity>
        {(editStory?.image?.uri || newStory.image?.uri) && (
          <Text style={styles.selectedMediaText}>
            Selected Image: {editStory?.image?.fileName || newStory.image?.fileName || 'image.jpg'}
          </Text>
        )}

        <TouchableOpacity style={styles.mediaUploadButton} onPress={() => pickMedia('audio')}>
          <Ionicons name="musical-notes-outline" size={24} color={Colors.primaryAccent} />
          <Text style={styles.mediaUploadButtonText}>
            {editStory?.audio?.uri || newStory.audio?.uri ? 'Change Audio' : 'Add Audio'}
          </Text>
          {(editStory?.audio?.uri || newStory.audio?.uri) && (
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} style={{ marginLeft: 'auto' }} />
          )}
        </TouchableOpacity>
        {(editStory?.audio?.uri || newStory.audio?.uri) && (
          <Text style={styles.selectedMediaText}>
            Selected Audio: {editStory?.audio?.fileName || newStory.audio?.fileName || 'audio.mp3'}
          </Text>
        )}

        <TouchableOpacity style={styles.mediaUploadButton} onPress={() => pickMedia('video')}>
          <Ionicons name="videocam-outline" size={24} color={Colors.primaryAccent} />
          <Text style={styles.mediaUploadButtonText}>
            {editStory?.video?.uri || newStory.video?.uri ? 'Change Video' : 'Add Video'}
          </Text>
          {(editStory?.video?.uri || newStory.video?.uri) && (
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} style={{ marginLeft: 'auto' }} />
          )}
        </TouchableOpacity>
        {(editStory?.video?.uri || newStory.video?.uri) && (
          <Text style={styles.selectedMediaText}>
            Selected Video: {editStory?.video?.fileName || newStory.video?.fileName || 'video.mp4'}
          </Text>
        )}

        <TouchableOpacity
          style={styles.submitButton}
          onPress={editStory ? handleEditStory : handleCreateStory}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={Colors.background} />
          ) : (
            <Text style={styles.submitButtonText}>
              {editStory ? 'Update Story' : 'Publish Story'}
            </Text>
          )}
        </TouchableOpacity>
        {editStory && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              setEditStory(null);
              setValidationError(null);
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel Edit</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    );

    // Render the Library tab content (bookmarked and user's own stories)
    const renderLibrary = () => (
      <ScrollView style={styles.content} contentContainerStyle={styles.libraryScrollContent}>
        <View style={styles.headerSection}>
          <Text style={styles.sectionTitle}>My Bookmarks</Text>
          <Text style={styles.sectionSubtitle}>Your saved stories</Text>
        </View>
        {isLoading ? (
          <ActivityIndicator size="large" color={Colors.primaryAccent} style={styles.loading} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <FlatList
            contentContainerStyle={styles.storiesList}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Ionicons name="bookmark-outline" size={50} color={Colors.primaryAccent} />
                <Text style={styles.emptyText}>No saved stories yet.</Text>
                <Text style={styles.emptyTextSmall}>Bookmark stories from Home or Explore!</Text>
              </View>
            )}
            // FIX: Disable scrolling for nested FlatList
            scrollEnabled={false}
          />
            )}
            scrollEnabled={false} {/* FIX: Disable scrolling for nested FlatList */}
          />
        )}

        <View style={styles.headerSection}>
          <Text style={styles.sectionTitle}>My Stories</Text>
          <Text style={styles.sectionSubtitle}>Stories you've published</Text>
        </View>
        {isLoading ? (
          <ActivityIndicator size="large" color={Colors.primaryAccent} style={styles.loading} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <FlatList
            data={stories.filter(s => s.authorId === user?.id)}
            keyExtractor={item => item._id}
            renderItem={({ item }) => renderStoryCard(item)}
            contentContainerStyle={styles.storiesList}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Ionicons name="pencil-outline" size={50} color={Colors.primaryAccent} />
                <Text style={styles.emptyText}>You haven't written any stories.</Text>
                <Text style={styles.emptyTextSmall}>Start creating your own tales!</Text>
                <TouchableOpacity style={styles.createButtonEmpty} onPress={() => handleNavPress('write')}>
                  <Text style={styles.createButtonTextEmpty}>Write New Story</Text>
                </TouchableOpacity>
              </View>
            )}
            // FIX: Disable scrolling for nested FlatList
            scrollEnabled={false}
          />
        )}
      </ScrollView>
    );

    // Render the Profile tab content
    const renderProfile = () => {
      if (!isLoaded || !isSignedIn) {
        return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primaryAccent} />
            <Text style={styles.loadingText}>Loading user data...</Text>
          </View>
        );
      }
      if (error) {
        return <Text style={styles.errorText}>{error}</Text>;
      }
      if (!userProfile) {
        return (
          <View style={styles.emptyState}>
            <Ionicons name="person-circle-outline" size={50} color={Colors.primaryAccent} />
            <Text style={styles.emptyText}>User profile not found.</Text>
            <Text style={styles.emptyTextSmall}>Please try again or contact support.</Text>
          </View>
        );
      }

      return (
        <ScrollView style={styles.content} contentContainerStyle={styles.profileScrollContent}>
          <View style={styles.profileHeader}>
            <Image source={{ uri: profileImageUri }} style={styles.profileImage} />
            <Text style={styles.profileName}>{userProfile.username}</Text>
            <Text style={styles.profileEmail}>{user.primaryEmailAddress?.emailAddress}</Text>
            {userProfile.bio && <Text style={styles.profileBio}>{userProfile.bio}</Text>}
            <TouchableOpacity style={styles.editProfileButton} onPress={() => setEditProfileModal(true)}>
              <Ionicons name="create-outline" size={20} color={Colors.background} />
              <Text style={styles.editProfileButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{userProfile.storiesCount || 0}</Text>
              <Text style={styles.statLabel}>Stories Written</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{userProfile.bookmarksCount || 0}</Text>
              <Text style={styles.statLabel}>Stories Saved</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{userProfile.likesCount || 0}</Text>
              <Text style={styles.statLabel}>Likes Given</Text>
            </View>
          </View>

          <View style={styles.headerSection}>
            <Text style={styles.sectionTitle}>My Activity</Text>
            <Text style={styles.sectionSubtitle}>Recent interactions</Text>
          </View>
          {/* Placeholder for user activity feed. To display real activity, a backend endpoint for user-specific activities would be needed. */}
          <View style={styles.activityItem}>
            <Ionicons name="book" size={20} color={Colors.textSecondary} />
            <Text style={styles.activityText}>Published "The Tale of Hanuman"</Text>
            <Text style={styles.activityDate}>2 days ago</Text>
          </View>
          <View style={styles.activityItem}>
            <Ionicons name="heart" size={20} color={Colors.primaryAccent} />
            <Text style={styles.activityText}>Liked "Krishna's Childhood Leelas"</Text>
            <Text style={styles.activityDate}>5 days ago</Text>
          </View>
          <View style={styles.activityItem}>
            <Ionicons name="chatbubble" size={20} color={Colors.textSecondary} />
            <Text style={styles.activityText}>Commented on "The Story of Ganesha"</Text>
            <Text style={styles.activityDate}>1 week ago</Text>
          </View>
          {/* More activities would go here */}

          {/* Edit Profile Modal */}
          <Modal
            visible={editProfileModal}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={() => setEditProfileModal(false)}
          >
            <SafeAreaView style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Profile</Text>
                <TouchableOpacity onPress={() => setEditProfileModal(false)}>
                  <Ionicons name="close-circle-outline" size={30} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor={Colors.textSecondary}
                value={editProfileData.username}
                onChangeText={text => setEditProfileData({ ...editProfileData, username: text })}
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Bio (Optional)"
                placeholderTextColor={Colors.textSecondary}
                multiline
                numberOfLines={4}
                value={editProfileData.bio}
                onChangeText={text => setEditProfileData({ ...editProfileData, bio: text })}
              />
              <TouchableOpacity style={styles.submitButton} onPress={handleEditProfile}>
                <Text style={styles.submitButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </SafeAreaView>
          </Modal>
        </ScrollView>
      );
    };

    // Main render logic based on activeTab
    const renderContent = () => {
      if (selectedStory) {
        return renderStoryDetail(selectedStory);
      }
      switch (activeTab) {
        case 'home':
          return renderHome();
        case 'explore':
          return renderExplore();
        case 'write':
          return renderWrite();
        case 'library':
          return renderLibrary();
        case 'profile':
          return renderProfile();
        default:
          return renderHome();
      }
    };

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.appHeader}>
          <Text style={styles.appTitle}>Timeless Tales</Text>
          <TouchableOpacity
            style={styles.profileIcon}
            onPress={() => handleNavPress('profile')}
          >
            <Image
              source={{ uri: profileImageUri }}
              style={styles.profileImageSmall}
            />
          </TouchableOpacity>
        </View>

        {renderContent()}

        <View style={styles.navbar}>
          {navItems.map(item => {
            const isSelected = activeTab === item.name;
            const scale = animatedValues.current[item.name].interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.15],
            });
            const opacity = animatedValues.current[item.name].interpolate({
              inputRange: [0, 1],
              outputRange: [0.7, 1],
            });
            const color = animatedValues.current[item.name].interpolate({
              inputRange: [0, 1],
              outputRange: [Colors.textSecondary, Colors.primaryAccent],
            });

            return (
              <TouchableOpacity
                key={item.name}
                style={styles.navItem}
                onPress={() => handleNavPress(item.name)}
              >
                <Animated.View style={{ transform: [{ scale }], opacity }}>
                  <Ionicons
                    name={isSelected ? item.icon : `${item.icon}-outline`}
                    size={26}
                    color={isSelected ? Colors.primaryAccent : Colors.textSecondary}
                  />
                </Animated.View>
                <Animated.Text style={[styles.navText, { color }]}>
                  {item.label}
                </Animated.Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>
    );
  };

  // --- Stylesheet for the new professional, clean, understated theme ---
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    appHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 18,
      paddingTop: Platform.OS === 'android' ? 40 : 18,
      backgroundColor: Colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: Colors.border,
    },
    appTitle: {
      fontSize: 26,
      fontFamily: Fonts.heading,
      color: Colors.primaryAccent,
      fontWeight: 'bold',
    },
    profileIcon: {
      padding: 5,
      borderRadius: 25,
      backgroundColor: Colors.cardBackground,
    },
    profileImageSmall: {
      width: 35,
      height: 35,
      borderRadius: 17.5,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
      paddingBottom: 100, // To make space for the fixed navbar
    },
    homeScrollContent: {
      paddingTop: 10,
    },
    exploreScrollContent: {
      paddingTop: 10,
    },
    writeScrollContent: {
      paddingTop: 20,
    },
    libraryScrollContent: {
      paddingTop: 10,
    },
    profileScrollContent: {
      paddingTop: 10,
      alignItems: 'center',
    },
    loading: {
      marginTop: 50,
    },
    loadingText: {
      color: Colors.textSecondary,
      fontFamily: Fonts.body,
      marginTop: 10,
      fontSize: 16,
    },
    errorText: {
      color: Colors.error,
      textAlign: 'center',
      marginTop: 20,
      fontSize: 16,
      fontFamily: Fonts.body,
    },
    welcomeBanner: {
      backgroundColor: Colors.secondaryAccent,
      padding: 25,
      borderRadius: 15,
      marginBottom: 25,
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 8,
    },
    welcomeText: {
      fontSize: 20,
      fontFamily: Fonts.subheading,
      color: Colors.background,
    },
    welcomeName: {
      fontSize: 32,
      fontFamily: Fonts.heading,
      color: Colors.background,
      fontWeight: 'bold',
      marginBottom: 5,
    },
    welcomeMessage: {
      fontSize: 16,
      fontFamily: Fonts.body,
      color: Colors.background,
      opacity: 0.8,
    },
    headerSection: {
      marginBottom: 20,
      marginTop: 15,
    },
    sectionTitle: {
      fontSize: 22,
      fontFamily: Fonts.heading,
      color: Colors.textPrimary,
      marginBottom: 5,
      fontWeight: 'bold',
    },
    sectionSubtitle: {
      fontSize: 14,
      fontFamily: Fonts.body,
      color: Colors.textSecondary,
    },
    storiesList: {
      paddingBottom: 20,
    },
    featuredStoriesList: {
      paddingRight: 20,
      marginBottom: 20,
    },
    storyCard: {
      backgroundColor: Colors.cardBackground,
      borderRadius: 15,
      padding: 18,
      marginBottom: 18,
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 15,
    },
    cardAuthorImage: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 12,
      borderWidth: 1,
      borderColor: Colors.primaryAccent,
    },
    cardAuthorInfo: {
      flex: 1,
    },
    cardAuthorName: {
      fontSize: 16,
      fontFamily: Fonts.subheading,
      color: Colors.textPrimary,
      fontWeight: 'bold',
    },
    cardDate: {
      fontSize: 12,
      fontFamily: Fonts.body,
      color: Colors.textSecondary,
      marginTop: 2,
    },
    bookmarkButton: {
      padding: 5,
    },
    storyContentContainer: {
      marginBottom: 15,
    },
    storyTitle: {
      fontSize: 20,
      fontFamily: Fonts.heading,
      color: Colors.textPrimary,
      fontWeight: 'bold',
      marginBottom: 10,
      lineHeight: 28,
    },
    storyImage: {
      width: '100%',
      height: 180,
      borderRadius: 10,
      marginBottom: 12,
      resizeMode: 'cover',
    },
    storyExcerpt: {
      fontSize: 15,
      fontFamily: Fonts.body,
      color: Colors.textSecondary,
      lineHeight: 22,
      marginBottom: 10,
    },
    readMoreText: {
      color: Colors.primaryAccent,
      fontFamily: Fonts.subheading,
      fontSize: 15,
      textDecorationLine: 'underline',
    },
    storyFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: Colors.border,
    },
    categoryPill: {
      backgroundColor: Colors.secondaryAccent,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    categoryText: {
      color: Colors.background,
      fontSize: 13,
      fontFamily: Fonts.subheading,
      fontWeight: 'bold',
    },
    interactionButtons: {
      flexDirection: 'row',
    },
    interactionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 15,
    },
    interactionCount: {
      color: Colors.textSecondary,
      fontSize: 14,
      marginLeft: 6,
      fontFamily: Fonts.body,
    },
    featuredStoryCard: {
      width: screenWidth * 0.65, // About 2/3 of screen width
      height: 200,
      borderRadius: 15,
      overflow: 'hidden',
      backgroundColor: Colors.cardBackground,
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    featuredStoryImage: {
      width: '100%',
      height: '100%',
      position: 'absolute',
    },
    featuredStoryGradient: {
      flex: 1,
      justifyContent: 'flex-end',
      padding: 15,
    },
    featuredStoryInfo: {
      justifyContent: 'flex-end',
    },
    featuredStoryTitle: {
      fontSize: 18,
      fontFamily: Fonts.subheading,
      color: Colors.textPrimary,
      fontWeight: 'bold',
      marginBottom: 4,
    },
    featuredStoryAuthor: {
      fontSize: 14,
      fontFamily: Fonts.body,
      color: Colors.textSecondary,
      marginBottom: 8,
    },
    categoryPillFeatured: {
      backgroundColor: Colors.primaryAccent,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
      alignSelf: 'flex-start',
    },
    storyDetailContainer: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    detailScrollContent: {
      paddingHorizontal: 20,
      paddingTop: Platform.OS === 'android' ? 20 : 0,
      paddingBottom: 120, // Space for navbar and bottom interactions
    },
    detailHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
      marginTop: 10,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
    },
    backButtonText: {
      color: Colors.primaryAccent,
      fontSize: 16,
      fontFamily: Fonts.subheading,
      marginLeft: 5,
    },
    storyActions: {
      flexDirection: 'row',
    },
    storyActionButton: {
      marginLeft: 15,
      padding: 8,
    },
    detailTitle: {
      fontSize: 30,
      fontFamily: Fonts.heading,
      color: Colors.textPrimary,
      fontWeight: 'bold',
      marginBottom: 15,
      lineHeight: 40,
    },
    detailAuthor: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    detailAuthorImage: {
      width: 50,
      height: 50,
      borderRadius: 25,
      marginRight: 15,
      borderWidth: 1.5,
      borderColor: Colors.primaryAccent,
    },
    detailAuthorName: {
      fontSize: 18,
      fontFamily: Fonts.subheading,
      color: Colors.textPrimary,
      fontWeight: 'bold',
    },
    detailDate: {
      fontSize: 14,
      fontFamily: Fonts.body,
      color: Colors.textSecondary,
      marginTop: 3,
    },
    detailImage: {
      width: '100%',
      height: 250,
      borderRadius: 15,
      marginBottom: 20,
      resizeMode: 'cover',
    },
    detailContent: {
      fontSize: 17,
      fontFamily: Fonts.body,
      color: Colors.textPrimary,
      lineHeight: 28,
      marginBottom: 25,
    },
    mediaControls: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: 25,
    },
    mediaButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Colors.primaryAccent,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 20,
      marginHorizontal: 10,
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 5,
    },
    mediaButtonText: {
      color: Colors.background,
      fontSize: 16,
      fontFamily: Fonts.button,
      marginLeft: 8,
      fontWeight: 'bold',
    },
    commentSection: {
      marginTop: 30,
      paddingTop: 20,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: Colors.border,
    },
    commentsTitle: {
      fontSize: 22,
      fontFamily: Fonts.heading,
      color: Colors.textPrimary,
      fontWeight: 'bold',
      marginBottom: 20,
    },
    comment: {
      backgroundColor: Colors.cardBackground,
      borderRadius: 10,
      padding: 15,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    commentUser: {
      fontSize: 15,
      fontFamily: Fonts.subheading,
      color: Colors.primaryAccent,
      fontWeight: 'bold',
      marginBottom: 5,
    },
    commentContent: {
      fontSize: 15,
      fontFamily: Fonts.body,
      color: Colors.textPrimary,
      lineHeight: 22,
    },
    deleteCommentButton: {
      position: 'absolute',
      top: 10,
      right: 10,
      padding: 5,
    },
    commentInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 20,
      backgroundColor: Colors.cardBackground,
      borderRadius: 25,
      paddingLeft: 15,
      paddingRight: 5,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    commentUserImage: {
      width: 35,
      height: 35,
      borderRadius: 17.5,
      marginRight: 10,
      borderWidth: 1,
      borderColor: Colors.primaryAccent,
    },
    commentInput: {
      flex: 1,
      color: Colors.textPrimary,
      fontFamily: Fonts.body,
      fontSize: 16,
      minHeight: 40,
      paddingVertical: 10,
    },
    commentButton: {
      padding: 10,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Colors.cardBackground,
      borderRadius: 25,
      paddingHorizontal: 15,
      marginBottom: 25,
      marginTop: 10,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    searchIcon: {
      marginRight: 10,
    },
    searchInput: {
      flex: 1,
      color: Colors.textPrimary,
      fontFamily: Fonts.body,
      fontSize: 16,
      paddingVertical: 12,
    },
    clearSearchButton: {
      marginLeft: 10,
      padding: 5,
    },
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: 25,
    },
    categoryGridItem: {
      width: '48%', // Roughly two items per row
      backgroundColor: Colors.cardBackground,
      borderRadius: 12,
      padding: 20,
      marginBottom: 15,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 5,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    categoryGridText: {
      color: Colors.primaryAccent,
      fontSize: 16,
      fontFamily: Fonts.subheading,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    input: {
      backgroundColor: Colors.cardBackground,
      borderRadius: 10,
      padding: 16,
      marginBottom: 15,
      color: Colors.textPrimary,
      fontFamily: Fonts.body,
      fontSize: 16,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    textArea: {
      minHeight: 150,
      textAlignVertical: 'top',
    },
    pickerContainer: {
      backgroundColor: Colors.cardBackground,
      borderRadius: 10,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: Colors.border,
      overflow: 'hidden', // Ensures picker content respects border radius
    },
    picker: {
      height: 50,
      color: Colors.textPrimary,
    },
    pickerItem: {
      color: Colors.textPrimary, // This might not apply to all picker implementations
      fontSize: 16,
      fontFamily: Fonts.body,
      backgroundColor: Colors.cardBackground, // This might not apply to all picker implementations
    },
    mediaUploadButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Colors.cardBackground,
      borderRadius: 10,
      padding: 16,
      marginBottom: 12,
      justifyContent: 'flex-start',
      borderWidth: 1,
      borderColor: Colors.border,
    },
    mediaUploadButtonText: {
      color: Colors.primaryAccent,
      fontFamily: Fonts.subheading,
      fontSize: 16,
      marginLeft: 10,
    },
    selectedMediaText: {
      color: Colors.textSecondary,
      fontFamily: Fonts.body,
      fontSize: 14,
      marginBottom: 15,
      marginLeft: 5,
    },
    submitButton: {
      backgroundColor: Colors.primaryAccent,
      borderRadius: 10,
      padding: 18,
      alignItems: 'center',
      marginTop: 20,
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 8,
    },
    submitButtonText: {
      color: Colors.background, // Black text on gold button
      fontSize: 18,
      fontWeight: 'bold',
      fontFamily: Fonts.button,
    },
    cancelButton: {
      backgroundColor: Colors.cardBackground,
      borderRadius: 10,
      padding: 18,
      alignItems: 'center',
      marginTop: 12,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    cancelButtonText: {
      color: Colors.textSecondary,
      fontSize: 18,
      fontFamily: Fonts.button,
    },
    validationErrorText: {
      color: Colors.error,
      fontSize: 14,
      fontFamily: Fonts.body,
      textAlign: 'center',
      marginBottom: 15,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 50,
      padding: 20,
      backgroundColor: Colors.cardBackground,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    emptyStateHorizontal: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      width: screenWidth * 0.7, // Adjust width as needed for horizontal lists
      marginRight: 20,
      backgroundColor: Colors.cardBackground,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    emptyText: {
      color: Colors.textSecondary,
      fontSize: 18,
      fontFamily: Fonts.subheading,
      marginTop: 15,
      textAlign: 'center',
    },
    emptyTextSmall: {
      color: Colors.textSecondary,
      fontSize: 14,
      fontFamily: Fonts.body,
      marginTop: 5,
      textAlign: 'center',
      opacity: 0.8,
    },
    createButtonEmpty: {
      backgroundColor: Colors.primaryAccent,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 20,
      marginTop: 20,
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 5,
    },
    createButtonTextEmpty: {
      color: Colors.background,
      fontSize: 16,
      fontFamily: Fonts.button,
      fontWeight: 'bold',
    },
    profileHeader: {
      alignItems: 'center',
      marginTop: 20,
      marginBottom: 30,
      backgroundColor: Colors.cardBackground,
      borderRadius: 15,
      paddingVertical: 25,
      paddingHorizontal: 20,
      width: '100%',
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    profileImage: {
      width: 100,
      height: 100,
      borderRadius: 50,
      marginBottom: 15,
      borderWidth: 3,
      borderColor: Colors.primaryAccent,
    },
    profileName: {
      fontSize: 26,
      fontFamily: Fonts.heading,
      color: Colors.textPrimary,
      fontWeight: 'bold',
      marginBottom: 5,
    },
    profileEmail: {
      fontSize: 16,
      fontFamily: Fonts.body,
      color: Colors.textSecondary,
      marginBottom: 10,
    },
    profileBio: {
      fontSize: 15,
      fontFamily: Fonts.body,
      color: Colors.textPrimary,
      textAlign: 'center',
      marginHorizontal: 10,
      marginBottom: 20,
      lineHeight: 22,
    },
    editProfileButton: {
      flexDirection: 'row',
      backgroundColor: Colors.primaryAccent,
      borderRadius: 20,
      paddingVertical: 10,
      paddingHorizontal: 18,
      alignItems: 'center',
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 5,
    },
    editProfileButtonText: {
      color: Colors.background,
      fontSize: 15,
      fontFamily: Fonts.button,
      marginLeft: 8,
      fontWeight: 'bold',
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      width: '100%',
      marginBottom: 30,
      backgroundColor: Colors.cardBackground,
      borderRadius: 15,
      paddingVertical: 20,
      borderWidth: 1,
      borderColor: Colors.border,
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 5,
    },
    statBox: {
      alignItems: 'center',
    },
    statNumber: {
      fontSize: 24,
      fontFamily: Fonts.heading,
      color: Colors.primaryAccent,
      fontWeight: 'bold',
    },
    statLabel: {
      fontSize: 14,
      fontFamily: Fonts.body,
      color: Colors.textSecondary,
      marginTop: 5,
    },
    activityItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Colors.cardBackground,
      borderRadius: 10,
      padding: 15,
      marginBottom: 10,
      width: '100%',
      borderWidth: 1,
      borderColor: Colors.border,
    },
    activityText: {
      flex: 1,
      fontSize: 15,
      fontFamily: Fonts.body,
      color: Colors.textPrimary,
      marginLeft: 15,
    },
    activityDate: {
      fontSize: 13,
      fontFamily: Fonts.body,
      color: Colors.textSecondary,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: Colors.background,
      padding: 24,
      paddingTop: Platform.OS === 'android' ? 40 : 60,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 35,
    },
    modalTitle: {
      color: Colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      fontFamily: Fonts.heading,
    },
    navbar: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingVertical: 20,
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: Colors.cardBackground,
      borderTopLeftRadius: 30, // Unique shape
      borderTopRightRadius: 30, // Unique shape
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: 'rgba(255,255,255,0.1)',
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: -10 },
      shadowOpacity: 0.3,
      shadowRadius: 15,
      elevation: 10,
    },
    navItem: {
      alignItems: 'center',
      flex: 1,
      paddingVertical: 5,
    },
    navText: {
      fontSize: 12,
      fontFamily: Fonts.body,
      marginTop: 5,
      fontWeight: 'bold',
    },
  });

  export default App;