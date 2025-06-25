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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser, useAuth } from '@clerk/clerk-expo';
import axios from 'axios';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';

const API_URL = 'http://192.168.16.65:3000'; // Replace with your actual API URL
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const App = () => {
  const [activeTab, setActiveTab] = useState('home');
  const animatedValues = useRef({});
  const [stories, setStories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newStory, setNewStory] = useState({
    title: '',
    content: '',
    category: '',
    image: null,
    audio: null,
    video: null,
  });
  const [commentText, setCommentText] = useState({});
  const [userProfile, setUserProfile] = useState(null);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [playbackObject, setPlaybackObject] = useState(null);
  const [playingMediaId, setPlayingMediaId] = useState(null);

  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();

  // Updated Navigation Items
  const navItems = [
    { name: 'home', label: 'Home', icon: 'home-outline' },
    { name: 'explore', label: 'Explore', icon: 'compass-outline' },
    { name: 'write', label: 'Write', icon: 'create-outline' },
    { name: 'mylibrary', label: 'My Library', icon: 'bookmark-outline' }, // Renamed from 'library'
    { name: 'notifications', label: 'Notifications', icon: 'notifications-outline' }, // New tab
    // Removed 'profile' from here, profile access will be via header image
  ];

  navItems.forEach(item => {
    animatedValues.current[item.name] = animatedValues.current[item.name] || new Animated.Value(0);
  });

  const profileImageUri = isLoaded && isSignedIn && user?.imageUrl
    ? user.imageUrl
    : 'https://placehold.co/40x40/6200ea/ffffff?text=DT';

  // Fetch stories
  const fetchStories = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/api/stories`);
      setStories(response.data);
    } catch (err) {
      setError('Failed to load stories. Please try again.');
      console.error('Error fetching stories:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch user profile by clerkId or ObjectId
  const fetchUserProfile = async (userId) => {
    if (!userId) return;
    try {
      const response = await axios.get(`${API_URL}/api/users/${userId}`);
      setUserProfile(response.data);
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError('Failed to load user profile.');
    }
  };

  // Fetch suggested users
  const fetchSuggestedUsers = async () => {
    if (!isSignedIn) return;
    try {
      const token = await getToken();
      const response = await axios.get(`${API_URL}/api/users/suggested`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuggestedUsers(response.data);
    } catch (err) {
      console.error('Error fetching suggested users:', err);
      setError('Failed to load suggested users.');
    }
  };

  // Fetch stories or library based on tab
  useEffect(() => {
    if (activeTab === 'home' || activeTab === 'explore') {
      fetchStories();
    } else if (activeTab === 'mylibrary' && isSignedIn) { // Updated tab name
      const fetchLibrary = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const token = await getToken();
          const response = await axios.get(`${API_URL}/api/users/library`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setStories(response.data);
        } catch (err) {
          setError('Failed to load library. Please try again.');
          console.error('Error fetching library:', err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchLibrary();
    } else if (activeTab === 'profile' && isSignedIn && user?.id) { // Profile tab handled separately for now
      fetchUserProfile(user.id); // Use Clerk userId
      fetchSuggestedUsers();
    }
    // No specific fetch for 'notifications' for now, just render placeholder
  }, [activeTab, isSignedIn, user?.id]);

  useEffect(() => {
    Object.keys(animatedValues.current).forEach(tabName => {
      Animated.timing(animatedValues.current[tabName], {
        toValue: activeTab === tabName ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  }, [activeTab]);

  // Cleanup playback
  useEffect(() => {
    return () => {
      if (playbackObject) {
        playbackObject.unloadAsync();
      }
    };
  }, [playbackObject]);

  const handleNavPress = (tabName) => {
    setActiveTab(tabName);
    if (playbackObject) {
      playbackObject.stopAsync();
      setPlayingMediaId(null);
    }
  };

  const handleProfilePress = () => {
    // Navigating to a dedicated profile screen/modal can be implemented here
    // For now, let's keep it simple and perhaps show profile details in a modal or new screen.
    // As per the request, removing it from the bottom nav and accessing via header icon.
    alert('Profile button pressed! Implement dedicated profile screen.');
  };

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
      alert('Failed to play media.');
    }
  };

  const pickMedia = async (type) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:
        type === 'image'
          ? ImagePicker.MediaTypeOptions.Images
          : type === 'audio'
          ? ImagePicker.MediaTypeOptions.All
          : ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      base64: true,
    });

    if (!result.canceled) {
      setNewStory({ ...newStory, [type]: result.assets[0] });
    }
  };

  const handleLike = async (storyId) => {
    if (!isSignedIn) {
      alert('Please sign in to like a story.');
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
    } catch (err) {
      alert('Failed to like story.');
      console.error('Error liking story:', err);
    }
  };

  const handleBookmark = async (storyId) => {
    if (!isSignedIn) {
      alert('Please sign in to bookmark a story.');
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
    } catch (err) {
      alert('Failed to bookmark story.');
      console.error('Error bookmarking story:', err);
    }
  };

  const handleComment = async (storyId) => {
    if (!isSignedIn) {
      alert('Please sign in to comment.');
      return;
    }
    if (!commentText[storyId]) {
      alert('Please enter a comment.');
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
      setCommentText({ ...commentText, [storyId]: '' });
    } catch (err) {
      alert('Failed to add comment.');
      console.error('Error adding comment:', err);
    }
  };

  const handleFollow = async (targetUserId) => {
    if (!isSignedIn) {
      alert('Please sign in to follow users.');
      return;
    }
    try {
      const token = await getToken();
      await axios.post(
        `${API_URL}/api/users/${targetUserId}/follow`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Removed direct profile refresh here as profile tab is gone from bottom nav
      // Instead, we might need to update a state that influences the suggestions if necessary.
      fetchSuggestedUsers(); // Refresh suggestions
      alert('User followed successfully!');
    } catch (err) {
      alert('Failed to follow user.');
      console.error('Error following user:', err);
    }
  };


  // Refactored renderStoryCard for Instagram-like feed
  const renderStoryCard = (story) => (
    <View style={styles.instagramStoryCard}>
      <View style={styles.cardHeader}>
        <Image
          source={{ uri: story.authorImage || 'https://placehold.co/40x40/6200ea/ffffff?text=U' }}
          style={styles.cardAuthorImage}
        />
        <TouchableOpacity onPress={() => handleProfilePress(story.authorId._id)}> {/* Placeholder for author profile */}
          <Text style={styles.cardAuthorName}>{story.author}</Text>
        </TouchableOpacity>
      </View>
      {story.imageUrl && (
        <Image
          source={{ uri: story.imageUrl }}
          style={styles.instagramStoryImage}
          onError={() => console.log('Failed to load story image')}
        />
      )}
      <View style={styles.cardContent}>
        <View style={styles.instagramSocialContainer}>
          <TouchableOpacity style={styles.instagramSocialButton} onPress={() => handleLike(story._id)}>
            <Ionicons
              name={story.likes.includes(user?.id) ? 'heart' : 'heart-outline'}
              size={24}
              color={story.likes.includes(user?.id) ? '#ff6b6b' : '#ffffff'}
            />
            <Text style={styles.instagramSocialText}>{story.likes.length}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.instagramSocialButton}>
            <Ionicons name="chatbubble-outline" size={24} color="#ffffff" />
            <Text style={styles.instagramSocialText}>{story.comments.length}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.instagramSocialButton} onPress={() => handleBookmark(story._id)}>
            <Ionicons
              name={story.bookmarks.includes(user?.id) ? 'bookmark' : 'bookmark-outline'}
              size={24}
              color={story.bookmarks.includes(user?.id) ? '#BB86FC' : '#ffffff'}
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.instagramStoryTitle}>{story.title}</Text>
        <Text style={styles.instagramStoryExcerpt}>
          <Text style={styles.cardAuthorName}>{story.author}: </Text>
          {story.content.substring(0, 150)}...
        </Text>
        <Text style={styles.instagramStoryCategory}>Category: {story.category || 'None'}</Text>
        <Text style={styles.instagramStoryDate}>
          {new Date(story.createdAt).toLocaleDateString()}
        </Text>

        {(story.audioUrl || story.videoUrl) && (
          <View style={styles.mediaControls}>
            {story.audioUrl && (
              <TouchableOpacity
                style={styles.mediaButton}
                onPress={() => handlePlayMedia(story.audioUrl, `audio-${story._id}`)}
              >
                <Ionicons
                  name={playingMediaId === `audio-${story._id}` ? 'pause' : 'play'}
                  size={20}
                  color="#ffffff"
                />
                <Text style={styles.mediaButtonText}>Audio</Text>
              </TouchableOpacity>
            )}
            {story.videoUrl && (
              <TouchableOpacity
                style={styles.mediaButton}
                onPress={() => handlePlayMedia(story.videoUrl, `video-${story._id}`)}
              >
                <Ionicons
                  name={playingMediaId === `video-${story._id}` ? 'pause' : 'play'}
                  size={20}
                  color="#ffffff"
                />
                <Text style={styles.mediaButtonText}>Video</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.commentSection}>
          {story.comments.length > 0 && (
            <TouchableOpacity onPress={() => {/* navigate to all comments */}}>
              <Text style={styles.commentViewAll}>View all {story.comments.length} comments</Text>
            </TouchableOpacity>
          )}
          {story.comments.slice(0, 2).map((comment, index) => ( // Show only first 2 comments
            <View key={index} style={styles.comment}>
              <Text style={styles.commentUser}>{comment.username}</Text>
              <Text style={styles.commentContent}>{comment.content}</Text>
            </View>
          ))}
          {isSignedIn && (
            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                placeholderTextColor="#a0a0a0"
                value={commentText[story._id] || ''}
                onChangeText={text => setCommentText({ ...commentText, [story._id]: text })}
              />
              <TouchableOpacity
                style={styles.commentButton}
                onPress={() => handleComment(story._id)}
              >
                <Text style={styles.commentButtonText}>Post</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.readMoreButton}>
          <Text style={styles.readMoreText}>Read Full Story</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderHome = () => (
    <FlatList
      data={stories}
      keyExtractor={item => item._id}
      renderItem={({ item }) => renderStoryCard(item)}
      ListHeaderComponent={() => (
        <Text style={styles.sectionTitle}>Your Feed</Text>
      )}
      ListEmptyComponent={() => (
        isLoading ? (
          <ActivityIndicator size="large" color="#BB86FC" style={styles.loading} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <Text style={styles.emptyText}>No stories available. Start following some authors or write your own!</Text>
        )
      )}
      contentContainerStyle={styles.content}
    />
  );

  const renderExplore = () => (
    <View style={styles.content}>
      <TextInput
        style={styles.searchBar}
        placeholder="Search stories..."
        placeholderTextColor="#a0a0a0"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      {isLoading ? (
        <ActivityIndicator size="large" color="#BB86FC" style={styles.loading} />
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
          numColumns={2}
          renderItem={({ item }) => renderStoryCard(item)} // Changed to use the single story card for consistency
          contentContainerStyle={styles.exploreGrid}
          ListEmptyComponent={() => (
            <Text style={styles.emptyText}>No stories found for your search.</Text>
          )}
        />
      )}
    </View>
  );

  const renderWrite = () => (
    <ScrollView style={styles.content}>
      <Text style={styles.sectionTitle}>Create a Story</Text>
      <TextInput
        style={styles.editorInput}
        placeholder="Story title..."
        placeholderTextColor="#a0a0a0"
        value={newStory.title}
        onChangeText={text => setNewStory({ ...newStory, title: text })}
      />
      <TextInput
        style={[styles.editorInput, { height: 200 }]}
        multiline
        placeholder="Write your story here..."
        placeholderTextColor="#a0a0a0"
        value={newStory.content}
        onChangeText={text => setNewStory({ ...newStory, content: text })}
      />
      <TextInput
        style={styles.editorInput}
        placeholder="Category (e.g., Fantasy, Sci-Fi)"
        placeholderTextColor="#a0a0a0"
        value={newStory.category}
        onChangeText={text => setNewStory({ ...newStory, category: text })}
      />
      <View style={styles.mediaPickerContainer}>
        <TouchableOpacity style={styles.mediaPickerButton} onPress={() => pickMedia('image')}>
          <Text style={styles.mediaPickerText}>
            {newStory.image ? 'Image Selected' : 'Pick Image'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.mediaPickerButton} onPress={() => pickMedia('audio')}>
          <Text style={styles.mediaPickerText}>
            {newStory.audio ? 'Audio Selected' : 'Pick Audio'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.mediaPickerButton} onPress={() => pickMedia('video')}>
          <Text style={styles.mediaPickerText}>
            {newStory.video ? 'Video Selected' : 'Pick Video'}
          </Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={styles.saveButton}
        onPress={async () => {
          if (!isSignedIn) {
            alert('Please sign in to create a story.');
            return;
          }
          if (!newStory.title || !newStory.content) {
            alert('Title and content are required.');
            return;
          }
          try {
            const token = await getToken();
            const formData = new FormData();
            formData.append('title', newStory.title);
            formData.append('content', newStory.content);
            formData.append('category', newStory.category);
            if (newStory.image) {
              formData.append('image', {
                uri: newStory.image.uri,
                name: `${newStory.title}_image.${newStory.image.uri.split('.').pop()}`,
                type: `image/${newStory.image.uri.split('.').pop()}`,
              });
            }
            if (newStory.audio) {
              formData.append('audio', {
                uri: newStory.audio.uri,
                name: `${newStory.title}_audio.${newStory.audio.uri.split('.').pop()}`,
                type: `audio/${newStory.audio.uri.split('.').pop()}`,
              });
            }
            if (newStory.video) {
              formData.append('video', {
                uri: newStory.video.uri,
                name: `${newStory.title}_video.${newStory.video.uri.split('.').pop()}`,
                type: `video/${newStory.video.uri.split('.').pop()}`,
              });
            }
            const response = await axios.post(`${API_URL}/api/stories`, formData, {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data',
              },
            });
            setStories([response.data, ...stories]);
            setNewStory({
              title: '',
              content: '',
              category: '',
              image: null,
              audio: null,
              video: null,
            });
            alert('Story saved successfully!');
          } catch (err) {
            alert('Failed to save story.');
            console.error('Error saving story:', err);
          }
        }}
      >
        <Text style={styles.saveButtonText}>Save Story</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderMyLibrary = () => ( // Updated function name
    <ScrollView style={styles.content}>
      <Text style={styles.sectionTitle}>My Library</Text>
      {isLoading ? (
        <ActivityIndicator size="large" color="#BB86FC" style={styles.loading} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : stories.length > 0 ? (
        stories.map(story => renderStoryCard(story))
      ) : (
        <Text style={styles.emptyText}>You haven't saved any stories yet.</Text>
      )}
    </ScrollView>
  );

  const renderNotifications = () => (
    <ScrollView style={styles.content}>
      <Text style={styles.sectionTitle}>Notifications</Text>
      <View style={styles.notificationItem}>
        <Ionicons name="heart" size={24} color="#ff6b6b" />
        <Text style={styles.notificationText}>Your story "The Great Adventure" was liked by John Doe.</Text>
      </View>
      <View style={styles.notificationItem}>
        <Ionicons name="chatbubble" size={24} color="#BB86FC" />
        <Text style={styles.notificationText}>Jane Smith commented on your story "Whispers in the Wind".</Text>
      </View>
      <View style={styles.notificationItem}>
        <Ionicons name="person-add" size={24} color="#00C853" />
        <Text style={styles.notificationText}>Mark Johnson started following you.</Text>
      </View>
      {/* Add more realistic notification fetching and rendering here */}
      <Text style={styles.emptyText}>No new notifications.</Text>
    </ScrollView>
  );


  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return renderHome();
      case 'explore':
        return renderExplore();
      case 'write':
        return renderWrite();
      case 'mylibrary': // Updated tab name
        return renderMyLibrary();
      case 'notifications': // New tab
        return renderNotifications();
      default:
        return renderHome();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ alignItems: 'center', marginTop: 10 }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>DevTales</Text>
          <TouchableOpacity onPress={handleProfilePress} activeOpacity={0.7}>
            <Image
              source={{ uri: profileImageUri }}
              style={styles.profileImage}
              onError={() => console.log('Failed to load profile image.')}
            />
          </TouchableOpacity>
        </View>
      </View>
      {renderContent()}
      <View style={styles.navbar}>
        <View style={styles.navbarGlass} />
        {navItems.map(item => {
          const iconScale = animatedValues.current[item.name].interpolate({
            inputRange: [0, 1],
            outputRange: [1, 1.2],
          });
          const textColor = activeTab === item.name ? '#BB86FC' : '#a0a0a0';
          const iconColor = activeTab === item.name ? '#BB86FC' : '#a0a0a0';

          return (
            <TouchableOpacity
              key={item.name}
              style={[styles.navItem, activeTab === item.name && styles.activeNavItemBackground]}
              onPress={() => handleNavPress(item.name)}
              activeOpacity={0.7}
            >
              <Animated.View style={{ transform: [{ scale: iconScale }] }}>
                <Ionicons name={item.icon} size={24} color={iconColor} style={styles.navIcon} />
              </Animated.View>
              <Text style={[styles.navLabel, { color: textColor }, activeTab === item.name && styles.activeNavLabel]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    marginTop: -10,
    borderColor: '#1e1e1e',
    height: 75,
    width: screenWidth,
    borderRadius: 10,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#6200ea',
  },
  content: {
    flexGrow: 1, // Use flexGrow for ScrollView content
    paddingHorizontal: 16,
    paddingBottom: 120, // Adjusted for navbar height
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
    marginVertical: 16,
  },
  // Instagram-like Story Card Styles
  instagramStoryCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  cardAuthorImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#BB86FC',
  },
  cardAuthorName: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  instagramStoryImage: {
    width: '100%',
    height: screenWidth * 0.8, // Make image larger, responsive to screen width
    resizeMode: 'cover',
  },
  cardContent: {
    padding: 12,
  },
  instagramSocialContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  instagramSocialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  instagramSocialText: {
    color: '#ffffff',
    marginLeft: 5,
    fontSize: 16,
  },
  instagramStoryTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 5,
  },
  instagramStoryExcerpt: {
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 5,
  },
  instagramStoryCategory: {
    color: '#BB86FC',
    fontSize: 12,
    marginBottom: 5,
  },
  instagramStoryDate: {
    color: '#a0a0a0',
    fontSize: 11,
    marginBottom: 10,
  },
  mediaControls: {
    flexDirection: 'row',
    marginVertical: 8,
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6200ea',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  mediaButtonText: {
    color: '#ffffff',
    fontSize: 14,
    marginLeft: 4,
  },
  commentSection: {
    marginTop: 10,
  },
  commentViewAll: {
    color: '#a0a0a0',
    fontSize: 13,
    marginBottom: 8,
  },
  comment: {
    marginBottom: 5,
  },
  commentUser: {
    color: '#BB86FC',
    fontSize: 13,
    fontWeight: '600',
    marginRight: 5,
  },
  commentContent: {
    color: '#ffffff',
    fontSize: 13,
    flexShrink: 1, // Allow text to wrap
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#252525',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
    color: '#ffffff',
    fontSize: 14,
    marginRight: 10,
  },
  commentButton: {
    backgroundColor: '#6200ea',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  commentButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  readMoreButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  readMoreText: {
    color: '#BB86FC',
    fontSize: 14,
    fontWeight: '600',
  },
  searchBar: {
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    padding: 12,
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  exploreGrid: {
    paddingBottom: 16,
    justifyContent: 'space-between', // Distribute items evenly
  },
  editorInput: {
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    padding: 16,
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    textAlignVertical: 'top',
  },
  mediaPickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  mediaPickerButton: {
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    padding: 12,
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  mediaPickerText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#6200ea',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignSelf: 'center',
    marginBottom: 16,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    color: '#a0a0a0',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  loading: {
    marginTop: 20,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  notificationText: {
    color: '#ffffff',
    marginLeft: 10,
    fontSize: 14,
    flexShrink: 1,
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    position: 'absolute',
    bottom: 30,
    left: 16,
    right: 16,
    height: 70,
    borderRadius: 30,
    backgroundColor: 'transparent',
    zIndex: 1000,
  },
  navbarGlass: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(30, 30, 30, 0.4)',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 25,
    marginHorizontal: 4,
    zIndex: 2,
  },
  activeNavItemBackground: {
    backgroundColor: 'rgba(98, 0, 234, 0.2)',
  },
  navIcon: {
    marginBottom: 4,
  },
  navLabel: {
    fontSize: 12,
    color: '#a0a0a0',
    fontWeight: '900',
  },
  activeNavLabel: {
    fontWeight: '700',
  },
});

export default App;