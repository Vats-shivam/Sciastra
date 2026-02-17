import React, { useState, useEffect } from "react";
import { FlatList, View, Text, StyleSheet } from "react-native";
import EventCard from "./EventCard";
import colors from "../config/colors";
import { useNavigation } from "@react-navigation/native";
import eventsApi from "../api/EventsApi";
import CustomRefreshControl from "./CustomRefreshControl";
import { EventCardSkeleton } from "./skeletons";

const EventListings = ({ onEventPress, category = null, limit = 20 }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    loadEvents();
  }, [category]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      let result;
      
      if (category) {
        result = await eventsApi.getEventsByCategory(category, 1, limit);
      } else {
        result = await eventsApi.getAllEvents(1, limit);
      }
      
      if (result.success) {
        setEvents(result.data.events || []);
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
      let result;
      
      if (category) {
        result = await eventsApi.getEventsByCategory(category, 1, limit);
      } else {
        result = await eventsApi.getAllEvents(1, limit);
      }
      
      if (result.success) {
        setEvents(result.data.events || []);
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
      <View style={{ paddingVertical: 16 }}>
        {[1, 2, 3].map((i) => (
          <EventCardSkeleton key={i} />
        ))}
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
        <CustomRefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
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
