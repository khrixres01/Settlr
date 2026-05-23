import XLSX from 'xlsx';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { formatNaira } from './calculations';
import { getMonthName } from './dateHelpers';

const SALE_HEADERS = [
  'Date', 'Item Name', 'Category', 'Quantity',
  'Selling Price (₦)', 'Base Amount (₦)',
  'Bobo Share (₦)', 'Mama Share (₦)', 'Utilities (₦)',
];

function saleToRow(s) {
  return [
    s.sale_date,
    s.item_name,
    s.category_name,
    s.quantity,
    s.selling_price,
    s.base_amount,
    s.bobo_share,
    s.mama_share,
    s.utilities_share,
  ];
}

function totalsRow(sales) {
  const sum = (key) => sales.reduce((acc, s) => acc + s[key], 0);
  return [
    'TOTAL', '', '', sum('quantity'), '',
    sum('base_amount'), sum('bobo_share'), sum('mama_share'), sum('utilities_share'),
  ];
}

function splitRulesRows(categories) {
  return [
    ['Category', 'Type', 'Bobo %', 'Mama %', 'Utilities %', 'Fixed Profit/Unit (₦)'],
    ...categories.map(c => [
      c.name,
      c.type === 'revenue_split' ? 'Revenue Split' : 'Fixed Profit Per Unit',
      c.bobo_pct,
      c.mama_pct,
      c.utilities_pct,
      c.fixed_profit_per_unit,
    ]),
  ];
}

export async function exportExcel(sales, categories, month, year) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Sales
  const salesRows = [SALE_HEADERS, ...sales.map(saleToRow), totalsRow(sales)];
  const ws1 = XLSX.utils.aoa_to_sheet(salesRows);
  XLSX.utils.book_append_sheet(wb, ws1, 'Sales');

  // Sheet 2: Split Rules (read-only reference)
  const ws2 = XLSX.utils.aoa_to_sheet(splitRulesRows(categories));
  XLSX.utils.book_append_sheet(wb, ws2, 'Split Rules');

  const monthName = getMonthName(month);
  const filename = `Settlr_${monthName}_${year}.xlsx`;
  const path = `${RNFS.CachesDirectoryPath}/${filename}`;

  const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  await RNFS.writeFile(path, wbout, 'base64');

  await Share.open({
    url: `file://${path}`,
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filename,
    title: `Settlr Report — ${monthName} ${year}`,
  });
}

export async function exportCSV(sales, categories, month, year) {
  const monthName = getMonthName(month);
  const filename = `Settlr_${monthName}_${year}.csv`;
  const path = `${RNFS.CachesDirectoryPath}/${filename}`;

  const rows = [SALE_HEADERS, ...sales.map(saleToRow), totalsRow(sales)];

  // Append split rules section
  rows.push([], ['--- Split Rules ---'], ...splitRulesRows(categories));

  const csv = rows.map(row =>
    row.map(cell => {
      const s = String(cell ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    }).join(',')
  ).join('\n');

  await RNFS.writeFile(path, csv, 'utf8');

  await Share.open({
    url: `file://${path}`,
    type: 'text/csv',
    filename,
    title: `Settlr Report — ${monthName} ${year}`,
  });
}
