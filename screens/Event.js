import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, FlatList, RefreshControl } from "react-native";
import colors from "../config/colors";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import EventCard from "../components/EventCard";
import Header from "../components/Header";
import eventsApi from "../api/EventsApi";
import { useLoader } from "../context/LoaderContext";

const DEFAULT_CATEGORIES = [
  { id: "for-you", label: "For You", icon: "star" },
  { id: "FEATURED", label: "Featured", icon: "star-outline" },
  { id: "SPOTLIGHT", label: "Spotlight", icon: "spotlight-beam" },
  { id: "TRENDING", label: "Trending", icon: "trending-up" },
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

function CategoryTabs({ categories, selectedCategory, onCategorySelect }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 12 }}
      style={{ marginTop: 10 }}
    >
      {categories.map((cat) => {
        const isActive = selectedCategory === cat.id;
        return (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.catChip,
              isActive && styles.catChipActive,
            ]}
            onPress={() => onCategorySelect(cat.id)}
          >
            <Icon
              name={cat.icon || "shape"}
              size={18}
              color={isActive ? colors.black : colors.textPrimary}
            />
            <Text style={[styles.catText, isActive && styles.catTextActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const EventScreen = ({ navigation }) => {
  const { showLoader, hideLoader } = useLoader();
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('for-you');

  const goDetail = (event) => navigation.navigate("EventDetail", { event });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedCategory !== 'for-you') {
      loadEventsByCategory(selectedCategory);
    } else {
      loadAllEvents();
    }
  }, [selectedCategory]);

  const loadInitialData = async () => {
    setLoading(true);
    showLoader();
    try {
      // Load categories
      const categoriesResult = await eventsApi.getAvailableCategories();
      if (categoriesResult.success) {
        const apiCategories = categoriesResult.data.categories.map(cat => ({
          id: cat.id,
          label: cat.name,
          icon: getIconForCategory(cat.id),
        }));
        setCategories([DEFAULT_CATEGORIES[0], ...apiCategories]); // Keep "For You" first
      }

      // Load all events for "For You" tab
      await loadAllEvents();
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
      hideLoader();
    }
  };

  const loadAllEvents = async () => {
    try {
      console.log('Loading all events...');
      setLoading(true);
      const result = await eventsApi.getAllEvents(1, 50); // Load more events
      console.log('All events result:', result);
      
      if (result.success) {
        // Handle the response structure where events are in result.data.events
        const eventsData = Array.isArray(result.data) 
          ? result.data 
          : (result.data?.events || result.data?.data || []);
          
        console.log('Processed events data:', eventsData);
        setEvents(eventsData);
      } else {
        console.error('Failed to load events:', result.message);
      }
    } catch (error) {
      console.error('Error loading all events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIconForCategory = (categoryId) => {
    switch (categoryId) {
      case 'FEATURED': return 'star-outline';
      case 'SPOTLIGHT': return 'spotlight-beam';
      case 'TRENDING': return 'trending-up';
      default: return 'calendar';
    }
  };

  const loadEventsByCategory = async (category) => {
    try {
      setLoading(true);
      const result = await eventsApi.getEventsByCategory(category, 1, 20);
      if (result.success) {
        // Handle both direct events array and nested events in data.events
        const eventsData = Array.isArray(result.data) 
          ? result.data 
          : (result.data?.events || result.data?.data || []);
        setEvents(eventsData);
      }
    } catch (error) {
      console.error('Error loading events by category:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (selectedCategory === 'for-you') {
        await loadAllEvents();
      } else {
        await loadEventsByCategory(selectedCategory);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      if (selectedCategory === 'for-you') {
        await loadAllEvents();
      } else {
        await loadEventsByCategory(selectedCategory);
      }
      return;
    }

    try {
      const result = await eventsApi.searchEvents(query, {}, 1, 20);
      if (result.success) {
        setEvents(result.data.events || result.data || []);
      } else {
        console.error('Search failed:', result.message);
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
    setSearchQuery(''); // Clear search when changing category
  };

  const renderAllEvents = () => {
    const title = selectedCategory === 'for-you'
      ? 'All Events'
      : `${categories.find(c => c.id === selectedCategory)?.label || selectedCategory} Events`;

    return (
      <View style={{ paddingTop: 8, flex: 1 }}>
        <SectionHeader title={title} onSeeAll={() => {}} />
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={{ marginHorizontal: 8 }}>
              <EventCard event={item} onPress={() => goDetail(item)} />
            </View>
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="calendar-remove" size={64} color={colors.textMuted} />
              <Text style={styles.emptyText}>
                {selectedCategory === 'for-you' 
                  ? 'No events available at the moment' 
                  : 'No events found in this category'}
              </Text>
              <Text style={styles.emptySubText}>
                {selectedCategory === 'for-you' 
                  ? 'Check back later for new events' 
                  : 'Try selecting a different category'}
              </Text>
            </View>
          }
        />
      </View>
    );
  };

  const renderSearchResults = () => {
    if (!searchQuery.trim()) return null;

    return (
      <View style={{ paddingTop: 8 }}>
        <SectionHeader title={`Search Results for "${searchQuery}"`} onSeeAll={() => {}} />
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={{ marginHorizontal: 8 }}>
              <EventCard event={item} onPress={() => goDetail(item)} />
            </View>
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="magnify-remove" size={64} color={colors.textMuted} />
              <Text style={styles.emptyText}>No events found for your search</Text>
              <Text style={styles.emptySubText}>Try different keywords or browse all events</Text>
            </View>
          }
        />
      </View>
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      {/* Header */}
      <Header title="EVENTS" />

      {/* Search */}
      <View style={styles.searchBar}>
        <Icon name="magnify" size={22} color={colors.textMuted} />
        <TextInput
          placeholder="Search for events or topics"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      {/* Categories */}
      <CategoryTabs
        categories={categories}
        selectedCategory={selectedCategory}
        onCategorySelect={handleCategorySelect}
      />

      {/* Search Results or All Events */}
      {searchQuery.trim() ? renderSearchResults() : renderAllEvents()}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerTitle}>EXPLORE EVENTS WITH SCIASTRA</Text>
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
  searchInput: { 
    marginLeft: 8, 
    color: colors.textPrimary, 
    flex: 1, 
    fontSize: 14 
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
  },
  catChipActive: { 
    backgroundColor: colors.white 
  },
  catText: { 
    marginLeft: 8, 
    color: colors.textPrimary, 
    fontWeight: "600" 
  },
  catTextActive: { 
    color: colors.black 
  },

  sectionHeader: {
    marginTop: 18,
    marginBottom: 6,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { 
    color: colors.textPrimary, 
    fontWeight: "800", 
    fontSize: 16 
  },
  seeAll: { 
    color: colors.secondary, 
    fontWeight: "700", 
    fontSize: 12 
  },

  footer: { 
    paddingHorizontal: 16, 
    paddingVertical: 28 
  },
  footerTitle: { 
    color: colors.textPrimary, 
    fontSize: 22, 
    fontWeight: "800", 
    marginBottom: 6 
  },
  footerMade: { 
    color: colors.textSecondary, 
    fontSize: 12 
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 16,
    fontWeight: "600",
  },
  emptySubText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 8,
  },
});

export default EventScreen;