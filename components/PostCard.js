import React, { useState } from "react";
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
} from "react-native";
import colors from "../config/colors";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import postApi from "../api/PostApi";
import authApi from "../api/AuthApi";
import { useNotification } from "../contexts/NotificationContext";

const { width: screenWidth } = Dimensions.get("window");

// Reaction types from backend enum
const REACTIONS = [
  { type: "LIKE", icon: "👍", label: "Like" },
  { type: "LOVE", icon: "❤️", label: "Love" },
  { type: "CELEBRATE", icon: "🎉", label: "Celebrate" },
  { type: "SUPPORT", icon: "🤝", label: "Support" },
  { type: "LAUGH", icon: "😂", label: "Laugh" },
  { type: "INSIGHTFUL", icon: "💡", label: "Insightful" },
];

const PostCard = ({ post }) => {
  const navigation = useNavigation();
  const { showError, showSuccess } = useNotification();
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [userReaction, setUserReaction] = useState(post.userReaction); // Track the current user's reaction
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [reactions, setReactions] = useState(post.counts.reactions); // Use reactions from the counts object
  const [reactionLoading, setReactionLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState({});

  // Fullscreen image modal
  const [selectedImage, setSelectedImage] = useState(null);

  // No longer needed with chat service pattern - auth headers handle authentication

  // Get image source with auth headers (chat service pattern)
  const getImageSource = (mediaItem) => {
    const userToken = authApi.getAccessToken();

    // If we have a media key and token, use authenticated approach
    if (mediaItem.key && userToken) {
      return postApi.getImageSource(mediaItem.key, userToken);
    }

    // Otherwise use the URL directly
    return { uri: mediaItem.uri || mediaItem.url || mediaItem.displayUrl };
  };

  const handleReaction = async (type) => {
    if (reactionLoading) return; // Prevent double taps

    try {
      setReactionLoading(true);

      // Optimistic update - update UI immediately
      const previousReaction = userReaction;
      const previousReactions = { ...reactions };

      // Update UI optimistically
      setReactions((prev) => {
        const newReactions = { ...prev };

        // Remove previous reaction count
        if (previousReaction && newReactions[previousReaction]) {
          newReactions[previousReaction] -= 1;
          if (newReactions[previousReaction] === 0) {
            delete newReactions[previousReaction];
          }
        }

        // Add new reaction count
        if (newReactions[type]) {
          newReactions[type] += 1;
        } else {
          newReactions[type] = 1;
        }

        return newReactions;
      });

      setUserReaction(type);
      setShowReactionPicker(false);

      // Make API call
      const result = await postApi.addReaction(post.id, type);

      if (!result.success && !result.cancelled) {
        // API failed, revert optimistic update
        setReactions(previousReactions);
        setUserReaction(previousReaction);
        showError('Failed to add reaction. Please try again.');
      } else if (result.cancelled) {
        // Don't revert - the UI state represents the latest user intent
      }
    } catch (error) {
      showError('Something went wrong. Please try again.');
    } finally {
      setReactionLoading(false);
    }
  };
  
  const handleRemoveReaction = async () => {
    if (reactionLoading) return; // Prevent double taps

    try {
      if (!userReaction) return;

      setReactionLoading(true);

      // Optimistic update
      const previousReaction = userReaction;
      const previousReactions = { ...reactions };

      setReactions((prev) => {
        const newReactions = { ...prev };
        if (userReaction && newReactions[userReaction]) {
          newReactions[userReaction] -= 1;
          if (newReactions[userReaction] === 0) {
            delete newReactions[userReaction];
          }
        }
        return newReactions;
      });

      setUserReaction(null);

      // Make API call
      const result = await postApi.removeReaction(post.id);

      if (!result.success) {
        // API failed, revert optimistic update
        setReactions(previousReactions);
        setUserReaction(previousReaction);
        showError('Failed to remove reaction. Please try again.');
      }
    } catch (error) {
      showError('Something went wrong. Please try again.');
    } finally {
      setReactionLoading(false);
    }
  };

  const totalReactions = Object.values(reactions).reduce(
    (sum, count) => sum + count,
    0
  );
  const usedReactions = Object.keys(reactions).filter(
    (key) => reactions[key] > 0
  );

  // Handle multiple images using chat service pattern (simplified)
  const images = Array.isArray(post.media)
    ? post.media.filter((item) => (item.mediaType === "image" || item.type === "image" || (!item.type && !item.mediaType)))
    : [];

  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) {
      return Math.floor(interval) + "y ago";
    }
    interval = seconds / 2592000;
    if (interval > 1) {
      return Math.floor(interval) + "m ago";
    }
    interval = seconds / 86400;
    if (interval > 1) {
      return Math.floor(interval) + "d ago";
    }
    interval = seconds / 3600;
    if (interval > 1) {
      return Math.floor(interval) + "h ago";
    }
    interval = seconds / 60;
    if (interval > 1) {
      return Math.floor(interval) + "min ago";
    }
    return Math.floor(seconds) + "s ago";
  };

  return (
    <Pressable
    onPress={() => navigation.navigate("PostDetail", { postId: post.id })}
    style={styles.container}
  >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (post.author.id === "1") {
              navigation.navigate("ProfileTab");
            } else {
              navigation.navigate("UserProfile", { userId: post.author.id });
            }
          }}
        >
          <Image
            source={
              post.author.profile.profilePic
                ? { uri: post.author.profile.profilePic }
                : require("../assets/icon.png")
            }
            style={styles.avatar}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, paddingLeft: 10 }}
          onPress={() => {
            if (post.author.id === "1") {
              navigation.navigate("ProfileTab");
            } else {
              navigation.navigate("UserProfile", { userId: post.author.id });
            }
          }}
        >
          <Text style={styles.author}>{post.author.profile.name}</Text>
          <Text style={styles.subTitle}>
            {post.author.profile.profession || "Professional"}
          </Text>
          <Text style={styles.timestamp}>
            {timeAgo(post.createdAt)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            if (post.author.id === "1") {
              navigation.navigate("ProfileTab");
            } else {
              navigation.navigate("UserProfile", { userId: post.author.id });
            }
          }}
        >
          <Icon name="dots-vertical" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Description */}
      {post.content && (
        <TouchableOpacity
          onPress={() => setShowFullDescription(!showFullDescription)}
          activeOpacity={0.8}
          style={{ marginVertical: 8 }}
        >
          <Text
            numberOfLines={showFullDescription ? 0 : 3}
            style={styles.description}
          >
            {post.content}
          </Text>
          {!showFullDescription && post.content.length > 100 && (
            <Text style={styles.showMore}>See More</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Image Carousel */}
      {images.length > 0 && (
        <View style={styles.mediaContainer}>
          <FlatList
            data={images}
            keyExtractor={(item, index) => `${post.id}_media_${index}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.carousel}
            renderItem={({ item, index }) => {
              const imageSource = getImageSource(item);
              const imageKey = `${post.id}_${index}`;

              return (
                <TouchableOpacity onPress={() => setSelectedImage(imageSource.uri)}>
                  <View style={styles.imageContainer}>
                    {imageLoading[imageKey] && (
                      <View style={styles.imageLoader}>
                        <ActivityIndicator size="large" color={colors.primary} />
                      </View>
                    )}
                    <Image
                      source={imageSource}
                      style={[styles.image, imageLoading[imageKey] && styles.imageLoading]}
                      resizeMode="cover"
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
          {images.length > 1 && (
            <View style={styles.mediaCountIndicator}>
              <Text style={styles.mediaCountText}>1 / {images.length}</Text>
            </View>
          )}
        </View>
      )}

      {/* Fullscreen Modal */}
      <Modal
        visible={!!selectedImage}
        transparent
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.modalBackground}>
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setSelectedImage(null)}
          >
            <Icon name="close" size={30} color={colors.white} />
          </TouchableOpacity>
          <Image
            source={{ uri: selectedImage }}
            style={styles.fullscreenImage}
            resizeMode="contain"
          />
        </View>
      </Modal>

      {/* Stats */}
      <View style={styles.stats}>
        {totalReactions > 0 ? (
          <View style={styles.reactionWrapper}>
            <View
              style={[
                styles.reactionsContainer,
                { width: usedReactions.length * 16 + 8 },
              ]}
            >
              {usedReactions.map((r, index) => (
                <View
                  key={r}
                  style={[
                    styles.reactionBubble,
                    { left: index * 16, zIndex: usedReactions.length - index },
                  ]}
                >
                  <Text style={styles.reactionText}>
                    {REACTIONS.find((x) => x.type === r)?.icon}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={styles.reactionCount}>
              {totalReactions} Reacted
            </Text>
          </View>
        ) : (
          <Text style={styles.statsText}>Be the first to react</Text>
        )}
        <TouchableOpacity
          onPress={() => navigation.navigate("PostDetail", { postId: post.id })}
        >
          <Text style={styles.statsText}>
            {post.counts.comments} Comments
          </Text>
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Pressable
          onLongPress={() => !reactionLoading && setShowReactionPicker(true)}
          onPress={() => !reactionLoading && (userReaction ? handleRemoveReaction() : handleReaction("LIKE"))}
          style={[styles.actionButton, reactionLoading && styles.actionButtonLoading]}
          disabled={reactionLoading}
        >
          {reactionLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <Icon
                name={userReaction ? "thumb-up" : "thumb-up-outline"}
                size={22}
                color={userReaction ? colors.accent : colors.textSecondary}
              />
              {userReaction && (
                <Text style={styles.reactionEmoji}>
                  {REACTIONS.find(r => r.type === userReaction)?.icon || '👍'}
                </Text>
              )}
            </>
          )}
        </Pressable>
        <TouchableOpacity
          onPress={() => navigation.navigate("PostDetail", { postId: post.id })}
        >
          <Icon name="comment-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity>
          <Icon name="share-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity>
          <Icon name="send-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Reaction Picker */}
      {showReactionPicker && !reactionLoading && (
        <View style={styles.reactionPickerContainer}>
          <View style={styles.reactionPicker}>
            {REACTIONS.map((reaction) => (
              <TouchableOpacity
                key={reaction.type}
                onPress={() => handleReaction(reaction.type)}
                style={styles.reactionOption}
                disabled={reactionLoading}
              >
                <Text style={styles.reactionIcon}>{reaction.icon}</Text>
                <Text style={styles.reactionLabel}>{reaction.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={styles.reactionPickerClose}
            onPress={() => setShowReactionPicker(false)}
          >
            <Icon name="close" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}
      {/* Overlay to close reaction picker when tapping outside */}
      {showReactionPicker && (
        <TouchableOpacity
          style={styles.reactionPickerOverlay}
          activeOpacity={1}
          onPress={() => setShowReactionPicker(false)}
        />
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    shadowColor: colors.primary,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
  },
  header: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  author: { fontWeight: "700", fontSize: 16, color: colors.primary },
  subTitle: { fontSize: 12, color: colors.secondary },
  timestamp: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  description: { color: colors.textPrimary, fontSize: 14, lineHeight: 20 },
  showMore: { color: colors.accent, fontWeight: "600", marginTop: 4 },

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
    width: screenWidth - 32, // padding aware
    height: 300,
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
    fontWeight: '600',
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
    justifyContent: "space-around",
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    position: 'relative',
    padding: 8,
    borderRadius: 8,
  },
  actionButtonLoading: {
    opacity: 0.6,
  },
  reactionWrapper: { flexDirection: "row", alignItems: "center" },
  reactionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    height: 24,
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
  // Reaction Picker Styles
  reactionPickerContainer: {
    position: 'relative',
    marginTop: 8,
  },
  reactionPicker: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 30,
    shadowColor: colors.primary,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reactionOption: {
    alignItems: 'center',
    marginHorizontal: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  reactionIcon: {
    fontSize: 24,
    marginBottom: 2,
  },
  reactionLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  reactionPickerClose: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.background,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Action button with reaction emoji
  reactionEmoji: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    fontSize: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 2,
    paddingVertical: 1,
  },

  // Overlay to close reaction picker
  reactionPickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
});

export default PostCard;