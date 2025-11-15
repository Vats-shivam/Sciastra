import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  FlatList,
  Image,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import colors from '../config/colors';
import postApi from '../api/PostApi';
import authApi from '../api/AuthApi';
import { useLoader } from '../context/LoaderContext';
import { useNotification } from '../contexts/NotificationContext';
import useScreenApiLogger from '../hooks/useScreenApiLogger';

// Reaction types from backend enum
const REACTIONS = [
  { type: "LIKE", icon: "👍", label: "Like" },
  { type: "LOVE", icon: "❤️", label: "Love" },
  { type: "CELEBRATE", icon: "🎉", label: "Celebrate" },
  { type: "SUPPORT", icon: "🤝", label: "Support" },
  { type: "LAUGH", icon: "😂", label: "Laugh" },
  { type: "INSIGHTFUL", icon: "💡", label: "Insightful" },
];

const PostDetailScreen = ({ route, navigation }) => {
  const { postId, postData } = route.params;
  const { showLoader, hideLoader } = useLoader();
  const { showError, showSuccess } = useNotification();
  const insets = useSafeAreaInsets();

  useScreenApiLogger('PostDetail');

  const [post, setPost] = useState(postData || null);
  const [comments, setComments] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(!postData); // If we have post data, start with loading false
  const [refreshing, setRefreshing] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [reactionsLoading, setReactionsLoading] = useState(false);
  const [showReactionsList, setShowReactionsList] = useState(false);

  useEffect(() => {
    loadPostDetails();
  }, [postId, postData]);

  const loadPostDetails = async () => {
    try {
      setLoading(true);

      // Debug log the postData structure
      if (postData) {
        console.log('PostDetail - Using passed postData:', JSON.stringify(postData, null, 2));
      }

      // Only fetch post data if not already provided from previous screen
      const promises = [
        postApi.getPostComments(postId, 1, 20),
        postApi.getPostReactions(postId, 1, 50)
      ];

      // Add post fetch only if we don't have post data already
      if (!postData) {
        promises.unshift(postApi.getPostById(postId));
      }

      const results = await Promise.all(promises);

      let postResult, commentsResult, reactionsResult;

      if (!postData) {
        // If we fetched post data, it's the first result
        [postResult, commentsResult, reactionsResult] = results;
        if (postResult.success) {
          console.log('PostDetail - Using API postResult:', JSON.stringify(postResult.data, null, 2));
          setPost(postResult.data);
        } else {
          showError('Failed to load post details');
          navigation.goBack();
          return;
        }
      } else {
        // If we already have post data, skip to comments and reactions
        [commentsResult, reactionsResult] = results;
      }

      if (commentsResult.success) {
        setComments(commentsResult.data.comments || []);
      }

      if (reactionsResult.success) {
        setReactions(reactionsResult.data.reactions || []);
      }

    } catch (error) {
      showError('Failed to load post details');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPostDetails();
    setRefreshing(false);
  };

  const addComment = async () => {
    if (!newComment.trim()) {
      showError('Please enter a comment');
      return;
    }

    try {
      showLoader('Adding comment...');

      const result = await postApi.addComment(postId, newComment.trim());

      if (result.success) {
        // Add the new comment to the list
        setComments(prev => [result.data, ...prev]);
        setNewComment('');

        // Update post comment count if available
        if (post) {
          setPost(prev => ({
            ...prev,
            counts: {
              ...prev.counts,
              comments: (prev.counts?.comments || 0) + 1
            }
          }));
        }
      } else {
        showError(result.message || 'Failed to add comment');
      }
    } catch (error) {
      showError('Failed to add comment');
    } finally {
      hideLoader();
    }
  };

  const getImageSource = (mediaItem) => {
    const userToken = authApi.getAccessToken();

    if (mediaItem.key && userToken) {
      return postApi.getImageSource(mediaItem.key, userToken);
    }

    return { uri: mediaItem.uri || mediaItem.url || mediaItem.displayUrl };
  };

  const renderComment = ({ item: comment }) => {
    // Get profile picture - use user's profilePic if available, otherwise use default icon
    const profilePic = comment.user?.profile?.profilePic;
    const imageSource = profilePic
      ? { uri: profilePic }
      : require('../assets/icon.png');
    
    const userId = comment.user?.id || comment.userId;
    const currentUserId = authApi.getCurrentUserId();
    
    const handleUserPress = () => {
      if (!userId) return;
      
      if (userId === currentUserId || userId === '1') {
        navigation.navigate('ProfileTab');
      } else {
        navigation.navigate('UserProfile', { userId: userId });
      }
    };

    return (
      <View style={styles.commentItem}>
        <TouchableOpacity onPress={handleUserPress}>
          <Image
            source={imageSource}
            style={styles.commentAvatar}
          />
        </TouchableOpacity>
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <TouchableOpacity onPress={handleUserPress}>
            <Text style={styles.commentAuthor}>
              {comment.user?.profile?.name || 'Unknown User'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.commentTime}>
            {new Date(comment.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <Text style={styles.commentText}>{comment.content}</Text>

        {comment._count?.replies > 0 && (
          <TouchableOpacity style={styles.repliesButton}>
            <Text style={styles.repliesText}>
              View {comment._count.replies} {comment._count.replies === 1 ? 'reply' : 'replies'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
    );
  };

  const renderReaction = ({ item: reaction }) => {
    const reactionConfig = REACTIONS.find(r => r.type === reaction.type);
    
    // Get profile picture - use user's profilePic if available, otherwise use default icon
    const profilePic = reaction.user?.profile?.profilePic;
    const imageSource = profilePic
      ? { uri: profilePic }
      : require('../assets/icon.png');
    
    const userId = reaction.user?.id || reaction.userId;
    const currentUserId = authApi.getCurrentUserId();
    
    const handleUserPress = () => {
      if (!userId) return;
      
      if (userId === currentUserId || userId === '1') {
        navigation.navigate('ProfileTab');
      } else {
        navigation.navigate('UserProfile', { userId: userId });
      }
    };

    return (
      <View style={styles.reactionItem}>
        <TouchableOpacity onPress={handleUserPress}>
          <Image
            source={imageSource}
            style={styles.reactionAvatar}
          />
        </TouchableOpacity>
        <View style={styles.reactionContent}>
          <TouchableOpacity onPress={handleUserPress}>
            <Text style={styles.reactionAuthor}>
              {reaction.user?.profile?.name || 'Unknown User'}
            </Text>
          </TouchableOpacity>
          <View style={styles.reactionType}>
            <Text style={styles.reactionIcon}>{reactionConfig?.icon || '👍'}</Text>
            <Text style={styles.reactionLabel}>{reactionConfig?.label || 'Like'}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.button} />
          <Text style={styles.loadingText}>Loading post...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Post not found</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadPostDetails}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const totalReactions = reactions.length;
  const totalComments = comments.length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top || 0 }] }>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <TouchableOpacity>
          <Icon name="dots-vertical" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          keyboardShouldPersistTaps="handled"
        >
          {/* Post Content */}
          <View style={styles.postCard}>
            {/* Author Info */}
            <View style={styles.postHeader}>
              <Image
                source={{
                  uri: post.author?.profile?.profilePic
                    ? postApi.getImageSource(post.author.profile.profilePic, authApi.getAccessToken()).uri
                    : post.author?.profilePic || 'https://randomuser.me/api/portraits/men/1.jpg'
                }}
                style={styles.avatar}
              />
              <View style={styles.authorInfo}>
                <Text style={styles.authorName}>
                  {post.author?.profile?.name || post.author?.name || 'Unknown User'}
                </Text>
                <Text style={styles.postTime}>
                  {new Date(post.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>

            {/* Post Content */}
            <Text style={styles.postContent}>{post.content}</Text>

            {/* Post Media */}
            {post.media && post.media.length > 0 && (
              <View style={styles.mediaContainer}>
                {post.media.map((mediaItem, index) => (
                  <Image
                    key={index}
                    source={getImageSource(mediaItem)}
                    style={styles.postImage}
                    resizeMode="cover"
                  />
                ))}
              </View>
            )}

            {/* Engagement Stats */}
            <View style={styles.engagementStats}>
              <View style={styles.statButton}>
                <Text style={styles.statText}>
                  {totalReactions} {totalReactions === 1 ? 'reaction' : 'reactions'}
                </Text>
              </View>
              <View style={styles.statButton}>
                <Text style={styles.statText}>
                  {totalComments} {totalComments === 1 ? 'comment' : 'comments'}
                </Text>
              </View>
            </View>
          </View>

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            {comments.length > 0 ? (
              <FlatList
                data={comments}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderComment}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No comments yet</Text>
                <Text style={styles.emptySubtext}>Be the first to comment!</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Comment Input */}
        <View style={[styles.commentInputWrapper, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="Write a comment..."
              placeholderTextColor={colors.textMuted}
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={500}
              returnKeyType="send"
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[styles.sendButton, !newComment.trim() && styles.sendButtonDisabled]}
              onPress={addComment}
              disabled={!newComment.trim()}
            >
              <Icon name="send" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    color: colors.textPrimary,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // Extra padding to ensure content is scrollable above floating comment box
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Gilroy-Medium',
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: colors.button,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    color: colors.white,
    fontFamily: 'Gilroy-Bold',
  },

  // Post Card Styles
  postCard: {
    backgroundColor: colors.card,
    margin: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 0,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: colors.textPrimary,
  },
  postTime: {
    fontSize: 12,
    fontFamily: 'Gilroy-Medium',
    color: colors.textMuted,
    marginTop: 2,
  },
  postContent: {
    fontSize: 16,
    fontFamily: 'Gilroy-Medium',
    lineHeight: 24,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  mediaContainer: {
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
  },
  engagementStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  statButton: {
    flex: 1,
    backgroundColor: colors.backgroundElevated,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statText: {
    fontSize: 14,
    fontFamily: 'Gilroy-SemiBold',
    color: colors.textPrimary,
    textAlign: 'center',
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSecondary,
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.textInverse,
  },

  // Comments
  commentsSection: {
    paddingHorizontal: 16,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 16,
  },
  commentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  commentAuthor: {
    fontSize: 15,
    fontFamily: 'Gilroy-Bold',
    color: colors.textPrimary,
  },
  commentTime: {
    fontSize: 11,
    fontFamily: 'Gilroy-Medium',
    color: colors.textMuted,
  },
  commentText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Medium',
    lineHeight: 20,
    color: colors.textSecondary,
  },
  repliesButton: {
    marginTop: 8,
    backgroundColor: colors.backgroundElevated,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  repliesText: {
    fontSize: 12,
    fontFamily: 'Gilroy-SemiBold',
    color: colors.button,
  },

  // Reactions
  reactionsSection: {
    paddingHorizontal: 16,
  },
  reactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reactionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  reactionContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reactionAuthor: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  reactionType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reactionIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  reactionLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  // Comment Input
  commentInputWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 28,
    paddingLeft: 20,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 56,
    borderWidth: 1,
    borderColor: colors.border,
  },
  commentInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Gilroy-Medium',
    color: colors.textPrimary,
    maxHeight: 120,
    paddingVertical: 12,
    paddingRight: 12,
  },
  sendButton: {
    backgroundColor: colors.button,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },

  // Empty States
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    backgroundColor: colors.card,
    borderRadius: 16,
    marginHorizontal: 16,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Gilroy-Medium',
    color: colors.textMuted,
  },
});

export default PostDetailScreen;