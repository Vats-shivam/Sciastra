// screens/ChatListScreen.js
import React, { useState } from 'react';
import { FlatList, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Container from '../components/Container';
import Card from '../components/Card';
import colors from '../config/colors';

const initialChats = [
  { id: '1', name: 'Alice Johnson', lastMessage: 'See you tomorrow!', unread: 2 },
  { id: '2', name: 'Bob Lee', lastMessage: 'Thanks for the help!', unread: 0 },
];

const ChatListScreen = ({ navigation }) => {
  const [chats] = useState(initialChats);

  return (
    <Container>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('OneToOneChat', { chatId: item.id, chatName: item.name })}>
            <Card style={styles.chatCard}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.lastMessage}>{item.lastMessage}</Text>
              {item.unread > 0 && <Text style={styles.unread}>{item.unread}</Text>}
            </Card>
          </TouchableOpacity>
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
});

export default ChatListScreen;
