import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from "../config/colors";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

const Header = ({ 
  title, 
  showSearchIcon = false, 
  showChatIcon = false,
  showBackButton = false,
  showMenuButton = false,
  onSearchPress, 
  onChatPress,
  onBackPress,
  onMenuPress,
  navigation 
}) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
        {showBackButton ? (
          <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
            <Icon name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <Image source={require("../assets/icon.png")} style={styles.logo} />
        )}
        <Text style={styles.appName}>{title}</Text>
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
        {showMenuButton && (
          <TouchableOpacity style={styles.iconButton} onPress={onMenuPress}>
            <Icon name="dots-vertical" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
      </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.card,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: colors.card,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { 
    flexDirection: "row", 
    alignItems: "center" 
  },
  headerRight: { 
    flexDirection: "row", 
    alignItems: "center" 
  },
  logo: { 
    width: 28, 
    height: 28, 
    borderRadius: 6, 
    marginRight: 8 
  },
  appName: { 
    fontSize: 18, 
    fontWeight: "800", 
    color: colors.textPrimary, 
    letterSpacing: 1 
  },
  iconButton: { 
    marginLeft: 10 
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
});

export default Header;
