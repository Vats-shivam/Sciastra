import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Image, Pressable, Linking } from "react-native";
import Container from "../components/Container";
import colors from "../config/colors";
import Header from "../components/Header";
import eventsApi from "../api/EventsApi";
import { useNotification } from "../contexts/NotificationContext";
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useFocusEffect } from "@react-navigation/native";
import useScreenApiLogger from "../hooks/useScreenApiLogger";
import Card from "../components/Card";
import CustomRefreshControl from "../components/CustomRefreshControl";

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
  if (!event) return { type: 'none', value: 'Not available', meetingLink: null };
  
  const isOnline = event.venueType === 'ONLINE' || event.venue_type === 'ONLINE' || event.venueType === 'VIRTUAL' || event.venue_type === 'VIRTUAL';
  
  // Check for online link fields (common field names) - check all possible locations
  const onlineLink = event.meetLink || 
                     event.onlineLink || 
                     event.meetingUrl || 
                     event.meeting_link ||
                     event.meetingURL ||
                     event.eventLink || 
                     event.link || 
                     event.onlineUrl || 
                     event.online_url ||
                     event.meetingLink ||
                     event.videoLink ||
                     event.video_link ||
                     event.zoomLink ||
                     event.zoom_link ||
                     event.registration?.meetingLink ||
                     event.registration?.onlineLink;
  
  // Always return meeting link if it exists, regardless of venue type
  if (onlineLink && onlineLink.trim()) {
    return { type: 'link', value: onlineLink.trim(), meetingLink: onlineLink.trim() };
  }
  
  if (isOnline) {
    // If online but no link, still show "Online Event" but indicate link not available
    return { type: 'none', value: 'Online Event', meetingLink: null };
  }
  
  // For offline events, check venue address or location
  const venueAddress = event.venueAddress || event.venue_address || event.location;
  if (venueAddress && venueAddress.trim()) {
    return { type: 'address', value: venueAddress.trim(), meetingLink: null };
  }
  
  return { type: 'none', value: 'Not available', meetingLink: null };
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
  const [expandedCards, setExpandedCards] = useState(new Set());
  const { showError, showSuccess } = useNotification();

  useScreenApiLogger("RegisteredEvents");

  const toggleCard = (registrationId) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(registrationId)) {
        newSet.delete(registrationId);
      } else {
        newSet.add(registrationId);
      }
      return newSet;
    });
  };

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
        <Header 
          title="REGISTERED EVENTS" 
          showTitle={true} 
          showBackButton={true} 
          onBackPress={() => navigation.goBack()} 
        />
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
      <Header 
        title="REGISTERED EVENTS" 
        showTitle={true} 
        showBackButton={true} 
        onBackPress={() => navigation.goBack()} 
      />
      <Container style={{ backgroundColor: colors.background }}>
        <ScrollView 
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <CustomRefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
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
              
              // Check for meeting link in both event and registration objects
              const meetingLinkFromEvent = event.meetLink || event.onlineLink || event.meetingUrl || 
                                          event.meeting_link || event.meetingURL || event.eventLink || 
                                          event.link || event.onlineUrl || event.online_url ||
                                          event.meetingLink || event.videoLink || event.video_link ||
                                          event.zoomLink || event.zoom_link;
              
              const meetingLinkFromRegistration = registration.meetingLink || registration.onlineLink || 
                                                   registration.meetingUrl || registration.meeting_link;
              
              const actualMeetingLink = meetingLinkFromRegistration || meetingLinkFromEvent;
              
              const venueInfo = getVenueInfo(event);
              // Override venueInfo with meeting link from registration if it exists
              if (actualMeetingLink && actualMeetingLink.trim()) {
                venueInfo.meetingLink = actualMeetingLink.trim();
                venueInfo.type = 'link';
                venueInfo.value = actualMeetingLink.trim();
              }
              
              const isOnline = event.venueType === 'ONLINE' || event.venue_type === 'ONLINE' || 
                              event.venueType === 'VIRTUAL' || event.venue_type === 'VIRTUAL';
              const isExpanded = expandedCards.has(registration.id);
              const hasMeetingLink = venueInfo.meetingLink && venueInfo.meetingLink.trim();
              
              // Debug log
              console.log('RegisteredEvents: Full data:', {
                registrationId: registration.id,
                eventId: event.id,
                title: event.title,
                venueType: event.venueType || event.venue_type,
                eventKeys: Object.keys(event),
                registrationKeys: Object.keys(registration),
                meetingLinkFromEvent: meetingLinkFromEvent,
                meetingLinkFromRegistration: meetingLinkFromRegistration,
                actualMeetingLink: actualMeetingLink,
                venueInfo: venueInfo,
                hasMeetingLink: hasMeetingLink
              });
              
              return (
                <Card key={registration.id} style={styles.card}>
                  {/* Image Container */}
                  <TouchableOpacity onPress={() => toggleCard(registration.id)} activeOpacity={0.9}>
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
                  </TouchableOpacity>
                  
                  {/* Content */}
                  <View style={styles.content}>
                    <TouchableOpacity onPress={() => toggleCard(registration.id)} activeOpacity={0.9}>
                      <Text style={styles.date}>{getDisplayDate(event)}</Text>
                      <Text style={styles.title} numberOfLines={2}>{event.title || 'Event Title'}</Text>
                      
                      {/* Venue/Link Info */}
                      <View style={styles.venueContainer}>
                        <Icon 
                          name={hasMeetingLink ? 'video' : (isOnline ? 'link' : 'map-marker')} 
                          size={14} 
                          color={hasMeetingLink ? "#8B5CF6" : "#9CA6AB"} 
                          style={styles.venueIcon}
                        />
                        {hasMeetingLink ? (
                          <TouchableOpacity 
                            onPress={() => {
                              Linking.openURL(venueInfo.meetingLink).catch(err => {
                                console.error('Error opening meeting link:', err);
                                showError('Unable to open meeting link');
                              });
                            }}
                            activeOpacity={0.7}
                            style={{ flex: 1 }}
                          >
                            <Text style={styles.venueLinkText} numberOfLines={1}>
                              {venueInfo.meetingLink}
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <Text style={styles.venueText} numberOfLines={1}>
                            {venueInfo.type === 'address' ? venueInfo.value : (isOnline ? 'Online Event' : 'Not available')}
                          </Text>
                        )}
                        {hasMeetingLink && (
                          <Icon name="open-in-new" size={14} color="#8B5CF6" style={{ marginLeft: 4 }} />
                        )}
                      </View>
                      
                      {/* Join Button - Always show if available */}
                      {hasMeetingLink && (
                        <TouchableOpacity 
                          style={styles.joinButton}
                          onPress={() => {
                            Linking.openURL(venueInfo.meetingLink).catch(err => {
                              console.error('Error opening meeting link:', err);
                              showError('Unable to open meeting link');
                            });
                          }}
                          activeOpacity={0.8}
                        >
                          <Icon name="video" size={18} color={colors.white} />
                          <Text style={styles.joinButtonText}>Join</Text>
                        </TouchableOpacity>
                      )}
                      
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
                    </TouchableOpacity>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <View style={styles.expandedSection}>
                        {/* Meeting Link - Always show in expanded view if available */}
                        {hasMeetingLink && (
                          <View style={styles.detailSection}>
                            <Text style={styles.detailSectionTitle}>Join Event</Text>
                            <View style={styles.meetingLinkContainer}>
                              <View style={styles.meetingLinkInfo}>
                                <Icon name="video" size={20} color="#8B5CF6" />
                                <View style={styles.meetingLinkTextContainer}>
                                  <Text style={styles.meetingLinkLabel}>Meeting Link</Text>
                                  <TouchableOpacity 
                                    onPress={() => {
                                      Linking.openURL(venueInfo.meetingLink).catch(err => {
                                        console.error('Error opening meeting link:', err);
                                        showError('Unable to open meeting link');
                                      });
                                    }}
                                    activeOpacity={0.7}
                                  >
                                    <Text style={styles.meetingLinkUrl} numberOfLines={1}>
                                      {venueInfo.meetingLink}
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                              <TouchableOpacity 
                                style={styles.joinButton}
                                onPress={() => {
                                  Linking.openURL(venueInfo.meetingLink).catch(err => {
                                    console.error('Error opening meeting link:', err);
                                    showError('Unable to open meeting link');
                                  });
                                }}
                                activeOpacity={0.8}
                              >
                                <Icon name="video" size={18} color={colors.white} />
                                <Text style={styles.joinButtonText}>Join</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}

                        {/* Speakers */}
                        {event.speakers && event.speakers.length > 0 && (
                          <View style={styles.detailSection}>
                            <Text style={styles.detailSectionTitle}>Speakers</Text>
                            {event.speakers.map((speaker, index) => (
                              <View key={speaker.id || index} style={styles.speakerItem}>
                                <Image
                                  source={
                                    speaker.profileImage || speaker.photoUrl
                                      ? { uri: speaker.profileImage || speaker.photoUrl }
                                      : require('../assets/icon.png')
                                  }
                                  style={styles.speakerAvatar}
                                />
                                <View style={styles.speakerInfo}>
                                  <Text style={styles.speakerName}>{speaker.name}</Text>
                                  {speaker.title && (
                                    <Text style={styles.speakerTitle}>{speaker.title}</Text>
                                  )}
                                  {speaker.company && (
                                    <Text style={styles.speakerCompany}>{speaker.company}</Text>
                                  )}
                                </View>
                              </View>
                            ))}
                          </View>
                        )}

                        {/* Agenda */}
                        {event.agenda && event.agenda.length > 0 && (
                          <View style={styles.detailSection}>
                            <Text style={styles.detailSectionTitle}>Agenda</Text>
                            {event.agenda.map((item, index) => (
                              <View key={item.id || index} style={styles.agendaItem}>
                                <View style={styles.agendaTime}>
                                  <Icon name="clock-outline" size={14} color="#8B5CF6" />
                                  <Text style={styles.agendaTimeText}>
                                    {new Date(item.startTime).toLocaleTimeString('en-IN', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: true
                                    })}
                                  </Text>
                                </View>
                                <Text style={styles.agendaTitle}>{item.title}</Text>
                                {item.speakerName && (
                                  <Text style={styles.agendaSpeaker}>
                                    by {item.speaker?.name || item.speakerName}
                                  </Text>
                                )}
                              </View>
                            ))}
                          </View>
                        )}

                        {/* View Full Details Button */}
                        <TouchableOpacity
                          style={styles.viewDetailsButton}
                          onPress={() => handleEventPress(registration)}
                        >
                          <Text style={styles.viewDetailsText}>View Full Details</Text>
                          <Icon name="arrow-right" size={18} color="#8B5CF6" />
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Expand/Collapse Button */}
                    <TouchableOpacity 
                      style={styles.expandButton}
                      onPress={() => toggleCard(registration.id)}
                    >
                      <Text style={styles.expandButtonText}>
                        {isExpanded ? 'Show Less' : 'Show More'}
                      </Text>
                      <Icon 
                        name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                        size={20} 
                        color="#8B5CF6" 
                      />
                    </TouchableOpacity>
                  </View>
                </Card>
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
  venueLinkText: {
    fontSize: 12,
    lineHeight: 16,
    color: "#8B5CF6",
    fontFamily: 'Gilroy-SemiBold',
    flex: 1,
    textDecorationLine: 'underline',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.button,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 8,
    gap: 8,
    shadowColor: colors.button,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  joinButtonText: {
    fontSize: 14,
    fontFamily: 'Gilroy-SemiBold',
    color: colors.white,
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

  // Expanded Section Styles
  expandedSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    color: colors.textPrimary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  meetingLinkContainer: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  meetingLinkInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  meetingLinkTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  meetingLinkLabel: {
    fontSize: 12,
    fontFamily: 'Gilroy-SemiBold',
    color: colors.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  meetingLinkUrl: {
    fontSize: 14,
    fontFamily: 'Gilroy-Medium',
    color: '#8B5CF6',
    lineHeight: 20,
  },


  // Speaker Styles
  speakerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundElevated,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  speakerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.card,
    marginRight: 12,
  },
  speakerInfo: {
    flex: 1,
  },
  speakerName: {
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  speakerTitle: {
    fontSize: 12,
    fontFamily: 'Gilroy-SemiBold',
    color: '#8B5CF6',
    marginBottom: 2,
  },
  speakerCompany: {
    fontSize: 11,
    fontFamily: 'Gilroy-Regular',
    color: colors.textSecondary,
  },

  // Agenda Styles
  agendaItem: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  agendaTime: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  agendaTimeText: {
    fontSize: 11,
    fontFamily: 'Gilroy-SemiBold',
    color: '#8B5CF6',
    marginLeft: 6,
  },
  agendaTitle: {
    fontSize: 13,
    fontFamily: 'Gilroy-Bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  agendaSpeaker: {
    fontSize: 11,
    fontFamily: 'Gilroy-Regular',
    color: colors.textMuted,
  },

  // View Details Button
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  viewDetailsText: {
    fontSize: 14,
    fontFamily: 'Gilroy-SemiBold',
    color: '#8B5CF6',
    marginRight: 8,
  },

  // Expand Button
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  expandButtonText: {
    fontSize: 13,
    fontFamily: 'Gilroy-SemiBold',
    color: '#8B5CF6',
    marginRight: 4,
  },
});

export default RegisteredEvents;
