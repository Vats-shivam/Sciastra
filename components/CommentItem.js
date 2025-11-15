// components/CommentItem.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../config/colors';

const CommentItem = ({ comment, onLike, onReply }) => {
  const [showReplies, setShowReplies] = useState(false);

  return (
    <View style={styles.commentContainer}>
      <Text style={styles.commentAuthor}>{comment.author}</Text>
      <Text style={styles.commentText}>{comment.text}</Text>

      <View style={styles.commentActions}>
        <TouchableOpacity onPress={() => onLike(comment.id)}>
          <Text style={styles.actionText}>Like ({comment.likes})</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowReplies(!showReplies)}>
          <Text style={styles.actionText}>{showReplies ? 'Hide Replies' : `Replies (${comment.replies.length || 0})`}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => onReply(comment.id)}>
          <Text style={styles.actionText}>Reply</Text>
        </TouchableOpacity>
      </View>

      {showReplies && comment.replies && comment.replies.length > 0 && (
        <View style={{ paddingLeft: 16 }}>
          {comment.replies.map(reply => (
            <CommentItem key={reply.id} comment={reply} onLike={onLike} onReply={onReply} />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  commentContainer: {
    backgroundColor: colors.background,
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  commentAuthor: { fontFamily: 'Gilroy-Bold', fontSize: 14, color: colors.primary },
  commentText: { marginVertical: 6, color: colors.textPrimary },
  commentActions: { flexDirection: 'row', justifyContent: 'space-between' },
  actionText: { color: colors.accent, fontFamily: 'Gilroy-SemiBold' },
});

export default CommentItem;
