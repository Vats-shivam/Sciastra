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
  Keyboard,
  Modal,
  Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { PinchGestureHandler, PanGestureHandler, State } from 'react-native-gesture-handler';
import Container from '../components/Container';
import colors from '../config/colors';
import chatApi from '../api/ChatApi';
import authApi from '../api/AuthApi';
import { useLoader } from '../context/LoaderContext';
import { useNotification } from '../contexts/NotificationContext';
import useScreenApiLogger from '../hooks/useScreenApiLogger';

const OneToOneChatScreen = ({ route, navigation }) => {
  const { userId, userName, avatar, isOnline: initialIsOnline = true } = route.params;
  const { showLoader, hideLoader } = useLoader();
  const { showError, showWarning } = useNotification();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [chatRoom, setChatRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [fullScreenImage, setFullScreenImage] = useState(null);
  const [isOnline, setIsOnline] = useState(initialIsOnline); // Track online status
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const currentUserId = authApi.getCurrentUserId();

  useScreenApiLogger('OneToOne');

  // Zoom and pan animation values
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const baseScale = useSharedValue(1);
  const baseTranslateX = useSharedValue(0);
  const baseTranslateY = useSharedValue(0);
  
  

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

  // Listen for user online/offline status changes
  useEffect(() => {
    const handleStatusChange = (statusData) => {
      console.log('📡 User status changed:', statusData);
      if (statusData.userId === userId) {
        const newStatus = statusData.status === 'online';
        setIsOnline(newStatus);
        console.log(`👤 ${userName} is now ${statusData.status}`);
      }
    };

    // Add status listener for this user
    chatApi.addStatusListener(userId, handleStatusChange);

    return () => {
      // Cleanup listener when component unmounts
      chatApi.removeStatusListener(userId, handleStatusChange);
    };
  }, [userId, userName]);

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
          const formattedMessages = apiMessages.map(msg => {
            const formattedMsg = {
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
            };

            if (msg.media) {
              console.log('📜 Historical message with media:', {
                messageId: msg.id,
                mediaKey: msg.media?.key,
                constructedUri: msg.media?.key ? chatApi.getMediaDisplayUrl(msg.media.key) : null,
                formattedMedia: formattedMsg.media
              });
            }

            return formattedMsg;
          });
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
        showError('Failed to load chat. Please try again.');
      }
    } catch (error) {
      console.error('OneToOneChat: Initialize chat error:', error);
      showError('Failed to initialize chat. Please try again.');
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

    console.log('🎯 Processing message with media:', {
      hasMedia: !!messageData.media,
      mediaKey: messageData.media?.key,
      constructedUri: messageData.media?.key ? chatApi.getMediaDisplayUrl(messageData.media.key) : null,
      formattedMedia: newMessage.media
    });

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

    if (chatRoom) {
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

    if (!chatRoom) {
      showError('Chat room not found. Please try again.');
      setMessages(prev => prev.filter(msg => msg.id !== newMessage.id));
      setInput(messageText);
      return;
    }

    try {
      // Send the message to the server
      const result = await chatApi.sendMessage(chatRoom.id, messageText);

      if (!result.success) {
        // Handle error - maybe show an alert and keep the message in input
        showError('Failed to send message. Please try again.');
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
      showError('An error occurred while sending the message.');
    }
  };

  // Image picker functions
  const selectAndSendImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showWarning('Please grant access to your photo library to send images.');
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
      showError('Failed to select image. Please try again.');
    }
  };

  const takeAndSendPhoto = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showWarning('Please grant camera access to take photos.');
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
      showError('Failed to take photo. Please try again.');
    }
  };

  const sendImageMessage = async (imageUri, caption = '') => {
    if (!chatRoom) {
      showError('Chat room not found. Please try again.');
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
      showError('Failed to send image. Please try again.');

      // Remove the failed message
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
    } finally {
      hideLoader();
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

  // Full screen image viewer functions
  const openFullScreenImage = (mediaItem) => {
    const userToken = authApi.getAccessToken();
    const imageSource = mediaItem.key && userToken
      ? chatApi.getImageSource(mediaItem.key, userToken)
      : { uri: mediaItem.uri || mediaItem.displayUrl };

    setFullScreenImage({
      ...mediaItem,
      source: imageSource
    });
  };

  const closeFullScreenImage = () => {
    // Reset zoom and pan values
    scale.value = withSpring(1);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    baseScale.value = 1;
    baseTranslateX.value = 0;
    baseTranslateY.value = 0;

    setFullScreenImage(null);
  };

  // Gesture handlers for zoom and pan
  const pinchHandler = useAnimatedGestureHandler({
    onStart: () => {
      baseScale.value = scale.value;
    },
    onActive: (event) => {
      scale.value = Math.max(0.5, Math.min(baseScale.value * event.scale, 5));
    },
    onEnd: () => {
      if (scale.value < 1) {
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    },
  });

  const panHandler = useAnimatedGestureHandler({
    onStart: () => {
      baseTranslateX.value = translateX.value;
      baseTranslateY.value = translateY.value;
    },
    onActive: (event) => {
      translateX.value = baseTranslateX.value + event.translationX;
      translateY.value = baseTranslateY.value + event.translationY;
    },
    onEnd: () => {
      // Add boundary constraints if needed
      if (scale.value <= 1) {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
    };
  });

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
                onPress={() => openFullScreenImage(item.media)}
              >
                {(() => {
                  const userToken = authApi.getAccessToken();
                  const imageSource = item.media.key && userToken
                    ? chatApi.getImageSource(item.media.key, userToken)
                    : { uri: item.media.uri || item.media.displayUrl };

                  console.log('🖼️ Rendering image:', {
                    messageId: item.id,
                    mediaKey: item.media.key,
                    userToken: userToken ? 'present' : 'missing',
                    imageSource: imageSource,
                    mediaType: item.media.type
                  });

                  return (
                    <Image
                      source={imageSource}
                      style={styles.messageImage}
                      resizeMode="cover"
                      onError={(error) => {
                        console.log('🚨 Image load error:', error.nativeEvent.error);
                        console.log('🚨 Failed image source:', imageSource);
                      }}
                      onLoad={() => {
                        console.log('✅ Image loaded successfully:', imageSource.uri);
                      }}
                    />
                  );
                })()}
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
                onPress={() => openFullScreenImage(item.media)}
              >
                {(() => {
                  const userToken = authApi.getAccessToken();
                  const videoSource = item.media.key && userToken
                    ? chatApi.getImageSource(item.media.key, userToken)
                    : { uri: item.media.uri || item.media.displayUrl };

                  return (
                    <Image
                      source={videoSource}
                      style={styles.messageImage}
                      resizeMode="cover"
                    />
                  );
                })()}
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
        {!item.media && item.text && item.text.trim() && (
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
              color={item.read ? colors.success : 'rgba(255, 255, 255, 0.5)'}
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
          <Icon name="arrow-left" size={24} color={colors.white} />
        </TouchableOpacity>
        
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{userName}</Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? '#4CAF50' : '#9E9E9E' }]} />
            <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
          </View>
        </View>
        
        <TouchableOpacity style={styles.headerButton}>
          <Icon name="dots-vertical" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Messages and Input Container */}
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          style={styles.messagesContainer}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <View style={styles.typingContainer}>
            <Text style={styles.typingText}>
              {userName} is typing...
            </Text>
          </View>
        )}

        {/* Message Input */}
        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={handleInputChange}
              placeholder="Type a message..."
              placeholderTextColor={colors.textMuted}
              multiline
              returnKeyType="send"
              blurOnSubmit={false}
            />
            <TouchableOpacity style={styles.attachmentButton} onPress={selectAndSendImage}>
              <Icon name="paperclip" size={22} color={colors.button} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.cameraButton} onPress={takeAndSendPhoto}>
              <Icon name="camera" size={22} color={colors.button} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
            style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!input.trim()}
          >
            <Icon name="send" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Full Screen Image Modal */}
      <Modal
        visible={!!fullScreenImage}
        transparent={true}
        animationType="fade"
        onRequestClose={closeFullScreenImage}
      >
        <View style={styles.fullScreenModalContainer}>
          <TouchableOpacity
            style={styles.fullScreenBackdrop}
            activeOpacity={1}
            onPress={closeFullScreenImage}
          >
            <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.9)" />

            {/* Close button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={closeFullScreenImage}
            >
              <Icon name="close" size={30} color="white" />
            </TouchableOpacity>

            {/* Full screen image */}
            {fullScreenImage && (
              <View style={styles.fullScreenImageContainer}>
                <PanGestureHandler onGestureEvent={panHandler}>
                  <Animated.View style={styles.gestureContainer}>
                    <PinchGestureHandler onGestureEvent={pinchHandler}>
                      <Animated.View style={[styles.imageWrapper, animatedStyle]}>
                        <Animated.Image
                          source={fullScreenImage.source}
                          style={styles.fullScreenImage}
                          resizeMode="contain"
                          onError={(error) => {
                            console.log('🚨 Full screen image load error:', error.nativeEvent.error);
                          }}
                          onLoad={() => {
                            console.log('✅ Full screen image loaded successfully');
                          }}
                        />
                      </Animated.View>
                    </PinchGestureHandler>
                  </Animated.View>
                </PanGestureHandler>

                {/* Image info */}
                
              </View>
            )}
          </TouchableOpacity>
        </View>
      </Modal>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 12,
    backgroundColor: colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 4,
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
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
    fontFamily: 'Gilroy-Medium',
    color: colors.textMuted,
  },
  headerButton: {
    padding: 8,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 20,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  sentMessage: {
    justifyContent: 'flex-end',
  },
  receivedMessage: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
    backgroundColor: colors.backgroundElevated,
    borderWidth: 2,
    borderColor: colors.border,
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 18,
    padding: 14,
    position: 'relative',
  },
  sentBubble: {
    backgroundColor: colors.button,
    borderBottomRightRadius: 4,
  },
  receivedBubble: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageText: {
    fontSize: 15,
    fontFamily: 'Gilroy-Medium',
    lineHeight: 22,
  },
  sentText: {
    color: colors.white,
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
    fontFamily: 'Gilroy-Medium',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  readIcon: {
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.backgroundSecondary,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 4,
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: 'Gilroy-Medium',
    fontSize: 15,
    maxHeight: 120,
    paddingVertical: 10,
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
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.button,
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
    fontFamily: 'Gilroy-Medium',
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  // Media message styles
  mediaBubble: {
    padding: 6,
    minWidth: 200,
  },
  mediaContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 4,
  },
  messageImage: {
    width: 220,
    height: 160,
    borderRadius: 12,
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
    fontFamily: 'Gilroy-Medium',
    marginTop: 4,
  },
  mediaMessageText: {
    marginTop: 4,
  },
  // Full screen modal styles
  fullScreenModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  fullScreenBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  gestureContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: Dimensions.get('window').width - 40,
    height: Dimensions.get('window').height - 200,
    maxWidth: '100%',
    maxHeight: '80%',
  },
  imageInfoContainer: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  imageInfoText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  imageInfoSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
});

export default OneToOneChatScreen;
