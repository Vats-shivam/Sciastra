import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  SafeAreaView,
  StatusBar,
  Image,
  Keyboard
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Container from '../components/Container';
import colors from '../config/colors';
import chatApi from '../api/ChatApi';
import authApi from '../api/AuthApi';
import { useLoader } from '../context/LoaderContext';

const OneToOneChatScreen = ({ route, navigation }) => {
  const { userId, userName, avatar, isOnline = true, isMock = false } = route.params;
  const { showLoader, hideLoader } = useLoader();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [chatRoom, setChatRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef(null);
  const currentUserId = isMock ? 'currentUser123' : authApi.getCurrentUserId();
  
  // Mock messages for Alice Johnson
  const mockMessages = [
    {
      id: '1',
      text: 'Hey there! How are you doing?',
      sender: 'other',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      read: true
    },
    {
      id: '2',
      text: "I'm doing great! Just finished my morning coffee.",
      sender: 'me',
      createdAt: new Date(Date.now() - 3500000).toISOString(),
      read: true
    },
    {
      id: '3',
      text: 'That sounds nice! What are your plans for today?',
      sender: 'other',
      createdAt: new Date(Date.now() - 3400000).toISOString(),
      read: true
    },
    {
      id: '4',
      text: 'I was thinking of going for a hike. The weather is perfect!',
      sender: 'me',
      createdAt: new Date(Date.now() - 3300000).toISOString(),
      read: true
    },
    {
      id: '5',
      text: 'That sounds amazing! Which trail are you thinking of?',
      sender: 'other',
      createdAt: new Date(Date.now() - 3200000).toISOString(),
      read: true
    },
    {
      id: '6',
      text: 'I was thinking of the Pine Ridge Trail. Have you been there before?',
      sender: 'me',
      createdAt: new Date(Date.now() - 3100000).toISOString(),
      read: false
    }
  ];

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
      
      if (isMock) {
        // Use mock data for Alice Johnson
        setMessages(mockMessages);
        setChatRoom({ id: 'mockRoom123' });
        navigation.setOptions({
          title: userName || 'Chat'
        });
      } else {
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

  const handleSend = async () => {
    if (!input.trim()) return;

    const messageText = input.trim();
    setInput('');
    
    // Create new message
    const newMessage = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'me',
      createdAt: new Date().toISOString(),
      read: false
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    if (isMock) {
      // Simulate reply after 1 second
      setTimeout(() => {
        const reply = {
          id: (Date.now() + 1).toString(),
          text: 'Thanks for your message! I\'ll get back to you soon.',
          sender: 'other',
          createdAt: new Date().toISOString(),
          read: false
        };
        setMessages(prev => [...prev, reply]);
      }, 1000);
    } else if (chatRoom) {
      try {
        // Send the message to the server
        const result = await chatApi.sendMessage(chatRoom.id, messageText);
        
        if (!result.success) {
          // Handle error - maybe show an alert and keep the message in input
          Alert.alert('Error', 'Failed to send message. Please try again.');
          setInput(messageText);
          // Remove the optimistic message
          setMessages(prev => prev.filter(msg => msg.id !== newMessage.id));
        } else {
          // Update the message with the server's ID and timestamp if needed
          setMessages(prev => 
            prev.map(msg => 
              msg.id === newMessage.id 
                ? { ...msg, id: result.data.id, createdAt: result.data.createdAt } 
                : msg
            )
          );
        }
      } catch (error) {
        console.error('Error sending message:', error);
        Alert.alert('Error', 'An error occurred while sending the message.');
      }
    }
  };

  // Cleaned up duplicate code block

  if (loading) {
    return (
      <Container style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.textPrimary, fontSize: 16 }}>Loading chat...</Text>
      </Container>
    );
  }

  const renderMessage = ({ item }) => (
    <View style={[
      styles.messageContainer,
      item.sender === 'me' ? styles.sentMessage : styles.receivedMessage
    ]}>
      {item.sender !== 'me' && (
        <Image 
          source={{ uri: avatar || 'https://randomuser.me/api/portraits/women/44.jpg' }} 
          style={styles.avatar} 
        />
      )}
      <View style={[
        styles.messageBubble,
        item.sender === 'me' ? styles.sentBubble : styles.receivedBubble
      ]}>
        <Text style={[
          styles.messageText,
          item.sender === 'me' ? styles.sentText : styles.receivedText
        ]}>
          {item.text}
        </Text>
        <View style={styles.messageTimeContainer}>
          <Text style={styles.messageTime}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {item.sender === 'me' && (
            <Icon 
              name="check-all" 
              size={16} 
              color={item.read ? colors.primary : colors.textMuted} 
              style={styles.readIcon} 
            />
          )}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.backgroundSecondary} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{userName}</Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? '#4CAF50' : '#9E9E9E' }]} />
            <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
          </View>
        </View>
        
        <TouchableOpacity style={styles.headerButton}>
          <Icon name="dots-vertical" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Messages List */}
      <KeyboardAvoidingView 
        style={styles.messagesContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : null}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        />
      </KeyboardAvoidingView>

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Type a message..."
            placeholderTextColor={colors.textMuted}
            multiline
          />
          <TouchableOpacity style={styles.attachmentButton}>
            <Icon name="paperclip" size={24} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.cameraButton}>
            <Icon name="camera" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity 
          style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!input.trim()}
        >
          <Icon name="send" size={24} color={colors.textInverse} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
    padding: 12,
    backgroundColor: colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  headerButton: {
    padding: 8,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  sentMessage: {
    justifyContent: 'flex-end',
  },
  receivedMessage: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: colors.backgroundElevated,
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
    position: 'relative',
  },
  sentBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  receivedBubble: {
    backgroundColor: colors.button, // Using the app's primary purple
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  sentText: {
    color: colors.textInverse,
  },
  receivedText: {
    color: colors.textPrimary,
  },
  messageTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    justifyContent: 'flex-end',
  },
  messageTime: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  readIcon: {
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: colors.backgroundSecondary,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 24,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    maxHeight: 120,
    paddingVertical: 8,
  },
  attachmentButton: {
    marginLeft: 8,
    padding: 6,
  },
  cameraButton: {
    marginLeft: 4,
    padding: 6,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

export default OneToOneChatScreen;
