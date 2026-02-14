import React, { memo, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Dimensions,
  FlatList,
  Modal,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import colors from "../config/colors";
import { useNavigation } from "@react-navigation/native";
import postApi from "../api/PostApi";
import profileApi from "../api/ProfileApi";
import authApi from "../api/AuthApi";
import { useNotification } from "../contexts/NotificationContext";
import PostIcon from "./PostIcon";
import HeaderIcon from "./HeaderIcon";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { getProfileImageSource } from "../utils/profileImage";

const { width: screenWidth } = Dimensions.get("window");

// Reaction types from backend enum
const REACTIONS = [
  { type: "LIKE", icon: "👍", label: "Like" },
];

const PostCard = memo(({ post }) => {
  // Early return if post is undefined or null
  if (!post) {
    return null;
  }

  const navigation = useNavigation();
  const { showError, showSuccess } = useNotification();
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [userReaction, setUserReaction] = useState(post.userReaction || null); // Track the current user's reaction
  const [reactionLoading, setReactionLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState({});
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  // Some backend responses include `userReaction` but omit/underreport `counts.reactions`.
  // Avoid showing "Be the first to like" when the current user has already liked.
  const [totalReactions, setTotalReactions] = useState(
    Math.max(post.counts?.reactions || 0, post.userReaction ? 1 : 0)
  );
  const [imageHeights, setImageHeights] = useState({}); // Track image heights dynamically

  // Fullscreen image modal
  const [selectedImage, setSelectedImage] = useState(null);
  
  // Options menu and report modal
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showReportSheet, setShowReportSheet] = useState(false);
  const [menuButtonLayout, setMenuButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const menuButtonRef = useRef(null);
  
  // Repost modal
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [repostCommentText, setRepostCommentText] = useState('');
  const [repostLoading, setRepostLoading] = useState(false);

  // No longer needed with chat service pattern - auth headers handle authentication

  // Get image source with auth headers (chat service pattern)
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

  const handleReaction = async () => {
    if (reactionLoading) return; // Prevent double taps

    try {
      setReactionLoading(true);

      // Optimistic update - update UI immediately
      const previousReaction = userReaction;
      const previousTotalReactions = totalReactions;

      // Update UI optimistically
      if (previousReaction) {
        // If already liked, remove like
        setUserReaction(null);
        setTotalReactions((prev) => Math.max(0, prev - 1));
      } else {
        // If not liked, add like
        setUserReaction("LIKE");
        setTotalReactions((prev) => prev + 1);
      }

      // Make API call
      let result;
      if (previousReaction) {
        result = await postApi.removeReaction(post.id);
      } else {
        result = await postApi.addReaction(post.id, "LIKE");
      }

      if (!result.success && !result.cancelled) {
        // API failed, revert optimistic update
        setUserReaction(previousReaction);
        setTotalReactions(previousTotalReactions);
        showError('Failed to update reaction. Please try again.');
      } else if (result.success && result.data) {
        // Update totalReactions with server response if available
        if (result.data.counts?.reactions !== undefined) {
          setTotalReactions(result.data.counts.reactions);
        }
      } else if (result.cancelled) {
        // Don't revert - the UI state represents the latest user intent
      }
    } catch (error) {
      showError('Something went wrong. Please try again.');
    } finally {
      setReactionLoading(false);
    }
  };
  
  const effectiveReactionsCount = Math.max(totalReactions, userReaction ? 1 : 0);
  // Determine which reaction icon to show - always LIKE if there are reactions
  const displayReactionType = effectiveReactionsCount > 0 ? 'LIKE' : null;

  // Determine if this is a repost and get the original post
  const isRepost = post.isRepost || false;
  const originalPost = post.originalPost || null;
  const repostComment = post.repostComment || null;
  const displayPost = isRepost && originalPost ? originalPost : post;
  const reposter = isRepost ? post.author : null;

  // Handle multiple images using chat service pattern (simplified)
  const displayImages = Array.isArray(displayPost.media)
    ? displayPost.media.filter((item) => (item.mediaType === "image" || item.type === "image" || (!item.type && !item.mediaType)))
    : [];

  // Reset image index and heights when post or images change
  useEffect(() => {
    if (!displayPost || !displayPost.id) return;
    
    setCurrentImageIndex(0);
    setImageHeights({}); // Reset heights when post changes
    
    // Pre-calculate image dimensions
    if (displayImages.length > 0) {
      const imageWidth = screenWidth - 32;
      const maxHeight = 700;
      
      displayImages.forEach((item, index) => {
        const imageKey = `${displayPost.id}_${index}`;
        const imageSource = getImageSource(item);
        
        if (imageSource.uri) {
          Image.getSize(
            imageSource.uri,
            (width, height) => {
              if (width && height) {
                const aspectRatio = height / width;
                const calculatedHeight = imageWidth * aspectRatio;
                const finalHeight = Math.min(calculatedHeight, maxHeight);
                setImageHeights(prev => ({
                  ...prev,
                  [imageKey]: finalHeight
                }));
              }
            },
            (error) => {
              // Fallback to default height on error
              setImageHeights(prev => ({
                ...prev,
                [imageKey]: 300
              }));
            }
          );
        }
      });
    }
  }, [displayPost?.id, displayImages.length]);

  useEffect(() => {
    const statsPost = isRepost && originalPost ? originalPost : post;
    // Only update if we're not in the middle of a reaction update
    if (!reactionLoading) {
      const nextFromCounts = statsPost?.counts?.reactions || 0;
      setTotalReactions(Math.max(nextFromCounts, userReaction ? 1 : 0));
    }
  }, [post?.counts?.reactions, isRepost, originalPost, reactionLoading, userReaction]);

  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) {
      return Math.floor(interval) + " year" + (Math.floor(interval) === 1 ? "" : "s") + " ago";
    }
    interval = seconds / 2592000;
    if (interval > 1) {
      return Math.floor(interval) + " month" + (Math.floor(interval) === 1 ? "" : "s") + " ago";
    }
    interval = seconds / 86400;
    if (interval > 1) {
      return Math.floor(interval) + " day" + (Math.floor(interval) === 1 ? "" : "s") + " ago";
    }
    interval = seconds / 3600;
    if (interval > 1) {
      return Math.floor(interval) + " hour" + (Math.floor(interval) === 1 ? "" : "s") + " ago";
    }
    interval = seconds / 60;
    if (interval > 1) {
      return Math.floor(interval) + " minute" + (Math.floor(interval) === 1 ? "" : "s") + " ago";
    }
    return Math.floor(seconds) + " second" + (Math.floor(seconds) === 1 ? "" : "s") + " ago";
  };

  return (
    <View style={styles.cardWrapper}>
      <BlurView intensity={Platform.OS === 'ios' ? 45 : 60} tint="dark" style={styles.glassBlur} />
      <LinearGradient
        colors={[colors.glassBg, 'rgba(26, 45, 55, 0.45)']}
        style={styles.glassGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={styles.container}>
      {/* Repost Header - Shows who reposted */}
      {isRepost && reposter && (
        <View style={styles.repostHeader}>
          <View style={styles.repostIndicator}>
            <PostIcon name="reshare" size={16} color={colors.button} />
            <Text style={styles.repostIndicatorText}>
              <Text style={styles.reposterName}>
                {reposter.profile?.name || reposter.name || 'Someone'}
              </Text>
              {' reposted'}
            </Text>
          </View>
          <Text style={styles.repostTimestamp}>
            {post.createdAt ? timeAgo(post.createdAt) : ''}
          </Text>
        </View>
      )}

      {/* Repost Comment */}
      {isRepost && repostComment && (
        <View style={styles.repostCommentContainer}>
          <Text style={styles.repostCommentText}>{repostComment}</Text>
        </View>
      )}

      {/* Original Post Container - Wrapped in a nested view for reposts */}
      <View style={isRepost ? styles.originalPostContainer : null}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              const authorId = displayPost.author?.id || displayPost.userId;
              if (authorId === "1") {
                navigation.navigate("ProfileTab");
              } else {
                navigation.navigate("UserProfile", { userId: authorId });
              }
            }}
          >
            <Image
              source={getProfileImageSource(displayPost.author, { 
                fallbackKey: displayPost.author?.profile?.profilePic || displayPost.author?.profilePic 
              })}
              style={styles.avatar}
              resizeMode="cover"
              defaultSource={require("../assets/icon.png")}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, paddingLeft: 10 }}
            onPress={() => navigation.navigate("PostDetail", { postId: displayPost.id, postData: displayPost })}
          >
            <Text style={styles.author}>{displayPost.author?.profile?.name || "Unknown User"}</Text>
            <Text style={styles.subTitle}>
              {displayPost.author?.profile?.profession || "Professional"}
            </Text>
            <Text style={styles.timestamp}>
              {displayPost.createdAt ? timeAgo(displayPost.createdAt) : "Unknown"}
            </Text>
          </TouchableOpacity>
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
            <HeaderIcon name="menu" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Description */}
        {displayPost.content && (
          <Pressable
            onPress={() => navigation.navigate("PostDetail", { postId: displayPost.id, postData: displayPost })}
            style={{ marginVertical: 8 }}
          >
            <Text
              numberOfLines={showFullDescription ? 0 : 3}
              style={styles.description}
            >
              {displayPost.content}
            </Text>
            {!showFullDescription && displayPost.content && displayPost.content.length > 100 && (
              <Text style={styles.showMore}>See More</Text>
            )}
          </Pressable>
        )}

        {/* Image Carousel */}
        {displayImages.length > 0 && (
        <View style={styles.mediaContainer}>
          <FlatList
            data={displayImages}
            keyExtractor={(item, index) => `${post.id}_media_${index}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.carousel}
            onMomentumScrollEnd={(event) => {
              const imageWidth = screenWidth - 32;
              const index = Math.round(
                event.nativeEvent.contentOffset.x / imageWidth
              );
              setCurrentImageIndex(Math.min(index, displayImages.length - 1));
            }}
            onScrollToIndexFailed={(info) => {
              // Handle scroll to index failure gracefully
              if (__DEV__) console.log('Scroll to index failed:', info);
            }}
            renderItem={({ item, index }) => {
              const imageSource = getImageSource(item);
              const imageKey = `${post.id}_${index}`;
              const imageWidth = screenWidth - 32;
              const imageHeight = imageHeights[imageKey] || 300; // Default to 300 if not calculated yet
              const maxHeight = 700; // Maximum height to prevent extremely tall images
              const calculatedHeight = Math.min(imageHeight, maxHeight);

              return (
                <TouchableOpacity 
                  onPress={() => setSelectedImage(imageSource.uri)}
                  activeOpacity={0.9}
                >
                  <View style={styles.imageContainer}>
                    {imageLoading[imageKey] && (
                      <View style={[styles.imageLoader, { height: calculatedHeight }]}>
                        <ActivityIndicator size="large" color={colors.primary} />
                      </View>
                    )}
                    <Image
                      source={imageSource}
                      style={[
                        styles.image,
                        {
                          width: imageWidth,
                          height: calculatedHeight,
                        },
                        imageLoading[imageKey] && styles.imageLoading
                      ]}
                      resizeMode="contain"
                      onError={() => {
                        setImageLoading(prev => ({ ...prev, [imageKey]: false }));
                      }}
                      onLoadStart={() => {
                        setImageLoading(prev => ({ ...prev, [imageKey]: true }));
                      }}
                      onLoadEnd={() => {
                        setImageLoading(prev => ({ ...prev, [imageKey]: false }));
                      }}
                    />
                  </View>
                </TouchableOpacity>
              );
            }}
          />
          {/* Media count indicator */}
          {displayImages.length > 1 && (
            <View style={styles.mediaCountIndicator}>
              <Text style={styles.mediaCountText}>{currentImageIndex + 1} / {displayImages.length}</Text>
            </View>
          )}
        </View>
        )}

        {/* Stats */}
        <Pressable 
          style={styles.stats}
          onPress={() => navigation.navigate("PostDetail", { postId: displayPost.id, postData: displayPost })}
        >
          {(() => {
            const statsPost = isRepost && originalPost ? originalPost : post;
            // Use totalReactions state for instant updates instead of reading from post prop
            const reactionsCount = effectiveReactionsCount;
            const commentsCount = statsPost.counts?.comments || 0;
            
            return (
              <>
                {reactionsCount > 0 ? (
                  <View style={styles.reactionWrapper}>
                    {displayReactionType && (
                      <View style={styles.reactionsContainer}>
                        <View style={styles.reactionBubble}>
                          <Text style={styles.reactionText}>
                            {REACTIONS.find((x) => x.type === displayReactionType)?.icon || '👍'}
                          </Text>
                        </View>
                      </View>
                    )}
                    <Text style={styles.reactionCount}>
                      {reactionsCount} {reactionsCount === 1 ? 'Like' : 'Likes'}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.statsText}>Be the first to like</Text>
                )}
                <TouchableOpacity
                  onPress={() => navigation.navigate("PostDetail", { postId: displayPost.id, postData: displayPost })}
                >
                  <Text style={styles.statsText}>
                    {commentsCount} {commentsCount === 1 ? 'Comment' : 'Comments'}
                  </Text>
                </TouchableOpacity>
                {statsPost.counts?.reposts > 0 && (
                  <Text style={styles.statsText}>
                    {statsPost.counts.reposts} {statsPost.counts.reposts === 1 ? 'Repost' : 'Reposts'}
                  </Text>
                )}
              </>
            );
          })()}
        </Pressable>

        {/* Action Buttons */}
        <View style={styles.actions}>
        <Pressable
          onPress={() => !reactionLoading && handleReaction()}
          style={styles.actionButton}
          disabled={reactionLoading}
        >
          {reactionLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
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
              <Text style={[styles.actionText, { marginLeft: 6 }, userReaction && { color: colors.primary }]}>
                {userReaction ? 'Liked' : 'Like'}
              </Text>
            </View>
          )}
        </Pressable>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate("PostDetail", { postId: post.id, postData: post })}
        >
          <View style={styles.actionContent}>
            <Icon name="comment-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.actionText, { marginLeft: 6 }]}>Comment</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => {
            // Check if user is trying to repost their own post
            const currentUserId = authApi.getCurrentUserId();
            const postToRepost = isRepost && originalPost ? originalPost : post;
            const postAuthorId = postToRepost.author?.id || postToRepost.userId;
            
            if (String(currentUserId) === String(postAuthorId)) {
              showError('You cannot repost your own post');
              return;
            }
            
            setShowRepostModal(true);
          }}
        >
          <View style={styles.actionContent}>
            <Icon name="repeat" size={20} color={colors.textSecondary} />
            <Text style={[styles.actionText, { marginLeft: 6 }]}>Repost</Text>
          </View>
        </TouchableOpacity>
      </View>
      </View>

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
                if (post.author?.id === "1") {
                  navigation.navigate("ProfileTab");
                } else {
                  navigation.navigate("UserProfile", { userId: post.author?.id });
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
                      const postToReport = isRepost && originalPost ? originalPost.id : post.id;
                      
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
                  const postToRepost = isRepost && originalPost ? originalPost.id : post.id;
                  
                  setRepostLoading(true);
                  try {
                    const result = await postApi.repostPost(postToRepost, repostCommentText);
                    
                    if (result.success) {
                      showSuccess('Post reposted successfully!');
                      setShowRepostModal(false);
                      setRepostCommentText('');
                      // Optionally refresh the feed or update the post
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

      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  cardWrapper: {
    marginVertical: 6,
    marginHorizontal: 0,
    marginBottom: 12,
    width: "100%",
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  glassBlur: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  glassGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  container: {
    backgroundColor: 'transparent',
    padding: 20,
  },
  header: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  author: { fontFamily: 'Gilroy-SemiBold', fontSize: 15, color: colors.textPrimary },
  subTitle: { fontFamily: 'Gilroy-Regular', fontSize: 13, color: colors.textMuted, marginTop: 2 },
  timestamp: { fontFamily: 'Gilroy-Regular', fontSize: 12, color: colors.textMuted, marginTop: 2 },
  description: { fontFamily: 'Gilroy-Regular', color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  showMore: { fontFamily: 'Gilroy-Regular', color: colors.textMuted, marginTop: 4 },

  // Media Container
  mediaContainer: {
    marginTop: 10,
    position: 'relative',
  },

  // Carousel
  carousel: { marginTop: 0 },

  // Image Container and Loading
  imageContainer: {
    position: 'relative',
  },
  image: {
    borderRadius: 12,
    marginRight: 12,
  },
  imageLoading: {
    opacity: 0.7,
  },
  imageLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 12,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
    zIndex: 1,
  },

  // Media Count Indicator
  mediaCountIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mediaCountText: {
    color: colors.white,
    fontSize: 12,
    fontFamily: 'Gilroy-SemiBold',
  },

  // Fullscreen Modal
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalClose: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
  },
  fullscreenImage: {
    width: screenWidth,
    height: "80%",
  },

  stats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 8,
  },
  statsText: { color: colors.textSecondary, fontSize: 13 },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
    marginTop: 12,
    paddingHorizontal: 4,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    flex: 1,
  },
  actionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: 'Gilroy-Medium',
  },
  reactionWrapper: { flexDirection: "row", alignItems: "center" },
  reactionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    height: 24,
    width: 22,
    marginRight: 6,
  },
  reactionBubble: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reactionText: { fontSize: 12 },
  reactionCount: { fontSize: 13, color: colors.textSecondary },
  // Action button with reaction emoji
  reactionEmoji: {
    fontSize: 20,
    marginRight: 6,
  },
  // Options Menu Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
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
  reportOptionText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
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
  repostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  repostIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  repostIndicatorText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Medium',
    color: colors.textSecondary,
    marginLeft: 6,
  },
  reposterName: {
    fontFamily: 'Gilroy-SemiBold',
    color: colors.textPrimary,
  },
  repostTimestamp: {
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: colors.textMuted,
  },
  repostCommentContainer: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.button,
  },
  repostCommentText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: colors.textPrimary,
    lineHeight: 20,
  },
  originalPostContainer: {
    backgroundColor: colors.glassInner,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.glassBorder,
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
});

export default PostCard;