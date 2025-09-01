import React from "react";
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, FlatList } from "react-native";
import Container from "../components/Container";
import Button from "../components/Button";
import Card from "../components/Card";
import colors from "../config/colors";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Header from "../components/Header";

const mockEvent = {
  banner_url: require("../assets/splash-icon.png"),
  title: "Designing Ideas - Lorem ipsum dolor",
  status: "Registration open",
  start_time: "2024-09-24T18:00:00Z",
  end_time: "2024-09-25T18:00:00Z",
  location: "ABC Venue Auditorium, Bengaluru",
  distance: "9km away",
  details:
    "Lorem ipsum dolor lorem ipsum dolor lorem ipsum dolor. Lorem ipsum dolor lorem ipsum dolor lorem ipsum dolor lorem ipsum dolor lorem ipsum dolor lorem ipsum dolor.",
  cheapest_ticket_price: 600,
  event_category: "PAID",
  tags: ["Design", "Nearby", "Workshop", "Other Tags", "Other"],
  organizer: { name: "Harshavardhana R.", avatar: null },
  attendees: 99,
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    weekday: "short",
  });
};

const formatTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const guestLineup = [
  { id: "g1", name: "Riya Kulkarni", subtitle: "Designation" },
  { id: "g2", name: "Nayanika Dey", subtitle: "Designation" },
  { id: "g3", name: "Debasish Rath", subtitle: "Designation" },
  { id: "g4", name: "Mayank", subtitle: "Designation" },
];

const galleryImages = [1, 2, 3, 4, 5, 6, 7].map((i) => ({ id: `img${i}` }));

