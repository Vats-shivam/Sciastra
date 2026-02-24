// screens/SettingsScreen.js
import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet, TouchableOpacity, ScrollView, Linking, Modal } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import colors from '../config/colors';
import authManager from '../services/AuthManager';
import { useNotification } from '../contexts/NotificationContext';
import Header from '../components/Header';
import useScreenApiLogger from '../hooks/useScreenApiLogger';
import profileApi from '../api/ProfileApi';

const SettingsScreen = ({ navigation }) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [contactModalType, setContactModalType] = useState('about');
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const { showError, showSuccess } = useNotification();

  useScreenApiLogger('Settings');

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const confirmLogout = async () => {
    setLogoutModalVisible(false);
    try {
      await authManager.logout();
      showSuccess('Logged out successfully');
    } catch (error) {
      showError('Failed to logout. Please try again.');
    }
  };

  const handleContactUs = (type) => {
    setContactModalType(type);
    setContactModalVisible(true);
  };

  const openWebsite = () => {
    setContactModalVisible(false);
    Linking.openURL('https://www.sciastra.com/').catch(err => {
      showError('Failed to open website');
      console.error('Error opening URL:', err);
    });
  };

  return (
    <View style={styles.container}>
      <Header 
        title="SETTINGS" 
        showTitle={true} 
        showBackButton={true} 
        onBackPress={() => navigation.goBack()} 
      />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <View style={styles.card}>
            <TouchableOpacity 
              style={styles.settingRow}
              onPress={() => navigation.navigate('EditProfile')}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: colors.button }]}>
                  <Icon name="account-edit" size={22} color={colors.white} />
                </View>
                <Text style={styles.settingLabel}>Edit Profile</Text>
              </View>
              <Icon name="chevron-right" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          
          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setDeleteModalVisible(true)}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.iconContainer, { backgroundColor: colors.error }]}>
                <Icon name="delete" size={22} color={colors.white} />
              </View>
              <Text style={[styles.settingLabel, { color: colors.error }]}>Delete Account</Text>
            </View>
            <Icon name="chevron-right" size={24} color={colors.textMuted} />
          </TouchableOpacity>
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#FF9800' }]}>
                  <Icon name="bell" size={22} color={colors.white} />
                </View>
                <Text style={styles.settingLabel}>Notifications</Text>
              </View>
              <Switch 
                value={notificationsEnabled} 
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: colors.border, true: colors.button }}
                thumbColor={notificationsEnabled ? colors.white : colors.textMuted}
              />
            </View>

            <View style={styles.divider} />

            <TouchableOpacity 
              style={styles.settingRow}
              onPress={() => setLanguageModalVisible(true)}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#2196F3' }]}>
                  <Icon name="translate" size={22} color={colors.white} />
                </View>
                <Text style={styles.settingLabel}>Language</Text>
              </View>
              <View style={styles.settingRight}>
                <Text style={styles.settingValue}>English</Text>
                <Icon name="chevron-right" size={24} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* More Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>More</Text>
          
          <View style={styles.card}>
            <TouchableOpacity 
              style={styles.settingRow}
              onPress={() => handleContactUs('about')}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#9C27B0' }]}>
                  <Icon name="information" size={22} color={colors.white} />
                </View>
                <Text style={styles.settingLabel}>About</Text>
              </View>
              <Icon name="chevron-right" size={24} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity 
              style={styles.settingRow}
              onPress={() => handleContactUs('support')}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#607D8B' }]}>
                  <Icon name="help-circle" size={22} color={colors.white} />
                </View>
                <Text style={styles.settingLabel}>Help & Support</Text>
              </View>
              <Icon name="chevron-right" size={24} color={colors.textMuted} />
            </TouchableOpacity>

          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon name="logout" size={24} color={colors.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={logoutModalVisible}
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalIconContainer}>
              <Icon name="logout" size={48} color={colors.error} />
            </View>
            
            <Text style={styles.modalTitle}>Logout</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to logout from your account?
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmModalButton]}
                onPress={confirmLogout}
              >
                <Text style={styles.confirmModalButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Account Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalIconContainer}>
              <Icon name="alert-circle" size={48} color={colors.error} />
            </View>
            
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalMessage}>
              This action is irreversible. All your posts, media, connections and account data will be permanently deleted. Are you sure you want to continue?
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmModalButton]}
                onPress={async () => {
                  setDeleteModalVisible(false);
                  try {
                    const res = await profileApi.deleteAccount();
                    if (res.success) {
                      await authManager.logout();
                      showSuccess('Account deleted successfully');
                      navigation.reset && navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
                    } else {
                      showError(res.message || 'Failed to delete account');
                    }
                  } catch (error) {
                    console.error('Delete account error:', error);
                    showError('Failed to delete account. Please try again.');
                  }
                }}
              >
                <Text style={styles.confirmModalButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Contact Info Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={contactModalVisible}
        onRequestClose={() => setContactModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setContactModalVisible(false)}
            >
              <Icon name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={styles.modalIconContainer}>
              <Icon 
                name={contactModalType === 'about' ? 'information' : 'help-circle'} 
                size={48} 
                color={colors.button} 
              />
            </View>
            
            <Text style={styles.modalTitle}>
              {contactModalType === 'about' ? 'About SciX' : 'Help & Support'}
            </Text>
            <Text style={styles.modalMessage}>
              For more information and support, please visit our website or contact us:
            </Text>
            
            <View style={styles.contactInfoContainer}>
              <View style={styles.contactInfoRow}>
                <Icon name="web" size={20} color={colors.button} />
                <Text style={styles.contactInfoText}>www.sciastra.com</Text>
              </View>
              
              <View style={styles.contactInfoRow}>
                <Icon name="email" size={20} color={colors.button} />
                <Text style={styles.contactInfoText}>support@sciastra.com</Text>
              </View>
              
              <View style={styles.contactInfoRow}>
                <Icon name="phone" size={20} color={colors.button} />
                <Text style={styles.contactInfoText}>8069409826</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.visitWebsiteButton}
              onPress={openWebsite}
            >
              <Icon name="open-in-new" size={20} color={colors.white} />
              <Text style={styles.visitWebsiteButtonText}>Visit Website</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Language Coming Soon Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={languageModalVisible}
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setLanguageModalVisible(false)}
            >
              <Icon name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={styles.modalIconContainer}>
              <Icon name="translate" size={48} color={colors.button} />
            </View>
            
            <Text style={styles.modalTitle}>Coming Soon</Text>
            <Text style={styles.modalMessage}>
              We're working on adding support for more languages. Stay tuned for updates!
            </Text>
            
            <View style={styles.languagePreviewContainer}>
              <View style={styles.languageItem}>
                <Icon name="check-circle" size={20} color={colors.success} />
                <Text style={styles.languageItemText}>English</Text>
              </View>
              
              <View style={styles.languageItem}>
                <Icon name="clock-outline" size={20} color={colors.textMuted} />
                <Text style={[styles.languageItemText, { color: colors.textMuted }]}>Hindi</Text>
              </View>
              
              <View style={styles.languageItem}>
                <Icon name="clock-outline" size={20} color={colors.textMuted} />
                <Text style={[styles.languageItemText, { color: colors.textMuted }]}>Spanish</Text>
              </View>
              
              <View style={styles.languageItem}>
                <Icon name="clock-outline" size={20} color={colors.textMuted} />
                <Text style={[styles.languageItemText, { color: colors.textMuted }]}>French</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.visitWebsiteButton}
              onPress={() => setLanguageModalVisible(false)}
            >
              <Text style={styles.visitWebsiteButtonText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Gilroy-SemiBold',
    color: colors.textMuted,
    marginBottom: 12,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    minHeight: 64,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontFamily: 'Gilroy-SemiBold',
    color: colors.textPrimary,
  },
  settingValue: {
    fontSize: 14,
    color: colors.textMuted,
    marginRight: 8,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 72,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.error,
  },
  logoutText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: colors.error,
    marginLeft: 12,
  },
  version: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 24,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    padding: 4,
  },
  modalIconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: 'Gilroy-Bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    fontFamily: 'Gilroy-Medium',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalButton: {
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmModalButton: {
    backgroundColor: colors.error,
  },
  cancelModalButtonText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: colors.textPrimary,
  },
  confirmModalButtonText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: colors.white,
  },
  contactInfoContainer: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  contactInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  contactInfoText: {
    fontSize: 15,
    fontFamily: 'Gilroy-SemiBold',
    color: colors.textPrimary,
    marginLeft: 12,
  },
  visitWebsiteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.button,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  visitWebsiteButtonText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: colors.white,
  },
  languagePreviewContainer: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  languageItemText: {
    fontSize: 15,
    fontFamily: 'Gilroy-SemiBold',
    color: colors.textPrimary,
    marginLeft: 12,
  },
});

export default SettingsScreen;
