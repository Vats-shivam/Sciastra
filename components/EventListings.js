import React, { useState, useEffect } from "react";
import { FlatList, RefreshControl, View, Text, StyleSheet, ActivityIndicator } from "react-native";
import EventCard from "./EventCard";
import colors from "../config/colors";
import { useNavigation } from "@react-navigation/native";
import eventsApi from "../api/EventsApi";

const EventListings = ({ onEventPress }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const result = await eventsApi.getAllEvents();
      if (result.success) {
        setEvents(result.data || []);
      }
    } catch (error) {
      // Handle error silently or show notification
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const result = await eventsApi.getAllEvents();
      if (result.success) {
        setEvents(result.data || []);
      }
    } catch (error) {
      // Handle error silently
    } finally {
      setRefreshing(false);
    }
  };

  const handleEventPress = (event) => {
    if (onEventPress) {
      onEventPress(event);
    } else {
      navigation.navigate("EventTab", { event });
    }
  };

  const renderEventCard = ({ item }) => (
    <EventCard event={item} onPress={() => handleEventPress(item)} />
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading events...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={events}
      renderItem={renderEventCard}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingVertical: 8 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No events found</Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: colors.textMuted,
    textAlign: "center",
  },
});

export default EventListings;
