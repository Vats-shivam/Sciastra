import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, Button } from 'react-native';
import { api } from '../api/MockApi';

const SuggestedConnectionsScreen = ({ navigation }) => {
  const [connections, setConnections] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.fetchSuggestedConnections().then(users => {
      setConnections(users);
      setLoading(false);
    });
  }, []);

  const toggleSelect = (id) => {
    const newSelected = new Set(selectedIds);
    newSelected.has(id) ? newSelected.delete(id) : newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const sendRequests = () => {
    api.sendConnectRequest(Array.from(selectedIds)).then(() => {
      alert('Connection requests sent!');
      setSelectedIds(new Set());
      navigation.navigate('HomeFeed');
    });
  };

  if (loading) return <Text>Loading...</Text>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Suggested Connections</Text>
      <FlatList
        data={connections}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.card, selectedIds.has(item.id) && styles.selectedCard]} onPress={() => toggleSelect(item.id)}>
            <Image source={item.profilePic ? { uri: item.profilePic } : require('../assets/icon.png')} style={styles.avatar} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.bio}>{item.bio}</Text>
            </View>
            <Button title={selectedIds.has(item.id) ? 'Selected' : 'Connect'} onPress={() => toggleSelect(item.id)} />
          </TouchableOpacity>
        )}
      />
      <View style={styles.actions}>
        <Button title="Send Requests" disabled={selectedIds.size === 0} onPress={sendRequests} />
        <Button title="Skip for Now" onPress={() => navigation.navigate('HomeFeed')} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#eaeaea' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#0f3460' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, marginVertical: 6, borderRadius: 8 },
  selectedCard: { backgroundColor: '#ee6c4d22' },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12, backgroundColor: '#53354a' },
  name: { fontSize: 16, fontWeight: '600', color: '#0f3460' },
  bio: { fontSize: 14, color: '#53354a' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
});

export default SuggestedConnectionsScreen;
