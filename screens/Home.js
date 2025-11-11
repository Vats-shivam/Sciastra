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
  StatusBar,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import colors from "../config/colors";
import postApi from "../api/PostApi";
import PostCard from "../components/PostCard";
import Header from "../components/Header";
import { useLoader } from "../context/LoaderContext";
import useScreenApiLogger from "../hooks/useScreenApiLogger";

const trendingSearches = ["React Native", "AI", "Blockchain", "Jobs", "Events"];

const HomeScreen = () => {
  const navigation = useNavigation();
  const { showLoader, hideLoader } = useLoader();
  const [searching, setSearching] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [feedPosts, setFeedPosts] = useState([]);
  const [searchResultsPosts, setSearchResultsPosts] = useState([]);
  const [searchResultsPeople, setSearchResultsPeople] = useState([]);

  useScreenApiLogger("Home");

  useEffect(() => {
    loadFeedPosts();
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (!searching) return;

    const timeoutId = setTimeout(() => {
      performSearch(searchText);
    }, 500); // 500ms debounce

    return () => {
      clearTimeout(timeoutId);
    };
  }, [searchText, searching]);

  const loadFeedPosts = async () => {
    showLoader();
    try {
      const result = await postApi.getFeedPosts(null, 15);
      if (result.success) {
        setFeedPosts(result.data.posts || []);
      } else {
        console.error('Failed to load feed posts:', result.message);
        setFeedPosts([]);
      }
    } catch (error) {
      console.error('Error loading feed posts:', error);
      setFeedPosts([]);
    } finally {
      hideLoader();
    }
  };

  const performSearch = async (query) => {
    if (!query.trim()) {
      setSearchResultsPosts([]);
      setSearchResultsPeople([]);
      return;
    }

    // Don't search if query is less than 2 characters
    if (query.trim().length < 2) {
      setSearchResultsPosts([]);
      setSearchResultsPeople([]);
      return;
    }

    try {
      // Search using the new PostApi
      const searchResult = await postApi.search(query, 'all', 1, 10);
      
      if (searchResult.success) {
        const data = searchResult.data;
        setSearchResultsPosts(data.posts || []);
        setSearchResultsPeople(data.users || []);
      } else {
        // Don't log short query validation as an error
        if (searchResult.message?.includes('at least 2 characters')) {
          // Just clear results for short queries - this is expected behavior
          setSearchResultsPosts([]);
          setSearchResultsPeople([]);
          return;
        }
        // Fallback to local search
        const lowerQ = query.toLowerCase();
        setSearchResultsPosts(
          feedPosts.filter(
            (p) =>
              (p.text && p.text.toLowerCase().includes(lowerQ)) ||
              (p.content && p.content.toLowerCase().includes(lowerQ)) ||
              (p.author && p.author.toLowerCase().includes(lowerQ))
          )
        );
        
        setSearchResultsPeople([]);
      }
    } catch (error) {
      // Fallback to local search
      const lowerQ = query.toLowerCase();
      setSearchResultsPosts(
        feedPosts.filter(
          (p) =>
            (p.text && p.text.toLowerCase().includes(lowerQ)) ||
            (p.content && p.content.toLowerCase().includes(lowerQ)) ||
            (p.author && p.author.toLowerCase().includes(lowerQ))
        )
      );
      
      setSearchResultsPeople([]);
    }
  };

  const clearSearch = () => {
    setSearchText("");
    setSearchResultsPosts([]);
    setSearchResultsPeople([]);
  };

  const handlePostClick = async (postId) => {
    showLoader();
    try {
      await postApi.getPostById(postId);
    } catch (error) {
      console.error('Error preloading post details:', error);
    } finally {
      navigation.navigate("PostDetail", { postId });
      hideLoader();
    }
  };

  const renderFeed = () => (
    <FlatList
      data={feedPosts}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <PostCard post={item} onPress={() => handlePostClick(item.id)} />
      )}
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
                  onPress={() => {
                    // Check if this is the current user
                    if (item.id === "1") {
                      // Current user ID is '1'
                      navigation.navigate("Profile");
                    } else {
                      navigation.navigate("UserProfile", { userId: item.id });
                    }
                  }}
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
      {/* Header with Search */}
      <View style={[
        styles.headerContainer,
        searching && styles.headerContainerSearching
      ]}>
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
            <TouchableOpacity
              onPress={() => {
                setSearching(false);
                clearSearch();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon
                name="arrow-left"
                size={20}
                color={colors.textPrimary}
              />
            </TouchableOpacity>
            <TextInput
              autoFocus
              placeholder="Search posts or people"
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
        )}
      </View>

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
  headerContainer: {
    paddingBottom: 8,
    backgroundColor: colors.background,
  },
  headerContainerSearching: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 8 : 44,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 20,
    height: 40,
    marginHorizontal: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
    color: colors.textPrimary,
    height: 38,
    padding: 0,
    margin: 0,
    includeFontPadding: false,
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
