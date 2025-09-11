// screens/ChatListScreen.js
import React, { useState, useEffect } from 'react';
import { FlatList, Text, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, View } from 'react-native';
import Container from '../components/Container';
import Card from '../components/Card';
import colors from '../config/colors';
import chatApi from '../api/ChatApi';
import { useLoader } from '../context/LoaderContext';

const initialChats = [
  { id: '1', name: 'Alice Johnson', lastMessage: 'See you tomorrow!', unread: 2 },
  { id: '2', name: 'Bob Lee', lastMessage: 'Thanks for the help!', unread: 0 },
];

const ChatListScreen = ({ navigation }) => {
  const { showLoader, hideLoader } = useLoader();
  const [chats, setChats] = useState(initialChats);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
      
      if (result.success) {
        const rooms = result.data || [];
        console.log('ChatList: Received rooms:', rooms);
        
        const formattedChats = rooms.map(room => ({
          id: room.id,
          name: getOtherParticipantName(room),
          lastMessage: room.lastMessage?.content || 'No messages yet',
          unread: room.unreadCount || 0,
          room: room,
        }));
        
        console.log('ChatList: Formatted chats:', formattedChats);
        setChats(formattedChats);
      } else {
        console.error('ChatList: Failed to load chat rooms:', result.message);
      }
    } catch (error) {
      console.error('Error loading chat rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOtherParticipantName = (room) => {
    if (room.type === 'direct' && room.participants) {
      const otherParticipant = room.participants.find(p => p.userId !== chatApi.getCurrentUserId?.());
      return otherParticipant?.name || 'Unknown User';
    }
    return room.name || 'Chat Room';
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChatRooms();
    setRefreshing(false);
  };

  return (
    <Container>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('OneToOneChat', { 
            chatId: item.id, 
            chatName: item.name,
            room: item.room 
          })}>
            <Card style={styles.chatCard}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.lastMessage}>{item.lastMessage}</Text>
              {item.unread > 0 && <Text style={styles.unread}>{item.unread}</Text>}
            </Card>
          </TouchableOpacity>
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.button]}
            tintColor={colors.button}
          />
        }
        ListEmptyComponent={() => (
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.button} />
              <Text style={styles.loadingText}>Loading chats...</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No chats yet</Text>
              <Text style={styles.emptySubtext}>Start a conversation with someone!</Text>
            </View>
          )
        )}
      />
    </Container>
  );
};

const styles = StyleSheet.create({
  chatCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  name: { fontWeight: 'bold', fontSize: 16, color: colors.primary },
  lastMessage: { flex: 1, color: colors.textSecondary, marginLeft: 10 },
  unread: { backgroundColor: colors.accent, color: colors.white, paddingHorizontal: 8, borderRadius: 12, fontWeight: 'bold' },
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
