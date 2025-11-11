import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import colors from '../config/colors';
import authManager from '../services/AuthManager';
import ConnectionApi from '../api/ConnectionApi';
import useScreenApiLogger from '../hooks/useScreenApiLogger';

const SuggestedConnectionsScreen = ({ navigation }) => {
  const [connections, setConnections] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useScreenApiLogger('SuggestedConnection');

  useEffect(() => {
    const loadSuggestedConnections = async () => {
      try {
        setLoading(true);
        // TODO: Replace with dedicated suggestion endpoint when available
        setConnections([]);
      } catch (error) {
        console.error('SuggestedConnections: Failed to load suggestions', error);
        setConnections([]);
      } finally {
        setLoading(false);
      }
    };

    loadSuggestedConnections();
  }, []);

  const toggleSelect = (id) => {
    const newSelected = new Set(selectedIds);
    newSelected.has(id) ? newSelected.delete(id) : newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const sendRequests = async () => {
    if (selectedIds.size === 0) {
      return;
    }

    try {
      setLoading(true);
      const ids = Array.from(selectedIds);

      for (const id of ids) {
        try {
          const result = await ConnectionApi.sendConnectionRequest(id);
          if (!result.success) {
            console.warn('SuggestedConnections: Failed to send request for user', id, result.error);
          }
        } catch (requestError) {
          console.error('SuggestedConnections: Error sending request for user', id, requestError);
        }
      }

      alert('Connection requests sent!');
      setSelectedIds(new Set());

      // Complete onboarding
      await authManager.completeOnboarding();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      alert('Failed to send some connection requests. You can try again later.');

      // Complete onboarding even if connection requests fail
      await authManager.completeOnboarding();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <LinearGradient
        colors={[colors.background, colors.backgroundSecondary, colors.background]}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color="#8a2be2" />
        <Text style={styles.loadingText}>Finding your community...</Text>
      </LinearGradient>
    );
  }

  const renderConnectionItem = ({ item }) => {
    const isSelected = selectedIds.has(item.id);
    
    return (
      <TouchableOpacity
        style={[styles.connectionCard, isSelected && styles.selectedCard]}
        onPress={() => toggleSelect(item.id)}
      >
        <View style={styles.cardContent}>
          <Image
            source={item.profilePic ? { uri: item.profilePic } : require('../assets/icon.png')}
            style={styles.avatar}
          />
          <View style={styles.userInfo}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.bio}>{item.bio}</Text>
          </View>
          <TouchableOpacity
            style={[styles.connectButton, isSelected && styles.connectedButton]}
            onPress={() => toggleSelect(item.id)}
          >
            <Icon
              name={isSelected ? 'check' : 'plus'}
              size={16}
              color={isSelected ? '#8a2be2' : 'white'}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient
      colors={[colors.background, colors.backgroundSecondary, colors.background]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logoText}>SciAstra</Text>
          <Text style={styles.title}>Connect with People</Text>
          <Text style={styles.subtitle}>
            Discover and connect with like-minded{'\n'}
            individuals in your community
          </Text>
        </View>

        {/* Connections List */}
        <FlatList
          data={connections}
          keyExtractor={(item) => item.id}
          renderItem={renderConnectionItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No suggestions available right now.</Text>
            </View>
          }
        />

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <Text style={styles.selectedText}>
            {selectedIds.size} {selectedIds.size === 1 ? 'person' : 'people'} selected
          </Text>
          
          <TouchableOpacity
            style={[
              styles.sendRequestsButton,
              selectedIds.size === 0 && styles.disabledButton,
            ]}
            onPress={sendRequests}
            disabled={selectedIds.size === 0}
          >
            <LinearGradient
              colors={selectedIds.size > 0 ? ['#8a2be2', '#9932cc'] : ['rgba(138, 43, 226, 0.3)', 'rgba(153, 50, 204, 0.3)']}
              style={styles.gradientButton}
            >
              <Text style={styles.sendButtonText}>
                Send {selectedIds.size > 0 ? `${selectedIds.size} ` : ''}Request{selectedIds.size !== 1 ? 's' : ''}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={async () => {
              // Complete onboarding
              await authManager.completeOnboarding();
              
              // AuthManager will automatically handle navigation through AuthNavigator
              // to the main app
            }}
          >
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 30,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 22,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    textAlign: 'center',
  },
  connectionCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  selectedCard: {
    backgroundColor: 'rgba(138, 43, 226, 0.1)',
    borderColor: '#8a2be2',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    backgroundColor: colors.backgroundElevated,
  },
  userInfo: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  bio: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
  },
  connectButton: {
    backgroundColor: '#8a2be2',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectedButton: {
    backgroundColor: 'rgba(138, 43, 226, 0.2)',
    borderWidth: 1,
    borderColor: '#8a2be2',
  },
  actionSection: {
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  selectedText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: 20,
  },
  sendRequestsButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
  gradientButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
  },
  sendButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  skipText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});

export default SuggestedConnectionsScreen;
