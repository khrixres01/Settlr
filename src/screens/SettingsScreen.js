import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { getAllSettings, upsertSetting, getSetting, getCategories, updateCategory } from '../db/salesService';
import { useAuth } from '../context/AuthContext';

export default function SettingsScreen() {
  const { isAdmin } = useAuth();

  // Account details
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);

  // PIN change
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [savingPin, setSavingPin] = useState(false);

  // Split rules
  const [categories, setCategories] = useState([]);
  const [loadingRules, setLoadingRules] = useState(true);
  const [editedRules, setEditedRules] = useState({});
  const [savingRules, setSavingRules] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [settings, cats] = await Promise.all([getAllSettings(), getCategories()]);
      setBankName(settings.bank_name || '');
      setAccountName(settings.account_name || '');
      setAccountNumber(settings.account_number || '');
      setCategories(cats);
      // Initialise editable fields from DB values
      const initial = {};
      cats.forEach(c => {
        initial[c.id] = {
          bobo_pct: String(c.bobo_pct),
          mama_pct: String(c.mama_pct),
          utilities_pct: String(c.utilities_pct),
          fixed_profit_per_unit: String(c.fixed_profit_per_unit),
        };
      });
      setEditedRules(initial);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoadingRules(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleSaveAccount() {
    if (!bankName.trim() || !accountName.trim() || !accountNumber.trim()) {
      Alert.alert('Missing Fields', 'All account fields are required.');
      return;
    }
    setSavingAccount(true);
    try {
      await Promise.all([
        upsertSetting('bank_name', bankName.trim()),
        upsertSetting('account_name', accountName.trim()),
        upsertSetting('account_number', accountNumber.trim()),
      ]);
      Alert.alert('Saved', 'Account details updated.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSavingAccount(false);
    }
  }

  async function handleChangePin() {
    if (!currentPin || !newPin || !confirmPin) {
      Alert.alert('Missing Fields', 'All PIN fields are required.');
      return;
    }
    if (newPin.length < 4) {
      Alert.alert('Too Short', 'New PIN must be at least 4 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      Alert.alert('Mismatch', 'New PIN and Confirm PIN do not match.');
      return;
    }
    setSavingPin(true);
    try {
      const stored = await getSetting('report_pin');
      if (currentPin !== stored) {
        Alert.alert('Incorrect PIN', 'Current PIN is incorrect.');
        return;
      }
      await upsertSetting('report_pin', newPin);
      setCurrentPin(''); setNewPin(''); setConfirmPin('');
      Alert.alert('Success', 'PIN changed successfully.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSavingPin(false);
    }
  }

  function updateRule(catId, field, value) {
    setEditedRules(prev => ({
      ...prev,
      [catId]: { ...prev[catId], [field]: value },
    }));
  }

  async function handleSaveRules() {
    // Validate each category
    for (const cat of categories) {
      const r = editedRules[cat.id];
      const bobo = parseFloat(r.bobo_pct);
      const mama = parseFloat(r.mama_pct);
      const util = parseFloat(r.utilities_pct);
      if (isNaN(bobo) || isNaN(mama) || isNaN(util)) {
        Alert.alert('Invalid', `All percentages for ${cat.name} must be numbers.`);
        return;
      }
      const total = Math.round((bobo + mama + util) * 10) / 10;
      if (total !== 100) {
        Alert.alert('Invalid', `${cat.name} percentages must add up to 100% (currently ${total}%).`);
        return;
      }
      if (cat.type === 'fixed_profit_per_unit') {
        const fp = parseFloat(r.fixed_profit_per_unit);
        if (isNaN(fp) || fp <= 0) {
          Alert.alert('Invalid', `Fixed profit per unit for ${cat.name} must be greater than 0.`);
          return;
        }
      }
    }

    setSavingRules(true);
    try {
      await Promise.all(categories.map(cat => {
        const r = editedRules[cat.id];
        const fields = {
          bobo_pct: parseFloat(r.bobo_pct),
          mama_pct: parseFloat(r.mama_pct),
          utilities_pct: parseFloat(r.utilities_pct),
          fixed_profit_per_unit: cat.type === 'fixed_profit_per_unit'
            ? parseFloat(r.fixed_profit_per_unit)
            : 0,
        };
        return updateCategory(cat.id, fields);
      }));
      await loadData();
      Alert.alert('Saved', 'Split rules updated successfully.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSavingRules(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.screenTitle}>Settings</Text>

      {/* Section 1: Account Details */}
      <SectionCard title="Your Account Details">
        <Label text="Bank Name" required />
        <TextInput style={styles.input} placeholder="e.g. First Bank" placeholderTextColor="#555" value={bankName} onChangeText={setBankName} />
        <Label text="Account Name" required />
        <TextInput style={styles.input} placeholder="e.g. Oluwaseun Adeyemi" placeholderTextColor="#555" value={accountName} onChangeText={setAccountName} />
        <Label text="Account Number" required />
        <TextInput
          style={[styles.input, styles.acctNumberInput]}
          placeholder="0123456789"
          placeholderTextColor="#555"
          value={accountNumber}
          onChangeText={setAccountNumber}
          keyboardType="number-pad"
          maxLength={10}
        />
        <TouchableOpacity
          style={[styles.saveBtn, savingAccount && styles.btnDisabled]}
          onPress={handleSaveAccount}
          disabled={savingAccount}
        >
          {savingAccount ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Account Details</Text>}
        </TouchableOpacity>
      </SectionCard>

      {/* Section 2: Change PIN */}
      <SectionCard title="Change Report PIN">
        <Label text="Current PIN" required />
        <TextInput style={styles.input} placeholder="Enter current PIN" placeholderTextColor="#555" value={currentPin} onChangeText={setCurrentPin} secureTextEntry keyboardType="number-pad" />
        <Label text="New PIN" required />
        <TextInput style={styles.input} placeholder="Minimum 4 digits" placeholderTextColor="#555" value={newPin} onChangeText={setNewPin} secureTextEntry keyboardType="number-pad" />
        <Label text="Confirm New PIN" required />
        <TextInput style={styles.input} placeholder="Repeat new PIN" placeholderTextColor="#555" value={confirmPin} onChangeText={setConfirmPin} secureTextEntry keyboardType="number-pad" />
        <TouchableOpacity
          style={[styles.saveBtn, savingPin && styles.btnDisabled]}
          onPress={handleChangePin}
          disabled={savingPin}
        >
          {savingPin ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Change PIN</Text>}
        </TouchableOpacity>
      </SectionCard>

      {/* Section 3: Profit Split Rules */}
      <View style={styles.rulesHeader}>
        <Text style={styles.sectionTitle}>Profit Split Rules</Text>
        {!isAdmin && (
          <View style={styles.lockBadge}>
            <Text style={styles.lockBadgeText}>🔒 Read-only</Text>
          </View>
        )}
        {isAdmin && (
          <View style={[styles.lockBadge, styles.adminBadge]}>
            <Text style={[styles.lockBadgeText, { color: '#60a5fa' }]}>⚙️ Admin</Text>
          </View>
        )}
      </View>

      {loadingRules
        ? <ActivityIndicator color="#60a5fa" />
        : categories.map(cat => (
          <View key={cat.id} style={styles.ruleCard}>
            <Text style={styles.ruleName}>{cat.name}</Text>
            <Text style={styles.ruleType}>
              {cat.type === 'revenue_split'
                ? 'Revenue Split (qty × price)'
                : 'Fixed profit per unit'}
            </Text>

            {isAdmin ? (
              /* EDITABLE for admin */
              <View>
                <View style={styles.pctRow}>
                  <PctInput label="Bobo %" value={editedRules[cat.id]?.bobo_pct} color="#60a5fa"
                    onChange={v => updateRule(cat.id, 'bobo_pct', v)} />
                  <PctInput label="Mama %" value={editedRules[cat.id]?.mama_pct} color="#c084fc"
                    onChange={v => updateRule(cat.id, 'mama_pct', v)} />
                  <PctInput label="Utilities %" value={editedRules[cat.id]?.utilities_pct} color="#4ade80"
                    onChange={v => updateRule(cat.id, 'utilities_pct', v)} />
                </View>
                {cat.type === 'fixed_profit_per_unit' && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={styles.pctLabel}>Fixed Profit per Unit (₦)</Text>
                    <TextInput
                      style={styles.input}
                      value={editedRules[cat.id]?.fixed_profit_per_unit}
                      onChangeText={v => updateRule(cat.id, 'fixed_profit_per_unit', v)}
                      keyboardType="decimal-pad"
                      placeholderTextColor="#555"
                    />
                  </View>
                )}
                <Text style={styles.pctHint}>
                  Total: {(
                    (parseFloat(editedRules[cat.id]?.bobo_pct) || 0) +
                    (parseFloat(editedRules[cat.id]?.mama_pct) || 0) +
                    (parseFloat(editedRules[cat.id]?.utilities_pct) || 0)
                  ).toFixed(1)}% (must equal 100%)
                </Text>
              </View>
            ) : (
              /* READ-ONLY for non-admin */
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
            )}
          </View>
        ))
      }

      {isAdmin && (
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: '#7c3aed', marginBottom: 8 }, savingRules && styles.btnDisabled]}
          onPress={handleSaveRules}
          disabled={savingRules}
        >
          {savingRules ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Split Rules</Text>}
        </TouchableOpacity>
      )}

      {!isAdmin && (
        <Text style={styles.rulesCaption}>
          Set by business agreement. Contact your admin to change.
        </Text>
      )}
    </ScrollView>
  );
}

function PctInput({ label, value, color, onChange }) {
  return (
    <View style={styles.pctInputWrap}>
      <Text style={[styles.pctLabel, { color }]}>{label}</Text>
      <TextInput
        style={[styles.pctInput, { borderColor: color }]}
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        placeholderTextColor="#555"
        maxLength={5}
      />
    </View>
  );
}

function SectionCard({ title, children }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Label({ text, required }) {
  return (
    <Text style={styles.label}>
      {text}{required && <Text style={{ color: '#ef4444' }}> *</Text>}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  content: { padding: 16, paddingBottom: 60 },
  screenTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 20 },
  card: { backgroundColor: '#1c1c1c', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#2a2a2a', marginBottom: 20 },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 14 },
  label: { color: '#ccc', fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#0f0f0f', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 10, padding: 14, color: '#fff', fontSize: 15 },
  acctNumberInput: { fontSize: 22, fontWeight: '800', letterSpacing: 3, fontVariant: ['tabular-nums'] },
  saveBtn: { backgroundColor: '#2563eb', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 16 },
  btnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 10 },
  rulesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  lockBadge: { backgroundColor: '#1c1c1c', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#2a2a2a' },
  adminBadge: { borderColor: '#60a5fa' },
  lockBadgeText: { color: '#888', fontSize: 11 },
  ruleCard: { backgroundColor: '#1c1c1c', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2a2a2a', marginBottom: 10 },
  ruleName: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 2 },
  ruleType: { color: '#888', fontSize: 12, marginBottom: 10 },
  rulePills: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  rulePill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  rulePillText: { fontSize: 12, fontWeight: '700' },
  rulesCaption: { color: '#555', fontSize: 11, textAlign: 'center', marginTop: 4, marginBottom: 20 },
  pctRow: { flexDirection: 'row', gap: 8 },
  pctInputWrap: { flex: 1 },
  pctLabel: { color: '#aaa', fontSize: 11, fontWeight: '600', marginBottom: 4 },
  pctInput: { backgroundColor: '#0f0f0f', borderWidth: 1, borderRadius: 8, padding: 10, color: '#fff', fontSize: 14, textAlign: 'center' },
  pctHint: { color: '#888', fontSize: 11, marginTop: 8, textAlign: 'right' },
});
