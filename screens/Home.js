// screens/HomeScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import colors from "../config/colors";
import { api } from "../api/MockApi";
import PostCard from "../components/PostCard";
import Header from "../components/Header";

const trendingSearches = ["React Native", "AI", "Blockchain", "Jobs", "Events"];

const HomeScreen = () => {
  const navigation = useNavigation();
  const [searching, setSearching] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [feedPosts, setFeedPosts] = useState([]);
  const [searchResultsPosts, setSearchResultsPosts] = useState([]);
  const [searchResultsPeople, setSearchResultsPeople] = useState([]);

  useEffect(() => {
    api.fetchFeedPosts().then(setFeedPosts);
  }, []);

  const performSearch = (query) => {
    const lowerQ = query.toLowerCase();
    setSearchResultsPosts(
      feedPosts.filter(
        (p) =>
          p.text.toLowerCase().includes(lowerQ) ||
          p.author.toLowerCase().includes(lowerQ)
      )
    );
    api.fetchSuggestedConnections().then((users) => {
      setSearchResultsPeople(
        users.filter((u) => u.name.toLowerCase().includes(lowerQ))
      );
    });
  };

  const clearSearch = () => {
    setSearchText("");
    setSearchResultsPosts([]);
    setSearchResultsPeople([]);
  };

  const renderFeed = () => (
  <FlatList
    data={feedPosts}
    keyExtractor={(item) => item.id}
    renderItem={({ item }) => <PostCard post={item} />}
    showsVerticalScrollIndicator={false}
    contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 100 }}
  />
);

  const renderSearchResults = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <View style={{ backgroundColor: colors.background, flex: 1 }}>
        {searchResultsPosts.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>Posts</Text>
            <FlatList
              data={searchResultsPosts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <PostCard post={item} />}
              showsVerticalScrollIndicator={false}
            />
          </>
        )}
        {searchResultsPeople.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>People</Text>
            <FlatList
              data={searchResultsPeople}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.peopleCard}
                  onPress={() =>
                    navigation.navigate("UserProfile", { userId: item.id })
                  }
                >
                  <Image
                    source={
                      item.profilePic
                        ? { uri: item.profilePic }
                        : require("../assets/icon.png")
                    }
                    style={styles.avatarSmall}
                  />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.personName}>{item.name}</Text>
                    <Text style={styles.subTitle}>{item.bio}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      {!searching ? (
        <Header 
          title="SCICOMM" 
          showSearchIcon={true} 
          showChatIcon={true}
          onSearchPress={() => setSearching(true)}
          onChatPress={() => navigation.navigate("ChatList")}
        />
      ) : (
        <View style={styles.searchBar}>
          <Icon
            name="arrow-left"
            size={24}
            color={colors.textPrimary}
            onPress={() => {
              setSearching(false);
              clearSearch();
            }}
          />
          <TextInput
            autoFocus
            placeholder="Search posts or people"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            value={searchText}
            onChangeText={(text) => {
              setSearchText(text);
              performSearch(text);
            }}
          />
        </View>
      )}

      {/* Trending Chips */}
      {searching && !searchText && (
        <View style={styles.breadcrumbs}>
          {trendingSearches.map((item) => (
            <TouchableOpacity
              key={item}
              onPress={() => {
                setSearchText(item);
                performSearch(item);
              }}
              style={styles.crumb}
              activeOpacity={0.7}
            >
              <Text style={styles.crumbText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Feed or Search Results */}
      <View style={{ flex: 1 }}>
        {searching ? renderSearchResults() : renderFeed()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 20,
    flex: 1,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    marginLeft: 8,
    fontSize: 15,
    flex: 1,
    color: colors.textPrimary,
  },

  breadcrumbs: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.background,
  },
  crumb: {
    backgroundColor: colors.accent,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    margin: 4,
    shadowColor: colors.black,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 2,
  },
  crumbText: {
    color: colors.textPrimary,
    fontWeight: "600",
    fontSize: 14,
  },

  sectionHeader: {
    fontWeight: "700",
    fontSize: 18,
    marginVertical: 8,
    paddingLeft: 16,
    color: colors.textPrimary,
  },
  peopleCard: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    alignItems: "center",
    shadowColor: colors.black,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 1,
  },
  avatarSmall: { width: 42, height: 42, borderRadius: 21 },
  personName: { fontWeight: "600", fontSize: 15, color: colors.primary },
  subTitle: { fontSize: 12, color: colors.textSecondary },
});

export default HomeScreen;
