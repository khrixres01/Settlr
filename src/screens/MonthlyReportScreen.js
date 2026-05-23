import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { getSalesByMonth, getCategories } from '../db/salesService';
import { buildSummary, buildCategorySummary, formatNaira } from '../utils/calculations';
import { getCurrentMonth, getCurrentYear, getMonthName, formatDate } from '../utils/dateHelpers';
import { exportCSV, exportExcel } from '../utils/export';

export default function MonthlyReportScreen() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [year, setYear] = useState(getCurrentYear());
  const [sales, setSales] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [saleData, catData] = await Promise.all([
        getSalesByMonth(month, year),
        getCategories(),
      ]);
      setSales(saleData);
      setCategories(catData);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function navigateMonth(delta) {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth < 1) { newMonth = 12; newYear -= 1; }
    if (newMonth > 12) { newMonth = 1; newYear += 1; }
    setMonth(newMonth);
    setYear(newYear);
  }

  async function handleExportExcel() {
    setExporting(true);
    try {
      await exportExcel(sales, categories, month, year);
    } catch (e) {
      Alert.alert('Export Error', e.message);
    } finally {
      setExporting(false);
    }
  }

  async function handleExportCSV() {
    setExporting(true);
    try {
      await exportCSV(sales, categories, month, year);
    } catch (e) {
      Alert.alert('Export Error', e.message);
    } finally {
      setExporting(false);
    }
  }

  const summary = buildSummary(sales);
  const catSummary = buildCategorySummary(sales);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Month Navigator */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.navArrow}>
          <Text style={styles.navArrowText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{getMonthName(month)} {year}</Text>
        <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.navArrow}>
          <Text style={styles.navArrowText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Export buttons */}
      <View style={styles.exportRow}>
        <TouchableOpacity
          style={[styles.exportBtn, exporting && styles.btnDisabled]}
          onPress={handleExportCSV}
          disabled={exporting || loading}
        >
          <Text style={styles.exportBtnText}>Export CSV</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.exportBtn, styles.exportBtnExcel, exporting && styles.btnDisabled]}
          onPress={handleExportExcel}
          disabled={exporting || loading}
        >
          {exporting
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.exportBtnText}>Export Excel</Text>
          }
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator color="#60a5fa" style={{ marginVertical: 20 }} />}

      {!loading && (
        <>
          {/* Monthly summary banner */}
          <View style={styles.grandBanner}>
            <Text style={styles.grandLabel}>Total Revenue — {getMonthName(month)}</Text>
            <Text style={styles.grandAmount}>{formatNaira(summary.baseTotal)}</Text>
          </View>

          {/* Bobo + Mama earnings */}
          <View style={styles.earningsRow}>
            <View style={[styles.earningsCard, { backgroundColor: '#1e3a5f' }]}>
              <Text style={styles.earningsLabel}>Bobo's Earnings</Text>
              <Text style={[styles.earningsAmount, { color: '#60a5fa' }]}>{formatNaira(summary.boboTotal)}</Text>
            </View>
            <View style={[styles.earningsCard, { backgroundColor: '#2d1f3d' }]}>
              <Text style={styles.earningsLabel}>Mama's Earnings</Text>
              <Text style={[styles.earningsAmount, { color: '#c084fc' }]}>{formatNaira(summary.mamaTotal)}</Text>
            </View>
          </View>

          {/* Per-category breakdown */}
          <Text style={styles.sectionTitle}>By Category</Text>
          {Object.entries(catSummary).map(([cat, c]) => (
            <View key={cat} style={styles.catCard}>
              <View style={styles.catHeader}>
                <Text style={styles.catName}>{cat}</Text>
                <Text style={styles.catCount}>{c.count} sale{c.count !== 1 ? 's' : ''}</Text>
              </View>
              <View style={styles.catRow}>
                <StatPill label="Bobo" value={c.boboTotal} color="#60a5fa" />
                <StatPill label="Mama" value={c.mamaTotal} color="#c084fc" />
                <StatPill label="Utilities" value={c.utilitiesTotal} color="#4ade80" />
              </View>
            </View>
          ))}

          {/* Grand total footer */}
          <View style={styles.summaryFooter}>
            <SummaryRow label="Bobo Total" value={summary.boboTotal} color="#60a5fa" />
            <SummaryRow label="Mama Total" value={summary.mamaTotal} color="#c084fc" />
            <SummaryRow label="Utilities" value={summary.utilitiesTotal} color="#4ade80" />
          </View>

          {/* Split Rules — read-only */}
          <View style={styles.rulesSection}>
            <View style={styles.rulesTitleRow}>
              <Text style={styles.sectionTitle}>Profit Split Rules</Text>
              <View style={styles.lockBadge}>
                <Text style={styles.lockBadgeText}>🔒 Read-only</Text>
              </View>
            </View>
            {categories.map(cat => (
              <View key={cat.id} style={styles.ruleCard}>
                <Text style={styles.ruleName}>{cat.name}</Text>
                <Text style={styles.ruleType}>
                  {cat.type === 'revenue_split' ? 'Revenue Split' : `Fixed ₦${cat.fixed_profit_per_unit}/unit`}
                </Text>
                <View style={styles.rulePills}>
                  <View style={[styles.rulePill, { backgroundColor: '#1e3a5f' }]}>
                    <Text style={[styles.rulePillText, { color: '#60a5fa' }]}>Bobo {cat.bobo_pct}%</Text>
                  </View>
                  <View style={[styles.rulePill, { backgroundColor: '#2d1f3d' }]}>
                    <Text style={[styles.rulePillText, { color: '#c084fc' }]}>Mama {cat.mama_pct}%</Text>
                  </View>
                  <View style={[styles.rulePill, { backgroundColor: '#1a2e1a' }]}>
                    <Text style={[styles.rulePillText, { color: '#4ade80' }]}>Utilities {cat.utilities_pct}%</Text>
                  </View>
                </View>
              </View>
            ))}
            <Text style={styles.rulesCaption}>
              Set by business agreement. Contact your developer to change.
            </Text>
          </View>

          {/* Full sales table */}
          <Text style={styles.sectionTitle}>All Sales</Text>
          {sales.length === 0 && <Text style={styles.emptyText}>No sales this month.</Text>}

          {/* Table header */}
          {sales.length > 0 && (
            <View style={styles.tableHeader}>
              <Text style={[styles.thCell, { flex: 1.4 }]}>Date</Text>
              <Text style={[styles.thCell, { flex: 2 }]}>Item</Text>
              <Text style={[styles.thCell, { flex: 1 }]}>Cat.</Text>
              <Text style={[styles.thCell, { flex: 0.7 }]}>Qty</Text>
              <Text style={[styles.thCell, { flex: 1.4 }]}>Revenue</Text>
              <Text style={[styles.thCell, { flex: 1.2 }]}>Bobo</Text>
              <Text style={[styles.thCell, { flex: 1.2 }]}>Mama</Text>
            </View>
          )}
          {sales.map(s => (
            <View key={s.id} style={styles.tableRow}>
              <Text style={[styles.tdCell, { flex: 1.4 }]}>{formatDate(s.sale_date)}</Text>
              <Text style={[styles.tdCell, { flex: 2 }]} numberOfLines={1}>{s.item_name}</Text>
              <Text style={[styles.tdCell, { flex: 1 }]} numberOfLines={1}>{s.category_name}</Text>
              <Text style={[styles.tdCell, { flex: 0.7 }]}>{s.quantity}</Text>
              <Text style={[styles.tdCell, { flex: 1.4, color: '#fff' }]}>{formatNaira(s.base_amount)}</Text>
              <Text style={[styles.tdCell, { flex: 1.2, color: '#60a5fa' }]}>{formatNaira(s.bobo_share)}</Text>
              <Text style={[styles.tdCell, { flex: 1.2, color: '#c084fc' }]}>{formatNaira(s.mama_share)}</Text>
            </View>
          ))}
          {/* Totals row */}
          {sales.length > 0 && (
            <View style={[styles.tableRow, styles.totalsRow]}>
              <Text style={[styles.tdCell, { flex: 1.4, color: '#fff', fontWeight: '700' }]}>TOTAL</Text>
              <Text style={[styles.tdCell, { flex: 2 }]} />
              <Text style={[styles.tdCell, { flex: 1 }]} />
              <Text style={[styles.tdCell, { flex: 0.7 }]} />
              <Text style={[styles.tdCell, { flex: 1.4, color: '#fff', fontWeight: '800' }]}>{formatNaira(summary.baseTotal)}</Text>
              <Text style={[styles.tdCell, { flex: 1.2, color: '#60a5fa', fontWeight: '800' }]}>{formatNaira(summary.boboTotal)}</Text>
              <Text style={[styles.tdCell, { flex: 1.2, color: '#c084fc', fontWeight: '800' }]}>{formatNaira(summary.mamaTotal)}</Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

function StatPill({ label, value, color }) {
  return (
    <View style={styles.pill}>
      <Text style={[styles.pillAmt, { color }]}>{formatNaira(value)}</Text>
      <Text style={styles.pillLabel}>{label}</Text>
    </View>
  );
}

function SummaryRow({ label, value, color }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, { color }]}>{formatNaira(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  content: { padding: 16, paddingBottom: 50 },
  btnDisabled: { opacity: 0.6 },

  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  navArrow: { padding: 10 },
  navArrowText: { color: '#60a5fa', fontSize: 28, fontWeight: '300' },
  monthLabel: { color: '#fff', fontSize: 18, fontWeight: '700' },

  exportRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  exportBtn: { flex: 1, backgroundColor: '#1c1c1c', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#2a2a2a' },
  exportBtnExcel: { backgroundColor: '#14532d' },
  exportBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  grandBanner: { backgroundColor: '#1c1c1c', borderRadius: 14, padding: 20, borderWidth: 1, borderColor: '#2a2a2a', marginBottom: 12, alignItems: 'center' },
  grandLabel: { color: '#aaa', fontSize: 13, marginBottom: 6 },
  grandAmount: { color: '#fff', fontSize: 34, fontWeight: '900' },
  earningsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  earningsCard: { flex: 1, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2a2a2a' },
  earningsLabel: { color: '#aaa', fontSize: 12, marginBottom: 6 },
  earningsAmount: { fontSize: 18, fontWeight: '800' },

  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 10, marginTop: 8 },
  emptyText: { color: '#555', fontSize: 13, marginBottom: 12 },

  catCard: { backgroundColor: '#1c1c1c', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2a2a2a', marginBottom: 10 },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  catName: { color: '#fff', fontSize: 14, fontWeight: '700' },
  catCount: { color: '#888', fontSize: 12 },
  catRow: { flexDirection: 'row', justifyContent: 'space-between' },
  pill: { alignItems: 'center', flex: 1 },
  pillAmt: { fontSize: 13, fontWeight: '700' },
  pillLabel: { color: '#888', fontSize: 11, marginTop: 2 },

  summaryFooter: { backgroundColor: '#1c1c1c', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#2a2a2a', marginVertical: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  summaryLabel: { color: '#aaa', fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: '700' },

  rulesSection: { marginBottom: 24 },
  rulesTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  lockBadge: { backgroundColor: '#1c1c1c', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#2a2a2a' },
  lockBadgeText: { color: '#888', fontSize: 11 },
  ruleCard: { backgroundColor: '#1c1c1c', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2a2a2a', marginBottom: 10 },
  ruleName: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 2 },
  ruleType: { color: '#888', fontSize: 12, marginBottom: 10 },
  rulePills: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  rulePill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  rulePillText: { fontSize: 12, fontWeight: '700' },
  rulesCaption: { color: '#555', fontSize: 11, marginTop: 6, textAlign: 'center' },

  tableHeader: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#2a2a2a', marginBottom: 2 },
  tableRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1c1c1c' },
  totalsRow: { borderTopWidth: 2, borderTopColor: '#2a2a2a', borderBottomWidth: 0, marginTop: 4 },
  thCell: { color: '#888', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  tdCell: { color: '#ccc', fontSize: 11 },
});
