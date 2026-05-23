import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../db/supabase';
import { getSalesByWeek } from '../db/salesService';
import { buildSummary, buildCategorySummary, formatNaira } from '../utils/calculations';
import { getWeekNumber, getCurrentYear, formatDate } from '../utils/dateHelpers';
import { useAuth } from '../context/AuthContext';

export default function DashboardScreen() {
  const navigation = useNavigation();
  const { signOut } = useAuth();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);
  const channelRef = useRef(null);

  const week = getWeekNumber();
  const year = getCurrentYear();

  const fetchSales = useCallback(async () => {
    try {
      const data = await getSalesByWeek(week, year);
      setSales(data);
    } catch (e) {
      console.warn('Dashboard fetch error:', e.message);
    }
  }, [week, year]);

  useEffect(() => {
    fetchSales().finally(() => setLoading(false));

    // Real-time subscription
    const channel = supabase
      .channel('sales-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
        fetchSales();
      })
      .subscribe((status) => {
        setLiveConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSales]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchSales();
    setRefreshing(false);
  }

  const summary = buildSummary(sales);
  const categorySummary = buildCategorySummary(sales);
  const recentSales = sales.slice(0, 6);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#60a5fa" size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#60a5fa" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>Settlr</Text>
          <Text style={styles.weekLabel}>Week {week} · {year}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.liveRow}>
            <View style={[styles.liveDot, liveConnected && styles.liveDotActive]} />
            <Text style={styles.liveText}>{liveConnected ? 'Live' : 'Connecting…'}</Text>
          </View>
          <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Top two cards */}
      <View style={styles.row}>
        <View style={[styles.shareCard, styles.boboCard]}>
          <Text style={styles.shareLabel}>Bobo</Text>
          <Text style={styles.shareAmount}>{formatNaira(summary.boboTotal)}</Text>
        </View>
        <View style={[styles.shareCard, styles.mamaCard]}>
          <Text style={styles.shareLabel}>Mama</Text>
          <Text style={styles.shareAmount}>{formatNaira(summary.mamaTotal)}</Text>
        </View>
      </View>

      {/* Utilities card */}
      <View style={[styles.utilitiesCard]}>
        <Text style={styles.shareLabel}>Utilities</Text>
        <Text style={[styles.shareAmount, styles.utilitiesAmount]}>
          {formatNaira(summary.utilitiesTotal)}
        </Text>
      </View>

      {/* Per-category breakdown */}
      <Text style={styles.sectionTitle}>By Category</Text>
      {Object.keys(categorySummary).length === 0 && (
        <Text style={styles.emptyText}>No sales this week yet.</Text>
      )}
      {Object.entries(categorySummary).map(([catName, cat]) => (
        <View key={catName} style={styles.catCard}>
          <View style={styles.catHeader}>
            <Text style={styles.catName}>{catName}</Text>
            <Text style={styles.catCount}>{cat.count} sale{cat.count !== 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.baseTotalRow}>
            <Text style={styles.baseTotalLabel}>Total Revenue</Text>
            <Text style={styles.baseTotalValue}>{formatNaira(cat.baseTotal)}</Text>
          </View>
          <View style={styles.catRow}>
            <CatStat label="Bobo" value={cat.boboTotal} color="#60a5fa" />
            <CatStat label="Mama" value={cat.mamaTotal} color="#c084fc" />
            <CatStat label="Utilities" value={cat.utilitiesTotal} color="#4ade80" />
          </View>
        </View>
      ))}

      {/* Recent sales */}
      <Text style={styles.sectionTitle}>Recent Sales</Text>
      {recentSales.length === 0 && (
        <Text style={styles.emptyText}>No recent sales.</Text>
      )}
      {recentSales.map(s => (
        <View key={s.id} style={styles.saleRow}>
          <View style={styles.saleLeft}>
            <Text style={styles.saleItem}>{s.item_name}</Text>
            <Text style={styles.saleMeta}>{s.category_name} · {formatDate(s.sale_date)}</Text>
          </View>
          <View style={styles.saleRight}>
            <Text style={styles.saleBobo}>{formatNaira(s.base_amount)}</Text>
            <Text style={styles.saleMeta}>Revenue</Text>
          </View>
        </View>
      ))}

      {/* Navigation buttons */}
      <View style={styles.navButtons}>
        <TouchableOpacity
          style={[styles.navBtn, { backgroundColor: '#1e3a5f' }]}
          onPress={() => navigation.navigate('WeeklyReport')}
        >
          <Text style={styles.navBtnText}>Weekly Report</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navBtn, { backgroundColor: '#2d1f3d' }]}
          onPress={() => navigation.navigate('MonthlyReport')}
        >
          <Text style={styles.navBtnText}>Monthly Report</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function CatStat({ label, value, color }) {
  return (
    <View style={styles.catStat}>
      <Text style={[styles.catStatAmt, { color }]}>{formatNaira(value)}</Text>
      <Text style={styles.catStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: '#0f0f0f', justifyContent: 'center', alignItems: 'center' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  appName: { fontSize: 26, fontWeight: '800', color: '#60a5fa', letterSpacing: 1 },
  weekLabel: { fontSize: 13, color: '#888', marginTop: 2 },
  headerRight: { alignItems: 'flex-end' },
  liveRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#555', marginRight: 5 },
  liveDotActive: { backgroundColor: '#4ade80' },
  liveText: { fontSize: 12, color: '#888' },
  signOutBtn: { backgroundColor: '#1c1c1c', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#2a2a2a' },
  signOutText: { color: '#ef4444', fontSize: 12, fontWeight: '600' },

  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  shareCard: { flex: 1, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#2a2a2a' },
  boboCard: { backgroundColor: '#1e3a5f' },
  mamaCard: { backgroundColor: '#2d1f3d' },
  utilitiesCard: { backgroundColor: '#1a2e1a', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#2a2a2a', marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  shareLabel: { color: '#aaa', fontSize: 13, marginBottom: 6, fontWeight: '600' },
  shareAmount: { color: '#60a5fa', fontSize: 22, fontWeight: '800' },
  utilitiesAmount: { color: '#4ade80' },

  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 10, marginTop: 4 },
  emptyText: { color: '#555', fontSize: 13, marginBottom: 12 },

  catCard: { backgroundColor: '#1c1c1c', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2a2a2a', marginBottom: 10 },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  catName: { color: '#fff', fontSize: 14, fontWeight: '700' },
  catCount: { color: '#888', fontSize: 12 },
  catRow: { flexDirection: 'row', justifyContent: 'space-between' },
  baseTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#2a2a2a' },
  baseTotalLabel: { color: '#888', fontSize: 12 },
  baseTotalValue: { color: '#fff', fontSize: 14, fontWeight: '700' },
  catStat: { alignItems: 'center', flex: 1 },
  catStatAmt: { fontSize: 14, fontWeight: '700' },
  catStatLabel: { color: '#888', fontSize: 11, marginTop: 2 },

  saleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1c1c1c' },
  saleLeft: { flex: 1 },
  saleItem: { color: '#fff', fontSize: 14, fontWeight: '600' },
  saleMeta: { color: '#888', fontSize: 11, marginTop: 2 },
  saleRight: { alignItems: 'flex-end' },
  saleBobo: { color: '#60a5fa', fontSize: 14, fontWeight: '700' },

  navButtons: { flexDirection: 'row', gap: 12, marginTop: 24 },
  navBtn: { flex: 1, borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#2a2a2a' },
  navBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
