import React from "react";
import { Image, Pressable, View, Text, StyleSheet } from "react-native";
import Card from "./Card";
import colors from "../config/colors";

const DEFAULT_EVENT_BANNER_URL = require("../assets/splash-icon.png");

const getDisplayPrice = (event) => {
  if (event.cheapest_ticket_price === 0) return "Free";
  if (event.cheapest_ticket_price) return `₹ ${event.cheapest_ticket_price}`;
  return "";
};

const getDisplayDate = (event) => {
  // Example: 15 Aug 2024, 10:00 AM
  if (!event.start_time) return "";
  const date = new Date(event.start_time);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const EventCard = ({ event, onPress }) => {
  const handlePress = () => {
    onPress?.(event);
  };

  const shouldShowPromotionChip = event.event_category === "PROMOTION_ONLY";
  const shouldShowExternalChip = event.event_category === "EXTERNAL";

  return (
    <Pressable onPress={handlePress} style={{ width: "100%" }}>
      <Card style={styles.card}>
        {/* Image Container */}
        <View style={styles.imageContainer}>
          <Image
            source={event.banner_url ? { uri: event.banner_url } : DEFAULT_EVENT_BANNER_URL}
            style={styles.image}
            resizeMode="cover"
          />
          {/* Promotion Chip - Top Right */}
          {shouldShowPromotionChip && (
            <View style={[styles.chip, { top: 8, right: 8 }]}> 
              <Text style={styles.chipText}>Promoted</Text>
            </View>
          )}
          {/* External Chip - Top Right (or below promotion if both exist) */}
          {shouldShowExternalChip && (
            <View style={[styles.chip, { top: shouldShowPromotionChip ? 32 : 8, right: 8 }]}> 
              <Text style={styles.chipText}>External</Text>
            </View>
          )}
        </View>
        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.date}>{getDisplayDate(event)}</Text>
          <Text style={styles.title} numberOfLines={2}>{event.title}</Text>
          {event.location && (
            <Text style={styles.location} numberOfLines={1}>{event.location}</Text>
          )}
          <Text style={styles.price}>{getDisplayPrice(event)}</Text>
        </View>
      </Card>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#081319",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FFFFFF30",
    marginHorizontal: 16,
    marginVertical: 16,
    padding: 0,
    overflow: "hidden",
  },
  imageContainer: {
    width: "100%",
    aspectRatio: 3 / 2,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  chip: {
    position: "absolute",
    backgroundColor: "#00000050",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 2,
  },
  chipText: {
    color: "#DDD",
    fontSize: 10,
    fontWeight: "500",
  },
  content: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  date: {
    fontSize: 12,
    lineHeight: 16,
    color: "#9CA6AB",
    fontWeight: "500",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.white,
    marginVertical: 4,
    lineHeight: 20,
  },
  location: {
    fontSize: 12,
    lineHeight: 16,
    color: "#9CA6AB",
    fontWeight: "500",
  },
  price: {
    fontSize: 12,
    lineHeight: 16,
    color: "#9CA6AB",
    fontWeight: "500",
  },
});

export default EventCard;
