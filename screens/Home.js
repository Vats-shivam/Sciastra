import React, { useState, useEffect, useRef } from "react";
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
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import colors from "../config/colors";
import postApi from "../api/PostApi";
import PostCard from "../components/PostCard";
import Header from "../components/Header";
import { useLoader } from "../context/LoaderContext";
import useScreenApiLogger from "../hooks/useScreenApiLogger";
import CustomRefreshControl from "../components/CustomRefreshControl";

const trendingSearches = ["React Native", "AI", "Blockchain", "Jobs", "Events"];
const POSTS_PER_PAGE = 50;

// Fisher-Yates shuffle algorithm
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const HomeScreen = () => {
  const navigation = useNavigation();
  const { showLoader, hideLoader } = useLoader();
  const insets = useSafeAreaInsets();
  const [searching, setSearching] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [feedPosts, setFeedPosts] = useState([]);
  const [searchResultsPosts, setSearchResultsPosts] = useState([]);
  const [searchResultsPeople, setSearchResultsPeople] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const loadingMoreRef = useRef(false);
  const lastCursorRef = useRef(null);
  const seenPostIdsRef = useRef(new Set());

  useScreenApiLogger("Home");

  useEffect(() => {
    loadFeedPosts();
  }, []);

  useEffect(() => {
    console.log(`[Feed] Total posts rendered: ${feedPosts.length}`);
  }, [feedPosts]);

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

  const loadFeedPosts = async (cursor = null, skipLoader = false) => {
    const isLoadMore = Boolean(cursor);

    if (isLoadMore) {
      console.log(`[Feed] Load-more requested with lastPostId=${cursor}`);
      if (loadingMoreRef.current || loadingMore || !hasMore) {
        console.log("[Feed] Skipping load-more (already loading or no more data)");
        return;
      }
      if (cursor === lastCursorRef.current) {
        console.log(`[Feed] Skipping load-more, cursor ${cursor} already processed`);
        return;
      }
      loadingMoreRef.current = true;
      setLoadingMore(true);
      lastCursorRef.current = cursor;
    } else {
      console.log("[Feed] Initial feed load");
      // Reset bookkeeping for a fresh load
      seenPostIdsRef.current = new Set();
      lastCursorRef.current = null;
      if (!skipLoader) {
        showLoader();
      }
    }

    try {
      console.log(`[Feed] Fetching posts (${isLoadMore ? `cursor=${cursor}` : "initial"})`);
      const result = await postApi.getFeedPosts(cursor, POSTS_PER_PAGE);
      if (result.success) {
        const posts = result.data.posts || [];
        console.log(
          `[Feed] API returned ${posts.length} post(s) for ${isLoadMore ? "load-more" : "initial"}:`,
          posts.map((p) => p.id)
        );
        const pagination = result.data.pagination || {};
        let appendedCount = posts.length;

        if (isLoadMore) {
          const uniqueNew = [];
          posts.forEach((post) => {
            const postId = post?.id;
            if (postId && seenPostIdsRef.current.has(postId)) {
              return;
            }
            if (postId) {
              seenPostIdsRef.current.add(postId);
            }
            uniqueNew.push(post);
          });
          appendedCount = uniqueNew.length;
          console.log(
            "[Feed] Unique new post IDs (after dedup):",
            uniqueNew.map((p) => p.id)
          );
          setFeedPosts((prev) =>
            uniqueNew.length ? [...prev, ...uniqueNew] : prev
          );
        } else {
          // Seed the seen set so subsequent pages can deduplicate reliably
          seenPostIdsRef.current = new Set(
            posts.filter((p) => p?.id).map((p) => p.id)
          );
          // Shuffle posts on refresh/initial load
          const shuffledPosts = shuffleArray(posts);
          setFeedPosts(shuffledPosts);
        }

        const newCursor = pagination.nextCursor || null;
        setNextCursor(newCursor);
        console.log(
          `[Feed] Updated next cursor: ${newCursor ?? "null"}`
        );

        let nextHasMore = pagination.hasMore;
        if (nextHasMore === undefined) {
          nextHasMore = newCursor !== null;
        }

        if (posts.length === 0 || (isLoadMore && appendedCount === 0)) {
          nextHasMore = false;
        }

        setHasMore(Boolean(nextHasMore));
      } else {
        console.error("Failed to load feed posts:", result.message);
        if (!isLoadMore) {
          setFeedPosts([]);
        }
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading feed posts:", error);
      if (!isLoadMore) {
        setFeedPosts([]);
      }
      setHasMore(false);
    } finally {
      if (isLoadMore) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      } else {
        if (!skipLoader) {
          hideLoader();
        }
      }
    }
  };

  const handleLoadMore = () => {
    if (loadingMore || !hasMore || !nextCursor) {
      return;
    }
    loadFeedPosts(nextCursor);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadFeedPosts(null, true); // Skip loader during refresh
    } finally {
      setRefreshing(false);
    }
  };

  const performSearch = async (query) => {
    if (!query.trim()) {
      setSearchResultsPosts([]);
      setSearchResultsPeople([]);
      setSearchLoading(false);
      return;
    }

    // Don't search if query is less than 2 characters
    if (query.trim().length < 2) {
      setSearchResultsPosts([]);
      setSearchResultsPeople([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
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
          setSearchLoading(false);
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
    } finally {
      setSearchLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchText("");
    setSearchResultsPosts([]);
    setSearchResultsPeople([]);
    setSearchLoading(false);
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
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
      refreshControl={
        <CustomRefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      }
      ListFooterComponent={() =>
        loadingMore ? (
          <View style={styles.footerLoader}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : null
      }
    />
  );

  const renderSearchResults = () => {
    const hasResults = searchResultsPosts.length > 0 || searchResultsPeople.length > 0;
    const showNoResults = !searchLoading && searchText.trim().length >= 2 && !hasResults;

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={{ backgroundColor: colors.background, flex: 1 }}>
          {searchLoading ? (
            <View style={styles.searchLoadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.searchLoadingText}>Searching...</Text>
            </View>
          ) : showNoResults ? (
            <View style={styles.noResultsContainer}>
              <Icon name="magnify-remove" size={64} color={colors.textMuted} />
              <Text style={styles.noResultsText}>No results found</Text>
              <Text style={styles.noResultsSubtext}>Try different keywords or search terms</Text>
            </View>
          ) : (
            <>
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
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} translucent={false} />
      {/* Header with Search */}
      <View style={styles.headerContainer}>
        {!searching ? (
          <Header
            title="SCICOMM"
            showSearchIcon={true}
            showChatIcon={true}
            onSearchPress={() => setSearching(true)}
            onChatPress={() => navigation.navigate("ChatList")}
          />
        ) : (
          <View style={[
            styles.searchBarContainer,
            { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0 }
          ]}>
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
  searchBarContainer: {
    paddingHorizontal: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 20,
    height: 40,
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
    fontFamily: 'Gilroy-SemiBold',
    fontSize: 14,
  },

  sectionHeader: {
    fontFamily: 'Gilroy-Bold',
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
  personName: { fontFamily: 'Gilroy-SemiBold', fontSize: 15, color: colors.primary },
  subTitle: { fontSize: 12, color: colors.textSecondary },
  footerLoader: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  searchLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  searchLoadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Gilroy-Medium',
    color: colors.textSecondary,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 32,
  },
  noResultsText: {
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default HomeScreen;