const EventDetailScreen = ({ route, navigation }) => {
  const event = route?.params?.event || mockEvent;
  const isEventOver = false;
  const isPriceAvailable = event.cheapest_ticket_price != null;

  const handleRegister = () => {
    navigation.navigate("EventRegister", { event });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <Header title="EVENT DETAIL" />
      
      <Container style={{ backgroundColor: colors.background, paddingHorizontal: 0 }}>
        <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header actions over banner */}
        <View style={styles.bannerWrapper}>
          <Image
            source={event.banner_url ? (typeof event.banner_url === 'string' ? { uri: event.banner_url } : event.banner_url) : require("../assets/splash-icon.png")}
            style={styles.banner}
            resizeMode="cover"
          />
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.circleBtn}>
              <Icon name="arrow-left" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <View style={{ flexDirection: "row" }}>
              <TouchableOpacity style={styles.circleBtn}>
                <Icon name="share-variant" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.circleBtn}>
                <Icon name="dots-vertical" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
          {/* pager dots placeholder */}
          <View style={styles.pagerDots}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </View>

        {/* Title and meta */}
        <View style={styles.content}>
          <View style={styles.statusRow}>
            <Icon name="check-decagram" size={16} color={colors.secondary} />
            <Text style={styles.statusText}>{event.status || "Upcoming"}</Text>
          </View>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.subtitle}>Design Workshop</Text>

          {/* Time & Location card */}
          <View style={styles.timeLocCard}>
            <View style={styles.timeRow}>
              <Icon name="calendar" size={18} color={colors.textPrimary} />
              <Text style={styles.timeText}>{formatDate(event.start_time)} - {formatDate(event.end_time)}</Text>
              <View style={styles.separatorDot} />
              <Icon name="clock-time-four-outline" size={18} color={colors.textPrimary} />
              <Text style={styles.timeText}>{formatTime(event.start_time)} onwards</Text>
            </View>
            <View style={styles.locRow}>
              <Icon name="map-marker" size={18} color={colors.textPrimary} />
              <Text style={styles.locText}>{event.location}</Text>
              <View style={{ flex: 1 }} />
              <TouchableOpacity style={styles.directionBtn}>
                <Text style={styles.directionText}>Direction</Text>
                <Icon name="arrow-right" size={16} color={colors.black} />
              </TouchableOpacity>
            </View>
            <View style={styles.distRow}>
              <Text style={styles.distText}>{event.distance}</Text>
            </View>
          </View>

          {/* Organizer / attendees */}
          <View style={styles.organizerRow}>
            <View style={styles.organizerLeft}>
              <Image source={require("../assets/icon.png")} style={styles.organizerAvatar} />
              <View>
                <Text style={styles.orgBy}>ORGANISED BY</Text>
                <Text style={styles.orgName}>{event.organizer?.name || "Sciastra"}</Text>
              </View>
            </View>
            <View style={styles.attendees}>
              <Icon name="account-group" size={16} color={colors.textPrimary} />
              <Text style={styles.attendeesText}>{event.attendees} attendees</Text>
            </View>
          </View>

          {/* Tags */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 6 }}>
            {(event.tags || []).map((t) => (
              <View key={t} style={styles.tagChip}><Text style={styles.tagText}>{t}</Text></View>
            ))}
          </ScrollView>

          {/* Tabs row (static) */}
          <View style={styles.tabsRow}>
            {['About', 'Guests Lineup', 'Gallery', 'Instructions', 'Venue'].map((tab, idx) => (
              <View key={tab} style={styles.tabItem}>
                <Text style={[styles.tabText, idx === 0 && styles.tabActive]}>{tab}</Text>
                {idx === 0 && <View style={styles.tabUnderline} />}
              </View>
            ))}
          </View>

          {/* About Section */}
          <Text style={styles.sectionHead}>About this event</Text>
          <Text style={styles.paragraph}>{event.details}</Text>
          <TouchableOpacity>
            <Text style={styles.readMore}>Read More</Text>
          </TouchableOpacity>

          {/* Guest Lineup */}
          {/* <View style={styles.sectionHeaderInline}>
            <Text style={styles.sectionHead}>Guest Lineup</Text>
            <Text style={styles.seeAllSmall}>SEE ALL</Text>
          </View>
          <View style={styles.guestsGrid}>
            {guestLineup.map((g) => (
              <View key={g.id} style={styles.guestCard}>
                <Image source={require("../assets/icon.png")} style={styles.guestAvatar} />
                <Text style={styles.guestName} numberOfLines={1}>{g.name}</Text>
                <Text style={styles.guestSub}>{g.subtitle}</Text>
              </View>
            ))}
          </View> */}

          {/* Gallery */}
          <Text style={[styles.sectionHead, { marginTop: 12 }]}>Gallery</Text>
          <View style={styles.galleryGrid}>
            {galleryImages.map((img) => (
              <View key={img.id} style={styles.galleryItem}>
                <Image source={require("../assets/splash-icon.png")} style={styles.galleryImage} />
              </View>
            ))}
          </View>

          {/* Instructions */}
          <Text style={[styles.sectionHead, { marginTop: 12 }]}>Instructions</Text>
          {[
            "Lorem ipsum dolor lorem.",
            "Lorem ipsum dolor lorem ipsum.",
            "Lorem ipsum dolor lorem ipsum dolor.",
            "Lorem ipsum dolor lorem.",
          ].map((i, idx) => (
            <View key={idx} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>{i}</Text>
            </View>
          ))}

          {/* Venue */}
          <Text style={[styles.sectionHead, { marginTop: 12 }]}>Venue</Text>
          <View style={styles.venueCard}>
            <Text style={styles.venueName}>ABC Venue Name</Text>
            <Text style={styles.venueAddress}>#1234, Nth Cross, XYZ Main Road, Area name{"\n"}Bengaluru, Karnataka 560xxx, India{"\n"}Landmark (if any)</Text>
            <TouchableOpacity style={styles.directionBtnWide}>
              <Text style={styles.directionText}>Get Directions</Text>
              <Icon name="arrow-right" size={16} color={colors.black} />
            </TouchableOpacity>
          </View>

          {/* More */}
          <Text style={[styles.sectionHead, { marginTop: 12 }]}>More</Text>
          {["Frequently Asked Questions", "Terms and Conditions", "Privacy policy"].map((label) => (
            <View key={label} style={styles.moreItem}>
              <Icon name="shield-outline" size={18} color={colors.textPrimary} />
              <Text style={styles.moreText}>{label}</Text>
              <View style={{ flex: 1 }} />
              <Icon name="chevron-right" size={22} color={colors.textSecondary} />
            </View>
          ))}
        </View>
      </ScrollView>

      {isPriceAvailable && !isEventOver && (
        <View style={styles.bottomBar}>
          <View>
            {event.cheapest_ticket_price !== 0 && (
              <Text style={styles.startsFrom}>Starts from</Text>
            )}
            <Text style={styles.price}>
              {event.cheapest_ticket_price === 0
                ? "Free"
                : `₹ ${event.cheapest_ticket_price}`}
            </Text>
          </View>
          <Button
            title={
              event.event_category === "LISTING_ONLY"
                ? "Know More"
                : "Register"
            }
            buttonColor={colors.primary}
            onPress={handleRegister}
            style={{ width: 160, borderRadius: 24, shadowColor: colors.primary, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 }}
          />
        </View>
      )}
        </Container>
      </View>
  );
};

