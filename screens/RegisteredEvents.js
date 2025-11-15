import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Image, Pressable } from "react-native";
import Container from "../components/Container";
import colors from "../config/colors";
import Header from "../components/Header";
import eventsApi from "../api/EventsApi";
import { useNotification } from "../contexts/NotificationContext";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useFocusEffect } from "@react-navigation/native";
import useScreenApiLogger from "../hooks/useScreenApiLogger";
import Card from "../components/Card";

const DEFAULT_EVENT_BANNER_URL = require("../assets/splash-icon.png");

const formatDate = (dateString) => {
  if (!dateString) return "";
  try {
  const date = new Date(dateString);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  } catch (error) {
    return "";
  }
};

const getDisplayDate = (event) => {
  try {
    const startTime = event?.startDateTime || event?.start_time || event?.startDate;
    if (!startTime) return 'Date not specified';
    
    const startDate = new Date(startTime);
    if (isNaN(startDate.getTime())) return 'Invalid date';
    
    return startDate.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

const getVenueInfo = (event) => {
  if (!event) return { type: 'none', value: 'Not available' };
  
  const isOnline = event.venueType === 'ONLINE';
  
  // Check for online link fields (common field names)
  const onlineLink = event.onlineLink || event.meetingUrl || event.eventLink || event.link || event.onlineUrl || event.meetingLink;
  
  if (isOnline) {
    if (onlineLink) {
      return { type: 'link', value: onlineLink };
    }
    // If online but no link, still show "Online Event" but indicate link not available
    return { type: 'none', value: 'Not available' };
  }
  
  // For offline events, check venue address or location
  const venueAddress = event.venueAddress || event.location;
  if (venueAddress && venueAddress.trim()) {
    return { type: 'address', value: venueAddress };
  }
  
  return { type: 'none', value: 'Not available' };
};

const getStatusColor = (status) => {
  switch (status) {
    case 'REGISTERED': return colors.success;
    case 'CANCELLED': return colors.error;
    case 'PENDING': return colors.warning;
    default: return colors.textSecondary;
  }
};

const getStatusText = (status) => {
  switch (status) {
    case 'REGISTERED': return 'Registered';
    case 'CANCELLED': return 'Cancelled';
    case 'PENDING': return 'Pending';
    default: return status;
  }
};

const RegisteredEvents = ({ navigation }) => {
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { showError } = useNotification();

  useScreenApiLogger("RegisteredEvents");

  useEffect(() => {
    loadRegisteredEvents();
  }, []);

  // Refresh when screen comes into focus (after registration)
  useFocusEffect(
    React.useCallback(() => {
      loadRegisteredEvents();
    }, [])
  );

  const loadRegisteredEvents = async () => {
    try {
      setLoading(true);
      const result = await eventsApi.getRegisteredEvents(1, 20);
      if (result.success) {
        setRegisteredEvents(result.data.registrations || []);
      } else {
        showError(result.message || 'Failed to load registered events');
      }
    } catch (error) {
      console.error('Error loading registered events:', error);
      showError('Something went wrong while loading your registered events');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadRegisteredEvents();
    } finally {
      setRefreshing(false);
    }
  };

  const handleEventPress = (registration) => {
    if (registration.event) {
      navigation.navigate("EventDetail", { event: registration.event });
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header title="REGISTERED EVENTS" />
        <Container style={{ backgroundColor: colors.background }}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading your registered events...</Text>
          </View>
        </Container>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="REGISTERED EVENTS" />
      <Container style={{ backgroundColor: colors.background }}>
        <ScrollView 
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {registeredEvents.length > 0 && (
            <Text style={styles.pageTitle}>Your Registered Events</Text>
          )}
          {registeredEvents.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="calendar-remove" size={64} color={colors.textMuted} />
              <Text style={styles.emptyText}>You have not registered for any events yet.</Text>
              <TouchableOpacity
                style={styles.exploreButton}
                onPress={() => navigation.navigate("MainTabs", { screen: "EventTab" })}
              >
                <Text style={styles.exploreButtonText}>Explore Events</Text>
              </TouchableOpacity>
            </View>
          ) : (
            registeredEvents.map((registration) => {
              const event = registration.event;
              if (!event) return null;
              
              const venueInfo = getVenueInfo(event);
              const isOnline = event.venueType === 'ONLINE';
              
              return (
                <Pressable 
                key={registration.id} 
                onPress={() => handleEventPress(registration)}
                  style={{ width: "100%" }}
              >
                  <Card style={styles.card}>
                    {/* Image Container */}
                    <View style={styles.imageContainer}>
                      <Image
                        source={event.featuredImage ? { uri: event.featuredImage } : DEFAULT_EVENT_BANNER_URL}
                        style={styles.image}
                        resizeMode="cover"
                      />
                      {/* Status Chip */}
                      <View style={[styles.chip, { top: 8, right: 8, backgroundColor: getStatusColor(registration.status) + 'DD' }]}>
                        <Text style={styles.chipText}>{getStatusText(registration.status)}</Text>
                      </View>
                      {/* Online/Offline Chip */}
                      {isOnline && (
                        <View style={[styles.chip, { top: 8, left: 8, backgroundColor: '#00000080' }]}>
                          <Text style={styles.chipText}>ONLINE</Text>
                        </View>
                      )}
                    </View>
                    
                    {/* Content */}
                    <View style={styles.content}>
                      <Text style={styles.date}>{getDisplayDate(event)}</Text>
                      <Text style={styles.title} numberOfLines={2}>{event.title || 'Event Title'}</Text>
                      
                      {/* Venue/Link Info */}
                      <View style={styles.venueContainer}>
                        <Icon 
                          name={isOnline ? 'link' : 'map-marker'} 
                          size={14} 
                          color="#9CA6AB" 
                          style={styles.venueIcon}
                        />
                        <Text style={styles.venueText} numberOfLines={1}>
                          {venueInfo.type === 'link' ? venueInfo.value : 
                           venueInfo.type === 'address' ? venueInfo.value : 
                           'Not available'}
                  </Text>
                </View>
                      
                      {/* Payment Status */}
                      <View style={styles.paymentContainer}>
                        {event.price > 0 ? (
                          <View style={styles.paymentRow}>
                            <Text style={styles.paymentLabel}>Payment: </Text>
                            <Text style={[
                              styles.paymentStatus, 
                              { color: registration.paymentStatus === 'PAID' ? colors.success : colors.warning }
                            ]}>
                              {registration.paymentStatus === 'PAID' ? 'Paid' : 'Pending'} - ₹{event.price}
                  </Text>
                          </View>
                        ) : (
                  <Text style={styles.freeEvent}>Free Event</Text>
                )}
                      </View>
                      
                      {/* Event Status */}
                      {registration.eventStatus && (
                        <View style={styles.eventStatusContainer}>
                          <Text style={styles.eventStatusText}>
                            Event Status: {registration.eventStatus}
                          </Text>
                        </View>
                      )}
                    </View>
                  </Card>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </Container>
    </View>
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
    fontFamily: 'Gilroy-Medium',
  },
  pageTitle: {
    fontSize: 22,
    fontFamily: 'Gilroy-Bold',
    color: colors.white,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    marginBottom: 8,
  },
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 2,
  },
  chipText: {
    color: "#FFF",
    fontSize: 10,
    fontFamily: 'Gilroy-SemiBold',
  },
  content: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  date: {
    fontSize: 12,
    lineHeight: 16,
    color: "#9CA6AB",
    fontFamily: 'Gilroy-Medium',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: colors.white,
    marginVertical: 4,
    lineHeight: 20,
  },
  venueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 8,
  },
  venueIcon: {
    marginRight: 6,
  },
  venueText: {
    fontSize: 12,
    lineHeight: 16,
    color: "#9CA6AB",
    fontFamily: 'Gilroy-Medium',
    flex: 1,
  },
  paymentContainer: {
    marginTop: 4,
    marginBottom: 4,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: "#9CA6AB",
    fontFamily: 'Gilroy-Medium',
  },
  paymentStatus: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Gilroy-SemiBold',
  },
  freeEvent: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.success,
    fontFamily: 'Gilroy-SemiBold',
  },
  eventStatusContainer: {
    marginTop: 4,
  },
  eventStatusText: {
    fontSize: 11,
    lineHeight: 14,
    color: "#9CA6AB",
    fontFamily: 'Gilroy-Regular',
    textTransform: 'uppercase',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    marginTop: 60,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 24,
    fontFamily: 'Gilroy-Medium',
  },
  exploreButton: {
    backgroundColor: colors.button,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: colors.button,
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  exploreButtonText: {
    color: colors.white,
    fontFamily: 'Gilroy-SemiBold',
    fontSize: 16,
  },
});

export default RegisteredEvents;
