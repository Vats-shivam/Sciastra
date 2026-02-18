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
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import colors from '../config/colors';
import postApi from '../api/PostApi';
import authApi from '../api/AuthApi';
import { useLoader } from '../context/LoaderContext';
import { PostDetailSkeleton } from '../components/skeletons';
import { useNotification } from '../contexts/NotificationContext';
import useScreenApiLogger from '../hooks/useScreenApiLogger';
import { getProfileImageSource } from '../utils/profileImage';
import { parseUTCDate } from '../utils/dateUtils';
import CustomRefreshControl from '../components/CustomRefreshControl';
import { useFeedRefresh } from '../contexts/FeedRefreshContext';
import FullScreenImageViewer from '../components/FullScreenImageViewer';

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
  const { postId, postData } = route.params || {};
  const { showLoader, hideLoader } = useLoader();
  const { updatePostReaction } = useFeedRefresh() || {};
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [menuButtonLayout, setMenuButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [fullScreenImageSource, setFullScreenImageSource] = useState(null);
  
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
      // Avoid full-screen loading flicker when we already have postData.
      setLoading(!postData);

      // Debug log the postData structure
      if (postData) {
        console.log('PostDetail - Using passed postData:', JSON.stringify(postData, null, 2));
      }

      // Always fetch the latest post as well (postData from feed can be stale/missing userReaction/counts).
      const promises = [
        postApi.getPostById(postId),
        postApi.getPostComments(postId, 1, 20),
        postApi.getPostReactions(postId, 1, 50),
      ];

      const results = await Promise.all(promises);

      const [postResult, commentsResult, reactionsResult] = results;

      if (postResult?.success) {
        const apiPost = postResult.data;
        // Preserve media from postData when it has valid URLs - API response can overwrite with
        // proxy URLs that may not work, causing the image to vanish after the fetch completes
        const hasValidMedia = postData?.media?.length > 0 && postData.media.some(
          (m) => (m.url || m.uri || m.signedUrl) && String(m.url || m.uri || m.signedUrl).startsWith('http')
        );
        const mergedPost = hasValidMedia && postData
          ? { ...apiPost, media: postData.media, mediaUrls: postData.mediaUrls }
          : apiPost;
        setPost(mergedPost);
      } else if (!postData) {
        // If we don't even have fallback postData, we can't render.
        showError('Failed to load post details');
        navigation.goBack();
        return;
      }

      if (commentsResult.success) {
        setComments(commentsResult.data.comments || []);
      }

      if (reactionsResult.success) {
        // Backend payloads vary; support both { reactions: [] } and direct [].
        const payload = reactionsResult.data;
        const reactionList = Array.isArray(payload?.reactions)
          ? payload.reactions
          : Array.isArray(payload)
            ? payload
            : [];

        setReactions(reactionList);

        // Derive current user's reaction from the reaction list so the Like button
        // stays correct even if post.userReaction isn't present.
        const currentUserId = authApi.getCurrentUserId();
        const myReaction = reactionList.find((r) => {
          const rid = r?.user?.id ?? r?.userId;
          return currentUserId && rid && String(rid) === String(currentUserId);
        });
        setUserReaction(myReaction ? (myReaction.type || 'LIKE') : null);

        // Keep post counts consistent (optional UI consistency).
        setPost((prev) => prev ? ({
          ...prev,
          counts: {
            ...(prev.counts || {}),
            reactions: reactionList.length,
          },
        }) : prev);
      }

    } catch (error) {
      showError('Failed to load post details');
    } finally {
      setLoading(false);
    }
  };

  const handleReaction = async () => {
    if (reactionLoading) return;

    const previousReaction = userReaction;

    try {
      setReactionLoading(true);

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
      } else if (result.success) {
        // removeReaction returns { success, message } without data; addReaction returns { success, data }
        const wasRemoved = previousReaction || result.data?.removed === true;
        if (result.data?.removed === true && !previousReaction) {
          setUserReaction(null);
          setReactions(prev => prev.filter(r => r.user?.id !== authApi.getCurrentUserId()));
        } else if (result.data?.counts) {
          setPost(prev => ({
            ...prev,
            counts: {
              ...prev.counts,
              reactions: result.data.counts.reactions
            }
          }));
        }
        // Update feed post in place based on response (add vs remove)
        updatePostReaction?.(postId, { added: !wasRemoved, reactionType: 'LIKE' });
      }
    } catch (error) {
      setUserReaction(previousReaction);
      if (previousReaction) {
        const currentUser = authApi.getCurrentUserId();
        setReactions(prev => [...prev, {
          id: `temp_${Date.now()}`,
          type: "LIKE",
          user: { id: currentUser, profile: { name: "You" } }
        }]);
      } else {
        setReactions(prev => prev.filter(r => r.user?.id !== authApi.getCurrentUserId()));
      }
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

    // Prefer backend-provided URL when available (CDN or proxy URL from API)
    const existingUrl = mediaItem.uri || mediaItem.url || mediaItem.displayUrl;
    if (existingUrl && typeof existingUrl === 'string' && existingUrl.startsWith('http')) {
      return {
        uri: existingUrl,
        headers: userToken ? { Authorization: `Bearer ${userToken}` } : undefined,
      };
    }

    // Fallback: use key with post proxy when we have S3 key
    if (mediaItem.key && userToken) {
      return postApi.getImageSource(mediaItem.key, userToken);
    }

    return { uri: existingUrl || '' };
  };

  const timeAgo = (date) => {
    const d = parseUTCDate(date);
    if (!d) return '';
    const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
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
    // Ensure we get the profilePic from the correct location - backend may nest under user.profile
    const userWithProfile = comment.user || {};
    const profilePicKey = userWithProfile.profile?.profilePic 
      || userWithProfile.profilePic 
      || comment.profilePic 
      || comment.user?.profilePic;
    const imageSource = commentAvatarErrors[comment.id]
      ? require('../assets/icon.png')
      : getProfileImageSource(userWithProfile, { fallbackKey: profilePicKey });
    
    const userId = comment.user?.id || comment.userId;
    const currentUserId = authApi.getCurrentUserId();
    const postAuthorId = post?.author?.id || post?.userId;
    
    // User can delete if they are the comment author OR the post owner
    const canDelete = userId === currentUserId || postAuthorId === currentUserId;
    
    const handleUserPress = () => {
      if (!userId) return;
      
      if (userId === currentUserId || userId === '1') {
        navigation.navigate('MainTabs', { screen: 'ProfileTab' });
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
    
    // Get profile picture - backend formats via formatAuthorProfile, may have profilePic at user.profile
    const userWithProfile = reaction.user || {};
    const profilePicKey = userWithProfile.profile?.profilePic 
      || userWithProfile.profilePic 
      || reaction.profilePic;
    const imageSource = reactionAvatarErrors[reaction.id]
      ? require('../assets/icon.png')
      : getProfileImageSource(userWithProfile, { fallbackKey: profilePicKey });
    
    const userId = reaction.user?.id || reaction.userId;
    const currentUserId = authApi.getCurrentUserId();
    
    const handleUserPress = () => {
      if (!userId) return;
      
      if (userId === currentUserId || userId === '1') {
        navigation.navigate('MainTabs', { screen: 'ProfileTab' });
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
        <PostDetailSkeleton />
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

  const totalReactions = Math.max(reactions.length, userReaction ? 1 : 0);
  const totalComments = comments.length;

  // For reposts: display original post's content/author, but comments/likes are for the repost
  const isRepost = post?.isRepost && post?.originalPost;
  const displayPost = isRepost ? post.originalPost : post;

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
            {/* Repost header */}
            {isRepost && post.author && (
              <View style={styles.repostHeader}>
                <Icon name="repeat" size={16} color={colors.button} />
                <Text style={styles.repostHeaderText}>
                  <Text style={styles.reposterName}>{post.author?.profile?.name || post.author?.name || 'Someone'}</Text>
                  {' reposted'}
                </Text>
              </View>
            )}
            {isRepost && post.repostComment ? (
              <View style={styles.repostCommentContainer}>
                <Text style={styles.repostCommentText}>{post.repostComment}</Text>
              </View>
            ) : null}
            {/* Author Info - show original author for reposts */}
            <View style={styles.postHeader}>
              <TouchableOpacity
                onPress={() => {
                  const authorId = displayPost?.author?.id || displayPost?.userId;
                  if (authorId && (authorId === "1" || authorId === authApi.getCurrentUserId())) {
                    navigation.navigate('MainTabs', { screen: 'ProfileTab' });
                  } else if (authorId) {
                    navigation.navigate("UserProfile", { userId: authorId });
                  }
                }}
              >
                <Image
                  source={getProfileImageSource(displayPost?.author, { 
                    fallbackKey: displayPost?.author?.profile?.profilePic || displayPost?.author?.profilePic 
                  })}
                  style={styles.avatar}
                  resizeMode="cover"
                  defaultSource={require('../assets/icon.png')}
                />
              </TouchableOpacity>
              <View style={styles.authorInfo}>
                <TouchableOpacity
                  onPress={() => {
                    const authorId = displayPost?.author?.id || displayPost?.userId;
                    if (authorId && (authorId === "1" || authorId === authApi.getCurrentUserId())) {
                      navigation.navigate('MainTabs', { screen: 'ProfileTab' });
                    } else if (authorId) {
                      navigation.navigate("UserProfile", { userId: authorId });
                    }
                  }}
                >
                  <Text style={styles.authorName}>
                    {displayPost?.author?.profile?.name || displayPost?.author?.name || 'Unknown User'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.postTime}>
                  {displayPost?.createdAt ? (parseUTCDate(displayPost.createdAt)?.toLocaleDateString() ?? '') : (post.createdAt ? (parseUTCDate(post.createdAt)?.toLocaleDateString() ?? '') : '')}
                </Text>
              </View>
            </View>

            {/* Post Content */}
            <Text style={styles.postContent}>{displayPost?.content || ''}</Text>

            {/* Post Media - filter for images only (matches PostCard) */}
            {(() => {
              const media = displayPost?.media || post?.media;
              const displayImages = Array.isArray(media)
                ? media.filter((item) => (item.mediaType === 'image' || item.type === 'image' || (!item.type && !item.mediaType)))
                : [];
              return displayImages.length > 0 ? (
                <View style={styles.mediaContainer}>
                  {displayImages.map((mediaItem, index) => {
                    const imgSource = getImageSource(mediaItem);
                    return (
                      <TouchableOpacity
                        key={index}
                        activeOpacity={0.9}
                        onPress={() => setFullScreenImageSource(imgSource)}
                      >
                        <Image
                          source={imgSource}
                          style={styles.postImage}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null;
            })()}

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
                style={[styles.actionButton, reactionLoading && { opacity: 0.8 }]}
                onPress={handleReaction}
                disabled={reactionLoading}
              >
                <View style={styles.actionContent}>
                  {userReaction ? (
                    <Icon name="thumb-up" size={20} color={colors.primary} />
                  ) : (
                    <Icon
                      name="thumb-up-outline"
                      size={20}
                      color={colors.textSecondary}
                      style={{ transform: [{ scaleX: -1 }] }}
                    />
                  )}
                  <Text style={[styles.actionButtonText, userReaction && styles.actionButtonTextActive, { marginLeft: 6 }]}>
                    {userReaction ? 'Liked' : 'Like'}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={scrollToComments}
              >
                <View style={styles.actionContent}>
                  <Icon name="comment-outline" size={20} color={colors.textSecondary} />
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
                  <Icon name="repeat" size={20} color={colors.textSecondary} />
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
                const authorId = post?.author?.id || post?.authorId || post?.userId;
                if (authorId === "1" || authorId === authApi.getCurrentUserId()) {
                  navigation.navigate('MainTabs', { screen: 'ProfileTab' });
                } else {
                  navigation.navigate("UserProfile", { userId: authorId });
                }
              }}
            >
              <Text style={styles.optionText}>View Profile</Text>
            </TouchableOpacity>
            <View style={styles.optionDivider} />
            {(post?.author?.id || post?.authorId || post?.userId) === authApi.getCurrentUserId() ? (
              <>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    setShowOptionsMenu(false);
                    setShowDeleteConfirm(true);
                  }}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? (
                    <ActivityIndicator size="small" color={colors.error} />
                  ) : (
                    <Text style={[styles.optionText, { color: colors.error }]}>Delete Post</Text>
                  )}
                </TouchableOpacity>
                <View style={styles.optionDivider} />
              </>
            ) : null}
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

      {/* Delete confirmation */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => !deleteLoading && setShowDeleteConfirm(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => !deleteLoading && setShowDeleteConfirm(false)}>
          <Pressable style={[styles.optionsMenu, { alignSelf: 'center', marginTop: '40%', minWidth: 280}]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.optionText, { marginBottom: 12, textAlign: 'center' }]}>Delete this post?</Text>
            <Text style={[styles.optionText, styles.reportOptionTextMenu, { marginBottom: 16, fontSize: 14, textAlign: 'center' }]}>This cannot be undone.</Text>
            <View style={{ flexDirection: 'row', gap: 16, justifyContent: 'center' }}>
              <TouchableOpacity
                style={[styles.optionItem, { flex: 1 }]}
                onPress={() => setShowDeleteConfirm(false)}
                disabled={deleteLoading}
              >
                <Text style={styles.optionText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.optionItem, { flex: 1 }]}
                onPress={async () => {
                  setDeleteLoading(true);
                  try {
                    const result = await postApi.deletePost(post?.id);
                    setShowDeleteConfirm(false);
                    if (result.success) {
                      showSuccess(result.message || 'Post deleted');
                      navigation.goBack();
                    } else {
                      showError(result.message || 'Failed to delete post');
                    }
                  } catch (err) {
                    showError('Failed to delete post');
                  } finally {
                    setDeleteLoading(false);
                  }
                }}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <ActivityIndicator size="small" color={colors.error} />
                ) : (
                  <Text style={[styles.optionText, { color: colors.error }]}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
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

      {/* Full-screen image viewer (like OneToOne) */}
      <FullScreenImageViewer
        visible={!!fullScreenImageSource}
        source={fullScreenImageSource}
        onClose={() => setFullScreenImageSource(null)}
      />
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
    backgroundColor: 'rgba(15, 28, 38, 0.98)',
    borderRadius: 28,
    paddingLeft: 20,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 56,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  modalContainer: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 20,
    padding: 24,
    width: '100%',
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
  repostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  repostHeaderText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Medium',
    color: colors.textSecondary,
    marginLeft: 6,
  },
  reposterName: {
    fontFamily: 'Gilroy-SemiBold',
    color: colors.textPrimary,
  },
  repostCommentContainer: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: colors.button,
  },
  repostCommentText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: colors.textPrimary,
    lineHeight: 20,
  },
  repostModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  repostModal: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    opacity: 1,
    borderTopRightRadius: 20,
    paddingTop: 24,
    paddingBottom: 40,
    paddingHorizontal: 24,
    maxHeight: '80%',
  },
  repostModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingTop: 0,
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
    marginBottom: 16,
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
    marginBottom: 24,
  },
  repostModalActions: {
    flexDirection: 'row',
    gap: 16,
  },
  repostModalButton: {
    flex: 1,
    paddingVertical: 16,
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
    opacity: 1,
    minWidth: 200,
    paddingVertical: 8,
    paddingHorizontal: 0,
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    opacity: 1,
    borderTopRightRadius: 20,
    paddingTop: 24,
    paddingBottom: 40,
    paddingHorizontal: 24,
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
    marginBottom: 24,
  },
  reportTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontFamily: 'Gilroy-Bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  reportSubtitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontFamily: 'Gilroy-SemiBold',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 0,
  },
  reportInfo: {
    color: colors.textMuted,
    fontSize: 13,
    fontFamily: 'Gilroy-Regular',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 0,
    lineHeight: 20,
    opacity: 1,
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