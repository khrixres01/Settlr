# Settlr — Business Profit Tracker

A React Native Android app for tracking and splitting business profits between Bobo (investor) and Mama (operator).

---

## Features

| Feature | Detail |
|---|---|
| Sales entry | Ice Block (revenue split) and Drinks (fixed ₦100/bottle) |
| Real-time dashboard | Live Supabase subscription, auto-updates across devices |
| Weekly report | PIN-protected, Pay Profit modal with double-confirm clear |
| Monthly report | Export to CSV or Excel (.xlsx) with split rules sheet |
| Settings | Account details + PIN change |
| Split rules | Read-only in UI — stored in Supabase, set by developer |
| Dark theme | Full dark UI with colour-coded shares |

---

## 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** and run the full contents of `supabase-setup.sql`.
3. Under **Authentication → Users**, create 2 users manually:
   - One for Bobo (e.g. `bobo@yourstore.com`)
   - One for Mama (e.g. `mama@yourstore.com`)
4. Copy your **Project URL** and **anon/public API key** from **Settings → API**.

---

## 2. Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:

```
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 3. Install Dependencies

```bash
npm install

# Core
npm install @supabase/supabase-js
npm install @react-native-async-storage/async-storage
npm install react-native-config

# Navigation
npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack
npm install react-native-screens react-native-safe-area-context

# Export & File
npm install xlsx
npm install react-native-fs
npm install react-native-share
```

---

## 4. Android: react-native-config Gradle Setup

**android/app/build.gradle** — add at the very top (line 1):

```gradle
apply from: project(':react-native-config').projectDir.getPath() + "/dotenv.gradle"
```

**android/settings.gradle** — if not auto-linked, add:

```gradle
include ':react-native-config'
project(':react-native-config').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-config/android')
```

---

## 5. Link Native Modules

```bash
# React Native 0.60+ auto-links most packages.
# For react-native-config, run:
npx react-native link react-native-config

# iOS pods (skip for Android-only)
# cd ios && pod install
```

---

## 6. Run & Build

```bash
# Start Metro bundler
npx react-native start

# Run on connected Android device / emulator
npx react-native run-android

# Build release APK
cd android
./gradlew assembleRelease
# APK location: android/app/build/outputs/apk/release/app-release.apk
```

---

## 7. Default Credentials

| Setting | Default Value |
|---|---|
| Report PIN | `0000` |
| Bank Name | *(empty — set in Settings)* |
| Account Name | *(empty — set in Settings)* |
| Account Number | *(empty — set in Settings)* |

**Important:** Change the PIN and set account details before first use.

---

## 8. Business Rules (hardcoded)

| Category | Type | Bobo | Mama | Utilities |
|---|---|---|---|---|
| Ice Block | Revenue split (qty × price) | 60% | 30% | 10% |
| Drinks | Fixed ₦100 profit per bottle | 50% | 30% | 20% |

These rules are stored in the Supabase `categories` table and displayed read-only in the app. To change them, update the database directly and contact your developer.

---

## 9. Project Structure

```
App.js                          Root component
.env.example                    Environment variable template
supabase-setup.sql              Full DB schema + seed + RLS + Realtime
src/
  context/AuthContext.js        Supabase auth state provider
  db/
    supabase.js                 Supabase client (AsyncStorage session)
    salesService.js             All DB query functions
  utils/
    calculations.js             calculateSaleSplit, buildSummary, formatNaira
    dateHelpers.js              getWeekNumber, getCurrentMonth, formatDate
    export.js                   exportExcel (SheetJS), exportCSV
  screens/
    LoginScreen.js
    DashboardScreen.js          Real-time subscription, weekly overview
    SalesEntryScreen.js         Category-gated sale form
    WeeklyReportScreen.js       PIN-locked, Pay Profit modal, Clear All
    MonthlyReportScreen.js      Month nav, export, split rules display
    SettingsScreen.js           Account details, PIN change, read-only rules
  navigation/
    AppNavigator.js             Auth-aware navigator, bottom tabs
```
