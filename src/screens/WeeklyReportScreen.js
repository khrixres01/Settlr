import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  StyleSheet, Alert, ActivityIndicator, TextInput, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { getSalesByWeek, deleteAllSales, getSetting } from '../db/salesService';
import { buildSummary, buildCategorySummary, formatNaira } from '../utils/calculations';
import { getWeekNumber, getCurrentYear, formatDate } from '../utils/dateHelpers';
import Share from 'react-native-share';

export default function WeeklyReportScreen() {
  const week = getWeekNumber();
  const year = getCurrentYear();

  // PIN lock state
  const [locked, setLocked] = useState(true);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [checkingPin, setCheckingPin] = useState(false);

  // Report data
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);

  // Pay Profit modal
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [accountDetails, setAccountDetails] = useState({ bank_name: '', account_name: '', account_number: '' });
  const [clearing, setClearing] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSalesByWeek(week, year);
      setSales(data);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [week, year]);

  async function checkPin() {
    if (!pinInput.trim()) {
      setPinError('Please enter the PIN.');
      return;
    }
    setCheckingPin(true);
    setPinError('');
    try {
      const storedPin = await getSetting('report_pin');
      if (pinInput === storedPin) {
        setLocked(false);
        setPinInput('');
        fetchReport();
        // Load account details for Pay Profit modal
        const [bankName, accName, accNum] = await Promise.all([
          getSetting('bank_name'),
          getSetting('account_name'),
          getSetting('account_number'),
        ]);
        setAccountDetails({ bank_name: bankName || '', account_name: accName || '', account_number: accNum || '' });
      } else {
        setPinError('Incorrect PIN. Please try again.');
      }
    } catch (e) {
      setPinError('Error checking PIN: ' + e.message);
    } finally {
      setCheckingPin(false);
    }
  }

  async function handleClearAll() {
    Alert.alert(
      'Confirm Clear',
      'Are you absolutely sure? This will permanently delete ALL sales records and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Clear Everything',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'This is your last chance. Delete ALL records?',
              [
                { text: 'No, Go Back', style: 'cancel' },
                {
                  text: 'DELETE ALL',
                  style: 'destructive',
                  onPress: async () => {
                    setClearing(true);
                    try {
                      await deleteAllSales();
                      setPayModalVisible(false);
                      setLocked(true);
                      setSales([]);
                      Alert.alert('Done', 'All records cleared. Screen has been locked.');
                    } catch (e) {
                      Alert.alert('Error', e.message);
                    } finally {
                      setClearing(false);
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }

  function buildShareText() {
    const summary = buildSummary(sales);
    const catSummary = buildCategorySummary(sales);
    let text = `SETTLR — Week ${week} ${year} Report\n`;
    text += '='.repeat(36) + '\n\n';
    text += `Bobo Total:     ${formatNaira(summary.boboTotal)}\n`;
    text += `Mama Total:     ${formatNaira(summary.mamaTotal)}\n`;
    text += `Utilities:      ${formatNaira(summary.utilitiesTotal)}\n\n`;
    text += 'BY CATEGORY\n' + '-'.repeat(24) + '\n';
    for (const [cat, c] of Object.entries(catSummary)) {
      text += `\n${cat} (${c.count} sales)\n`;
      text += `  Bobo: ${formatNaira(c.boboTotal)}  Mama: ${formatNaira(c.mamaTotal)}  Utilities: ${formatNaira(c.utilitiesTotal)}\n`;
    }
    text += '\nSALES DETAIL\n' + '-'.repeat(24) + '\n';
    for (const s of sales) {
      text += `${formatDate(s.sale_date)} | ${s.item_name} | Qty:${s.quantity} | Bobo:${formatNaira(s.bobo_share)}\n`;
    }
    return text;
  }

  async function handleShare() {
    try {
      await Share.open({ message: buildShareText(), title: `Week ${week} Report` });
    } catch (e) {
      // user dismissed share sheet — not an error
    }
  }

  // ── PIN LOCK SCREEN ──────────────────────────────────────────────
  if (locked) {
    return (
      <KeyboardAvoidingView style={styles.lockContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.lockCard}>
          <Text style={styles.lockTitle}>Weekly Report</Text>
          <Text style={styles.lockSub}>Enter PIN to unlock</Text>
          <TextInput
            style={styles.pinInput}
            placeholder="PIN"
            placeholderTextColor="#555"
            value={pinInput}
            onChangeText={setPinInput}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={20}
          />
          {pinError ? <Text style={styles.pinError}>{pinError}</Text> : null}
          <TouchableOpacity
            style={[styles.unlockBtn, checkingPin && styles.btnDisabled]}
            onPress={checkPin}
            disabled={checkingPin}
          >
            {checkingPin
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.unlockBtnText}>Unlock</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ── REPORT SCREEN ────────────────────────────────────────────────
  const summary = buildSummary(sales);
  const catSummary = buildCategorySummary(sales);

  return (
    <View style={{ flex: 1, backgroundColor: '#0f0f0f' }}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.screenTitle}>Week {week} Report · {year}</Text>

        {loading && <ActivityIndicator color="#60a5fa" style={{ marginBottom: 16 }} />}

        {/* Total revenue banner */}
        <View style={styles.grandBanner}>
          <Text style={styles.grandLabel}>Total Revenue This Week</Text>
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

        {/* Per-category */}
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

        {/* Grand summary footer */}
        <View style={styles.summaryFooter}>
          <SummaryRow label="Bobo Total" value={summary.boboTotal} color="#60a5fa" />
          <SummaryRow label="Mama Total" value={summary.mamaTotal} color="#c084fc" />
          <SummaryRow label="Utilities" value={summary.utilitiesTotal} color="#4ade80" />
        </View>

        {/* Full sales list */}
        <Text style={styles.sectionTitle}>All Sales</Text>
        {sales.length === 0 && <Text style={styles.emptyText}>No sales this week.</Text>}
        {sales.map(s => (
          <View key={s.id} style={styles.saleRow}>
            <View style={styles.saleLeft}>
              <Text style={styles.saleItem}>{s.item_name}</Text>
              <Text style={styles.saleMeta}>{s.category_name} · Qty: {s.quantity} · {formatDate(s.sale_date)}</Text>
            </View>
            <View style={styles.saleRight}>
              <Text style={styles.saleBobo}>{formatNaira(s.base_amount)}</Text>
              <Text style={styles.saleMeta}>Revenue</Text>
            </View>
          </View>
        ))}

        {/* Share button */}
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Text style={styles.shareBtnText}>Share Report</Text>
        </TouchableOpacity>

        {/* Spacer for sticky button */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Sticky Pay Profit button */}
      <View style={styles.stickyBar}>
        <TouchableOpacity
          style={styles.payBtn}
          onPress={() => setPayModalVisible(true)}
        >
          <Text style={styles.payBtnText}>💳 Pay Profit</Text>
        </TouchableOpacity>
      </View>

      {/* Pay Profit Modal */}
      <Modal
        visible={payModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPayModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Pay Bobo's Profit</Text>

            <View style={styles.accountCard}>
              <Text style={styles.accountLabel}>Bank</Text>
              <Text style={styles.accountValue}>{accountDetails.bank_name || '—'}</Text>
              <Text style={styles.accountLabel}>Account Name</Text>
              <Text style={styles.accountValue}>{accountDetails.account_name || '—'}</Text>
              <Text style={styles.accountLabel}>Account Number</Text>
              <Text style={styles.accountNumber}>{accountDetails.account_number || '—'}</Text>
            </View>

            <Text style={styles.payAmountLabel}>Amount to Transfer</Text>
            <Text style={styles.payAmount}>{formatNaira(summary.boboTotal)}</Text>

            <Text style={styles.payNote}>
              Tap Payment Done only after transfer is confirmed.
            </Text>

            <TouchableOpacity
              style={[styles.clearAllBtn, clearing && styles.btnDisabled]}
              onPress={handleClearAll}
              disabled={clearing}
            >
              {clearing
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.clearAllBtnText}>✅ Payment Done — Clear All Records</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.notYetBtn} onPress={() => setPayModalVisible(false)}>
              <Text style={styles.notYetText}>Not Yet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
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
  // Lock screen
  lockContainer: { flex: 1, backgroundColor: '#0f0f0f', justifyContent: 'center', alignItems: 'center', padding: 24 },
  lockCard: { backgroundColor: '#1c1c1c', borderRadius: 14, padding: 28, width: '100%', maxWidth: 380, borderWidth: 1, borderColor: '#2a2a2a' },
  lockTitle: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  lockSub: { color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 24 },
  pinInput: { backgroundColor: '#0f0f0f', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 10, padding: 14, color: '#fff', fontSize: 20, textAlign: 'center', letterSpacing: 8, marginBottom: 8 },
  pinError: { color: '#ef4444', fontSize: 13, textAlign: 'center', marginBottom: 10 },
  unlockBtn: { backgroundColor: '#2563eb', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  unlockBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  btnDisabled: { opacity: 0.6 },

  // Report
  content: { padding: 16, paddingBottom: 20 },
  screenTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 18 },
  grandBanner: { backgroundColor: '#1c1c1c', borderRadius: 14, padding: 20, borderWidth: 1, borderColor: '#2a2a2a', marginBottom: 12, alignItems: 'center' },
  grandLabel: { color: '#aaa', fontSize: 13, marginBottom: 6 },
  grandAmount: { color: '#fff', fontSize: 34, fontWeight: '900' },
  earningsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  earningsCard: { flex: 1, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2a2a2a' },
  earningsLabel: { color: '#aaa', fontSize: 12, marginBottom: 6 },
  earningsAmount: { fontSize: 18, fontWeight: '800' },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 10, marginTop: 8 },
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
  emptyText: { color: '#555', fontSize: 13, marginBottom: 12 },
  saleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1c1c1c' },
  saleLeft: { flex: 1 },
  saleItem: { color: '#fff', fontSize: 14, fontWeight: '600' },
  saleMeta: { color: '#888', fontSize: 11, marginTop: 2 },
  saleRight: { alignItems: 'flex-end' },
  saleBobo: { color: '#60a5fa', fontSize: 14, fontWeight: '700' },
  shareBtn: { backgroundColor: '#1c1c1c', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 20, borderWidth: 1, borderColor: '#2a2a2a' },
  shareBtnText: { color: '#60a5fa', fontWeight: '700', fontSize: 14 },

  // Sticky Pay button
  stickyBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: '#0f0f0f', borderTopWidth: 1, borderTopColor: '#1c1c1c' },
  payBtn: { backgroundColor: '#7c3aed', borderRadius: 12, padding: 16, alignItems: 'center' },
  payBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#1c1c1c', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: '#2a2a2a' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 20 },
  accountCard: { backgroundColor: '#0f0f0f', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#2a2a2a', marginBottom: 16 },
  accountLabel: { color: '#888', fontSize: 11, marginTop: 8, marginBottom: 2 },
  accountValue: { color: '#fff', fontSize: 16, fontWeight: '600' },
  accountNumber: { color: '#fff', fontSize: 24, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: 2, marginTop: 2 },
  payAmountLabel: { color: '#aaa', fontSize: 13, textAlign: 'center', marginBottom: 6 },
  payAmount: { color: '#60a5fa', fontSize: 36, fontWeight: '900', textAlign: 'center', marginBottom: 16 },
  payNote: { color: '#888', fontSize: 12, textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  clearAllBtn: { backgroundColor: '#dc2626', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  clearAllBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  notYetBtn: { alignItems: 'center', padding: 10 },
  notYetText: { color: '#888', fontSize: 14 },
});
