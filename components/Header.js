import React from "react";
import { View, StyleSheet, TouchableOpacity, Image, Text } from "react-native";
import colors from "../config/colors";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

const Header = ({ 
  showSearchIcon = false, 
  showChatIcon = false, 
  onSearchPress, 
  onChatPress,
  navigation 
}) => {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.gradientOverlay} />
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image 
            source={require("../assets/top.png")} 
            style={styles.logoSvg}
            resizeMode="contain"
          />
          <View style={styles.logoGlow} />
        </View>
        <View style={styles.headerCenter}>
          <Text style={styles.pageTitle}>Create</Text>
        </View>
        <View style={styles.headerRight}>
        {showSearchIcon && (
          <TouchableOpacity style={styles.iconButton} onPress={onSearchPress}>
            <Icon name="magnify" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        {showChatIcon && (
          <TouchableOpacity style={styles.iconButton} onPress={onChatPress}>
            <Icon name="chat-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        </View>
      </View>
      <View style={styles.bottomGlow} />
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    position: 'relative',
    shadowColor: colors.accent,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: `${colors.accent}08`,
    zIndex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 12,
    backgroundColor: colors.card,
    borderBottomColor: `${colors.accent}30`,
    borderBottomWidth: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    position: 'relative',
    zIndex: 2,
  },
  bottomGlow: {
    position: 'absolute',
    bottom: -8,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: `${colors.accent}15`,
    zIndex: 0,
  },
  headerLeft: {
    alignItems: "flex-start",
    justifyContent: "center",
    position: 'relative',
  },
  logoGlow: {
    position: 'absolute',
    top: -5,
    left: -8,
    right: -8,
    bottom: -5,
    backgroundColor: `${colors.accent}15`,
    borderRadius: 12,
    zIndex: -1,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.5,
  },
  headerRight: { 
    flexDirection: "row", 
    alignItems: "center",
    position: "absolute",
    right: 16,
    top: 54
  },
  logoSvg: {
    width: 120,
    height: 38,
    alignSelf: "flex-start",
    paddingTop: 4,
    paddingRight: 6,
    paddingBottom: 4,
    paddingLeft: 6,
  },
  iconButton: { 
    marginLeft: 10 
  },
});

export default Header;
