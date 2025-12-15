import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Image,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import colors from '../config/colors';
import postApi from '../api/PostApi';
import authApi from '../api/AuthApi';
import { useLoader } from '../context/LoaderContext';
import { useNotification } from '../contexts/NotificationContext';
import useScreenApiLogger from '../hooks/useScreenApiLogger';
import { getProfileImageSource } from '../utils/profileImage';
import PostIcon from '../components/PostIcon';
import CustomRefreshControl from '../components/CustomRefreshControl';

// Reaction types from backend enum
const REACTIONS = [
  { type: "LIKE", icon: "👍", label: "Like" },
  // { type: "LOVE", icon: "❤️", label: "Love" },
  // { type: "CELEBRATE", icon: "🎉", label: "Celebrate" },
  // { type: "SUPPORT", icon: "🤝", label: "Support" },
  // { type: "LAUGH", icon: "😂", label: "Laugh" },
  // { type: "INSIGHTFUL", icon: "💡", label: "Insightful" },
];

const { width: screenWidth } = Dimensions.get("window");

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
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [commentAvatarErrors, setCommentAvatarErrors] = useState({});
  const [reactionAvatarErrors, setReactionAvatarErrors] = useState({});
  const [userReaction, setUserReaction] = useState(null);
  const [reactionLoading, setReactionLoading] = useState(false);
  const [commentsYPosition, setCommentsYPosition] = useState(0);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [repostCommentText, setRepostCommentText] = useState('');
  const [repostLoading, setRepostLoading] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [menuButtonLayout, setMenuButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  
  const scrollViewRef = useRef(null);
  const commentsSectionRef = useRef(null);
  const menuButtonRef = useRef(null);

  useEffect(() => {
    loadPostDetails();
  }, [postId, postData]);

  useEffect(() => {
    // Set initial user reaction from post data
    if (post?.userReaction) {
      setUserReaction(post.userReaction);
    }
  }, [post]);

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

      // Set user reaction if available
      if (post?.userReaction) {
        setUserReaction(post.userReaction);
      }

    } catch (error) {
      showError('Failed to load post details');
    } finally {
      setLoading(false);
    }
  };

  const handleReaction = async () => {
    if (reactionLoading) return;

    try {
      setReactionLoading(true);

      const previousReaction = userReaction;

      // Optimistic update
      if (previousReaction) {
        setUserReaction(null);
        setReactions(prev => prev.filter(r => r.user?.id !== authApi.getCurrentUserId()));
      } else {
        setUserReaction("LIKE");
        // Add optimistic reaction to list
        const currentUser = authApi.getCurrentUserId();
        setReactions(prev => [...prev, {
          id: `temp_${Date.now()}`,
          type: "LIKE",
          user: { id: currentUser, profile: { name: "You" } }
        }]);
      }

      // Make API call
      let result;
      if (previousReaction) {
        result = await postApi.removeReaction(postId);
      } else {
        result = await postApi.addReaction(postId, "LIKE");
      }

      if (!result.success && !result.cancelled) {
        // Revert on failure
        setUserReaction(previousReaction);
        if (previousReaction) {
          // Re-add reaction to list
          const currentUser = authApi.getCurrentUserId();
          setReactions(prev => [...prev, {
            id: `temp_${Date.now()}`,
            type: "LIKE",
            user: { id: currentUser, profile: { name: "You" } }
          }]);
        } else {
          setReactions(prev => prev.filter(r => r.user?.id !== authApi.getCurrentUserId()));
        }
        showError('Failed to update reaction. Please try again.');
      } else if (result.success && result.data) {
        // Update post counts if API returns updated data
        if (result.data.counts) {
          setPost(prev => ({
            ...prev,
            counts: {
              ...prev.counts,
              reactions: result.data.counts.reactions
            }
          }));
        }
      }
    } catch (error) {
      showError('Something went wrong. Please try again.');
    } finally {
      setReactionLoading(false);
    }
  };

  const scrollToComments = () => {
    if (commentsYPosition > 0 && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: commentsYPosition - 20, animated: true });
    } else {
      // Fallback: scroll to a reasonable position
      scrollViewRef.current?.scrollTo({ y: 500, animated: true });
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

  const handleDeleteComment = async () => {
    if (!commentToDelete) return;

    try {
      setDeleteModalVisible(false);
      showLoader('Deleting comment...');

      const result = await postApi.deleteComment(commentToDelete.id);

      if (result.success) {
        // Remove the comment from the list
        setComments(prev => prev.filter(c => c.id !== commentToDelete.id));

        // Update post comment count if available
        if (post) {
          const deletedCount = 1 + (result.data?.repliesDeleted || 0);
          setPost(prev => ({
            ...prev,
            counts: {
              ...prev.counts,
              comments: Math.max(0, (prev.counts?.comments || 0) - deletedCount)
            }
          }));
        }

        showSuccess(result.data?.repliesDeleted > 0 
          ? `Comment and ${result.data.repliesDeleted} ${result.data.repliesDeleted === 1 ? 'reply' : 'replies'} deleted`
          : 'Comment deleted successfully'
        );
      } else {
        showError(result.message || 'Failed to delete comment');
      }
    } catch (error) {
      showError('Failed to delete comment');
    } finally {
      hideLoader();
      setCommentToDelete(null);
    }
  };

  const getImageSource = (mediaItem) => {
    const userToken = authApi.getAccessToken();

    if (mediaItem.key && userToken) {
      return postApi.getImageSource(mediaItem.key, userToken);
    }

    return { uri: mediaItem.uri || mediaItem.url || mediaItem.displayUrl };
  };

  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) {
      return Math.floor(interval) + " year" + (Math.floor(interval) === 1 ? "" : "s");
    }
    interval = seconds / 2592000;
    if (interval > 1) {
      return Math.floor(interval) + " month" + (Math.floor(interval) === 1 ? "" : "s");
    }
    interval = seconds / 86400;
    if (interval > 1) {
      return Math.floor(interval) + " day" + (Math.floor(interval) === 1 ? "" : "s");
    }
    interval = seconds / 3600;
    if (interval > 1) {
      return Math.floor(interval) + " hour" + (Math.floor(interval) === 1 ? "" : "s");
    }
    interval = seconds / 60;
    if (interval > 1) {
      return Math.floor(interval) + " minute" + (Math.floor(interval) === 1 ? "" : "s");
    }
    return Math.floor(seconds) + " second" + (Math.floor(seconds) === 1 ? "" : "s");
  };

  const renderComment = ({ item: comment }) => {
    // Ensure we get the profilePic from the correct location
    const userWithProfile = comment.user || {};
    const imageSource = commentAvatarErrors[comment.id]
      ? require('../assets/icon.png')
      : getProfileImageSource(userWithProfile, { 
          fallbackKey: comment.profilePic || userWithProfile.profilePic || userWithProfile.profile?.profilePic 
        });
    
    const userId = comment.user?.id || comment.userId;
    const currentUserId = authApi.getCurrentUserId();
    const postAuthorId = post?.author?.id || post?.userId;
    
    // User can delete if they are the comment author OR the post owner
    const canDelete = userId === currentUserId || postAuthorId === currentUserId;
    
    const handleUserPress = () => {
      if (!userId) return;
      
      if (userId === currentUserId || userId === '1') {
        navigation.navigate('ProfileTab');
      } else {
        navigation.navigate('UserProfile', { userId: userId });
      }
    };

    const handleDeletePress = () => {
      setCommentToDelete(comment);
      setDeleteModalVisible(true);
    };

    return (
      <View style={styles.commentItem}>
        <View style={styles.commentLeftContainer}>
          <TouchableOpacity onPress={handleUserPress}>
            <Image
              source={imageSource}
              style={styles.commentAvatar}
              resizeMode="cover"
              defaultSource={require('../assets/icon.png')}
              onError={() => {
                setCommentAvatarErrors((prev) => ({ ...prev, [comment.id]: true }));
              }}
            />
          </TouchableOpacity>
          {/* Vertical gray line on the left - starts below profile pic */}
          <View style={styles.commentLeftLine} />
        </View>
        
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <View style={styles.commentHeaderLeft}>
              <TouchableOpacity onPress={handleUserPress}>
                <Text style={styles.commentAuthor}>
                  {comment.user?.profile?.name || 'Unknown User'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.commentProfession}>
                {comment.user?.profile?.profession || 'Professional'}
              </Text>
            </View>
            <View style={styles.commentHeaderRight}>
              <Text style={styles.commentTime}>
                {comment.createdAt ? timeAgo(comment.createdAt) : ''}
              </Text>
              {canDelete && (
                <TouchableOpacity 
                  onPress={handleDeletePress}
                  style={styles.commentOptions}
                >
                  <Icon name="dots-vertical" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          <Text style={styles.commentText}>{comment.content}</Text>
        </View>
      </View>
    );
  };

  const renderReaction = ({ item: reaction }) => {
    const reactionConfig = REACTIONS.find(r => r.type === reaction.type);
    
    // Get profile picture - use user's profilePic if available, otherwise use default icon
    const imageSource = reactionAvatarErrors[reaction.id]
      ? require('../assets/icon.png')
      : getProfileImageSource(reaction.user, { fallbackKey: reaction.profilePic });
    
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
            resizeMode="cover"
            defaultSource={require('../assets/icon.png')}
            onError={() => {
              setReactionAvatarErrors((prev) => ({ ...prev, [reaction.id]: true }));
            }}
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
        <TouchableOpacity
          ref={menuButtonRef}
          onPress={(e) => {
            e.stopPropagation();
            if (menuButtonRef.current) {
              menuButtonRef.current.measureInWindow((x, y, width, height) => {
                setMenuButtonLayout({ x, y, width, height });
                setShowOptionsMenu(true);
              });
            } else {
              setShowOptionsMenu(true);
            }
          }}
        >
          <Icon name="dots-vertical" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <CustomRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          keyboardShouldPersistTaps="handled"
        >
          {/* Post Content */}
          <View style={styles.postCard}>
            {/* Author Info */}
            <View style={styles.postHeader}>
              <TouchableOpacity
                onPress={() => {
                  const authorId = post.author?.id || post.userId;
                  if (authorId === "1" || authorId === authApi.getCurrentUserId()) {
                    navigation.navigate("ProfileTab");
                  } else {
                    navigation.navigate("UserProfile", { userId: authorId });
                  }
                }}
              >
                <Image
                  source={{
                    uri: post.author?.profile?.profilePic
                      ? postApi.getImageSource(post.author.profile.profilePic, authApi.getAccessToken()).uri
                      : post.author?.profilePic || 'https://randomuser.me/api/portraits/men/1.jpg'
                  }}
                  style={styles.avatar}
                />
              </TouchableOpacity>
              <View style={styles.authorInfo}>
                <TouchableOpacity
                  onPress={() => {
                    const authorId = post.author?.id || post.userId;
                    if (authorId === "1" || authorId === authApi.getCurrentUserId()) {
                      navigation.navigate("ProfileTab");
                    } else {
                      navigation.navigate("UserProfile", { userId: authorId });
                    }
                  }}
                >
                  <Text style={styles.authorName}>
                    {post.author?.profile?.name || post.author?.name || 'Unknown User'}
                  </Text>
                </TouchableOpacity>
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
              {totalReactions > 0 ? (
                <View style={styles.statsRow}>
                  <View style={styles.reactionDisplay}>
                    <Text style={styles.reactionEmoji}>👍</Text>
                    <Text style={styles.reactionCount}>
                      {totalReactions} {totalReactions === 1 ? 'Like' : 'Likes'}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.statsText}>Be the first to like</Text>
              )}
              {totalComments > 0 && (
                <TouchableOpacity onPress={scrollToComments}>
                  <Text style={styles.statsText}>
                    {totalComments} {totalComments === 1 ? 'Comment' : 'Comments'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleReaction}
                disabled={reactionLoading}
              >
                {reactionLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <View style={styles.actionContent}>
                    {userReaction ? (
                      <Text style={styles.reactionEmoji}>👍</Text>
                    ) : (
                      <PostIcon name="like" size={20} color={colors.textSecondary} />
                    )}
                    <Text style={[styles.actionButtonText, userReaction && styles.actionButtonTextActive, { marginLeft: 6 }]}>
                      {userReaction ? 'Liked' : 'Like'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={scrollToComments}
              >
                <View style={styles.actionContent}>
                  <PostIcon name="comment" size={20} color={colors.textSecondary} />
                  <Text style={[styles.actionButtonText, { marginLeft: 6 }]}>Comment</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  // Check if user is trying to repost their own post
                  const currentUserId = authApi.getCurrentUserId();
                  const postAuthorId = post.author?.id || post.userId;
                  
                  if (String(currentUserId) === String(postAuthorId)) {
                    showError('You cannot repost your own post');
                    return;
                  }
                  
                  // Check if this is already a repost - can only repost original posts
                  if (post.isRepost && post.originalPost) {
                    // Repost the original post instead
                    setShowRepostModal(true);
                  } else {
                    setShowRepostModal(true);
                  }
                }}
              >
                <View style={styles.actionContent}>
                  <PostIcon name="reshare" size={20} color={colors.textSecondary} />
                  <Text style={[styles.actionButtonText, { marginLeft: 6 }]}>Repost</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Comments Section */}
          <View 
            style={styles.commentsSection} 
            ref={commentsSectionRef}
            onLayout={(event) => {
              const { y } = event.nativeEvent.layout;
              // Get the absolute position by measuring from the ScrollView
              if (commentsSectionRef.current && scrollViewRef.current) {
                commentsSectionRef.current.measureLayout(
                  scrollViewRef.current,
                  (x, measuredY) => {
                    setCommentsYPosition(measuredY);
                  },
                  () => {
                    // Fallback: use layout y
                    setCommentsYPosition(y);
                  }
                );
              } else {
                setCommentsYPosition(y);
              }
            }}
          >
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

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <Pressable 
          style={[styles.modalOverlay, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}
          onPress={() => setDeleteModalVisible(false)}
        >
          <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
            {/* Icon */}
            <View style={styles.modalIconContainer}>
              <Icon name="delete-alert" size={48} color={colors.error} />
            </View>

            {/* Title */}
            <Text style={styles.modalTitle}>Delete Comment</Text>

            {/* Message */}
            <Text style={styles.modalMessage}>
              {commentToDelete?._count?.replies > 0
                ? `Are you sure you want to delete this comment and ${commentToDelete._count.replies} ${commentToDelete._count.replies === 1 ? 'reply' : 'replies'}? This action cannot be undone.`
                : 'Are you sure you want to delete this comment? This action cannot be undone.'}
            </Text>

            {/* Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setCommentToDelete(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButtonModal]}
                onPress={handleDeleteComment}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Repost Modal */}
      <Modal
        visible={showRepostModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowRepostModal(false);
          setRepostCommentText('');
        }}
      >
        <Pressable 
          style={styles.repostModalOverlay}
          onPress={() => {
            setShowRepostModal(false);
            setRepostCommentText('');
          }}
        >
          <Pressable style={styles.repostModal} onPress={(e) => e.stopPropagation()}>
            <View style={styles.repostModalHeader}>
              <Text style={styles.repostModalTitle}>Repost</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowRepostModal(false);
                  setRepostCommentText('');
                }}
              >
                <Icon name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.repostModalSubtitle}>Add a comment (optional)</Text>
            
            <TextInput
              style={styles.repostCommentInput}
              placeholder="What are your thoughts?"
              placeholderTextColor={colors.textMuted}
              value={repostCommentText}
              onChangeText={setRepostCommentText}
              multiline
              maxLength={500}
              autoFocus
            />
            
            <View style={styles.repostModalActions}>
              <TouchableOpacity
                style={[styles.repostModalButton, styles.repostCancelButton]}
                onPress={() => {
                  setShowRepostModal(false);
                  setRepostCommentText('');
                }}
                disabled={repostLoading}
              >
                <Text style={styles.repostCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.repostModalButton, styles.repostConfirmButton]}
                onPress={async () => {
                  const postToRepost = post.isRepost && post.originalPost ? post.originalPost.id : post.id;
                  
                  setRepostLoading(true);
                  try {
                    const result = await postApi.repostPost(postToRepost, repostCommentText);
                    
                    if (result.success) {
                      showSuccess('Post reposted successfully!');
                      setShowRepostModal(false);
                      setRepostCommentText('');
                      // Optionally refresh the post or navigate back
                    } else {
                      showError(result.message || 'Failed to repost');
                    }
                  } catch (error) {
                    showError('Failed to repost. Please try again.');
                  } finally {
                    setRepostLoading(false);
                  }
                }}
                disabled={repostLoading}
              >
                {repostLoading ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.repostConfirmButtonText}>Repost</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Options Menu Modal */}
      <Modal
        visible={showOptionsMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptionsMenu(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowOptionsMenu(false)}
        >
          <Pressable 
            style={[
              styles.optionsMenu,
              {
                position: 'absolute',
                top: menuButtonLayout.y + menuButtonLayout.height + 8,
                right: screenWidth - menuButtonLayout.x - menuButtonLayout.width + 20,
              }
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setShowOptionsMenu(false);
                const authorId = post.author?.id || post.userId;
                if (authorId === "1" || authorId === authApi.getCurrentUserId()) {
                  navigation.navigate("ProfileTab");
                } else {
                  navigation.navigate("UserProfile", { userId: authorId });
                }
              }}
            >
              <Text style={styles.optionText}>View Profile</Text>
            </TouchableOpacity>
            <View style={styles.optionDivider} />
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setShowOptionsMenu(false);
                setShowReportSheet(true);
              }}
            >
              <Text style={[styles.optionText, styles.reportOptionTextMenu]}>Report Post</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Report Bottom Sheet */}
      <Modal
        visible={showReportSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReportSheet(false)}
      >
        <Pressable 
          style={styles.bottomSheetOverlay}
          onPress={() => setShowReportSheet(false)}
        >
          <Pressable style={styles.bottomSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.bottomSheetHandle} />
            <Text style={styles.reportTitle}>Report</Text>
            <Text style={styles.reportSubtitle}>
              Why are you reporting this post?
            </Text>
            <Text style={styles.reportInfo}>
              Your report is anonymous. If someone is in immediate danger, call the local emergency services – don't wait.
            </Text>
            
            <ScrollView 
              style={styles.reportOptionsList}
              showsVerticalScrollIndicator={false}
            >
              {[
                "I just don't like it",
                "Bullying or unwanted contact",
                "Suicide, self-injury or eating disorders",
                "Violence, hate or exploitation",
                "Selling or promoting restricted items",
                "Nudity or sexual activity",
                "Scam, fraud or spam",
                "False information",
                "Intellectual property"
              ].map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.reportOption}
                  onPress={async () => {
                    try {
                      setShowReportSheet(false);
                      
                      // Get the post ID to report (handle reposts correctly)
                      const postToReport = post.isRepost && post.originalPost ? post.originalPost.id : post.id;
                      
                      // Call the report API
                      const result = await postApi.reportPost(postToReport, option);
                      
                      if (result.success) {
                        showSuccess(result.message || 'Report submitted successfully. Our team will review it.');
                      } else {
                        showError(result.message || 'Failed to submit report. Please try again.');
                      }
                    } catch (error) {
                      console.error('Report error:', error);
                      showError('Failed to submit report. Please try again.');
                    }
                  }}
                >
                  <Text style={styles.reportOptionText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    borderWidth: 2,
    borderColor: colors.border,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reactionDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reactionCount: {
    fontSize: 14,
    fontFamily: 'Gilroy-Medium',
    color: colors.textSecondary,
    marginLeft: 6,
  },
  statsText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Medium',
    color: colors.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 0,
    paddingHorizontal: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    flex: 1,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: 'Gilroy-Medium',
  },
  actionButtonTextActive: {
    color: colors.primary,
  },
  reactionEmoji: {
    fontSize: 20,
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
    marginTop: 8,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 20,
    position: 'relative',
  },
  commentLeftContainer: {
    alignItems: 'center',
    marginRight: 12,
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  commentLeftLine: {
    position: 'absolute',
    left: 19.5,
    top: 40,
    bottom: 0,
    width: 1,
    backgroundColor: colors.border,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  commentHeaderLeft: {
    flex: 1,
  },
  commentHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentAuthor: {
    fontSize: 15,
    fontFamily: 'Gilroy-Bold',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  commentProfession: {
    fontSize: 13,
    fontFamily: 'Gilroy-Regular',
    color: colors.textMuted,
  },
  commentTime: {
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: colors.textMuted,
  },
  commentOptions: {
    padding: 4,
  },
  commentText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    lineHeight: 20,
    color: colors.textSecondary,
    marginBottom: 8,
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
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.border,
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

  // Delete Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 380,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: 'Gilroy-Bold',
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    fontFamily: 'Gilroy-Medium',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  cancelButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Gilroy-SemiBold',
    color: colors.textPrimary,
  },
  deleteButtonModal: {
    backgroundColor: colors.error,
  },
  deleteButtonText: {
    fontSize: 16,
    fontFamily: 'Gilroy-SemiBold',
    color: colors.white,
  },
  repostModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  repostModal: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: 20,
    maxHeight: '80%',
  },
  repostModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingTop: 8,
  },
  repostModalTitle: {
    fontSize: 20,
    fontFamily: 'Gilroy-Bold',
    color: colors.textPrimary,
  },
  repostModalSubtitle: {
    fontSize: 15,
    fontFamily: 'Gilroy-Medium',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  repostCommentInput: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 12,
    padding: 16,
    minHeight: 120,
    maxHeight: 200,
    fontSize: 15,
    fontFamily: 'Gilroy-Regular',
    color: colors.textPrimary,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  repostModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  repostModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repostCancelButton: {
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  repostCancelButtonText: {
    fontSize: 16,
    fontFamily: 'Gilroy-SemiBold',
    color: colors.textPrimary,
  },
  repostConfirmButton: {
    backgroundColor: colors.button,
  },
  repostConfirmButtonText: {
    fontSize: 16,
    fontFamily: 'Gilroy-SemiBold',
    color: colors.white,
  },
  // Options Menu Styles
  optionsMenu: {
    backgroundColor: colors.card,
    borderRadius: 12,
    width: 180,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  optionItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  optionText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontFamily: 'Gilroy-Medium',
  },
  reportOptionTextMenu: {
    color: colors.error || '#ef4444',
  },
  optionDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  // Report Bottom Sheet Styles
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 40,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.textMuted,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  reportTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontFamily: 'Gilroy-Bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  reportSubtitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontFamily: 'Gilroy-SemiBold',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  reportInfo: {
    color: colors.textMuted,
    fontSize: 13,
    fontFamily: 'Gilroy-Regular',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  reportOptionsList: {
    paddingHorizontal: 0,
  },
  reportOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  reportOptionText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
  },
});

export default PostDetailScreen;