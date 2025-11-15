import React, { useState, useEffect } from "react";
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator, Linking } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import Container from "../components/Container";
import Button from "../components/Button";
import Card from "../components/Card";
import colors from "../config/colors";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Header from "../components/Header";
import eventsApi from "../api/EventsApi";
import { useNotification } from "../contexts/NotificationContext";
import authApi from "../api/AuthApi";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import authManager from "../services/AuthManager";
import useScreenApiLogger from "../hooks/useScreenApiLogger";

const INSTRUCTIONS = [
  "Registration is mandatory for all participants.",
  "The event will be conducted online via Zoom/Google Meet. The link will be shared 1 hour before the event.",
  "Please ensure you have a stable internet connection and the latest version of the video conferencing app installed.",
  "Participants are requested to join 10 minutes before the scheduled time.",
  "For any technical issues, please contact our support team at support@sciastra.com"
];

const getDisplayDate = (event) => {
  try {
    // Check for all possible date properties in order of preference
    const startTime = event?.startDateTime || event?.start_time || event?.startDate;
    if (!startTime) return 'Date not specified';
    
    const startDate = new Date(startTime);
    if (isNaN(startDate.getTime())) return 'Invalid date';
    
    // Format date parts
    const day = startDate.getDate().toString().padStart(2, '0');
    const month = startDate.toLocaleString('default', { month: 'short' });
    const year = startDate.getFullYear();
    
    return `${day} ${month} ${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

const isEventStarted = (event) => {
  const startTime = event?.startDateTime || event?.start_time;
  if (!startTime) return false;
  return new Date(startTime) <= new Date();
};

const getEventStatus = (event) => {
  if (!event) return { status: 'Unknown', color: colors.gray };
  
  const eventStarted = isEventStarted(event);
  
  if (event.status === 'CANCELLED') {
    return { status: 'Cancelled', color: colors.danger };
  }
  
  if (event.status === 'COMPLETED') {
    return { status: 'Completed', color: colors.gray };
  }
  
  if (eventStarted) {
    return { status: 'Event in Progress', color: colors.warning };
  }
  
  return { status: 'Registration Open', color: colors.success };
};

const galleryImages = [1, 2, 3].map((i) => ({
  id: `img${i}`,
  uri: 'https://via.placeholder.com/300x200?text=Event+Image'
}));

const EventDetailScreen = ({ route, navigation }) => {
  const { eventId } = route?.params || {};
  const initialEvent = route?.params?.event;

  const [event, setEvent] = useState(initialEvent || null);
  const [loading, setLoading] = useState(!initialEvent);
  const [checkingRegistration, setCheckingRegistration] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState(null);
  const [showEventStartedModal, setShowEventStartedModal] = useState(false);
  const [showRegisterConfirm, setShowRegisterConfirm] = useState(false);
  const [registering, setRegistering] = useState(false);
  const { showError, showSuccess } = useNotification();
  const insets = useSafeAreaInsets();

  useScreenApiLogger("EventDetail");

  const eventStarted = event ? isEventStarted(event) : false;
  const { status: eventStatus, color: statusColor } = event ? getEventStatus(event) : { status: '', color: colors.gray };
  const isRegistrationOpen = event?.status === 'PUBLISHED' && !eventStarted;
  const isOnlineEvent = event?.venueType === 'ONLINE';

  useEffect(() => {
    if (eventId && !initialEvent) {
      loadEventDetails();
    } else if (event) {
      checkRegistrationStatus();
      // Show modal if event has started
      if (isEventStarted(event)) {
        setShowEventStartedModal(true);
      }
    }
  }, [eventId, event]);

  useEffect(() => {
    if (event) {
      checkRegistrationStatus();
    }
  }, [event]);

  const loadEventDetails = async () => {
    try {
      setLoading(true);
      const result = await eventsApi.getEventById(eventId);
      if (result.success) {
        setEvent(result.data);
      } else {
        showError('Failed to load event details');
        setEvent(null);
      }
    } catch (error) {
      showError('Something went wrong while loading event details');
      setEvent(null);
    } finally {
      setLoading(false);
    }
  };

  const checkRegistrationStatus = async () => {
    if (!event?.id) return;
    
    try {
      setCheckingRegistration(true);
      const result = await eventsApi.getRegistrationStatus(event.id);
      if (result.success) {
        setRegistrationStatus(result.data);
      }
    } catch (error) {
      console.error('Error checking registration status:', error);
    } finally {
      setCheckingRegistration(false);
    }
  };

  const handleRegister = () => {
    if (registrationStatus?.is_registered) {
      showSuccess('You are already registered for this event!');
      return;
    }

    setShowRegisterConfirm(true);
  };

  const registerForEvent = async () => {
    try {
      setRegistering(true);

      // Check if event has already started
      if (eventStarted) {
        setShowRegisterConfirm(false);
        setShowEventStartedModal(true);
        return;
      }

      // Check if user is logged in
      const currentUserId = authApi.getCurrentUserId();
      if (!currentUserId) {
        showError('Please login to register for events');
        navigation.navigate('Login');
        setShowRegisterConfirm(false);
        return;
      }

      // Gather user data from profile/cache as fallbacks
      const currentUserProfile = authManager.getCurrentUser?.() || {};
      const storedEmail = await AsyncStorage.getItem('userEmail');
      const storedName = await AsyncStorage.getItem('userName');
      const storedPhone = await AsyncStorage.getItem('userPhone');

      const userEmail = (currentUserProfile.email || storedEmail || '').trim();
      const userName = currentUserProfile.name || storedName || 'User';
      const userPhone = currentUserProfile.phoneNumber || currentUserProfile.phone || storedPhone || '';

      if (!userEmail) {
        showError('Please add an email to your profile before registering for events.');
        return;
      }

      if (!event?.id) {
        throw new Error('Event information is not available');
      }

      // Format registration payload including both API-friendly keys and legacy keys
      const registrationData = {
        fullName: userName,
        name: userName,
        email: userEmail,
        phone: userPhone,
        company: currentUserProfile.company || '',
        experienceLevel: currentUserProfile.experienceLevel || 'Not specified',
        dietaryRestrictions: 'None',
        "Full Name": userName,
        "Email": userEmail,
        "Phone": userPhone,
        "Company": currentUserProfile.company || '',
        "Experience Level": currentUserProfile.experienceLevel || 'Not specified',
        "Dietary Restrictions": 'None'
      };

      const response = await eventsApi.registerForEvent(event.id, registrationData);

      if (response.success) {
        setRegistrationStatus({
          is_registered: true,
          registration_date: new Date().toISOString(),
        });

        showSuccess('Successfully registered for the event!');
      } else {
        showError(response.message || 'Failed to register for the event');
      }
    } catch (error) {
      console.error('Registration error:', error);
      showError(error.message === 'Please add an email to your profile before registering for events.'
        ? error.message
        : 'An error occurred while registering for the event');
    } finally {
      setRegistering(false);
      setShowRegisterConfirm(false);
    }
  };

  const getButtonText = () => {
    if (registering) return 'Processing...';
    if (registrationStatus?.is_registered) return 'Registered';
    if (event?.status === 'COMPLETED') return 'Event Completed';
    if (eventStarted) return 'Event In Progress';
    if (!isRegistrationOpen) return 'Registration Closed';
    return 'Register Now';
  };

  const isButtonDisabled = () => {
    return registering ||
           checkingRegistration || 
           registrationStatus?.is_registered || 
           event?.status === 'COMPLETED' ||
           eventStarted ||
           !isRegistrationOpen;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading event details...</Text>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle-outline" size={48} color={colors.danger} />
        <Text style={styles.errorText}>Event not found</Text>
        <Button
          title="Go Back"
          onPress={() => navigation.goBack()}
          style={{ marginTop: 20 }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="EVENT DETAIL" onBackPress={() => navigation.goBack()} />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 140 + insets.bottom } ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Event Banner */}
        <Image
          source={event.featuredImage ? { uri: event.featuredImage } : require("../assets/splash-icon.png")}
          style={styles.banner}
          resizeMode="cover"
        />
        
        {/* Event Details */}
        <View style={styles.content}>
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusText}>{eventStatus}</Text>
            </View>
            {isOnlineEvent && (
              <View style={styles.onlineBadge}>
                <Text style={styles.onlineText}>ONLINE</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.title}>{event.title}</Text>
          
          {/* Event Date and Time */}
          <View style={styles.dateTimeContainer}>
            <View style={styles.dateTimeRow}>
              <View style={styles.dateIcon}>
                <Icon name="calendar-month" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.dateText}>{getDisplayDate(event)}</Text>
                <Text style={styles.timeText}>
                  {event.startDateTime || event.start_time || event.startDate
                    ? new Date(event.startDateTime || event.start_time || event.startDate).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })
                    : 'Time not specified'}
                </Text>
              </View>
            </View>
            <View style={styles.locationContainer}>
              <Icon 
                name={isOnlineEvent ? 'monitor' : 'map-marker'} 
                size={16} 
                color="#9CA6AB" 
                style={styles.locationIcon}
              />
              <Text style={styles.locationText}>
                {isOnlineEvent ? 'Online Event' : (event.location || 'Location not specified')}
              </Text>
            </View>
          </View>

          {/* Event Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About This Event</Text>
            <Text style={styles.description}>
              {event.description || 'No description available.'}
            </Text>
          </View>

          {/* Event Instructions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Instructions</Text>
            {INSTRUCTIONS.map((instruction, index) => (
              <View key={index} style={styles.instructionItem}>
                <Text style={styles.bulletPoint}>•</Text>
                <Text style={styles.instructionText}>{instruction}</Text>
              </View>
            ))}
          </View>

          {/* Event Contact */}
          <View style={styles.contactSection}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            <View style={styles.contactItem}>
              <Icon name="email" size={20} color={colors.primary} />
              <Text style={styles.contactText}>support@sciastra.com</Text>
            </View>
            <View style={styles.contactItem}>
              <Icon name="phone" size={20} color={colors.primary} />
              <Text style={styles.contactText}>+91 1234567890</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Register Button */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Button
          title={getButtonText()}
          onPress={handleRegister}
          disabled={isButtonDisabled()}
          style={[
            styles.registerButton,
            (registrationStatus?.is_registered || event?.status === 'COMPLETED' || eventStarted) && 
              { backgroundColor: colors.gray }
          ]}
        />
      </View>
      {!isRegistrationOpen && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity 
            style={[
              styles.registerButton,
              { 
                backgroundColor: eventStarted ? '#6B7280' : '#8B5CF6',
                opacity: 0.9,
              }
            ]}
            disabled={true}
            activeOpacity={0.8}
          >
            <Text style={styles.registerButtonText}>
              {eventStarted ? 'Event has already started' : 'Registration is closed'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Event Started Modal */}
      <Modal
        visible={showEventStartedModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEventStartedModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Icon name="alert-circle" size={48} color={colors.warning} />
            <Text style={styles.modalTitle}>Event Has Started</Text>
            <Text style={styles.modalText}>
              This event has already started. You can still view the details but registration is no longer available.
            </Text>
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => setShowEventStartedModal(false)}
            >
              <Text style={styles.modalButtonText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showRegisterConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRegisterConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Icon name="calendar-check" size={48} color={colors.primary} />
            <Text style={styles.modalTitle}>Register for Event</Text>
            <Text style={styles.modalText}>
              {`Would you like to register for "${event?.title || ''}"?`}
              {event?.cheapest_ticket_price === 0
                ? ' This is a free event.'
                : ` Registration fee: ₹${event?.cheapest_ticket_price || 0}`}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.modalSecondaryButton]}
                onPress={() => setShowRegisterConfirm(false)}
                disabled={registering}
              >
                <Text style={[styles.modalActionText, styles.modalSecondaryText]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.modalPrimaryButton]}
                onPress={registerForEvent}
                disabled={registering}
                activeOpacity={0.9}
              >
                {registering ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={[styles.modalActionText, styles.modalPrimaryText]}>Register</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.background,
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'Gilroy-SemiBold',
    color: colors.textPrimary,
    marginTop: 16,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  banner: {
    width: '100%',
    height: 220,
  },
  content: {
    padding: 20,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  statusText: {
    color: colors.white,
    fontSize: 12,
    fontFamily: 'Gilroy-SemiBold',
  },
  onlineBadge: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  onlineText: {
    color: colors.white,
    fontSize: 10,
    fontFamily: 'Gilroy-Bold',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Gilroy-Bold',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  // Date and Time styles
  dateTimeContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateIcon: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dateText: {
    fontSize: 16,
    color: colors.textPrimary,
    fontFamily: 'Gilroy-SemiBold',
    marginBottom: 2,
  },
  timeText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: 'Gilroy-Regular',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationIcon: {
    marginRight: 4,
  },
  locationText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#9CA6AB',
    fontFamily: 'Gilroy-Medium',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Gilroy-SemiBold',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bulletPoint: {
    marginRight: 8,
    color: colors.primary,
    fontSize: 16,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  contactSection: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactText: {
    fontSize: 14,
    color: colors.textPrimary,
    marginLeft: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  registerButton: {
    width: '100%',
    height: 56,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
  },
  registerButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Gilroy-SemiBold',
    textAlign: 'center',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Gilroy-Bold',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: '#8B5CF6', // Purple color
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: colors.white,
    fontSize: 16,
    fontFamily: 'Gilroy-SemiBold',
  },

  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 16,
    gap: 12,
  },
  modalActionButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActionText: {
    fontSize: 16,
    fontFamily: 'Gilroy-SemiBold',
  },
  modalSecondaryButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalSecondaryText: {
    color: colors.textPrimary,
  },
  modalPrimaryButton: {
    backgroundColor: '#8B5CF6',
  },
  modalPrimaryText: {
    color: colors.white,
  },

  // Loading and Error States
  loadingContainer: {
    flex: 1,
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  errorText: {
    fontSize: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontFamily: 'Gilroy-SemiBold',
  },
});

export default EventDetailScreen;
