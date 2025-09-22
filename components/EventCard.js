import React from "react";
import { Image, Pressable, View, Text, StyleSheet } from "react-native";
import Card from "./Card";
import colors from "../config/colors";

const DEFAULT_EVENT_BANNER_URL = require("../assets/splash-icon.png");

const getDisplayPrice = (event) => {
  if (event.isFree) return "Free";
  if (event.price && event.price > 0) return `₹${event.price}`;
  return "Free";
};

const getDisplayDate = (event) => {
  try {
    // Use startDateTime from the API response
    const startDate = new Date(event.startDateTime);
    const endDate = event.endDateTime ? new Date(event.endDateTime) : null;
    
    // Format start date
    const formattedStartDate = startDate.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    
    // If end date is available and different from start date, include it
    if (endDate && startDate.toDateString() !== endDate.toDateString()) {
      const formattedEndDate = endDate.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      return `${formattedStartDate} - ${formattedEndDate}`;
    }
    
    return formattedStartDate;
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

const getEventCategory = (event) => {
  // Map API categories to display categories
  switch (event.category) {
    case 'FEATURED': return 'Featured';
    case 'SPOTLIGHT': return 'Spotlight';
    case 'TRENDING': return 'Trending';
    default: return event.category;
  }
};

const EventCard = ({ event, onPress }) => {
  const handlePress = () => {
    onPress?.(event);
  };

  const shouldShowCategoryChip = event.category && ['FEATURED', 'SPOTLIGHT', 'TRENDING'].includes(event.category);
  const shouldShowVenueChip = event.venue_type === 'VIRTUAL';

  // Format the event data to match what the component expects
  const formattedEvent = {
    ...event,
    // Map API fields to component's expected fields
    banner_url: event.featuredImage || null,
    start_time: event.startDateTime,
    end_time: event.endDateTime,
    cheapest_ticket_price: event.isFree ? 0 : event.price,
    location: event.venueAddress || event.location || 'Online Event'
  };

  return (
    <Pressable onPress={handlePress} style={{ width: "100%" }}>
      <Card style={styles.card}>
        {/* Image Container */}
        <View style={styles.imageContainer}>
          <Image
            source={formattedEvent.featuredImage ? { uri: formattedEvent.featuredImage } : DEFAULT_EVENT_BANNER_URL}
            style={styles.image}
            resizeMode="cover"
          />
          {/* Category Chip - Top Right */}
          {shouldShowCategoryChip && (
            <View style={[styles.chip, { top: 8, right: 8 }]}> 
              <Text style={styles.chipText}>{getEventCategory(formattedEvent)}</Text>
            </View>
          )}
          {/* Venue Type Chip - Top Right (or below category if both exist) */}
          {(shouldShowVenueChip || formattedEvent.venueType === 'ONLINE') && (
            <View style={[styles.chip, { top: shouldShowCategoryChip ? 32 : 8, right: 8 }]}> 
              <Text style={styles.chipText}>
                {formattedEvent.venueType === 'ONLINE' ? 'Online' : 'In-Person'}
              </Text>
            </View>
          )}
        </View>
        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.date}>{getDisplayDate(formattedEvent)}</Text>
          <Text style={styles.title} numberOfLines={2}>{formattedEvent.title}</Text>
          <Text style={styles.location} numberOfLines={1}>
            {formattedEvent.venueType === 'ONLINE' ? 'Online Event' : (formattedEvent.location || 'Location not specified')}
          </Text>
          <Text style={styles.price}>{getDisplayPrice(formattedEvent)}</Text>
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
