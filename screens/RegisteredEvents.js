import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import Container from "../components/Container";
import colors from "../config/colors";
import Header from "../components/Header";

const mockRegisteredEvents = [
  {
    id: "1",
    title: "Sciastra Tech Conference 2024",
    date: "2024-08-15T10:00:00Z",
    location: "IIT Delhi, New Delhi",
    price: 499,
    paymentId: "PAY123456",
    status: "Paid",
  },
  {
    id: "2",
    title: "AI & ML Bootcamp",
    date: "2024-10-05T11:00:00Z",
    location: "Online",
    price: 299,
    paymentId: "PAY654321",
    status: "Paid",
  },
];

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

const RegisteredEvents = () => {
  return (
    <Container style={{ backgroundColor: colors.background }}>
      <Text style={styles.header}>Registered Events</Text>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {mockRegisteredEvents.length === 0 ? (
          <Text style={styles.emptyText}>You have not registered for any events yet.</Text>
        ) : (
          mockRegisteredEvents.map((event) => (
            <View key={event.id} style={styles.card}>
              <Text style={styles.title}>{event.title}</Text>
              <Text style={styles.info}>Date: {formatDate(event.date)}</Text>
              <Text style={styles.info}>Location: {event.location}</Text>
              <Text style={styles.info}>Payment ID: {event.paymentId}</Text>
              <View style={styles.statusContainer}>
                <Text style={styles.info}>Status: </Text>
                <Text style={styles.statusPaid}>{event.status}</Text>
              </View>
              <Text style={styles.price}>Paid: ₹ {event.price}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </Container>
  );
};

const styles = StyleSheet.create({
  header: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.primary,
    marginTop: 24,
    marginBottom: 18,
    textAlign: "center",
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
  statusPaid: {
    color: colors.success,
    fontWeight: "700",
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.success,
    marginTop: 6,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: "center",
    marginTop: 40,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
});

export default RegisteredEvents;
