import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { getCategories, insertSale } from '../db/salesService';
import { calculateSaleSplit } from '../utils/calculations';
import { getWeekNumber, getCurrentYear, getCurrentMonth } from '../utils/dateHelpers';

const REQUIRED = <Text style={{ color: '#ef4444' }}> *</Text>;

export default function SalesEntryScreen() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCategories().then(setCategories).catch(console.warn);
  }, []);

  function clearForm() {
    setSelectedCategory(null);
    setItemName('');
    setQuantity('');
    setSellingPrice('');
  }

  function validate() {
    if (!selectedCategory) {
      Alert.alert('Missing Field', 'Please select a category.');
      return false;
    }
    if (selectedCategory.type === 'fixed_profit_per_unit' && !itemName.trim()) {
      Alert.alert('Missing Field', 'Item Name is required.');
      return false;
    }
    const qty = parseFloat(quantity);
    if (!quantity || isNaN(qty) || qty <= 0) {
      Alert.alert('Invalid Quantity', 'Quantity must be a number greater than 0.');
      return false;
    }
    if (selectedCategory.type === 'revenue_split') {
      const sp = parseFloat(sellingPrice);
      if (!sellingPrice || isNaN(sp) || sp <= 0) {
        Alert.alert('Invalid Selling Price', 'Selling Price must be greater than 0 for Ice Block.');
        return false;
      }
    }
    return true;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);

    try {
      const qty = parseFloat(quantity);
      const sp = selectedCategory.type === 'revenue_split' ? parseFloat(sellingPrice) : 0;

      const split = calculateSaleSplit(
        { quantity: qty, sellingPrice: sp },
        selectedCategory,
      );

      const now = new Date();
      const saleRow = {
        category_id: selectedCategory.id,
        category_name: selectedCategory.name,
        item_name: selectedCategory.type === 'revenue_split' ? selectedCategory.name : itemName.trim(),
        quantity: qty,
        selling_price: sp,
        base_amount: split.baseAmount,
        bobo_share: split.bobo,
        mama_share: split.mama,
        utilities_share: split.utilities,
        sale_date: now.toISOString().split('T')[0],
        week_number: getWeekNumber(now),
        month: getCurrentMonth(now),
        year: getCurrentYear(now),
      };

      await insertSale(saleRow);
      Alert.alert('Sale Recorded', 'The sale has been saved successfully.');
      clearForm();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save sale.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#0f0f0f' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.screenTitle}>Log Sale</Text>

        {/* Step 1: Category Selection */}
        <Text style={styles.label}>Category{REQUIRED}</Text>
        <View style={styles.categoryRow}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.catBtn,
                selectedCategory?.id === cat.id && styles.catBtnActive,
              ]}
              onPress={() => {
                setSelectedCategory(cat);
                setItemName('');
                setQuantity('');
                setSellingPrice('');
              }}
            >
              <Text style={[
                styles.catBtnText,
                selectedCategory?.id === cat.id && styles.catBtnTextActive,
              ]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Fields — only shown after category selected */}
        {selectedCategory && (
          <>
            {/* Item Name — hidden for Ice Block (revenue_split), shown for Drinks */}
            {selectedCategory.type === 'fixed_profit_per_unit' && (
              <>
                <Text style={styles.label}>Item Name{REQUIRED}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Coca-Cola"
                  placeholderTextColor="#555"
                  value={itemName}
                  onChangeText={setItemName}
                />
              </>
            )}

            <Text style={styles.label}>Quantity{REQUIRED}</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 10"
              placeholderTextColor="#555"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="decimal-pad"
            />

            {selectedCategory.type === 'revenue_split' && (
              <>
                <Text style={styles.label}>Selling Price per Unit (₦){REQUIRED}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 500"
                  placeholderTextColor="#555"
                  value={sellingPrice}
                  onChangeText={setSellingPrice}
                  keyboardType="decimal-pad"
                />
              </>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnText}>Record Sale</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.clearBtn} onPress={clearForm}>
              <Text style={styles.clearBtnText}>Clear Form</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 50 },
  screenTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 24 },
  label: { color: '#ccc', fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 16 },

  categoryRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  catBtn: {
    borderRadius: 10, paddingHorizontal: 18, paddingVertical: 12,
    backgroundColor: '#1c1c1c', borderWidth: 1, borderColor: '#2a2a2a',
  },
  catBtnActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  catBtnText: { color: '#aaa', fontWeight: '600', fontSize: 14 },
  catBtnTextActive: { color: '#fff' },

  ruleBox: { marginTop: 12, backgroundColor: '#1c1c1c', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#2a2a2a' },
  ruleText: { color: '#60a5fa', fontSize: 13, fontWeight: '600' },
  ruleNote: { color: '#888', fontSize: 12, marginTop: 4 },

  input: {
    backgroundColor: '#1c1c1c', borderWidth: 1, borderColor: '#2a2a2a',
    borderRadius: 10, padding: 14, color: '#fff', fontSize: 15,
  },

  saveBtn: {
    backgroundColor: '#16a34a', borderRadius: 10, padding: 16,
    alignItems: 'center', marginTop: 28,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  clearBtn: { alignItems: 'center', marginTop: 14 },
  clearBtnText: { color: '#555', fontSize: 14 },
});
