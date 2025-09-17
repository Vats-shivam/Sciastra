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
import * as ImagePicker from 'expo-image-picker';
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
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
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
        console.log('🧹 Cleaning up all listeners for room:', chatRoom.id);
        chatApi.clearRoomListeners(chatRoom.id);
        chatApi.leaveRoom(chatRoom.id);
      }
    };
  }, [chatRoom?.id]);

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
              sender: msg.sender?.id === currentUserId ? 'me' : 'other',
              createdAt: msg.createdAt,
              read: msg.read || false,
              media: msg.media ? {
                type: msg.media.type,
                uri: msg.media.key ? chatApi.getMediaDisplayUrl(msg.media.key) : null,
                key: msg.media.key,
                mimeType: msg.media.mimeType,
                fileName: msg.media.fileName
              } : null,
              originalMessage: msg
            }));
            console.log('OneToOneChat: Formatted messages:', formattedMessages);
            setMessages(formattedMessages);
          }

          // Clean up any existing listeners first to prevent duplicates
          console.log('🧹 Clearing existing listeners before adding new ones');
          chatApi.clearRoomListeners(room.id);

          // Join room for real-time updates
          chatApi.joinRoom(room.id);

          // Add message listener
          console.log('🔧 Adding message listener for room:', room.id);
          chatApi.addMessageListener(room.id, handleNewMessage);

          // Add typing listener
          console.log('🔧 Adding typing listener for room:', room.id);
          chatApi.addTypingListener(room.id, handleTypingEvent);

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
    console.log('🎯 OneToOneChat: New message received:', messageData);
    console.log('🎯 Current room ID:', chatRoom?.id);
    console.log('🎯 Message room ID:', messageData.chatRoomId || messageData.roomId);

    if (messageData.type === 'message_read') {
      // Handle read receipts - update message read status
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === messageData.messageId ? { ...msg, read: true } : msg
        )
      );
      return;
    }

    // Handle new message from 'new:message' event
    const newMessage = {
      id: messageData.id,
      text: messageData.content,
      sender: messageData.sender?.id === currentUserId ? 'me' : 'other',
      createdAt: messageData.createdAt,
      read: false,
      media: messageData.media ? {
        type: messageData.media.type,
        uri: messageData.media.key ? chatApi.getMediaDisplayUrl(messageData.media.key) : null,
        key: messageData.media.key,
        mimeType: messageData.media.mimeType,
        fileName: messageData.media.fileName
      } : null,
      originalMessage: messageData
    };

    console.log('🎯 Formatted new message:', newMessage);

    setMessages(prevMessages => {
      // Avoid duplicates by checking both real ID and temporary ID
      const existsById = prevMessages.find(msg => msg.id === newMessage.id);
      const existsByContent = prevMessages.find(msg =>
        msg.text === newMessage.text &&
        msg.sender === newMessage.sender &&
        Math.abs(new Date(msg.createdAt).getTime() - new Date(newMessage.createdAt).getTime()) < 10000 // Within 10 seconds
      );

      if (existsById || existsByContent) {
        console.log('🎯 Message already exists (by ID or content), skipping');
        return prevMessages;
      }

      // If this is our own message, replace the temporary message
      if (newMessage.sender === 'me') {
        console.log('🎯 Replacing temporary message with real message');
        return prevMessages.map(msg => {
          // Replace temporary message with real message
          if (msg.id.startsWith('temp_') &&
              msg.text === newMessage.text &&
              msg.sender === 'me') {
            return { ...newMessage };
          }
          return msg;
        });
      }

      console.log('🎯 Adding new message to state');
      return [...prevMessages, newMessage];
    });
  };

  const handleTypingEvent = (typingData) => {
    console.log('OneToOneChat: Typing event received:', typingData);

    if (typingData.userId === currentUserId) {
      return; // Ignore our own typing events
    }

    if (typingData.isTyping) {
      setTypingUsers(prev => {
        if (!prev.includes(typingData.userId)) {
          return [...prev, typingData.userId];
        }
        return prev;
      });
    } else {
      setTypingUsers(prev => prev.filter(id => id !== typingData.userId));
    }
  };

  const handleInputChange = (text) => {
    setInput(text);

    if (!isMock && chatRoom) {
      // Send typing start indicator
      if (!isTyping && text.length > 0) {
        setIsTyping(true);
        chatApi.sendTypingIndicator(chatRoom.id, true);
      }

      // Reset typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        if (isTyping) {
          setIsTyping(false);
          chatApi.sendTypingIndicator(chatRoom.id, false);
        }
      }, 2000);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const messageText = input.trim();
    setInput('');

    // Create new message with temporary ID
    const newMessage = {
      id: 'temp_' + Date.now(),
      text: messageText,
      sender: 'me',
      createdAt: new Date().toISOString(),
      read: false,
      status: 'sending' // Mark as sending
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
          // Update the temporary message with server data
          setMessages(prev =>
            prev.map(msg =>
              msg.id === newMessage.id
                ? {
                    ...msg,
                    id: result.data.id,
                    createdAt: result.data.createdAt,
                    status: 'sent' // Mark as successfully sent
                  }
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

  // Image picker functions
  const selectAndSendImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant access to your photo library to send images.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'Images',
        allowsEditing: true,
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        await sendImageMessage(asset.uri, '');
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const takeAndSendPhoto = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera access to take photos.');
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        await sendImageMessage(asset.uri, '');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const sendImageMessage = async (imageUri, caption = '') => {
    if (!chatRoom && !isMock) {
      Alert.alert('Error', 'Chat room not found. Please try again.');
      return;
    }

    // Create temporary message for immediate UI feedback
    const tempMessage = {
      id: 'temp_' + Date.now(),
      text: caption || 'Image',
      sender: 'me',
      createdAt: new Date().toISOString(),
      read: false,
      status: 'sending',
      media: {
        type: 'image',
        uri: imageUri,
        isUploading: true
      }
    };

    setMessages(prev => [...prev, tempMessage]);

    if (isMock) {
      // Mock image sending
      setTimeout(() => {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === tempMessage.id
              ? { ...msg, status: 'sent', media: { ...msg.media, isUploading: false } }
              : msg
          )
        );
      }, 2000);
    } else {
      try {
        showLoader('Sending image...');
        const result = await chatApi.sendImageMessage(chatRoom.id, imageUri, caption);

        if (result.success) {
          // Update the temporary message with server data
          setMessages(prev =>
            prev.map(msg =>
              msg.id === tempMessage.id
                ? {
                    ...msg,
                    id: result.data.id,
                    createdAt: result.data.createdAt,
                    status: 'sent',
                    media: {
                      ...msg.media,
                      isUploading: false,
                      key: result.data.media?.key,
                      displayUrl: result.data.media?.key ? chatApi.getMediaDisplayUrl(result.data.media.key) : imageUri
                    }
                  }
                : msg
            )
          );
        } else {
          throw new Error(result.message);
        }
      } catch (error) {
        console.error('Error sending image:', error);
        Alert.alert('Error', 'Failed to send image. Please try again.');

        // Remove the failed message
        setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      } finally {
        hideLoader();
      }
    }
  };

  const showMediaOptions = () => {
    Alert.alert(
      'Send Media',
      'Choose an option',
      [
        { text: 'Camera', onPress: takeAndSendPhoto },
        { text: 'Photo Library', onPress: selectAndSendImage },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
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
        item.sender === 'me' ? styles.sentBubble : styles.receivedBubble,
        item.media && styles.mediaBubble
      ]}>
        {/* Media content */}
        {item.media && (
          <View style={styles.mediaContainer}>
            {item.media.type === 'image' && (
              <TouchableOpacity
                onPress={() => {
                  // Could implement full-screen image viewer here
                  console.log('View image:', item.media.uri || item.media.displayUrl);
                }}
              >
                <Image
                  source={{ uri: item.media.uri || item.media.displayUrl }}
                  style={styles.messageImage}
                  resizeMode="cover"
                />
                {item.media.isUploading && (
                  <View style={styles.uploadingOverlay}>
                    <Icon name="loading" size={24} color="white" />
                    <Text style={styles.uploadingText}>Uploading...</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            {item.media.type === 'video' && (
              <TouchableOpacity
                style={styles.videoContainer}
                onPress={() => {
                  // Could implement video player here
                  console.log('Play video:', item.media.uri || item.media.displayUrl);
                }}
              >
                <Image
                  source={{ uri: item.media.uri || item.media.displayUrl }}
                  style={styles.messageImage}
                  resizeMode="cover"
                />
                <View style={styles.videoPlayButton}>
                  <Icon name="play" size={32} color="white" />
                </View>
                {item.media.isUploading && (
                  <View style={styles.uploadingOverlay}>
                    <Icon name="loading" size={24} color="white" />
                    <Text style={styles.uploadingText}>Uploading...</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Text content */}
        {item.text && item.text.trim() && (
          <Text style={[
            styles.messageText,
            item.sender === 'me' ? styles.sentText : styles.receivedText,
            item.media && styles.mediaMessageText
          ]}>
            {item.text}
          </Text>
        )}

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

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <View style={styles.typingContainer}>
          <Text style={styles.typingText}>
            {userName} is typing...
          </Text>
        </View>
      )}

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={handleInputChange}
            placeholder="Type a message..."
            placeholderTextColor={colors.textMuted}
            multiline
          />
          <TouchableOpacity style={styles.attachmentButton} onPress={selectAndSendImage}>
            <Icon name="paperclip" size={24} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.cameraButton} onPress={takeAndSendPhoto}>
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
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 12,
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
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.background,
  },
  typingText: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  // Media message styles
  mediaBubble: {
    padding: 4,
    minWidth: 200,
  },
  mediaContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 4,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  videoContainer: {
    position: 'relative',
  },
  videoPlayButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -16 }, { translateY: -16 }],
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  uploadingText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
  },
  mediaMessageText: {
    marginTop: 4,
  },
});

export default OneToOneChatScreen;
