// screens/OneToOneChatScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, FlatList, Text, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet, Alert } from 'react-native';
import Container from '../components/Container';
import colors from '../config/colors';
import chatApi from '../api/ChatApi';
import authApi from '../api/AuthApi';
import { useLoader } from '../context/LoaderContext';

const OneToOneChatScreen = ({ route, navigation }) => {
  const { userId, userName } = route.params;
  const { showLoader, hideLoader } = useLoader();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [chatRoom, setChatRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef(null);
  const currentUserId = authApi.getCurrentUserId();

  useEffect(() => {
    initializeChat();
    
    return () => {
      // Cleanup listeners when component unmounts
      if (chatRoom?.id) {
        chatApi.leaveRoom(chatRoom.id);
      }
    };
  }, []);

  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const initializeChat = async () => {
    try {
      console.log('OneToOneChat: Initializing chat with userId:', userId, 'userName:', userName);
      setLoading(true);
      
      // Create or get direct chat room
      const roomResult = await chatApi.createOrGetDirectChat(userId);
      console.log('OneToOneChat: Room creation result:', roomResult);
      
      if (roomResult.success) {
        const room = roomResult.data;
        setChatRoom(room);
        
        // Load messages for this room
        const messagesResult = await chatApi.getMessages(room.id, 1, 50);
        console.log('OneToOneChat: Messages result:', messagesResult);
        
        if (messagesResult.success) {
          const apiMessages = messagesResult.data.messages || [];
          const formattedMessages = apiMessages.map(msg => ({
            id: msg.id,
            text: msg.content,
            sender: msg.senderId === currentUserId ? 'me' : 'other',
            createdAt: msg.createdAt,
            originalMessage: msg
          }));
          console.log('OneToOneChat: Formatted messages:', formattedMessages);
          setMessages(formattedMessages);
        }
        
        // Join room for real-time updates
        chatApi.joinRoom(room.id);
        
        // Add message listener
        chatApi.addMessageListener(room.id, handleNewMessage);
        
        // Set navigation title
        navigation.setOptions({
          title: userName || 'Chat'
        });
        
      } else {
        console.error('OneToOneChat: Failed to create/get chat room:', roomResult.message);
        Alert.alert('Error', 'Failed to load chat. Please try again.');
      }
    } catch (error) {
      console.error('OneToOneChat: Initialize chat error:', error);
      Alert.alert('Error', 'Failed to initialize chat. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNewMessage = (messageData) => {
    console.log('OneToOneChat: New message received:', messageData);
    
    if (messageData.type === 'message_read') {
      // Handle read receipts
      return;
    }
    
    const newMessage = {
      id: messageData.id,
      text: messageData.content,
      sender: messageData.senderId === currentUserId ? 'me' : 'other',
      createdAt: messageData.createdAt,
      originalMessage: messageData
    };
    
    setMessages(prevMessages => {
      // Avoid duplicates
      const exists = prevMessages.find(msg => msg.id === newMessage.id);
      if (exists) return prevMessages;
      
      return [...prevMessages, newMessage];
    });
  };

  const sendMessage = async () => {
    if (!input.trim() || !chatRoom) return;
    
    try {
      console.log('OneToOneChat: Sending message:', input, 'to room:', chatRoom.id);
      const result = await chatApi.sendMessage(chatRoom.id, input.trim());
      console.log('OneToOneChat: Send message result:', result);
      
      if (result.success) {
        // For real-time chat, the message will be added via the listener
        // For demo mode, it might be added immediately in the API
        setInput('');
      } else {
        Alert.alert('Error', 'Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('OneToOneChat: Send message error:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  if (loading) {
    return (
      <Container style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.textPrimary, fontSize: 16 }}>Loading chat...</Text>
      </Container>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
      <Container style={{flex: 1}}>
        {messages.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: colors.textSecondary, fontSize: 16 }}>
              Start a conversation with {userName}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={[styles.messageBox, item.sender === 'me' ? styles.myMessage : styles.theirMessage]}>
                <Text style={styles.messageText}>{item.text}</Text>
              </View>
            )}
            contentContainerStyle={{ padding: 10 }}
          />
        )}
        <View style={styles.inputContainer}>
          <TextInput
            placeholder={`Message ${userName || 'User'}`}
            style={styles.input}
            value={input}
            onChangeText={setInput}
            multiline
          />
          <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
            <Text style={{ color: colors.white, fontWeight: 'bold' }}>Send</Text>
          </TouchableOpacity>
        </View>
      </Container>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  messageBox: {
    padding: 12,
    borderRadius: 20,
    marginVertical: 6,
    maxWidth: '70%',
  },
  myMessage: {
    backgroundColor: colors.accent,
    alignSelf: 'flex-end',
  },
  theirMessage: {
    backgroundColor: colors.secondary,
    alignSelf: 'flex-start',
  },
  messageText: {
    color: colors.white,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderColor: colors.textSecondary,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
    color: colors.textPrimary,
  },
  sendButton: {
    backgroundColor: colors.accent,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
});

export default OneToOneChatScreen;
