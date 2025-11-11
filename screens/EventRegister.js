import React, { useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, TextInput, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import Container from "../components/Container";
import colors from "../config/colors";
import Header from "../components/Header";
import eventsApi from "../api/EventsApi";
import { useNotification } from "../contexts/NotificationContext";
import useScreenApiLogger from "../hooks/useScreenApiLogger";

const EventRegister = ({ route, navigation }) => {
  const event = route?.params?.event;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useNotification();

  useScreenApiLogger("EventRegister");

  const handleProceed = async () => {
    if (!name || !email || !phone) {
      setError("Please fill all fields");
      return;
    }

    // Basic validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    const phoneRegex = /^[+]?[\d\s-()]{10,15}$/;
    if (!phoneRegex.test(phone)) {
      setError("Please enter a valid phone number");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // Check if event is free or requires payment
      const isFreeEvent = event.cheapest_ticket_price === 0;
      
      if (isFreeEvent) {
        // Register directly for free events
        const registrationData = {
          "Full Name": name,
          "Email": email,
          "Phone": phone,
        };

        const result = await eventsApi.registerForEvent(event.id, registrationData);
        
        if (result.success) {
          showSuccess("Successfully registered for the event!");
          navigation.navigate("RegisteredEvents");
        } else {
          setError(result.message || "Registration failed. Please try again.");
        }
      } else {
        // Navigate to payment for paid events
        navigation.navigate("EventPayment", { event, name, email, phone });
      }
    } catch (error) {
      console.error("Registration error:", error);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <Header title="REGISTER" />
      
      <Container style={{ backgroundColor: colors.background }}>
        <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Register for Event</Text>
          <Text style={styles.eventName}>{event?.title}</Text>
        </View>
        <View style={styles.form}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Your Name"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Your Email"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Your Phone Number"
            placeholderTextColor={colors.textMuted}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={15}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleProceed}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.buttonText}>
              {event?.cheapest_ticket_price === 0 ? "Register for Free" : "Proceed to Payment"}
            </Text>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
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
  form: {
    marginTop: 12,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  label: {
    color: colors.textPrimary,
    fontWeight: "600",
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.card,
  },
  error: {
    color: colors.error,
    marginTop: 8,
    textAlign: "center",
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: "center",
    marginHorizontal: 8,
    marginTop: 16,
    shadowColor: colors.primary,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: colors.textInverse,
    fontWeight: "700",
    fontSize: 17,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default EventRegister;
