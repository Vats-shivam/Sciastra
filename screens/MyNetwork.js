// screens/MyNetworkScreen.js
import React from 'react';
import { FlatList, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Container from '../components/Container';
import Card from '../components/Card';
import colors from '../config/colors';

const mockConnections = [
  { id: '1', name: 'Alice Johnson' },
  { id: '2', name: 'Bob Lee' },
];

const MyNetworkScreen = ({ navigation }) => (
  <Container>
    <FlatList
      data={mockConnections}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { userId: item.id, userName: item.name })}>
          <Card style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
          </Card>
        </TouchableOpacity>
      )}
    />
  </Container>
);

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  name: { fontSize: 18, fontWeight: '600', color: colors.primary },
});

export default MyNetworkScreen;
