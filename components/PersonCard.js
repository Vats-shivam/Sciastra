// components/PersonCard.js
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../config/colors';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

const PersonCard = ({ person, onChatPress, onMorePress, showActions = true }) => {
  return (
    <View style={styles.card}>
      <Image source={person.profilePic ? { uri: person.profilePic } : require('../assets/scix.png')} style={styles.avatar} />
      <View style={styles.infoContainer}>
        <Text style={styles.name}>{person.name}</Text>
        <Text style={styles.designation}>{person.designation}</Text>
      </View>
      {showActions && (
        <View style={styles.actions}>
          <TouchableOpacity onPress={onChatPress}>
            <Icon name="chat" size={24} color={colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onMorePress} style={{ marginLeft: 12 }}>
            <Icon name="dots-vertical" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  infoContainer: { flex: 1, marginLeft: 12 },
  name: { fontFamily: 'Gilroy-Bold', color: colors.primary, fontSize: 16 },
  designation: { fontFamily: 'Gilroy-Regular', color: colors.secondary, fontSize: 14 },
  actions: { flexDirection: 'row', alignItems: 'center' },
});

export default PersonCard;
