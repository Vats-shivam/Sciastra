// screens/MyNetworkScreen.js
import React from 'react';
import { FlatList, Text, TouchableOpacity, StyleSheet, View, Alert } from 'react-native';
import Container from '../components/Container';
import Card from '../components/Card';
import colors from '../config/colors';
import chatApi from '../api/ChatApi';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const mockConnections = [
  { id: '1', name: 'Alice Johnson' },
  { id: '2', name: 'Bob Lee' },
];

const MyNetworkScreen = ({ navigation }) => {
  const handleMessagePress = async (connection) => {
    try {
      console.log('Starting chat with connection:', connection);

      // Create or get direct chat room with this user
      const chatResult = await chatApi.createOrGetDirectChat(connection.user.id);

      if (chatResult.success) {
        console.log('Chat room created/found:', chatResult.data);

        // Navigate to OneToOneChat screen with user details
        navigation.navigate('OneToOneChat', {
          userId: connection.user.id,
          userName: connection.user.name,
          avatar: null, // Mock connections don't have avatars
          isOnline: true,
          roomId: chatResult.data.id,
        });
      } else {
        console.error('Failed to create/get chat room:', chatResult.message);
        Alert.alert('Error', 'Failed to start chat. Please try again.');
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      Alert.alert('Error', 'Failed to start chat. Please try again.');
    }
  };

  return (
    <Container>
      <FlatList
        data={mockConnections}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.cardContent}>
              <TouchableOpacity
                style={styles.nameContainer}
                onPress={() => navigation.navigate('UserProfile', { userId: item.id, userName: item.name })}
              >
                <Text style={styles.name}>{item.name}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.messageBtn}
                onPress={() => handleMessagePress(item)}
              >
                <Icon name="message" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </Card>
        )}
      />
    </Container>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    padding: 16,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
  },
  messageBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
});

export default MyNetworkScreen;
