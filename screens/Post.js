import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import Container from "../components/Container";
import colors from "../config/colors";
import { api } from "../api/MockApi";
import PostCard from "../components/PostCard";
import Header from "../components/Header";

const Comment = ({ comment, onReply, onLike, level = 0 }) => {
  const [showReplies, setShowReplies] = useState(true);

  return (
    <View style={[styles.commentContainer, { marginLeft: level * 20 }]}>
      <View style={styles.commentHeader}>
        <Image
          source={
            comment.profilePic
              ? { uri: comment.profilePic }
              : require("../assets/icon.png")
          }
          style={styles.avatar}
        />
        <Text style={styles.commentAuthor}>{comment.author}</Text>
      </View>

      <Text style={styles.commentText}>{comment.text}</Text>

      <View style={styles.commentActions}>
        <TouchableOpacity onPress={() => onLike(comment.id)}>
          <Text style={styles.actionText}>👍 {comment.likes}</Text>
        </TouchableOpacity>
        {comment.replies.length > 0 && (
          <TouchableOpacity onPress={() => setShowReplies(!showReplies)}>
            <Text style={styles.actionText}>
              {showReplies
                ? `Hide Replies (${comment.replies.length})`
                : `Replies (${comment.replies.length})`}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => onReply(comment.id)}>
          <Text style={styles.actionText}>Reply</Text>
        </TouchableOpacity>
      </View>

      {showReplies &&
        comment.replies.map((reply) => (
          <Comment
            key={reply.id}
            comment={reply}
            onReply={onReply}
            onLike={onLike}
            level={level + 1}
          />
        ))}
    </View>
  );
};

const PostDetailScreen = ({ route }) => {
  const { postId } = route.params;
  const [post, setPost] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const inputRef = useRef(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    api.fetchFeedPosts().then((posts) => {
      const found = posts.find((p) => p.id === postId);
      const normalizedComments = (found.comments || []).map((c, idx) => ({
        id: c.id || `c-${idx}-${Date.now()}`,
        author: c.user || c.author,
        text: c.text,
        likes: c.likes || 0,
        profilePic:
          c.profilePic || "https://randomuser.me/api/portraits/lego/2.jpg",
        replies: c.replies || [],
      }));
      setPost({ ...found, comments: normalizedComments });
      
    });
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: false });
    }, 500);
    return () => clearTimeout(timer);
  }, [postId]);

  const addReplyRecursive = (comments, parentId, newComment) =>
    comments.map((c) =>
      c.id === parentId
        ? { ...c, replies: [...c.replies, newComment] }
        : { ...c, replies: addReplyRecursive(c.replies, parentId, newComment) }
    );
  const onReply = (commentId) => {
    setTimeout(() => {
      inputRef.current?.focus(); // focus input after state update
    }, 200);
    setReplyTo(commentId); // keep track of which comment we are replying to
  };
  const handleComment = () => {
    if (!commentText) return;
    const newComment = {
      id: Date.now().toString(),
      author: "You",
      text: commentText,
      likes: 0,
      profilePic: "https://randomuser.me/api/portraits/lego/1.jpg",
      replies: [],
    };

    if (replyTo) {
      const updatedComments = addReplyRecursive(
        post.comments,
        replyTo,
        newComment
      );
      setPost({ ...post, comments: updatedComments });
    } else {
      setPost({ ...post, comments: [...post.comments, newComment] });
    }

    setCommentText("");
    setReplyTo(null);

    // Auto scroll to bottom after posting
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const likeCommentRecursive = (comments, commentId) =>
    comments.map((c) =>
      c.id === commentId
        ? { ...c, likes: c.likes + 1 }
        : { ...c, replies: likeCommentRecursive(c.replies, commentId) }
    );

  const handleLikeComment = (commentId) => {
    const updatedComments = likeCommentRecursive(post.comments, commentId);
    setPost({ ...post, comments: updatedComments });
  };

  if (!post)
    return <Text style={{ textAlign: "center", marginTop: 50 }}>Loading...</Text>;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <Header title="POST" />
      
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            <Container>
              <PostCard post={post} />

              <FlatList
                ref={flatListRef}
                data={post.comments}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <Comment
                    comment={item}
                    onReply={onReply}
                    onLike={handleLikeComment}
                  />
                )}
                ListEmptyComponent={
                  <Text style={{ textAlign: "center", marginVertical: 20 }}>
                    No comments yet
                  </Text>
                }
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
              />

              {/* Input Bar */}
              <View style={styles.commentInputContainer}>
                <TextInput
                  ref={inputRef}
                  placeholder="Write a comment..."
                  style={styles.commentInput}
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                />
                <TouchableOpacity
                  onPress={handleComment}
                  style={styles.commentButton}
                >
                  <Text style={{ color: "white" }}>Post</Text>
                </TouchableOpacity>
              </View>
            </Container>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  commentContainer: {
    backgroundColor: colors.card,
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  commentHeader: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  avatar: { width: 28, height: 28, borderRadius: 14, marginRight: 8 },
  commentAuthor: { fontWeight: "bold", fontSize: 14, color: colors.primary },
  commentText: { marginVertical: 6, color: colors.textPrimary },
  commentActions: { flexDirection: "row", gap: 16 },
  actionText: { color: colors.accent, fontWeight: "600", fontSize: 12 },
  commentInputContainer: {
    flexDirection: "row",
    padding: 10,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.textSecondary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    color: colors.textPrimary,
    maxHeight: 100,
  },
  commentButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  replying: { fontSize: 12, color: colors.secondary, marginBottom: 4 },
});

export default PostDetailScreen;
