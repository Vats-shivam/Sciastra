import React, { useState, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ScrollView } from "react-native";
import colors from "../config/colors";
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import EventCard from "../components/EventCard";
import Header from "../components/Header";
import eventsApi from "../api/EventsApi";
import { useLoader } from "../context/LoaderContext";
import useScreenApiLogger from "../hooks/useScreenApiLogger";
import CustomRefreshControl from "../components/CustomRefreshControl";
import { EventCardSkeleton } from "../components/skeletons";

const DEFAULT_CATEGORIES = [
  { id: "ALL", label: "All", icon: "format-list-bulleted" },
  { id: "FEATURED", label: "Featured", icon: "star-outline" },
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
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  useScreenApiLogger("Event");

  const goDetail = (event) => navigation.navigate("EventDetail", { event });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    showLoader();
    try {
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
      if (selectedCategory === 'ALL') {
        await loadAllEvents();
      } else {
        await loadEventsByCategory(selectedCategory);
      }
    } finally {
      setRefreshing(false);
    }
  };


  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
    setSearchQuery(''); // Clear search when changing category
    if (categoryId === 'ALL') {
      loadAllEvents();
    } else {
      loadEventsByCategory(categoryId);
    }
  };

  // Filter events by title based on search query
  const filteredEvents = useMemo(() => {
    return searchQuery.trim() 
      ? events.filter(event => 
          event.title?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : events;
  }, [events, searchQuery]);

  const title = useMemo(() => {
    return searchQuery.trim()
      ? `Search Results for "${searchQuery}"`
      : selectedCategory === 'ALL'
      ? 'All Events'
      : `${categories.find(c => c.id === selectedCategory)?.label || selectedCategory} Events`;
  }, [searchQuery, selectedCategory, categories]);

  const emptyIcon = searchQuery.trim() ? "magnify-remove" : "calendar-remove";
  const emptyTitle = searchQuery.trim()
    ? 'No events found for your search'
    : selectedCategory === 'ALL' 
      ? 'No events available at the moment' 
      : 'No events found in this category';
  const emptySubText = searchQuery.trim()
    ? 'Try different keywords or browse all events'
    : selectedCategory === 'ALL' 
      ? 'Check back later for new events' 
      : 'Try selecting a different category';

  const renderListFooter = () => (
    <View style={styles.footer}>
      <Text style={styles.footerTitle}>EXPLORE EVENTS WITH SCIASTRA</Text>
      <Text style={styles.footerMade}>Made with 💙 in India</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Fixed Header Section */}
      <View style={{ backgroundColor: colors.background }}>
        {/* Header */}
        <Header title="EVENTS" />

        {/* Search - Outside FlatList to prevent re-renders */}
        <View style={styles.searchBar}>
          <Icon name="magnify" size={22} color={colors.textMuted} />
          <TextInput
            placeholder="Search for events or topics"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>

        {/* Categories */}
        <CategoryTabs
          categories={categories}
          selectedCategory={selectedCategory}
          onCategorySelect={handleCategorySelect}
        />

        {/* Section Header */}
        <View style={{ paddingTop: 8, paddingBottom: 8 }}>
          <SectionHeader title={title} onSeeAll={() => {}} />
        </View>
      </View>

      {/* FlatList */}
      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ marginHorizontal: 8 }}>
            <EventCard event={item} onPress={() => goDetail(item)} />
          </View>
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListFooterComponent={renderListFooter}
        ListEmptyComponent={
          loading ? (
            <View style={{ paddingVertical: 16 }}>
              {[1, 2, 3].map((i) => <EventCardSkeleton key={i} />)}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Icon name={emptyIcon} size={64} color={colors.textMuted} />
              <Text style={styles.emptyText}>{emptyTitle}</Text>
              <Text style={styles.emptySubText}>{emptySubText}</Text>
            </View>
          )
        }
        refreshControl={
          <CustomRefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
      />
    </View>
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