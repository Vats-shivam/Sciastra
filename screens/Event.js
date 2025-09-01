import React, { useMemo } from "react";
import { View, Text, StyleSheet, Image, TextInput, TouchableOpacity, ScrollView, FlatList } from "react-native";
import colors from "../config/colors";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import EventCard from "../components/EventCard";
import Header from "../components/Header";

const CATEGORIES = [
  { id: "for-you", label: "For You", icon: "star" },
  { id: "seminar", label: "Seminar", icon: " school" },
  { id: "webinar", label: "Webinar", icon: "video" },
  { id: "workshop", label: "Workshop", icon: "hammer-wrench" },
  { id: "meetup", label: "Meetup", icon: "account-group" },
];

const mockEvents = Array.from({ length: 8 }).map((_, i) => ({
  id: `${i + 1}`,
  title: i % 2 === 0 ? "Tech Innovations Workshop" : "Sustainability Panel",
  start_time: "2024-08-15T10:00:00Z",
  location: i % 2 === 0 ? "IIT Delhi" : "Online",
  banner_url: null,
  cheapest_ticket_price: i % 3 === 0 ? 0 : 499,
  event_category: i % 4 === 0 ? "PROMOTION_ONLY" : "PAID",
}));

const mentors = [
  { id: "m1", name: "Riya Kulkarnai" },
  { id: "m2", name: "Nayanika Dey" },
  { id: "m3", name: "Debasish Rath" },
  { id: "m4", name: "Mayank" },
];

function SectionHeader({ title, onSeeAll }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <TouchableOpacity onPress={onSeeAll}>
        <Text style={styles.seeAll}>SEE ALL</Text>
      </TouchableOpacity>
    </View>
  );
}

function CategoryTabs() {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 12 }}
      style={{ marginTop: 10 }}
    >
      {CATEGORIES.map((cat, idx) => (
        <View
          key={cat.id}
          style={[
            styles.catChip,
            idx === 0 && styles.catChipActive,
          ]}
        >
          <Icon
            name={idx === 0 ? "star" : cat.icon || "shape"}
            size={18}
            color={idx === 0 ? colors.black : colors.textPrimary}
          />
          <Text style={[styles.catText, idx === 0 && styles.catTextActive]}>
            {cat.label}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const EventScreen = ({ navigation }) => {
  const goDetail = (event) => navigation.navigate("EventDetail", { event });
  const spotlight = useMemo(() => mockEvents.slice(0, 3), []);
  const featured = useMemo(() => mockEvents.slice(3, 6), []);
  const trending = useMemo(() => mockEvents.slice(1, 5), []);
  const publicEvents = useMemo(() => mockEvents.slice(2, 6), []);
  const college = useMemo(() => mockEvents.slice(0, 4), []);
  const upcoming = useMemo(() => mockEvents.slice(4, 8), []);

  const renderHorizontal = (data) => (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={{ width: 300 }}>
          <EventCard event={item} onPress={() => goDetail(item)} />
        </View>
      )}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 8 }}
    />
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <Header title="EVENTS" />

      {/* Search */}
      <View style={styles.searchBar}>
        <Icon name="magnify" size={22} color={colors.textMuted} />
        <TextInput
          placeholder="Search for events or topics"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
        />
      </View>

      {/* Categories */}
      <CategoryTabs />

      {/* Sections */}
      <View style={{ paddingTop: 8 }}>
        <SectionHeader title="Spotlight Events" onSeeAll={() => {}} />
        {renderHorizontal(spotlight)}

        <SectionHeader title="Featured Events" onSeeAll={() => {}} />
        {renderHorizontal(featured)}

        <SectionHeader title="Trending Events" onSeeAll={() => {}} />
        {renderHorizontal(trending)}

        {/* Mentors row */}
        <SectionHeader title="Meet Our Mentors" onSeeAll={() => {}} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12 }}>
          {mentors.map((m) => (
            <View key={m.id} style={styles.mentorItem}>
              <Image source={require("../assets/icon.png")} style={styles.mentorAvatar} />
              <Text style={styles.mentorName} numberOfLines={1}>{m.name}</Text>
            </View>
          ))}
        </ScrollView>

        <SectionHeader title="Public Events" onSeeAll={() => {}} />
        {renderHorizontal(publicEvents)}

        <SectionHeader title="College Events" onSeeAll={() => {}} />
        {renderHorizontal(college)}

        <SectionHeader title="Upcoming Events" onSeeAll={() => {}} />
        {renderHorizontal(upcoming)}
      </View>

      {/* Footer */}
      <View style={styles.footer}> 
        <Text style={styles.footerTitle}>LOREM IPSUM DOLOR</Text>
        <Text style={styles.footerMade}>Made with 💙 in India</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({

  searchBar: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 42,
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: { marginLeft: 8, color: colors.textPrimary, flex: 1, fontSize: 14 },

  catChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 10,
  },
  catChipActive: { backgroundColor: colors.white },
  catText: { marginLeft: 8, color: colors.textPrimary, fontWeight: "600" },
  catTextActive: { color: colors.black },

  sectionHeader: {
    marginTop: 18,
    marginBottom: 6,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { color: colors.textPrimary, fontWeight: "800", fontSize: 16 },
  seeAll: { color: colors.secondary, fontWeight: "700", fontSize: 12 },

  mentorItem: { alignItems: "center", marginHorizontal: 10 },
  mentorAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.borderLight },
  mentorName: { color: colors.textSecondary, fontSize: 12, marginTop: 6, width: 80, textAlign: "center" },

  footer: { paddingHorizontal: 16, paddingVertical: 28 },
  footerTitle: { color: colors.textPrimary, fontSize: 22, fontWeight: "800", marginBottom: 6 },
  footerMade: { color: colors.textSecondary, fontSize: 12 },
});

export default EventScreen;
