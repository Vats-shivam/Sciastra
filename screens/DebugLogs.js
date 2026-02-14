// screens/DebugLogs.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Share,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import Container from '../components/Container';
import Header from '../components/Header';
import colors from '../config/colors';
import logger from '../services/Logger';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import useScreenApiLogger from '../hooks/useScreenApiLogger';

const DebugLogsScreen = ({ navigation }) => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [searchText, setSearchText] = useState('');

  useScreenApiLogger('DebugLogs');

  const logLevels = [
    { key: 'all', label: 'All', color: colors.textPrimary },
    { key: 'error', label: 'Errors', color: colors.error },
    { key: 'warn', label: 'Warnings', color: colors.warning },
    { key: 'info', label: 'Info', color: colors.info },
    { key: 'debug', label: 'Debug', color: colors.textSecondary },
  ];

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, selectedLevel, searchText]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const allLogs = logger.getLogs(null, 200);
      setLogs(allLogs);
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = logs;

    // Filter by level
    if (selectedLevel !== 'all') {
      filtered = filtered.filter(log => log.level === selectedLevel);
    }

    // Filter by search text
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(searchLower) ||
        JSON.stringify(log.extra).toLowerCase().includes(searchLower)
      );
    }

    setFilteredLogs(filtered);
  };

  const exportLogs = async () => {
    try {
      const logText = logger.exportLogs();
      const deviceInfo = logger.getDeviceInfo();

      const fullExport = `=== DEBUG LOGS EXPORT ===
Device Info: ${JSON.stringify(deviceInfo, null, 2)}
Export Time: ${new Date().toISOString()}
Total Logs: ${logs.length}

=== LOGS ===
${logText}`;

      await Share.share({
        message: fullExport,
        title: 'App Debug Logs',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to export logs');
    }
  };

  const clearLogs = () => {
    Alert.alert(
      'Clear Logs',
      'Are you sure you want to clear all logs? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await logger.clearLogs();
            setLogs([]);
            setFilteredLogs([]);
          },
        },
      ]
    );
  };

  const renderLogItem = (log, index) => {
    const levelColor = logLevels.find(l => l.key === log.level)?.color || colors.textPrimary;
    const isError = log.level === 'error';
    const isApiLog = log.extra?.type?.includes('api');

    return (
      <View key={index} style={[styles.logItem, isError && styles.errorLogItem]}>
        <View style={styles.logHeader}>
          <Text style={[styles.logLevel, { color: levelColor }]}>
            {log.level.toUpperCase()}
          </Text>
          <Text style={styles.logTime}>
            {new Date(log.timestamp).toLocaleTimeString()}
          </Text>
          {isApiLog && (
            <Icon name="api" size={16} color={colors.primary} />
          )}
        </View>

        <Text style={styles.logMessage}>{log.message}</Text>

        {log.extra && Object.keys(log.extra).length > 0 && (
          <View style={styles.logExtra}>
            <Text style={styles.logExtraText}>
              {JSON.stringify(log.extra, null, 2)}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header
        title="DEBUG LOGS"
        showBack
        onBackPress={() => navigation.goBack()}
      />

      <Container>
        {/* Controls */}
        <View style={styles.controls}>
          {/* Search */}
          <View style={styles.searchContainer}>
            <Icon name="magnify" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search logs..."
              placeholderTextColor={colors.textMuted}
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>

          {/* Filter Buttons */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
            {logLevels.map(level => (
              <TouchableOpacity
                key={level.key}
                style={[
                  styles.filterButton,
                  selectedLevel === level.key && styles.activeFilterButton
                ]}
                onPress={() => setSelectedLevel(level.key)}
              >
                <Text style={[
                  styles.filterButtonText,
                  selectedLevel === level.key && styles.activeFilterButtonText
                ]}>
                  {level.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={exportLogs}>
              <Icon name="export" size={20} color={colors.primary} />
              <Text style={styles.actionButtonText}>Export</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={clearLogs}>
              <Icon name="delete" size={20} color={colors.error} />
              <Text style={[styles.actionButtonText, { color: colors.error }]}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            Showing {filteredLogs.length} of {logs.length} logs
          </Text>
        </View>

        {/* Logs List */}
        <ScrollView
          style={styles.logsList}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadLogs} />
          }
        >
          {filteredLogs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="file-document-outline" size={64} color={colors.textMuted} />
              <Text style={styles.emptyText}>
                {logs.length === 0 ? 'No logs available' : 'No logs match your filter'}
              </Text>
            </View>
          ) : (
            filteredLogs.map((log, index) => renderLogItem(log, index))
          )}
        </ScrollView>
      </Container>
    </View>
  );
};

const styles = StyleSheet.create({
  controls: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingLeft: 8,
    color: colors.textPrimary,
    fontSize: 14,
  },
  filterContainer: {
    marginBottom: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    marginRight: 8,
  },
  activeFilterButton: {
    backgroundColor: colors.primary,
  },
  filterButtonText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: colors.textInverse,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  actionButtonText: {
    marginLeft: 8,
    color: colors.primary,
    fontWeight: '500',
  },
  statsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  statsText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  logsList: {
    flex: 1,
  },
  logItem: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    marginHorizontal: 4,
  },
  errorLogItem: {
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  logLevel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginRight: 8,
  },
  logTime: {
    fontSize: 10,
    color: colors.textMuted,
    flex: 1,
  },
  logMessage: {
    color: colors.textPrimary,
    fontSize: 14,
    marginBottom: 4,
  },
  logExtra: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 4,
    padding: 8,
    marginTop: 4,
  },
  logExtraText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: 'monospace',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
});

export default DebugLogsScreen;