import { supabase } from './supabase';

export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('id');
  if (error) throw error;
  return data;
}

export async function insertSale(saleRow) {
  const { data, error } = await supabase
    .from('sales')
    .insert([saleRow])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getSalesByWeek(weekNumber, year) {
  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .eq('week_number', weekNumber)
    .eq('year', year)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getSalesByMonth(month, year) {
  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .eq('month', month)
    .eq('year', year)
    .order('sale_date', { ascending: true });
  if (error) throw error;
  return data;
}

export async function deleteAllSales() {
  // Deletes every row — RLS policy requires authenticated user
  const { error } = await supabase
    .from('sales')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // always-true predicate
  if (error) throw error;
}

export async function getSetting(key) {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', key)
    .single();
  if (error) throw error;
  return data?.value ?? null;
}

export async function upsertSetting(key, value) {
  const { error } = await supabase
    .from('settings')
    .upsert({ key, value });
  if (error) throw error;
}

export async function getMyRole(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  if (error) return 'user'; // default to non-admin if no profile yet
  return data?.role ?? 'user';
}

export async function ensureProfile(userId) {
  // Creates profile row if it doesn't exist yet (role defaults to 'user')
  await supabase
    .from('profiles')
    .upsert({ id: userId }, { onConflict: 'id', ignoreDuplicates: true });
}

export async function updateCategory(id, fields) {
  const { error } = await supabase
    .from('categories')
    .update(fields)
    .eq('id', id);
  if (error) throw error;
}

export async function getAllSettings() {
  const { data, error } = await supabase
    .from('settings')
    .select('*');
  if (error) throw error;
  // Convert array to object for convenience
  return Object.fromEntries(data.map(r => [r.key, r.value]));
}
