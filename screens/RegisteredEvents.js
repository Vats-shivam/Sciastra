import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from "react-native";
import Container from "../components/Container";
import colors from "../config/colors";
import Header from "../components/Header";
import eventsApi from "../api/EventsApi";
import { useNotification } from "../contexts/NotificationContext";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useFocusEffect } from "@react-navigation/native";

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
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
          {registeredEvents.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="calendar-remove" size={64} color={colors.textMuted} />
              <Text style={styles.emptyText}>You have not registered for any events yet.</Text>
              <TouchableOpacity 
                style={styles.exploreButton}
                onPress={() => navigation.navigate("EventTab")}
              >
                <Text style={styles.exploreButtonText}>Explore Events</Text>
              </TouchableOpacity>
            </View>
          ) : (
            registeredEvents.map((registration) => (
              <TouchableOpacity 
                key={registration.id} 
                style={styles.card}
                onPress={() => handleEventPress(registration)}
              >
                <Text style={styles.title}>{registration.event?.title || 'Event Title'}</Text>
                <Text style={styles.info}>Date: {formatDate(registration.event?.start_time)}</Text>
                <Text style={styles.info}>Location: {registration.event?.location || 'TBD'}</Text>
                <Text style={styles.info}>Registered: {formatDate(registration.registered_at)}</Text>
                <View style={styles.statusContainer}>
                  <Text style={styles.info}>Status: </Text>
                  <Text style={[styles.statusText, { color: getStatusColor(registration.status) }]}>
                    {getStatusText(registration.status)}
                  </Text>
                </View>
                {registration.event?.cheapest_ticket_price > 0 && (
                  <Text style={styles.price}>
                    {registration.payment_status === 'COMPLETED' ? 'Paid' : 'Payment Pending'}: ₹ {registration.event.cheapest_ticket_price}
                  </Text>
                )}
                {registration.event?.cheapest_ticket_price === 0 && (
                  <Text style={styles.freeEvent}>Free Event</Text>
                )}
              </TouchableOpacity>
            ))
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
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 18,
    marginHorizontal: 8,
    marginBottom: 18,
    shadowColor: colors.primary,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  title: {
    fontWeight: "700",
    color: colors.primary,
    fontSize: 17,
    marginBottom: 6,
  },
  info: {
    color: colors.textPrimary,
    fontSize: 15,
    marginBottom: 2,
  },
  statusText: {
    fontWeight: "700",
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.success,
    marginTop: 6,
  },
  freeEvent: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.secondary,
    marginTop: 6,
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
  },
  exploreButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: colors.white,
    fontWeight: "600",
    fontSize: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
});

export default RegisteredEvents;
