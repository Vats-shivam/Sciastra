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
  const [activeTab, setActiveTab] = useState('comments'); // 'comments' or 'reactions'

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

  const renderComment = ({ item: comment }) => (
    <View style={styles.commentItem}>
      <Image
        source={{
          uri: comment.user?.profile?.profilePic
            ? postApi.getImageSource(comment.user.profile.profilePic, authApi.getAccessToken()).uri
            : 'https://randomuser.me/api/portraits/men/1.jpg'
        }}
        style={styles.commentAvatar}
      />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentAuthor}>
            {comment.user?.profile?.name || 'Unknown User'}
          </Text>
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

  const renderReaction = ({ item: reaction }) => {
    const reactionConfig = REACTIONS.find(r => r.type === reaction.type);

    return (
      <View style={styles.reactionItem}>
        <Image
          source={{
            uri: reaction.user?.profile?.profilePic
              ? postApi.getImageSource(reaction.user.profile.profilePic, authApi.getAccessToken()).uri
              : 'https://randomuser.me/api/portraits/men/1.jpg'
          }}
          style={styles.reactionAvatar}
        />
        <View style={styles.reactionContent}>
          <Text style={styles.reactionAuthor}>
            {reaction.user?.profile?.name || 'Unknown User'}
          </Text>
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
            <Icon name="arrow-left" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
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
            <Icon name="arrow-left" size={24} color={colors.primary} />
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
          <Icon name="arrow-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <TouchableOpacity>
          <Icon name="dots-vertical" size={24} color={colors.primary} />
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
              <TouchableOpacity
                style={styles.statButton}
                onPress={() => setActiveTab('reactions')}
              >
                <Text style={styles.statText}>
                  {totalReactions} {totalReactions === 1 ? 'reaction' : 'reactions'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.statButton}
                onPress={() => setActiveTab('comments')}
              >
                <Text style={styles.statText}>
                  {totalComments} {totalComments === 1 ? 'comment' : 'comments'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'comments' && styles.activeTab]}
              onPress={() => setActiveTab('comments')}
            >
              <Text style={[styles.tabText, activeTab === 'comments' && styles.activeTabText]}>
                Comments ({totalComments})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'reactions' && styles.activeTab]}
              onPress={() => setActiveTab('reactions')}
            >
              <Text style={[styles.tabText, activeTab === 'reactions' && styles.activeTabText]}>
                Reactions ({totalReactions})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content based on active tab */}
          {activeTab === 'comments' ? (
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
          ) : (
            <View style={styles.reactionsSection}>
              {reactions.length > 0 ? (
                <FlatList
                  data={reactions}
                  keyExtractor={(item) => `${item.userId}_${item.type}`}
                  renderItem={renderReaction}
                  scrollEnabled={false}
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No reactions yet</Text>
                  <Text style={styles.emptySubtext}>Be the first to react!</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Comment Input */}
        {activeTab === 'comments' && (
          <View style={[styles.commentInputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
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
              <Icon name="send" size={20} color={colors.textInverse} />
            </TouchableOpacity>
          </View>
        )}
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
    fontWeight: '600',
    color: colors.textPrimary,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Extra padding to ensure content is scrollable above keyboard
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
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
    color: colors.textPrimary,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: colors.textInverse,
    fontWeight: '600',
  },

  // Post Card Styles
  postCard: {
    backgroundColor: colors.card,
    margin: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
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
    fontWeight: '600',
    color: colors.textPrimary,
  },
  postTime: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  postContent: {
    fontSize: 16,
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
    borderRadius: 8,
    marginBottom: 8,
  },
  engagementStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statButton: {
    flex: 1,
  },
  statText: {
    fontSize: 14,
    color: colors.textSecondary,
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
    marginBottom: 16,
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  commentTime: {
    fontSize: 12,
    color: colors.textMuted,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  repliesButton: {
    marginTop: 8,
  },
  repliesText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
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
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.backgroundSecondary,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  commentInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 14,
    color: colors.textPrimary,
    marginRight: 12,
  },
  sendButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },

  // Empty States
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textMuted,
  },
});

export default PostDetailScreen;