import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
  SafeAreaView,
  BackHandler,
} from "react-native";
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation, useRoute } from "@react-navigation/native";
import colors from "../config/colors";
import postApi from "../api/PostApi";
import PostCard from "../components/PostCard";
import { PostSkeleton, SearchResultsSkeleton } from "../components/skeletons";
import Header from "../components/Header";
import { useLoader } from "../context/LoaderContext";
import useScreenApiLogger from "../hooks/useScreenApiLogger";
import CustomRefreshControl from "../components/CustomRefreshControl";
import { getProfileImageSource } from "../utils/profileImage";
import { useFeedRefresh } from "../contexts/FeedRefreshContext";

const trendingSearches = ["React Native", "AI", "Blockchain", "Jobs", "Events"];
const POSTS_PER_PAGE = 20;

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
  const route = useRoute();
  const { showLoader, hideLoader } = useLoader();
  const { registerUpdatePostReaction } = useFeedRefresh() || {};
  const { registerRemovePostsByAuthor } = useFeedRefresh() || {};
  const [searching, setSearching] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [feedPosts, setFeedPosts] = useState([]);
  const [searchResultsPosts, setSearchResultsPosts] = useState([]);
  const [searchResultsPeople, setSearchResultsPeople] = useState([]);
  const [searchResultsTopics, setSearchResultsTopics] = useState([]);
  const [searchAvatarErrors, setSearchAvatarErrors] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const loadingMoreRef = useRef(false);
  const lastPageRef = useRef(null);
  const lastLoadMoreAtRef = useRef(0);

  useScreenApiLogger("Home");

  useEffect(() => {
    loadFeedPosts();
  }, []);

  useEffect(() => {
    if (__DEV__) {
      console.log(`[Feed] Total posts rendered: ${feedPosts.length}`);
    }
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

  const loadFeedPosts = async (page = null, skipLoader = false) => {
    const isLoadMore = page !== null && page > 1;
    const fetchPage = page ?? 1;

    if (isLoadMore) {
      if (__DEV__) console.log(`[Feed] Load-more requested, page=${fetchPage}`);
      if (loadingMoreRef.current || loadingMore || !hasMore) {
        if (__DEV__) console.log("[Feed] Skipping load-more (already loading or no more data)");
        return;
      }
      if (fetchPage === lastPageRef.current) {
        if (__DEV__) console.log(`[Feed] Skipping load-more, page ${fetchPage} already processed`);
        return;
      }
      loadingMoreRef.current = true;
      setLoadingMore(true);
      lastPageRef.current = fetchPage;
    } else {
      if (__DEV__) console.log("[Feed] Initial feed load");
      lastPageRef.current = null;
    }

    try {
      if (__DEV__) console.log(`[Feed] Fetching posts (${isLoadMore ? `page=${fetchPage}` : "initial"})`);
      const result = await postApi.getFeedPosts(fetchPage, POSTS_PER_PAGE);
      if (result.success) {
        const posts = result.data.posts || [];
        if (__DEV__) {
          console.log(
            `[Feed] API returned ${posts.length} post(s) for ${isLoadMore ? "load-more" : "initial"}:`,
            posts.map((p) => p.id)
          );
        }
        const pagination = result.data.pagination || {};

        if (isLoadMore) {
          setFeedPosts((prev) => {
            const existingIds = new Set(prev.map((p) => p?.id).filter(Boolean));
            const uniqueNew = posts.filter((post) => post?.id && !existingIds.has(post.id));
            if (__DEV__ && uniqueNew.length < posts.length) {
              console.log(`[Feed] Deduped: ${posts.length} -> ${uniqueNew.length} new posts`);
            }
            return uniqueNew.length ? [...prev, ...uniqueNew] : prev;
          });
        } else {
          setFeedPosts(posts);
          setInitialLoading(false);
        }

        setCurrentPage(fetchPage);
        let nextHasMore = pagination.hasMore;
        if (nextHasMore === undefined) {
          nextHasMore = posts.length >= POSTS_PER_PAGE;
        }
        if (posts.length === 0) nextHasMore = false;
        setHasMore(Boolean(nextHasMore));
        if (__DEV__) console.log(`[Feed] Page ${fetchPage}, hasMore: ${nextHasMore}`);
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
        setInitialLoading(false);
      }
    }
  };

  const updatePostReactionInFeed = useCallback((postId, { added, reactionType = 'LIKE' }) => {
    setFeedPosts((prev) =>
      prev.map((p) => {
        if (p?.id !== postId) return p;
        const currentCount = p.counts?.reactions ?? 0;
        const newCount = Math.max(0, currentCount + (added ? 1 : -1));
        return {
          ...p,
          counts: { ...p.counts, reactions: newCount },
          userReaction: added ? reactionType : null,
        };
      })
    );
    setSearchResultsPosts((prev) =>
      prev.map((p) => {
        if (p?.id !== postId) return p;
        const currentCount = p.counts?.reactions ?? 0;
        const newCount = Math.max(0, currentCount + (added ? 1 : -1));
        return {
          ...p,
          counts: { ...p.counts, reactions: newCount },
          userReaction: added ? reactionType : null,
        };
      })
    );
  }, []);

  useEffect(() => {
    return registerUpdatePostReaction?.(updatePostReactionInFeed);
  }, [registerUpdatePostReaction, updatePostReactionInFeed]);

  // Register removal callback to instantly remove posts from feed when a user blocks another user
  useEffect(() => {
    const removePostsByAuthor = (authorId) => {
      setFeedPosts((prev) => prev.filter((p) => String(p?.author?.id || p?.authorId) !== String(authorId)));
      setSearchResultsPosts((prev) => prev.filter((p) => String(p?.author?.id || p?.authorId) !== String(authorId)));
    };
    return registerRemovePostsByAuthor?.(removePostsByAuthor);
  }, [registerRemovePostsByAuthor]);

  const handleLoadMore = useCallback(() => {
    if (loadingMoreRef.current || loadingMore || !hasMore) return;

    // Throttle to avoid repeated triggers during fast scrolling.
    const now = Date.now();
    if (now - lastLoadMoreAtRef.current < 800) return;
    lastLoadMoreAtRef.current = now;

    loadFeedPosts(currentPage + 1);
  }, [loadingMore, hasMore, currentPage]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadFeedPosts(1, true); // Reset to page 1
    } finally {
      setRefreshing(false);
    }
  };

  const performSearch = async (query) => {
    if (!query.trim()) {
        setSearchResultsPosts([]);
        setSearchResultsPeople([]);
        setSearchAvatarErrors({});
      setSearchLoading(false);
      return;
    }

    // Don't search if query is less than 2 characters
    if (query.trim().length < 2) {
        setSearchResultsPosts([]);
        setSearchResultsPeople([]);
        setSearchAvatarErrors({});
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
        setSearchAvatarErrors({});
      } else {
        // Don't log short query validation as an error
        if (searchResult.message?.includes('at least 2 characters')) {
          // Just clear results for short queries - this is expected behavior
        setSearchResultsPosts([]);
        setSearchResultsPeople([]);
        setSearchAvatarErrors({});
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
        setSearchAvatarErrors({});
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
      setSearchAvatarErrors({});
    } finally {
      setSearchLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchText("");
    setSearchResultsPosts([]);
    setSearchResultsPeople([]);
    setSearchResultsTopics([]);
    setSearchAvatarErrors({});
    setSearchLoading(false);
  };

  useEffect(() => {
    const resetToFeed = route.params?.resetToFeed;
    if (resetToFeed) {
      setSearching(false);
      clearSearch();
      navigation.setParams({ resetToFeed: undefined });
    }
  }, [route.params?.resetToFeed]);

  // Handle Android hardware back button: when searching, consume back press to exit search mode
  useEffect(() => {
    const onBackPress = () => {
      if (searching) {
        setSearching(false);
        clearSearch();
        return true; // handled
      }
      return false; // allow default behavior
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [searching, clearSearch]);

  const keyExtractor = useCallback((item) => String(item?.id ?? ""), []);
  const feedContentContainerStyle = useMemo(
    () => ({ paddingHorizontal: 12, paddingBottom: 100 }),
    []
  );
  const handlePostDeleted = useCallback((postId) => {
    setFeedPosts((prev) => prev.filter((p) => p?.id !== postId));
  }, []);

  const handleSearchPostDeleted = useCallback((postId) => {
    setSearchResultsPosts((prev) => prev.filter((p) => p?.id !== postId));
  }, []);

  const renderFeedItem = useCallback(
    ({ item }) => <PostCard post={item} onPostDeleted={handlePostDeleted} />,
    [handlePostDeleted]
  );
  const feedFooter = useMemo(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }, [loadingMore]);

  const FeedSkeletonList = () => (
    <View style={{ paddingHorizontal: 12, paddingBottom: 100 }}>
      {[1, 2, 3].map((i) => <PostSkeleton key={i} />)}
    </View>
  );

  const renderFeed = () => (
    <FlatList
      data={feedPosts}
      keyExtractor={keyExtractor}
      renderItem={renderFeedItem}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={feedContentContainerStyle}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.2}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={5}
      updateCellsBatchingPeriod={50}
      removeClippedSubviews={Platform.OS === "android"}
      refreshControl={
        <CustomRefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      }
      ListEmptyComponent={initialLoading ? FeedSkeletonList : null}
      ListFooterComponent={feedFooter}
    />
  );

  const renderSearchResults = () => {
    const hasResults =
      searchResultsPosts.length > 0 ||
      searchResultsPeople.length > 0 ||
      searchResultsTopics.length > 0;
    const showNoResults = !searchLoading && searchText.trim().length >= 2 && !hasResults;

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={{ backgroundColor: colors.background, flex: 1, paddingTop: 8 }}>
          {searchLoading ? (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.searchSkeletonContent}
              showsVerticalScrollIndicator={false}
            >
              <SearchResultsSkeleton />
            </ScrollView>
          ) : showNoResults ? (
            <View style={styles.noResultsContainer}>
              <Icon name="magnify-remove" size={64} color={colors.textMuted} />
              <Text style={styles.noResultsText}>No results found</Text>
              <Text style={styles.noResultsSubtext}>Try different keywords or search terms</Text>
            </View>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {searchResultsTopics.length > 0 && (
                <>
                  <Text style={styles.sectionHeader}>Topics</Text>
                  <View style={styles.topicChipsRow}>
                    {searchResultsTopics.map((topic) => (
                      <TouchableOpacity
                        key={topic.id}
                        style={styles.topicChip}
                        onPress={() => setSearchText(topic.name)}
                        activeOpacity={0.7}
                      >
                        <Icon name="tag" size={16} color={colors.primary} />
                        <Text style={styles.topicChipText}>{topic.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
              {searchResultsPeople.length > 0 && (
                <>
                  <Text style={styles.sectionHeader}>People</Text>
                  {searchResultsPeople.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.peopleCard}
                      onPress={() => {
                        if (item.id === "1") {
                          navigation.navigate("ProfileTab");
                        } else {
                          navigation.navigate("UserProfile", { userId: item.id });
                        }
                      }}
                    >
                      <Image
                        source={
                          searchAvatarErrors[item.id]
                            ? require("../assets/scix.png")
                            : getProfileImageSource(item, { fallbackKey: item.profilePic })
                        }
                        style={styles.avatarSmall}
                        resizeMode="cover"
                        defaultSource={require("../assets/scix.png")}
                        onError={() =>
                          setSearchAvatarErrors((prev) => ({ ...prev, [item.id]: true }))
                        }
                      />
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.personName}>{item.name}</Text>
                        <Text style={styles.subTitle}>{item.profession || item.bio || ""}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}
              {searchResultsPosts.length > 0 && (
                <>
                  <Text style={styles.sectionHeader}>Posts</Text>
                  {searchResultsPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onPostDeleted={handleSearchPostDeleted}
                    />
                  ))}
                </>
              )}
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
      </SafeAreaView>
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
            { paddingTop: (StatusBar.currentHeight || 0) }
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
  topicChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  topicChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  topicChipText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Medium',
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
  searchSkeletonContent: {
    flexGrow: 1,
    paddingBottom: 24,
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
