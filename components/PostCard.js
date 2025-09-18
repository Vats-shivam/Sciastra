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
} from "react-native";
import colors from "../config/colors";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

const { width: screenWidth } = Dimensions.get("window");

const REACTIONS = [
  { type: "like", icon: "👍" },
  { type: "love", icon: "❤️" },
  { type: "haha", icon: "😆" },
  { type: "wow", icon: "😮" },
  { type: "sad", icon: "😢" },
  { type: "angry", icon: "😡" },
];

const PostCard = ({ post }) => {
  // console.log(JSON.stringify(post, null, 2)); // Use this to debug the post data
  const navigation = useNavigation();
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [userReaction, setUserReaction] = useState(post.userReaction); // Track the current user's reaction
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [reactions, setReactions] = useState(post.counts.reactions); // Use reactions from the counts object

  // Fullscreen image modal
  const [selectedImage, setSelectedImage] = useState(null);

  const handleReaction = (type) => {
    setReactions((prev) => {
      const newReactions = { ...prev };
      // Decrement the previous reaction count if it exists
      if (userReaction && newReactions[userReaction]) {
        newReactions[userReaction] -= 1;
        if (newReactions[userReaction] === 0) {
          delete newReactions[userReaction];
        }
      }
      // Increment the new reaction count
      if (newReactions[type]) {
        newReactions[type] += 1;
      } else {
        newReactions[type] = 1;
      }
      return newReactions;
    });
    setUserReaction(type);
    setShowReactionPicker(false);
  };
  
  const handleRemoveReaction = () => {
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
  };

  const totalReactions = Object.values(reactions).reduce(
    (sum, count) => sum + count,
    0
  );
  const usedReactions = Object.keys(reactions).filter(
    (key) => reactions[key] > 0
  );

  // Handle multiple images (default to array)
  const images = Array.isArray(post.media)
    ? post.media.filter((item) => item.mediaType === "image").map((item) => item.uri)
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
        <FlatList
          data={images}
          keyExtractor={(item, index) => index.toString()}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.carousel}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => setSelectedImage(item)}>
              <Image
                source={{ uri: item }}
                style={styles.image}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}
        />
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
          onLongPress={() => setShowReactionPicker(true)}
          onPress={() => userReaction ? handleRemoveReaction() : handleReaction("like")}
        >
          <Icon
            name={userReaction ? "thumb-up" : "thumb-up-outline"}
            size={22}
            color={userReaction ? colors.accent : colors.textSecondary}
          />
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
      {showReactionPicker && (
        <View style={styles.reactionPicker}>
          {REACTIONS.map((reaction) => (
            <TouchableOpacity
              key={reaction.type}
              onPress={() => handleReaction(reaction.type)}
              style={{ marginHorizontal: 6 }}
            >
              <Text style={{ fontSize: 26 }}>{reaction.icon}</Text>
            </TouchableOpacity>
          ))}
        </View>
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

  // Carousel
  carousel: { marginTop: 10 },
  image: {
    width: screenWidth - 32, // padding aware
    height: 300,
    borderRadius: 12,
    marginRight: 12,
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
  reactionPicker: {
    flexDirection: "row",
    justifyContent: "center",
    padding: 8,
    marginTop: 6,
    backgroundColor: colors.background,
    borderRadius: 30,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});

export default PostCard;