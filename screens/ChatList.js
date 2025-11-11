import React, { useState, useEffect } from 'react';
import {
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
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

const ChatListScreen = ({ navigation }) => {
  const { showLoader, hideLoader } = useLoader();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useScreenApiLogger('ChatList');
  
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

        const formattedChats = rooms.map(room => ({
          id: room.id,
          name: getOtherParticipantName(room),
          lastMessage: room.messages?.[0]?.content || room.lastMessage?.content || 'No messages yet',
          time: room.messages?.[0] 
            ? new Date(room.messages[0].createdAt).toLocaleDateString() 
            : (room.lastMessage?.createdAt ? new Date(room.lastMessage.createdAt).toLocaleDateString() : ''),
          unread: room.unreadCount || 0,
          avatar: getOtherParticipantAvatar(room),
          isOnline: true, // Default to online since we don't have real-time status
          room: room,
        }));

        console.log('ChatList: Formatted chats:', formattedChats);
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
  const getOtherParticipantId = (room) => {
    if (!room.isGroup && room.members) {
      const otherMember = room.members.find(member => member.user.id !== chatApi.getCurrentUserId?.());
      return otherMember?.user?.id || null;
    }
    return null;
  }

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
      return otherMember?.user?.profile?.profilePic || 'https://randomuser.me/api/portraits/men/1.jpg';
    }
    return 'https://randomuser.me/api/portraits/men/1.jpg';
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChatRooms();
    setRefreshing(false);
  };

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
            placeholder="Search messages"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
        </View>
      </View>

      {/* Chat List */}
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.chatItem}
            onPress={() => handleChatPress(item)}
          >
            <View style={styles.avatarContainer}>
              <Image 
                source={{ uri: item.avatar }} 
                style={styles.avatar} 
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
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
    fontWeight: 'bold',
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
  listContent: {
    paddingBottom: 16,
    backgroundColor: colors.background,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
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
    fontWeight: '600',
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
    fontWeight: '500',
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
    fontWeight: 'bold',
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
    fontWeight: 'bold',
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
