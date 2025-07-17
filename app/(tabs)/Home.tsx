import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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
  StatusBar,
  Pressable,
  KeyboardAvoidingView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser, useAuth } from '@clerk/clerk-expo';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';

const API_URL = 'https://devtalesbackend-1jbk.onrender.com';
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const Categories = [
  'Mythology',
  'Devotion',
  'Epic',
  'Folktale',
  'Philosophy',
  'Puranic',
  'Spirituality',
  'Rituals',
];

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
  overlay: 'rgba(0,0,0,0.7)',
  goldLight: '#C9A66B',
  goldDark: '#5E4A2E',
};

const Fonts = {
  heading: Platform.OS === 'ios' ? 'PlayfairDisplay-Bold' : 'serif',
  subheading: Platform.OS === 'ios' ? 'Inter-SemiBold' : 'sans-serif-medium',
  body: Platform.OS === 'ios' ? 'Inter-Regular' : 'sans-serif',
  button: Platform.OS === 'ios' ? 'Inter-Bold' : 'sans-serif',
};

const App = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedStory, setSelectedStory] = useState(null);
  const animatedValues = useRef({}).current;
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);

  type Story = {
    _id: string;
    title: string;
    content: string;
    category: string;
    imageUrl?: string;
    author: string;
    authorId: string;
    authorImage?: string;
    createdAt: string;
    updatedAt?: string;
    likes: string[];
    bookmarks: string[];
    comments: Array<{
      _id: string;
      userId: string;
      username: string;
      content: string;
    }>;
    [key: string]: any;
  };

  const [stories, setStories] = useState<Story[]>([]);
  const [bookmarkedStories, setBookmarkedStories] = useState<Story[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  type ImageAsset = { uri: string; fileName?: string;[key: string]: any } | null;

  const [newStory, setNewStory] = useState<{
    title: string;
    content: string;
    category: string;
    image: ImageAsset;
  }>({
    title: '',
    content: '',
    category: Categories[0],
    image: null,
  });

  const [editStory, setEditStory] = useState(null);
  const [commentText, setCommentText] = useState({});
  const [userProfile, setUserProfile] = useState(null);
  const [editProfileModal, setEditProfileModal] = useState(false);
  const [editProfileData, setEditProfileData] = useState<{ username: string; image: ImageAsset }>({ username: '', image: null });
  const [validationError, setValidationError] = useState<String | null>(null);
  const [randomTopPick, setRandomTopPick] = useState<Story | null>(null);

  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const navItems = [
    { name: 'home', label: 'Home', icon: 'home' },
    { name: 'explore', label: 'Discover', icon: 'compass' },
    { name: 'write', label: 'Create', icon: 'create' },
    { name: 'library', label: 'Library', icon: 'bookmark' },
  ];

  navItems.forEach(item => {
    animatedValues[item.name] = animatedValues[item.name] || new Animated.Value(0);
  });

  const profileImageUri = isLoaded && isSignedIn && user?.imageUrl
    ? user.imageUrl
    : 'https://placehold.co/40x40/8B6F47/F5F5F5?text=U';

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [activeTab, selectedStory]);

  useEffect(() => {
    StatusBar.setHidden(false);
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor(Colors.background);
  }, [activeTab, insets]);

  const fetchStories = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/api/stories`);
      setStories(response.data);
      if (response.data.length > 0) {
        const randomIndex = Math.floor(Math.random() * response.data.length);
        setRandomTopPick(response.data[randomIndex]);
      }
    } catch (err) {
      setError('Failed to fetch stories. Please try again.');
      console.error('Error fetching stories:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (stories.length > 0) {
        const randomIndex = Math.floor(Math.random() * stories.length);
        setRandomTopPick(stories[randomIndex]);
      }
    }, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [stories]);

  const fetchUserProfile = async (userId: any) => {
    if (!userId) return;
    try {
      const response = await axios.get(`${API_URL}/api/users/${userId}`);
      setUserProfile(response.data);
      setEditProfileData({ username: response.data.username, image: null });
    } catch (err) {
      setError('Failed to fetch user profile.');
      console.error('Error fetching user profile:', err);
    }
  };

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
      setError('Failed to fetch bookmarked stories.');
      console.error('Error fetching bookmarked stories:', err);
      setBookmarkedStories([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateStory = async () => {
    if (!isSignedIn) {
      Alert.alert('Authentication Required', 'Please sign in to create a story.');
      return;
    }
    if (!newStory.title || !newStory.content) {
      setValidationError('Title and content are required.');
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
        formData.append(
          'image',
          {
            uri: newStory.image.uri,
            name: `image_${Date.now()}.${newStory.image.uri.split('.').pop()}`,
            type: `image/${newStory.image.uri.split('.').pop()}`,
          } as any
        );
      }
      const response = await axios.post(`${API_URL}/api/stories`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      setNewStory({ title: '', content: '', category: Categories[0], image: null });
      setValidationError(null);
      Alert.alert('Success', 'Story created successfully.');
      setActiveTab('home');
      await fetchStories();
      console.log('New Story Created:', response.data);
    } catch (err) {
      Alert.alert('Error', 'Failed to create story. Please try again.');
      console.error('Error creating story:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProfile = async () => {
    if (!isSignedIn) {
      Alert.alert('Authentication Required', 'Please sign in to edit your profile.');
      return;
    }
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('username', editProfileData.username);
      if (editProfileData.image) {
        formData.append('image', {
          uri: editProfileData.image.uri,
          name: `profile_${Date.now()}.${editProfileData.image.uri.split('.').pop()}`,
          type: `image/${editProfileData.image.uri.split('.').pop()}`,
        } as any);
      }
      await axios.put(
        `${API_URL}/api/users/${user.id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      await fetchUserProfile(user.id);
      setEditProfileModal(false);
      Alert.alert('Success', 'Profile updated.');
    } catch (err) {
      Alert.alert('Error', 'Failed to update profile.');
      console.error('Error updating profile:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setUserProfile(null);
      setBookmarkedStories([]);
      setActiveTab('home');
      Alert.alert('Success', 'Signed out successfully.');
    } catch (err) {
      Alert.alert('Error', 'Failed to sign out.');
      console.error('Error signing out:', err);
    }
    setProfileMenuVisible(false);
  };

  const handleDeleteProfile = async () => {
    if (!isSignedIn) {
      Alert.alert('Authentication Required', 'Please sign in to delete your profile.');
      return;
    }
    Alert.alert(
      'Delete Profile',
      'Are you sure you want to delete your profile? This action is permanent and will remove all your stories and data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getToken();
              await axios.delete(`${API_URL}/api/users/${user.id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              setUserProfile(null);
              setBookmarkedStories([]);
              setStories(stories.filter(s => String(s.authorId?._id || s.authorId) !== String(user.id)));
              setActiveTab('home');
              Alert.alert('Success', 'Profile deleted successfully.');
            } catch (err) {
              Alert.alert('Error', 'Failed to delete profile.');
              console.error('Error deleting profile:', err);
            }
            setProfileMenuVisible(false);
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (activeTab === 'home' || activeTab === 'explore' || activeTab === 'profile') {
      fetchStories();
    }
    if (isSignedIn && user?.id) {
      fetchUserProfile(user.id);
    }
    if (activeTab === 'library') {
      fetchBookmarkedStories();
    }
  }, [activeTab, isSignedIn, user?.id]);

  useEffect(() => {
    Object.keys(animatedValues).forEach(tabName => {
      Animated.timing(animatedValues[tabName], {
        toValue: activeTab === tabName ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  }, [activeTab]);

  const handleNavPress = (tabName: string) => {
    setActiveTab(tabName);
    setSelectedStory(null);
  };

  const pickMedia = async (forProfile = false) => {
    setValidationError(null);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please allow access to your photos to select an image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        const extension = asset.uri ? asset.uri.split('.').pop()?.toLowerCase() : '';
        const validImageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
        if (!extension || !validImageExtensions.includes(extension)) {
          setValidationError('Please select a valid image file (jpg, png, gif, bmp, webp).');
          return;
        }
        if (forProfile) {
          setEditProfileData({ ...editProfileData, image: { ...asset, fileName: asset.fileName ?? undefined } });
        } else if (editStory && typeof editStory === 'object' && !('call' in editStory)) {
          setEditStory({ ...editStory, image: asset });
        } else {
          setNewStory({ ...newStory, image: asset });
        }
      }
    } catch (err) {
      setValidationError('Failed to pick image. Please try again.');
      console.error('Error picking image:', err);
    }
  };

  const handleLike = async (storyId: string) => {
    if (!isSignedIn) {
      Alert.alert('Authentication Required', 'Please sign in to like a story.');
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
      Alert.alert('Error', 'Failed to like/unlike story.');
      console.error('Error liking story:', err);
    }
  };

  const handleBookmark = async (storyId: string) => {
    if (!isSignedIn) {
      Alert.alert('Authentication Required', 'Please sign in to bookmark a story.');
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
      await fetchBookmarkedStories();
    } catch (err) {
      Alert.alert('Error', 'Failed to bookmark story.');
      console.error('Error bookmarking story:', err);
    }
  };

  const handleComment = async (storyId: string) => {
    if (!isSignedIn) {
      Alert.alert('Authentication Required', 'Please sign in to comment.');
      return;
    }
    if (!commentText[storyId as keyof typeof commentText] || (commentText[storyId as keyof typeof commentText] as string).trim() === '') {
      Alert.alert('Invalid Comment', 'Please enter a comment.');
      return;
    }
    try {
      const token = await getToken();
      const response = await axios.post(
        `${API_URL}/api/stories/${storyId}/comment`,
        { content: commentText[storyId as keyof typeof commentText] },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStories(stories.map(s => (s._id === storyId ? response.data : s)));
      if (selectedStory?._id === storyId) {
        setSelectedStory(response.data);
      }
      setBookmarkedStories(bookmarkedStories.map(s => (s._id === storyId ? response.data : s)));
      setCommentText({ ...commentText, [storyId]: '' });
    } catch (err) {
      Alert.alert('Error', 'Failed to add comment.');
      console.error('Error adding comment:', err);
    }
  };

  const handleDeleteComment = async (storyId: string, commentId: string) => {
    if (!isSignedIn) {
      Alert.alert('Authentication Required', 'Please sign in to delete a comment.');
      return;
    }
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
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
              Alert.alert('Success', 'Comment deleted.');
            } catch (err) {
              Alert.alert('Error', 'Failed to delete comment.');
              console.error('Error deleting comment:', err);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleEditStory = async () => {
    if (!isSignedIn) {
      Alert.alert('Authentication Required', 'Please sign in to edit a story.');
      return;
    }
    if (!editStory.title || !editStory.content) {
      setValidationError('Title and content are required.');
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
        } as any);
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
      Alert.alert('Success', 'Story updated.');
      setActiveTab('home');
      await fetchStories();
    } catch (err) {
      Alert.alert('Error', 'Failed to update story.');
      console.error('Error updating story:', err);
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    if (!isSignedIn) {
      Alert.alert('Authentication Required', 'Please sign in to delete a story.');
      return;
    }
    Alert.alert(
      'Delete Story',
      'Are you sure you want to delete this story? This action is permanent.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
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
              Alert.alert('Success', 'Story deleted.');
              await fetchStories();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete story.');
              console.error('Error deleting story:', err);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const renderStoryCard = (story: Story) => (
    <Animated.View style={{ opacity: fadeAnim }}>
      <TouchableOpacity
        style={styles.storyCard}
        onPress={() => setSelectedStory(story)}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <Image
            source={{ uri: story.authorImage || 'https://placehold.co/40x40/1C1C1C/F5F5F5?text=U' }}
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
            onPress={(e) => {
              e.stopPropagation();
              handleBookmark(story._id);
            }}
          >
            <Ionicons
              name={story.bookmarks.includes(user?.id || '') ? 'bookmark' : 'bookmark-outline'}
              size={24}
              color={story.bookmarks.includes(user?.id || '') ? Colors.primaryAccent : Colors.textSecondary}
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
              onPress={(e) => {
                e.stopPropagation();
                handleLike(story._id);
              }}
            >
              <Ionicons
                name={story.likes.includes(user?.id || '') ? 'heart' : 'heart-outline'}
                size={24}
                color={story.likes.includes(user?.id || '') ? Colors.like : Colors.textSecondary}
              />
              <Text style={styles.interactionCount}>{story.likes.length}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.interactionButton}
              onPress={(e) => {
                e.stopPropagation();
                setSelectedStory(story);
              }}
            >
              <Ionicons name="chatbubble-outline" size={24} color={Colors.textSecondary} />
              <Text style={styles.interactionCount}>{story.comments.length}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderStoryDetail = (story: Story) => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
        <ScrollView
          style={styles.storyDetailContainer}
          contentContainerStyle={styles.detailScrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.detailHeader}>
            <TouchableOpacity onPress={() => setSelectedStory(null)} style={styles.backButton}>
              <Ionicons name="arrow-back" size={28} color={Colors.primaryAccent} />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            <View style={styles.storyActions}>
              {String(story.authorId?._id || story.authorId) === String(userProfile?._id) && (
                <>
                  <TouchableOpacity
                    onPress={() => {
                      setEditStory(story);
                      setSelectedStory(null);
                      setActiveTab('write');
                    }}
                    style={styles.storyActionButton}
                  >
                    <Ionicons name="pencil" size={24} color={Colors.primaryAccent} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.storyActionButton}
                    onPress={() => handleDeleteStory(story._id)}
                  >
                    <Ionicons name="trash" size={24} color={Colors.error} />
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity
                style={styles.storyActionButton}
                onPress={() => handleBookmark(story._id)}
              >
                <Ionicons
                  name={story.bookmarks.includes(user?.id || '') ? 'bookmark' : 'bookmark-outline'}
                  size={24}
                  color={story.bookmarks.includes(user?.id || '') ? Colors.primaryAccent : Colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.detailTitle}>{story.title}</Text>

          <View style={styles.detailAuthor}>
            <Image
              source={{ uri: story.authorImage || 'https://placehold.co/40x40/1C1C1C/F5F5F5?text=U' }}
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
                  name={story.likes.includes(user?.id || '') ? 'heart' : 'heart-outline'}
                  size={24}
                  color={story.likes.includes(user?.id || '') ? Colors.like : Colors.textSecondary}
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
                <View style={styles.commentUserContainer}>
                  <Image
                    source={{ uri: 'https://placehold.co/30x30/1C1C1C/F5F5F5?text=U' }}
                    style={styles.commentUserImage}
                  />
                  <Text style={styles.commentUser}>{comment.username}</Text>
                </View>
                <Text style={styles.commentContent}>{comment.content}</Text>
                {String(comment.userId?._id || comment.userId) === String(userProfile?._id) && (
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
                  value={commentText[story._id as keyof typeof commentText] || ''}
                  onChangeText={text => setCommentText({ ...commentText, [story._id]: text })}
                  multiline
                />
                <TouchableOpacity
                  style={styles.commentButton}
                  onPress={() => handleComment(story._id)}
                  disabled={!commentText[story._id as keyof typeof commentText]}
                >
                  <Ionicons
                    name="send"
                    size={24}
                    color={commentText[story._id as keyof typeof commentText] ? Colors.primaryAccent : Colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );

  const renderHome = () => (
    <ScrollView
      style={styles.content}
      contentContainerStyle={styles.homeScrollContent}
      showsVerticalScrollIndicator={false}
    >
      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.primaryAccent} style={styles.loading} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <>
          <View style={styles.welcomeBanner}>
            <LinearGradient
              colors={[Colors.goldDark, Colors.goldLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.welcomeGradient}
            >
              <Text style={styles.welcomeText}>Hello there,</Text>
              <Text style={styles.welcomeName}>
                {isSignedIn && user?.firstName ? user.firstName : 'Explorer'}!
              </Text>
              <Text style={styles.welcomeMessage}>Discover timeless tales</Text>
            </LinearGradient>
          </View>

          <View style={styles.headerSection}>
            <Text style={styles.sectionTitle}>Featured Story</Text>
            <Text style={styles.sectionSubtitle}>Today's special pick for you</Text>
          </View>

          {randomTopPick ? (
            <Animated.View style={{ opacity: fadeAnim, marginBottom: 30 }}>
              <TouchableOpacity
                style={[styles.featuredStoryCard, { width: screenWidth - 35 }]}
                onPress={() => setSelectedStory(randomTopPick)}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: randomTopPick.imageUrl || 'https://placehold.co/600x400/1C1C1C/BBBBBB?text=Top+Pick' }}
                  style={styles.featuredStoryImage}
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.8)']}
                  style={styles.featuredStoryGradient}
                >
                  <View style={styles.featuredStoryInfo}>
                    <Text style={styles.featuredStoryTitle} numberOfLines={2}>{randomTopPick.title}</Text>
                    <Text style={styles.featuredStoryAuthor}>by {randomTopPick.author}</Text>
                    <View style={styles.categoryPillFeatured}>
                      <Text style={styles.categoryText}>{randomTopPick.category || 'General'}</Text>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <View style={styles.emptyStateHorizontal}>
              <Ionicons name="trending-up-outline" size={40} color={Colors.primaryAccent} />
              <Text style={styles.emptyTextSmall}>No featured stories yet</Text>
            </View>
          )}

          <View style={styles.headerSection}>
            <Text style={styles.sectionTitle}>Recently Added</Text>
            <Text style={styles.sectionSubtitle}>Explore the newest tales</Text>
          </View>

          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[...stories].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)}
            keyExtractor={item => item._id}
            renderItem={({ item }) => (
              <Animated.View style={{ opacity: fadeAnim, marginRight: 20 }}>
                <TouchableOpacity
                  style={styles.recentStoryCard}
                  onPress={() => setSelectedStory(item)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: item.imageUrl || 'https://placehold.co/300x200/1C1C1C/BBBBBB?text=New' }}
                    style={styles.recentStoryImage}
                  />
                  <View style={styles.recentStoryInfo}>
                    <Text style={styles.recentStoryTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.recentStoryAuthor}>by {item.author}</Text>
                    <View style={styles.categoryPillSmall}>
                      <Text style={styles.categoryText}>{item.category || 'General'}</Text>
                    </View>
                  </View>
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
          />

          <View style={styles.headerSection}>
            <Text style={styles.sectionTitle}>All Stories</Text>
            <Text style={styles.sectionSubtitle}>Dive into our collection</Text>
          </View>

          <FlatList
            data={stories}
            keyExtractor={item => item._id}
            renderItem={({ item }) => renderStoryCard(item)}
            contentContainerStyle={styles.storiesList}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Ionicons name="book-outline" size={50} color={Colors.primaryAccent} />
                <Text style={styles.emptyText}>No stories available yet</Text>
                <Text style={styles.emptyTextSmall}>Be the first to create one!</Text>
                <TouchableOpacity
                  style={styles.createButtonEmpty}
                  onPress={() => handleNavPress('write')}
                >
                  <Text style={styles.createButtonTextEmpty}>Add New Story</Text>
                </TouchableOpacity>
              </View>
            )}
            scrollEnabled={false}
          />
        </>
      )}
    </ScrollView>
  );

  const renderExplore = () => (
    <ScrollView
      style={styles.content}
      contentContainerStyle={styles.exploreScrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={24} color={Colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search stories by title or author..."
          placeholderTextColor={Colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
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
        {Categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryGridItem,
              searchQuery === category && styles.categoryGridItemActive
            ]}
            onPress={() => setSearchQuery(category)}
          >
            <Text style={styles.categoryGridText}>{category}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.headerSection}>
        <Text style={styles.sectionTitle}>
          {searchQuery ? 'Search Results' : 'Popular Stories'}
        </Text>
        <Text style={styles.sectionSubtitle}>
          {searchQuery ? `Stories matching "${searchQuery}"` : 'Trending in the community'}
        </Text>
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
              <Text style={styles.emptyText}>No stories found</Text>
              <Text style={styles.emptyTextSmall}>Try a different search term or category</Text>
            </View>
          )}
          scrollEnabled={false}
        />
      )}
    </ScrollView>
  );

  const renderWrite = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.writeScrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.modalTitle}>
          {editStory ? 'Edit Your Story' : 'Create a New Story'}
        </Text>

        {validationError && (
          <View style={styles.validationErrorContainer}>
            <Ionicons name="warning" size={20} color={Colors.error} />
            <Text style={styles.validationErrorText}>{validationError}</Text>
          </View>
        )}

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
            onValueChange={(itemValue) => (editStory ? setEditStory({ ...editStory, category: itemValue }) : setNewStory({ ...newStory, category: itemValue }))}
          >
            {Categories.map((cat, index) => (
              <Picker.Item key={index} label={cat} value={cat} />
            ))}
          </Picker>
        </View>

        <TouchableOpacity
          style={styles.mediaUploadButton}
          onPress={() => pickMedia()}
        >
          <Ionicons
            name={editStory?.image?.uri || newStory.image?.uri ? "image" : "image-outline"}
            size={24}
            color={Colors.primaryAccent}
          />
          <Text style={styles.mediaUploadButtonText}>
            {editStory?.image?.uri || newStory.image?.uri ? 'Change Image' : 'Add Image'}
          </Text>
          {(editStory?.image?.uri || newStory.image?.uri) && (
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={Colors.success}
              style={{ marginLeft: 'auto' }}
            />
          )}
        </TouchableOpacity>

        {(editStory?.image?.uri || newStory.image?.uri) && (
          <Text style={styles.selectedMediaText}>
            Selected: {editStory?.image?.fileName || newStory.image?.fileName || 'image.jpg'}
          </Text>
        )}

        <TouchableOpacity
          style={styles.submitButton}
          onPress={editStory ? handleEditStory : handleCreateStory}
          disabled={isLoading}
        >
          <LinearGradient
            colors={[Colors.primaryAccent, Colors.secondaryAccent]}
            style={styles.submitButtonGradient}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={Colors.textPrimary} />
            ) : (
              <Text style={styles.submitButtonText}>
                {editStory ? 'Update Story' : 'Publish Story'}
              </Text>
            )}
          </LinearGradient>
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
    </KeyboardAvoidingView>
  );

  const renderLibrary = () => {
    const userStories = stories.filter(story => story.authorId === userProfile?._id);
    const showMyStories = userStories.length > 0;

    return (
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.libraryScrollContent}
        showsVerticalScrollIndicator={false}
      >
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
            data={bookmarkedStories}
            keyExtractor={item => item._id}
            renderItem={({ item }) => renderStoryCard(item)}
            contentContainerStyle={styles.storiesList}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Ionicons name="bookmark-outline" size={50} color={Colors.primaryAccent} />
                <Text style={styles.emptyText}>No saved stories yet</Text>
                <Text style={styles.emptyTextSmall}>Bookmark stories from Home or Explore</Text>
              </View>
            )}
            scrollEnabled={false}
          />
        )}

        {showMyStories && (
          <>
            <View style={styles.headerSection}>
              <Text style={styles.sectionTitle}>My Stories</Text>
              <Text style={styles.sectionSubtitle}>Stories you've created</Text>
            </View>

            {isLoading ? (
              <ActivityIndicator size="large" color={Colors.primaryAccent} style={styles.loading} />
            ) : error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : (
              <FlatList
                data={userStories}
                keyExtractor={item => item._id}
                renderItem={({ item }) => renderStoryCard(item)}
                contentContainerStyle={styles.storiesList}
                ListEmptyComponent={() => (
                  <View style={styles.emptyState}>
                    <Ionicons name="create-outline" size={50} color={Colors.primaryAccent} />
                    <Text style={styles.emptyText}>You haven't created any stories yet</Text>
                    <Text style={styles.emptyTextSmall}>Share your wisdom with the community</Text>
                    <TouchableOpacity
                      style={styles.createButtonEmpty}
                      onPress={() => handleNavPress('write')}
                    >
                      <Text style={styles.createButtonTextEmpty}>Create First Story</Text>
                    </TouchableOpacity>
                  </View>
                )}
                scrollEnabled={false}
              />
            )}
          </>
        )}
      </ScrollView>
    );
  };

  const renderProfile = () => {
    const createdStoriesCount = userProfile ? stories.filter(s => s.authorId && String(s.authorId._id) === String(userProfile._id)).length : 0;

    return (
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.profileScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color={Colors.primaryAccent} style={styles.loading} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : !userProfile ? (
          <View style={styles.emptyState}>
            <Ionicons name="person-outline" size={50} color={Colors.primaryAccent} />
            <Text style={styles.emptyText}>Profile data not loaded</Text>
            <Text style={styles.emptyTextSmall}>Please try again later</Text>
          </View>
        ) : (
          <View style={styles.profileContainer}>
            <View style={styles.profileImageContainer}>
              <Image
                source={{ uri: profileImageUri || userProfile.imageUrl || 'https://placehold.co/150x150/1C1C1C/F5F5F5?text=Profile' }}
                style={styles.profileImage}
              />
              <TouchableOpacity
                style={styles.editImageButton}
                onPress={() => setEditProfileModal(true)}
              >
                <Ionicons name="camera" size={20} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.profileName}>{userProfile?.username || 'Guest'}</Text>

            {userProfile?.email && (
              <View style={styles.profileEmailContainer}>
                <Ionicons name="mail" size={16} color={Colors.textSecondary} />
                <Text style={styles.profileEmail}>{userProfile.email}</Text>
              </View>
            )}

            <View style={styles.profileStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {stories.filter(s => s.likes.includes(user?.id || '')).length}
                </Text>
                <Text style={styles.statLabel}>Liked</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{bookmarkedStories.length}</Text>
                <Text style={styles.statLabel}>Saved</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{createdStoriesCount}</Text>
                <Text style={styles.statLabel}>Created</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={() => setEditProfileModal(true)}
            >
              <LinearGradient
                colors={[Colors.primaryAccent, Colors.secondaryAccent]}
                style={styles.editProfileButtonGradient}
              >
                <Ionicons name="create-outline" size={20} color={Colors.textPrimary} />
                <Text style={styles.editProfileButtonText}>Edit Profile</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        <Modal
          animationType="slide"
          transparent={true}
          visible={editProfileModal}
          onRequestClose={() => setEditProfileModal(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setEditProfileModal(false)}
          >
            <Pressable style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Profile</Text>
                <TouchableOpacity
                  onPress={() => setEditProfileModal(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalContent}>
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor={Colors.textSecondary}
                  value={editProfileData.username}
                  onChangeText={text => setEditProfileData({ ...editProfileData, username: text })}
                />

                <TouchableOpacity
                  style={styles.mediaUploadButton}
                  onPress={() => pickMedia(true)}
                >
                  <Ionicons
                    name={editProfileData.image?.uri ? "image" : "image-outline"}
                    size={24}
                    color={Colors.primaryAccent}
                  />
                  <Text style={styles.mediaUploadButtonText}>
                    {editProfileData.image?.uri ? 'Change Profile Picture' : 'Add Profile Picture'}
                  </Text>
                  {editProfileData.image?.uri && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={Colors.success}
                      style={{ marginLeft: 'auto' }}
                    />
                  )}
                </TouchableOpacity>

                {editProfileData.image?.uri && (
                  <Text style={styles.selectedMediaText}>
                    Selected: {editProfileData.image?.fileName || 'image.jpg'}
                  </Text>
                )}

                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleEditProfile}
                >
                  <LinearGradient
                    colors={[Colors.primaryAccent, Colors.secondaryAccent]}
                    style={styles.submitButtonGradient}
                  >
                    <Text style={styles.submitButtonText}>Save Changes</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </ScrollView>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>DevTales</Text>

      {isSignedIn ? (
        activeTab === 'profile' ? (
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => setProfileMenuVisible(true)}
          >
            <Ionicons name="ellipsis-vertical" size={28} color={Colors.primaryAccent} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => handleNavPress('profile')}
          >
            <Image
              source={{ uri: userProfile?.imageUrl || 'https://placehold.co/100x100/8B6F47/F5F5F5?text=U' }}
              style={styles.headerProfileImage}
            />
          </TouchableOpacity>
        )
      ) : (
        <TouchableOpacity
          style={styles.signInButton}
          onPress={() => router.replace('/auth')}
        >
          <Text style={styles.signInButtonText}>Sign In</Text>
        </TouchableOpacity>
      )}

      <Modal
        animationType="fade"
        transparent={true}
        visible={profileMenuVisible}
        onRequestClose={() => setProfileMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.profileMenuOverlay}
          activeOpacity={1}
          onPress={() => setProfileMenuVisible(false)}
        >
          <View style={styles.profileMenu}>
            <TouchableOpacity
              style={styles.profileMenuItem}
              onPress={handleSignOut}
            >
              <Ionicons name="log-out-outline" size={24} color={Colors.textPrimary} />
              <Text style={styles.profileMenuText}>Sign Out</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.profileMenuItem}
              onPress={handleDeleteProfile}
            >
              <Ionicons name="trash-outline" size={24} color={Colors.error} />
              <Text style={[styles.profileMenuText, { color: Colors.error }]}>Delete Profile</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );

  const renderContent = () => {
    if (selectedStory) {
      return renderStoryDetail(selectedStory);
    }
    switch (activeTab) {
      case 'home': return renderHome();
      case 'explore': return renderExplore();
      case 'write': return renderWrite();
      case 'library': return renderLibrary();
      case 'profile': return renderProfile();
      default: return renderHome();
    }
  };

  if (!isLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primaryAccent} />
        <Text style={styles.loadingText}>Loading application...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="light-content"
        backgroundColor={Colors.background}
        hidden={false}
        translucent={Platform.OS === 'android' ? false : undefined}
      />

      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
        {renderHeader()}
        {renderContent()}

        <View style={styles.navbar}>
          {navItems.map(item => {
            const isFocused = activeTab === item.name;
            const iconColor = isFocused ? Colors.primaryAccent : Colors.textSecondary;
            const translateY = animatedValues[item.name].interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
            const opacity = animatedValues[item.name].interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });

            return (
              <TouchableOpacity
                key={item.name}
                onPress={() => handleNavPress(item.name)}
                style={styles.navItem}
              >
                <Animated.View style={{ transform: [{ translateY }], opacity }}>
                  <Ionicons
                    name={isFocused ? item.icon : `${item.icon}-outline`}
                    size={28}
                    color={iconColor}
                  />
                </Animated.View>
                <Text style={[styles.navText, { color: iconColor }]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 15 : 15,
  },
  headerTitle: {
    color: Colors.primaryAccent,
    fontSize: 28,
    fontFamily: Fonts.heading,
    letterSpacing: 1,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.primaryAccent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerProfileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  signInButton: {
    backgroundColor: Colors.primaryAccent,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInButtonText: {
    color: Colors.textPrimary,
    fontFamily: Fonts.button,
    fontSize: 16,
  },
  profileMenuOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    backgroundColor: Colors.overlay,
  },
  profileMenu: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 10,
    marginTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 60 : 60,
    marginRight: 15,
    padding: 10,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 180,
  },
  profileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  profileMenuText: {
    color: Colors.textPrimary,
    fontFamily: Fonts.button,
    fontSize: 16,
    marginLeft: 10,
  },
  content: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  homeScrollContent: {
    paddingBottom: 100,
  },
  welcomeBanner: {
    borderRadius: 15,
    margin: 15,
    marginBottom: 20,
    overflow: 'hidden',
  },
  welcomeGradient: {
    padding: 20,
    paddingVertical: 25,
  },
  welcomeText: {
    fontSize: 20,
    fontFamily: Fonts.subheading,
    color: Colors.textPrimary,
    opacity: 0.9,
  },
  welcomeName: {
    fontSize: 28,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
    marginTop: 5,
  },
  welcomeMessage: {
    fontSize: 16,
    fontFamily: Fonts.body,
    color: Colors.textPrimary,
    marginTop: 10,
    opacity: 0.9,
  },
  headerSection: {
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    marginTop: 5,
  },
  featuredStoriesList: {
    paddingHorizontal: 15,
    marginBottom: 30,
  },
  featuredStoryCard: {
    width: 100,
    height: screenWidth * 0.6,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: Colors.cardBackground,
    position: 'relative',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    margin: 10
  },
  featuredStoryImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  featuredStoryGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -1,

    height: '70%',
    justifyContent: 'flex-end',
    padding: 15,
  },
  featuredStoryInfo: {
    flexDirection: 'column',
  },
  featuredStoryTitle: {
    fontSize: 22,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
    marginBottom: 5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  featuredStoryAuthor: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  categoryPillFeatured: {
    backgroundColor: Colors.primaryAccent,
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  recentStoryCard: {
    width: screenWidth * 0.6,
    backgroundColor: Colors.cardBackground,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  recentStoryImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  recentStoryInfo: {
    padding: 12,
  },
  recentStoryTitle: {
    fontSize: 16,
    fontFamily: Fonts.subheading,
    color: Colors.textPrimary,
    marginBottom: 5,
  },
  recentStoryAuthor: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  categoryPillSmall: {
    backgroundColor: Colors.secondaryAccent,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  storiesList: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  storyCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardAuthorImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  cardAuthorInfo: {
    flex: 1,
  },
  cardAuthorName: {
    fontSize: 16,
    fontFamily: Fonts.subheading,
    color: Colors.textPrimary,
  },
  cardDate: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
  },
  bookmarkButton: {
    padding: 5,
  },
  storyContentContainer: {
    marginBottom: 10,
  },
  storyTitle: {
    fontSize: 20,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  storyImage: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    marginBottom: 10,
    resizeMode: 'cover',
  },
  storyExcerpt: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  readMoreText: {
    fontSize: 14,
    fontFamily: Fonts.button,
    color: Colors.primaryAccent,
    marginTop: 5,
    alignSelf: 'flex-end',
  },
  storyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
  },
  categoryPill: {
    backgroundColor: Colors.secondaryAccent,
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.textPrimary,
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
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    marginLeft: 5,
  },
  storyDetailContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  detailScrollContent: {
    paddingBottom: 100,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 15 : 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.cardBackground,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    color: Colors.primaryAccent,
    fontSize: 18,
    fontFamily: Fonts.button,
    marginLeft: 5,
  },
  storyActions: {
    flexDirection: 'row',
    gap: 10,
  },
  storyActionButton: {
    padding: 5,
  },
  detailTitle: {
    fontSize: 26,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
    padding: 15,
    paddingBottom: 0,
    lineHeight: 34,
  },
  detailAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    paddingTop: 10,
  },
  detailAuthorImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  detailAuthorName: {
    fontSize: 18,
    fontFamily: Fonts.subheading,
    color: Colors.textPrimary,
  },
  detailDate: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
  },
  detailImage: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
    marginBottom: 20,
  },
  detailContent: {
    fontSize: 16,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    paddingHorizontal: 15,
    lineHeight: 24,
    marginBottom: 20,
  },
  commentSection: {
    padding: 15,
    backgroundColor: Colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 20,
  },
  commentsTitle: {
    fontSize: 20,
    fontFamily: Fonts.subheading,
    color: Colors.textPrimary,
    marginBottom: 15,
  },
  comment: {
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    position: 'relative',
  },
  commentUserContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  commentUserImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  commentUser: {
    fontSize: 14,
    fontFamily: Fonts.subheading,
    color: Colors.primaryAccent,
  },
  commentContent: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    marginLeft: 38, // Align with user image
  },
  deleteCommentButton: {
    position: 'absolute',
    right: 10,
    top: 10,
    padding: 5,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: Colors.background,
    borderRadius: 25,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  commentInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontFamily: Fonts.body,
    fontSize: 14,
    maxHeight: 100,
    paddingVertical: 8,
  },
  commentButton: {
    padding: 8,
    marginLeft: 5,
  },
  exploreScrollContent: {
    paddingBottom: 100,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 25,
    margin: 15,
    paddingHorizontal: 15,
    paddingVertical: 5,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontFamily: Fonts.body,
    fontSize: 16,
    paddingVertical: 8,
  },
  clearSearchButton: {
    marginLeft: 10,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  categoryGridItem: {
    backgroundColor: Colors.secondaryAccent,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 15,
    margin: 5,
  },
  categoryGridItemActive: {
    backgroundColor: Colors.primaryAccent,
  },
  categoryGridText: {
    color: Colors.textPrimary,
    fontFamily: Fonts.body,
    fontSize: 14,
  },
  writeScrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  input: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 10,
    padding: 15,
    color: Colors.textPrimary,
    fontFamily: Fonts.body,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    minHeight: 200,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: Colors.textPrimary,
  },
  pickerItem: {
    color: Colors.textPrimary,
    fontFamily: Fonts.body,
    fontSize: 16,
  },
  mediaUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mediaUploadButtonText: {
    color: Colors.primaryAccent,
    fontFamily: Fonts.button,
    fontSize: 16,
    marginLeft: 10,
  },
  selectedMediaText: {
    color: Colors.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 12,
    marginBottom: 15,
    marginLeft: 5,
  },
  submitButton: {
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 20,
  },
  submitButtonGradient: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: Colors.textPrimary,
    fontFamily: Fonts.button,
    fontSize: 18,
  },
  cancelButton: {
    marginTop: 10,
    padding: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontFamily: Fonts.button,
    fontSize: 16,
  },
  validationErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(207, 42, 39, 0.1)',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  validationErrorText: {
    color: Colors.error,
    fontFamily: Fonts.body,
    fontSize: 14,
    marginLeft: 5,
  },
  libraryScrollContent: {
    paddingBottom: 100,
  },
  profileScrollContent: {
    paddingBottom: 100,
  },
  profileContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.cardBackground,
    borderRadius: 15,
    margin: 15,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: Colors.primaryAccent,
  },
  editImageButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: Colors.primaryAccent,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 24,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
    marginBottom: 5,
  },
  profileEmailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileEmail: {
    fontSize: 16,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    marginLeft: 5,
  },
  profileStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  statNumber: {
    fontSize: 20,
    fontFamily: Fonts.subheading,
    color: Colors.primaryAccent,
  },
  statLabel: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    marginTop: 5,
  },
  editProfileButton: {
    width: '80%',
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 10,
  },
  editProfileButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  editProfileButtonText: {
    color: Colors.textPrimary,
    fontFamily: Fonts.button,
    fontSize: 16,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.overlay,
  },
  modalContainer: {
    width: '90%',
    backgroundColor: Colors.cardBackground,
    borderRadius: 15,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalCloseButton: {
    padding: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: Fonts.heading,
    color: Colors.textPrimary,
  },
  modalContent: {
    padding: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 18,
    color: Colors.textSecondary,
    fontFamily: Fonts.subheading,
    marginTop: 10,
    textAlign: 'center',
  },
  emptyTextSmall: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Fonts.body,
    marginTop: 5,
    textAlign: 'center',
  },
  emptyStateHorizontal: {
    width: screenWidth * 0.7,
    height: screenWidth * 0.45,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  createButtonEmpty: {
    marginTop: 20,
    backgroundColor: Colors.primaryAccent,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  createButtonTextEmpty: {
    color: Colors.textPrimary,
    fontFamily: Fonts.button,
    fontSize: 16,
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.cardBackground,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  navItem: {
    alignItems: 'center',
    flex: 1,
  },
  navText: {
    fontSize: 12,
    fontFamily: Fonts.body,
    marginTop: 5,
  },
  loading: {
    marginVertical: 20,
  },
  errorText: {
    color: Colors.error,
    fontFamily: Fonts.body,
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 20,
  },
});

export default App;