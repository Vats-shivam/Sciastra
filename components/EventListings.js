import React, { useState } from "react";
import { FlatList, RefreshControl, View, Text, StyleSheet } from "react-native";
import EventCard from "./EventCard";
import colors from "../config/colors";
import { useNavigation } from "@react-navigation/native";

const mockEvents = [
  {
    id: "1",
    title: "Sciastra Tech Conference 2024",
    start_time: "2024-08-15T10:00:00Z",
    location: "IIT Delhi, New Delhi",
    banner_url: null,
    cheapest_ticket_price: 499,
    event_category: "PAID",
    status: "Upcoming",
    details: "Join us for a day of inspiring talks, networking, and hands-on workshops with top minds in tech!",
  },
  {
    id: "2",
    title: "Open Source Summit",
    start_time: "2024-09-10T09:00:00Z",
    location: "Bangalore International Center",
    banner_url: null,
    cheapest_ticket_price: 0,
    event_category: "FREE",
    status: "Upcoming",
    details: "A gathering of open source enthusiasts and contributors.",
  },
  {
    id: "3",
    title: "AI & ML Bootcamp",
    start_time: "2024-10-05T11:00:00Z",
    location: "Online",
    banner_url: null,
    cheapest_ticket_price: 299,
    event_category: "PROMOTION_ONLY",
    status: "Upcoming",
    details: "Hands-on bootcamp for AI and ML beginners.",
  },
];

const EventListings = ({ onEventPress }) => {
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
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

  return (
    <FlatList
      data={mockEvents}
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
