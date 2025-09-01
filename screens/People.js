import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  ScrollView,
} from "react-native";
import colors from "../config/colors";
import Container from "../components/Container";
import Header from "../components/Header";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

const mockConnections = Array.from({ length: 50 }, (_, i) => ({
  id: `${i + 1}`,
  name: `Connection ${i + 1}`,
  designation: i % 2 === 0 ? "Software Engineer" : "Designer",
  profilePic: null,
  mutualConnections: Math.floor(Math.random() * 10), // mocked
}));

const mockInvites = Array.from({ length: 30 }, (_, i) => ({
  id: `${i + 51}`,
  name: `Invite ${i + 1}`,
  designation: i % 3 === 0 ? "Student" : "Product Manager",
  profilePic: null,
}));

const PEOPLE_CATEGORIES = [
  { id: "invites", label: "Invites", icon: "account-plus" },
  { id: "connections", label: "Connections", icon: "account-group" },
];

const ConnectionsScreen = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("invites");
  const [showMoreConnections, setShowMoreConnections] = useState(false);
  const [showMoreInvites, setShowMoreInvites] = useState(false);

  const filteredConnections = useMemo(
    () =>
      mockConnections.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.designation.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [searchQuery]
  );

  const filteredInvites = useMemo(
    () =>
      mockInvites.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.designation.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [searchQuery]
  );

  const renderConnection = useCallback(({ item }) => {
    return (
      <View style={styles.card}>
        <Image
          source={
            item.profilePic
              ? { uri: item.profilePic }
              : require("../assets/icon.png")
          }
          style={styles.avatar}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.designation}>{item.designation}</Text>
          <Text style={styles.mutual}>
            {item.mutualConnections} mutual connections
          </Text>
        </View>
        <TouchableOpacity style={styles.actionBtn}>
          <Text style={styles.actionBtnText}>Message</Text>
        </TouchableOpacity>
      </View>
    );
  }, []);

  const renderInvite = useCallback(({ item }) => {
    return (
      <View style={styles.card}>
        <Image
          source={
            item.profilePic
              ? { uri: item.profilePic }
              : require("../assets/icon.png")
          }
          style={styles.avatar}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.designation}>{item.designation}</Text>
        </View>
        <View style={{ flexDirection: "row" }}>
          <TouchableOpacity style={styles.acceptBtn}>
            <Text style={styles.acceptText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ignoreBtn}>
            <Text style={styles.ignoreText}>Ignore</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, []);

  const renderCategoryTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 12 }}
      style={{ marginTop: 10 }}
    >
      {PEOPLE_CATEGORIES.map((cat, idx) => (
        <TouchableOpacity
          key={cat.id}
          style={[
            styles.catChip,
            activeCategory === cat.id && styles.catChipActive,
          ]}
          onPress={() => setActiveCategory(cat.id)}
        >
          <Icon
            name={cat.icon}
            size={18}
            color={activeCategory === cat.id ? colors.black : colors.textPrimary}
          />
          <Text style={[styles.catText, activeCategory === cat.id && styles.catTextActive]}>
            {cat.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderContent = () => {
    if (activeCategory === "invites") {
      return (
        <>
          <FlatList
            data={
              showMoreInvites ? filteredInvites : filteredInvites.slice(0, 5)
            }
            keyExtractor={(item) => item.id}
            renderItem={renderInvite}
          />
          {filteredInvites.length > 5 && (
            <TouchableOpacity
              onPress={() => setShowMoreInvites(!showMoreInvites)}
              style={styles.showMoreBtn}
            >
              <Text style={styles.showMoreText}>
                {showMoreInvites ? "Show less" : "Show more"}
              </Text>
            </TouchableOpacity>
          )}
        </>
      );
    } else {
      return (
        <>
          <FlatList
            data={
              showMoreConnections
                ? filteredConnections
                : filteredConnections.slice(0, 10)
            }
            keyExtractor={(item) => item.id}
            renderItem={renderConnection}
          />
          {filteredConnections.length > 10 && (
            <TouchableOpacity
              onPress={() => setShowMoreConnections(!showMoreConnections)}
              style={styles.showMoreBtn}
            >
              <Text style={styles.showMoreText}>
                {showMoreConnections ? "Show less" : "Show more"}
              </Text>
            </TouchableOpacity>
          )}
        </>
      );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <Header title="PEOPLE" />
      
      <Container style={styles.container}>
        {/* Search Bar */}
        <TextInput
          style={styles.searchBar}
          placeholder="Search connections & invites..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {/* Category Tabs */}
        {renderCategoryTabs()}

        {/* Content based on selected category */}
        {renderContent()}
      </Container>
    </View>
  );
};

export default ConnectionsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  searchBar: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.white,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 12,
    color: colors.textPrimary,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: colors.black,
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: colors.borderLight, // fallback if no image
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  designation: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  mutual: {
    fontSize: 12,
    color: colors.textMuted,
  },
  actionBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnText: {
    color: colors.textInverse,
    fontWeight: "600",
  },
  acceptBtn: {
    backgroundColor: colors.success,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 6,
  },
  acceptText: {
    color: colors.textInverse,
    fontWeight: "600",
  },
  ignoreBtn: {
    backgroundColor: colors.backgroundElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  ignoreText: {
    color: colors.textMuted,
    fontWeight: "600",
  },
  showMoreBtn: {
    alignItems: "center",
    paddingVertical: 6,
  },
  showMoreText: {
    color: colors.secondary, // softer cyan for "show more"
    fontWeight: "600",
  },
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
    height: 42,
    marginBottom: 30,
  },
  catChipActive: { backgroundColor: colors.white },
  catText: { marginLeft: 8, color: colors.textPrimary, fontWeight: "600" },
  catTextActive: { color: colors.black },

  catText: { 
    marginLeft: 8, 
    color: colors.textPrimary, 
    fontWeight: "600",
    fontSize: 14,
  },
  catTextActive: { 
    color: colors.black 
  },
});