const styles = StyleSheet.create({
  bannerWrapper: { position: "relative", width: "100%", height: 260, backgroundColor: colors.backgroundElevated },
  banner: { width: "100%", height: 260 },
  headerActions: {
    position: "absolute",
    top: 46,
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  circleBtn: {
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 18,
    padding: 8,
    marginLeft: 10,
  },
  pagerDots: {
    position: "absolute",
    bottom: 12,
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.4)", marginHorizontal: 3 },
  dotActive: { backgroundColor: colors.white },

  content: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 28 },
  statusRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  statusText: { color: colors.secondary, fontWeight: "700", marginLeft: 6, fontSize: 12 },
  title: { fontSize: 22, fontWeight: "800", color: colors.textPrimary },
  subtitle: { color: colors.textSecondary, marginTop: 2, marginBottom: 12 },

  timeLocCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 12,
  },
  timeRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  timeText: { color: colors.textPrimary, marginLeft: 6, marginRight: 10 },
  separatorDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.textSecondary, marginHorizontal: 8 },
  locRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  locText: { color: colors.textPrimary, marginLeft: 6, flexShrink: 1 },
  distRow: { marginTop: 8 },
  distText: { color: colors.textSecondary, fontSize: 12 },
  directionBtn: { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  directionBtnWide: { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, marginTop: 10, alignSelf: "flex-start" },
  directionText: { color: colors.black, fontWeight: "700", marginRight: 6 },

  organizerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  organizerLeft: { flexDirection: "row", alignItems: "center" },
  organizerAvatar: { width: 34, height: 34, borderRadius: 17, marginRight: 8, backgroundColor: colors.borderLight },
  orgBy: { color: colors.textSecondary, fontSize: 10, fontWeight: "700" },
  orgName: { color: colors.textPrimary, fontWeight: "700" },
  attendees: { flexDirection: "row", alignItems: "center" },
  attendeesText: { color: colors.textSecondary, marginLeft: 6 },

  tagChip: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 8 },
  tagText: { color: colors.textSecondary, fontWeight: "600", fontSize: 12 },

  tabsRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 8, marginBottom: 8 },
  tabItem: { marginRight: 16 },
  tabText: { color: colors.textSecondary, fontWeight: "700" },
  tabActive: { color: colors.textPrimary },
  tabUnderline: { height: 3, backgroundColor: colors.primary, borderRadius: 2, marginTop: 6 },

  sectionHead: { color: colors.textPrimary, fontWeight: "800", fontSize: 16, marginTop: 4, marginBottom: 6 },
  paragraph: { color: colors.textSecondary, lineHeight: 20 },
  readMore: { color: colors.secondary, fontWeight: "700", marginTop: 6 },

  sectionHeaderInline: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  seeAllSmall: { color: colors.secondary, fontWeight: "700", fontSize: 12 },

  guestsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  guestCard: { width: "31%", backgroundColor: colors.card, borderRadius: 12, padding: 8, marginBottom: 10 },
  guestAvatar: { width: "100%", aspectRatio: 1, borderRadius: 10, backgroundColor: colors.borderLight, marginBottom: 6 },
  guestName: { color: colors.textPrimary, fontWeight: "700" },
  guestSub: { color: colors.textSecondary, fontSize: 12 },

  galleryGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  galleryItem: { width: "31%", aspectRatio: 1, borderRadius: 10, overflow: "hidden", marginBottom: 8, backgroundColor: colors.borderLight },
  galleryImage: { width: "100%", height: "100%" },

  bulletRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 6 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textSecondary, marginTop: 7, marginRight: 8 },
  bulletText: { color: colors.textSecondary, flex: 1, lineHeight: 20 },

  venueCard: { backgroundColor: colors.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
  venueName: { color: colors.textPrimary, fontWeight: "800", marginBottom: 6 },
  venueAddress: { color: colors.textSecondary, lineHeight: 20 },

  moreItem: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, marginTop: 8 },
  moreText: { color: colors.textPrimary, fontWeight: "600", marginLeft: 8 },

  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#C3EAFE29",
    backgroundColor: colors.backgroundSecondary,
  },
  startsFrom: { fontSize: 13, color: colors.textPrimary },
  price: { fontSize: 22, fontWeight: "700", color: colors.white },
});

export default EventDetailScreen;
