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
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import colors from '../config/colors';
import chatApi from '../api/ChatApi';
import { useLoader } from '../context/LoaderContext';
import useScreenApiLogger from '../hooks/useScreenApiLogger';
import { getProfileImageSource } from '../utils/profileImage';
import CustomRefreshControl from '../components/CustomRefreshControl';

const ChatListScreen = ({ navigation }) => {
  const { showLoader, hideLoader } = useLoader();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlineUsers, setOnlineUsers] = useState(new Set()); // Track online users
  const [avatarErrors, setAvatarErrors] = useState({});

  useScreenApiLogger('ChatList');
  
  // Helper functions - defined before useEffect
  const getOtherParticipantId = (room) => {
    if (!room.isGroup && room.members) {
      const otherMember = room.members.find(member => member.user.id !== chatApi.getCurrentUserId?.());
      return otherMember?.user?.id || null;
    }
    return null;
  };

  const getOtherParticipantName = (room) => {
    if (!room.isGroup && room.members) {
      const otherMember = room.members.find(member => member.user.id !== chatApi.getCurrentUserId?.());
      return otherMember?.user?.profile?.name || 'Unknown User';
    }
    return room.name || 'Chat Room';
  };

  const getOtherParticipantAvatar = (room) => {
    if (!room.isGroup && room.members) {
      const otherMember = room.members.find(member => member.user.id !== chatApi.getCurrentUserId?.());
      return otherMember?.user?.profile?.profilePic || null;
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
      console.log('📡 ChatList: User status changed:', statusData);
      const { userId, status } = statusData;
      
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        if (status === 'online') {
          newSet.add(userId);
        } else {
          newSet.delete(userId);
        }
        return newSet;
      });

      // Update the specific chat item
      setChats(prevChats => 
        prevChats.map(chat => {
          const participantId = getOtherParticipantId(chat.room);
          if (participantId === userId) {
            return { ...chat, isOnline: status === 'online' };
          }
          return chat;
        })
      );
    };

    // Add status listener for each chat participant
    const participantIds = chats
      .map(chat => getOtherParticipantId(chat.room))
      .filter(Boolean);

    participantIds.forEach(participantId => {
      chatApi.addStatusListener(participantId, handleUserStatusChange);
    });

    console.log('📡 ChatList: Set up status listeners for:', participantIds);

    // Cleanup listeners on unmount or when chats change
    return () => {
      participantIds.forEach(participantId => {
        chatApi.removeStatusListener(participantId, handleUserStatusChange);
      });
      console.log('🧹 ChatList: Cleaned up status listeners');
    };
  }, [chats.map(c => c.id).join(',')]); // Only re-run when chat IDs change

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
          const participant = !room.isGroup && room.members
            ? room.members.find(member => member.user.id !== chatApi.getCurrentUserId?.())
            : null;
          const participantUser = participant?.user || null;
          const avatarKey = participantUser?.profile?.profilePic || participantUser?.profilePic || null;
          
          // Debug logging
          if (avatarKey) {
            console.log('ChatList: Avatar key found for room', room.id, ':', avatarKey);
          } else {
            console.log('ChatList: No avatar key for room', room.id, 'participantUser:', participantUser);
          }
          
          return {
            id: room.id,
            name: getOtherParticipantName(room),
            lastMessage: room.messages?.[0]?.content || room.lastMessage?.content || 'No messages yet',
            time: room.messages?.[0] 
              ? new Date(room.messages[0].createdAt).toLocaleDateString() 
              : (room.lastMessage?.createdAt ? new Date(room.lastMessage.createdAt).toLocaleDateString() : ''),
            unread: room.unreadCount || 0,
            avatar: avatarKey,
            isOnline: onlineUsers.has(participantId), // Use actual online status
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
                    ? require('../assets/icon.png')
                    : getProfileImageSource(item.participant || {}, { fallbackKey: item.avatar })
                }
                style={styles.avatar}
                resizeMode="cover"
                defaultSource={require('../assets/icon.png')}
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
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading chats...</Text>
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
