/**
 * Calculate the split for a single sale at save time.
 * Returns { baseAmount, bobo, mama, utilities }.
 *
 * For 'revenue_split': baseAmount = quantity × sellingPrice
 * For 'fixed_profit_per_unit': baseAmount = quantity × fixedProfitPerUnit
 * Splits are derived from the category percentages stored in the DB.
 */
export function calculateSaleSplit(sale, categoryRule) {
  let baseAmount;

  if (categoryRule.type === 'revenue_split') {
    baseAmount = sale.quantity * sale.sellingPrice;
  } else {
    // fixed_profit_per_unit
    baseAmount = sale.quantity * categoryRule.fixed_profit_per_unit;
  }

  const bobo = round2(baseAmount * (categoryRule.bobo_pct / 100));
  const mama = round2(baseAmount * (categoryRule.mama_pct / 100));
  const utilities = round2(baseAmount * (categoryRule.utilities_pct / 100));

  return { baseAmount: round2(baseAmount), bobo, mama, utilities };
}

/**
 * Aggregate pre-stored split columns from an array of sale rows.
 * Does NOT recalculate — just sums the stored values.
 */
export function buildSummary(sales) {
  let boboTotal = 0;
  let mamaTotal = 0;
  let utilitiesTotal = 0;
  let baseTotal = 0;

  for (const s of sales) {
    boboTotal += s.bobo_share;
    mamaTotal += s.mama_share;
    utilitiesTotal += s.utilities_share;
    baseTotal += s.base_amount;
  }

  return {
    boboTotal: round2(boboTotal),
    mamaTotal: round2(mamaTotal),
    utilitiesTotal: round2(utilitiesTotal),
    baseTotal: round2(baseTotal),
    count: sales.length,
  };
}

/**
 * Build per-category summaries from a flat list of sale rows.
 * Returns a map: categoryName → { boboTotal, mamaTotal, utilitiesTotal, count }
 */
export function buildCategorySummary(sales) {
  const map = {};
  for (const s of sales) {
    if (!map[s.category_name]) {
      map[s.category_name] = { boboTotal: 0, mamaTotal: 0, utilitiesTotal: 0, baseTotal: 0, count: 0 };
    }
    map[s.category_name].boboTotal += s.bobo_share;
    map[s.category_name].mamaTotal += s.mama_share;
    map[s.category_name].utilitiesTotal += s.utilities_share;
    map[s.category_name].baseTotal += s.base_amount;
    map[s.category_name].count += 1;
  }
  // Round all values
  for (const key of Object.keys(map)) {
    const c = map[key];
    c.boboTotal = round2(c.boboTotal);
    c.mamaTotal = round2(c.mamaTotal);
    c.utilitiesTotal = round2(c.utilitiesTotal);
    c.baseTotal = round2(c.baseTotal);
  }
  return map;
}

export function formatNaira(amount) {
  if (amount === null || amount === undefined) return '₦0.00';
  return '₦' + Number(amount).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
