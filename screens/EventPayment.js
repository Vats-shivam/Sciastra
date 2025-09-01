import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import Container from "../components/Container";
import colors from "../config/colors";
import Header from "../components/Header";

const EventPayment = ({ route, navigation }) => {
  const { event, name, email, phone } = route?.params || {};

  const handlePay = () => {
    Alert.alert("Payment Success", "Thank you for registering!", [
      { text: "OK", onPress: () => navigation.popToTop() },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <Header title="PAYMENT" />
      
      <Container style={{ backgroundColor: colors.background }}>
        <View style={styles.header}>
          <Text style={styles.title}>Payment</Text>
          <Text style={styles.eventName}>{event?.title}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Your Details</Text>
          <Text style={styles.summaryText}>Name: {name}</Text>
          <Text style={styles.summaryText}>Email: {email}</Text>
          <Text style={styles.summaryText}>Phone: {phone}</Text>
          <View style={styles.divider} />
          <Text style={styles.summaryTitle}>Event Price</Text>
          <Text style={styles.price}>{event?.cheapest_ticket_price === 0 ? "Free" : `₹ ${event?.cheapest_ticket_price}`}</Text>
        </View>
        <TouchableOpacity style={styles.button} onPress={handlePay}>
          <Text style={styles.buttonText}>Pay Now</Text>
        </TouchableOpacity>
      </Container>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    marginTop: 24,
    marginBottom: 12,
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 2,
  },
  eventName: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 8,
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 18,
    marginHorizontal: 8,
    marginBottom: 24,
    shadowColor: colors.primary,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryTitle: {
    fontWeight: "700",
    color: colors.primary,
    fontSize: 16,
    marginBottom: 6,
  },
  summaryText: {
    color: colors.textPrimary,
    fontSize: 15,
    marginBottom: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
    opacity: 0.18,
    borderRadius: 1,
  },
  price: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.success,
    marginTop: 2,
  },
  button: {
    backgroundColor: colors.success,
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: "center",
    marginHorizontal: 8,
    marginTop: 16,
    shadowColor: colors.success,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: colors.textInverse,
    fontWeight: "700",
    fontSize: 17,
  },
});

export default EventPayment;
