import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import colors from "../config/colors";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

const Header = ({ 
  title, 
  showSearchIcon = false, 
  showChatIcon = false, 
  onSearchPress, 
  onChatPress,
  navigation 
}) => {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Image source={require("../assets/icon.png")} style={styles.logo} />
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
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 44,
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
});

export default Header;
