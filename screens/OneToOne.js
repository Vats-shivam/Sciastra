// screens/OneToOneChatScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, FlatList, Text, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import Container from '../components/Container';
import colors from '../config/colors';

const mockMessages = [
  { id: 'm1', text: 'Hello!', sender: 'other' },
  { id: 'm2', text: 'Hi! How are you?', sender: 'me' },
];

const OneToOneChatScreen = ({ route }) => {
  const { chatName } = route.params;
  const [messages, setMessages] = useState(mockMessages);
  const [input, setInput] = useState('');
  const flatListRef = useRef(null);

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages([...messages, { id: Date.now().toString(), text: input, sender: 'me' }]);
    setInput('');
  };

  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
      <Container style={{flex: 1}}>
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
        <View style={styles.inputContainer}>
          <TextInput
            placeholder={`Message ${chatName}`}
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
