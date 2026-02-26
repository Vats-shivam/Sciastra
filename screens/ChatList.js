import React, { useState, useEffect } from 'react';
import {
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  View,
  Image,
  TextInput,
  SafeAreaView,
  StatusBar,
  Platform
} from 'react-native';
// Navigation prop is now passed directly to the component
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import colors from '../config/colors';
import chatApi from '../api/ChatApi';
import { useLoader } from '../context/LoaderContext';
import useScreenApiLogger from '../hooks/useScreenApiLogger';
import { getProfileImageSource } from '../utils/profileImage';
import { parseUTCDate } from '../utils/dateUtils';
import CustomRefreshControl from '../components/CustomRefreshControl';
import { ChatItemSkeleton } from '../components/skeletons';

const ChatListScreen = ({ navigation }) => {
  const { showLoader, hideLoader } = useLoader();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlineUsers, setOnlineUsers] = useState(new Set()); // Track online users
  const [avatarErrors, setAvatarErrors] = useState({});

  useScreenApiLogger('ChatList');
  
  // Helper - backend returns members as User[] directly, not [{ user }]
  const getMemberId = (member) => member?.id ?? member?.user?.id;
  const getMemberProfile = (member) => member?.profile ?? member?.user?.profile;

  const getOtherParticipantId = (room) => {
    if (!room.isGroup && room.members?.length) {
      const currentUserId = chatApi.getCurrentUserId?.();
      const other = room.members.find(m => getMemberId(m) !== currentUserId);
      return getMemberId(other) || null;
    }
    return null;
  };

  const getOtherParticipantName = (room) => {
    if (!room.isGroup && room.members?.length) {
      const currentUserId = chatApi.getCurrentUserId?.();
      const other = room.members.find(m => getMemberId(m) !== currentUserId);
      return getMemberProfile(other)?.name || 'Unknown User';
    }
    return room.name || 'Chat Room';
  };

  const getOtherParticipantAvatar = (room) => {
    if (!room.isGroup && room.members?.length) {
      const currentUserId = chatApi.getCurrentUserId?.();
      const other = room.members.find(m => getMemberId(m) !== currentUserId);
      return getMemberProfile(other)?.profilePic || null;
    }
    return null;
  };

  const handleChatPress = (chat) => {
    const participantId = getOtherParticipantId(chat.room);

    if (!participantId) {
      console.warn('ChatList: Unable to determine participant for chat', chat);
      return;
    }

    navigation.navigate('OneToOneChat', { 
      userId: participantId, 
      userName: chat.name,
      avatar: chat.avatar,
      isOnline: chat.isOnline
    });
  };

  useEffect(() => {
    loadChatRooms();
    initializeChat();
  }, []);

  // Set up status listeners for all chat participants
  useEffect(() => {
    if (chats.length === 0) return;

    const handleUserStatusChange = (statusData) => {
      const { userId, status } = statusData;
      const uid = String(userId);
      
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        if (status === 'online') {
          newSet.add(uid);
        } else {
          newSet.delete(uid);
        }
        return newSet;
      });

      setChats(prevChats => 
        prevChats.map(chat => {
          const participantId = getOtherParticipantId(chat.room);
          if (participantId && String(participantId) === uid) {
            return { ...chat, isOnline: status === 'online' };
          }
          return chat;
        })
      );
    };

    const participantIds = chats
      .map(chat => getOtherParticipantId(chat.room))
      .filter(Boolean);

    participantIds.forEach(participantId => {
      chatApi.addStatusListener(participantId, handleUserStatusChange);
    });

    return () => {
      participantIds.forEach(participantId => {
        chatApi.removeStatusListener(participantId, handleUserStatusChange);
      });
    };
  }, [chats.map(c => c?.id).filter(Boolean).join(',')]);

  // Set up message listeners to update last message in real-time
  useEffect(() => {
    if (chats.length === 0) return;

    const handleNewMessage = (messageData) => {
      const roomId = messageData.chatRoomId || messageData.roomId;
      if (!roomId) return;

      let lastMessageText = messageData.content || messageData.text || '';
      if (!lastMessageText?.trim() && messageData.media) {
        lastMessageText = messageData.media?.type === 'image' ? 'Photo' : 'Media';
      }
      if (!lastMessageText?.trim()) lastMessageText = 'New message';

      const timeStr = messageData.createdAt
        ? (parseUTCDate(messageData.createdAt)?.toLocaleDateString() ?? new Date().toLocaleDateString())
        : new Date().toLocaleDateString();

      setChats(prevChats =>
        prevChats.map(chat => {
          if (chat.id === roomId) {
            return {
              ...chat,
              lastMessage: lastMessageText,
              time: timeStr,
            };
          }
          return chat;
        })
      );
    };

    chats.forEach(chat => {
      if (chat.id) {
        chatApi.addMessageListener(chat.id, handleNewMessage);
        chatApi.joinRoom(chat.id);
      }
    });

    return () => {
      chats.forEach(chat => {
        if (chat.id) {
          chatApi.removeMessageListener(chat.id, handleNewMessage);
          chatApi.leaveRoom(chat.id);
        }
      });
    };
  }, [chats.map(c => c?.id).filter(Boolean).join(',')]);

  const initializeChat = async () => {
    try {
      await chatApi.initializeSocket();
    } catch (error) {
      console.error('Failed to initialize chat:', error);
    }
  };

  const loadChatRooms = async () => {
    console.log('ChatList: Loading chat rooms...');
    setLoading(true);
    try {
      const result = await chatApi.getChatRooms(1, 20);
      console.log('ChatList: Get chat rooms result:', result);
      
      if (result.success && result.data) {
        // Handle different response structures
        const rooms = Array.isArray(result.data) 
          ? result.data 
          : (result.data.chatRooms || result.data.rooms || []);
        
        console.log('ChatList: Received rooms:', rooms);

        if (rooms.length === 0) {
          setChats([]);
          return;
        }

        const formattedChats = rooms.map(room => {
          const participantId = getOtherParticipantId(room);
          const currentUserId = chatApi.getCurrentUserId?.();
          const participantMember = !room.isGroup && room.members?.length
            ? room.members.find(m => getMemberId(m) !== currentUserId)
            : null;
          const participantUser = participantMember
            ? (participantMember.user || participantMember)
            : null;
          const avatarKey = getMemberProfile(participantMember)?.profilePic || participantUser?.profilePic || null;

          const latestMsg = room.messages?.[0] ?? room.lastMessage;
          let lastMessageText = latestMsg?.content ?? latestMsg?.text ?? '';
          if (!lastMessageText?.trim() && latestMsg?.media) {
            lastMessageText = latestMsg.media?.type === 'image' ? 'Photo' : 'Media';
          }
          if (!lastMessageText?.trim()) lastMessageText = 'No messages yet';

          const lastMsgTime = latestMsg?.createdAt;
          const timeStr = lastMsgTime ? (parseUTCDate(lastMsgTime)?.toLocaleDateString() ?? '') : '';

          return {
            id: room.id,
            name: getOtherParticipantName(room),
            lastMessage: lastMessageText,
            time: timeStr,
            unread: room.unreadCount || 0,
            avatar: avatarKey,
            isOnline: onlineUsers.has(participantId),
            room: room,
            participant: participantUser,
          };
        });

        console.log('ChatList: Formatted chats:', formattedChats.map(c => ({ id: c.id, name: c.name, avatar: c.avatar, hasParticipant: !!c.participant })));
        setChats(formattedChats);
      } else {
        console.error('ChatList: Failed to load chat rooms:', result.message || result.error);
        setChats([]);
      }
    } catch (error) {
      console.error('Error loading chat rooms:', error);
      setChats([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChatRooms();
    setRefreshing(false);
  };

  // Filter chats based on search query
  const filteredChats = chats.filter(chat => 
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.searchButton}>
          <Icon name="magnify" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon name="magnify" size={20} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            placeholder="Search by name"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Icon name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Chat List */}
      <FlatList
        data={filteredChats}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.chatItem}
            onPress={() => handleChatPress(item)}
          >
            <View style={styles.avatarContainer}>
              <Image 
                source={
                  avatarErrors[item.id]
                    ? require('../assets/scix.png')
                    : getProfileImageSource(item.participant || {}, { fallbackKey: item.avatar })
                }
                style={styles.avatar}
                resizeMode="cover"
                defaultSource={require('../assets/scix.png')}
                onError={() => {
                  console.log('ChatList: Avatar error for chat', item.id, 'participant:', item.participant, 'avatar:', item.avatar);
                  setAvatarErrors(prev => ({ ...prev, [item.id]: true }));
                }}
              />
              {item.isOnline && <View style={styles.onlineIndicator} />}
            </View>
            
            <View style={styles.chatContent}>
              <View style={styles.chatHeader}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.time}>{item.time}</Text>
              </View>
              <View style={styles.messageContainer}>
                <Text 
                  style={[
                    styles.lastMessage,
                    item.unread > 0 && styles.unreadMessage
                  ]} 
                  numberOfLines={1}
                >
                  {item.lastMessage}
                </Text>
                {item.unread > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadCount}>{item.unread}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
        refreshControl={
          <CustomRefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={{ paddingVertical: 16 }}>
              {[1, 2, 3, 4, 5].map((i) => <ChatItemSkeleton key={i} />)}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Icon name="message-outline" size={64} color={colors.textMuted} />
              <Text style={styles.emptyText}>No chats yet</Text>
              <Text style={styles.emptySubtext}>Start a conversation with someone!</Text>
            </View>
          )
        }
      />
    </View>
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
    paddingTop:40,
    paddingBottom: 8,
    backgroundColor: colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Gilroy-Bold',
    color: colors.textPrimary,
  },
  backButton: {
    padding: 8,
  },
  searchButton: {
    padding: 8,
  },
  searchContainer: {
    padding: 16,
    paddingTop: 8,
    backgroundColor: colors.background,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: 8,
    color: colors.textMuted,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: colors.textPrimary,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  listContent: {
    paddingBottom: 16,
    backgroundColor: colors.background,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.backgroundElevated,
  },
  onlineIndicator: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: colors.card,
  },
  chatContent: {
    flex: 1,
    marginLeft: 8,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontFamily: 'Gilroy-SemiBold',
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
    color: colors.textMuted,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    marginRight: 8,
  },
  unreadMessage: {
    color: colors.textPrimary,
    fontFamily: 'Gilroy-Medium',
  },
  unreadBadge: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadCount: {
    color: colors.textInverse,
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    color: colors.textSecondary,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default ChatListScreen;
