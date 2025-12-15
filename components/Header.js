import React from "react";
import { View, StyleSheet, TouchableOpacity, Image, Text, Platform } from "react-native";
import colors from "../config/colors";
import HeaderIcon from "./HeaderIcon";

const Header = ({ 
  showSearchIcon = false, 
  showChatIcon = false,
  showBackButton = false,
  showMenuButton = false,
  showTitle = false,
  title = "",
  onSearchPress, 
  onChatPress,
  onBackPress,
  onMenuPress,
  navigation 
}) => {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.logoText}>Xcience</Text>
        </View>
        {showTitle && (
          <View style={styles.headerCenter}>
            <Text style={styles.pageTitle}>{title}</Text>
          </View>
        )}
        <View style={styles.headerRight}>
        {showBackButton && (
          <TouchableOpacity style={styles.iconButton} onPress={onBackPress}>
            <HeaderIcon name="back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        {showSearchIcon && (
          <TouchableOpacity style={styles.iconButton} onPress={onSearchPress}>
            <HeaderIcon name="search" size={26} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        {showChatIcon && (
          <TouchableOpacity style={styles.iconButton} onPress={onChatPress}>
            <HeaderIcon name="message" size={26} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        {showMenuButton && (
          <TouchableOpacity style={styles.iconButton} onPress={onMenuPress}>
            <HeaderIcon name="menu" size={26} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 12,
    backgroundColor: colors.background,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    alignItems: "flex-start",
    justifyContent: "center",
  },
  headerCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: -1,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  headerRight: { 
    flexDirection: "row", 
    alignItems: "center",
    gap: 16,
  },
  logoText: {
    fontSize: 25,
    fontFamily: Platform.select({
      ios: 'Gilroy-SemiBold',
      android: 'Arial Rounded MT Bold',
      default: 'Arial Rounded MT Bold',
    }),
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  iconButton: { 
    padding: 4,
  },
});

export default Header;
