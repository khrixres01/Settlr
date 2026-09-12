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

---

## 10. Keeping the Project Alive

Two independent timers would otherwise take this app offline while it sits
untouched. [`.github/workflows/keepalive.yml`](.github/workflows/keepalive.yml)
handles both.

| Timer | Limit | How the workflow handles it |
|---|---|---|
| Supabase pauses a free project after inactivity | 7 days | Reads one row over the REST API every 3 days |
| GitHub disables a scheduled workflow after repo inactivity | 60 days | Commits `.github/keepalive-heartbeat.txt` every 14 days |

The ping uses the **anon** key, not the service role key. A plain read needs no
elevated rights, so the powerful key never has to be stored in GitHub.

### Required repository secrets

Add both under **Settings → Secrets and variables → Actions → _Secrets_ tab →
New repository secret**. They must be **Secrets**, not **Variables** —
Variables are readable by anyone who can view the repo and are printed in plain
text in workflow logs.

| Name | Value |
|---|---|
| `SUPABASE_URL` | Same as `SUPABASE_URL` in your local `.env` (e.g. `https://<project-id>.supabase.co`) |
| `SUPABASE_ANON_KEY` | Same as `SUPABASE_ANON_KEY` in your local `.env` (the `sb_publishable_…` / anon key) |

### Behaviour

- **Missing secrets fail immediately** with an explicit message, so a
  configuration mistake is never mistaken for a database fault.
- **Any non-2xx response fails the run**, so GitHub emails you if the project
  paused anyway.
- Run it by hand any time from **Actions → Keepalive → Run workflow**
  (`workflow_dispatch`).

A `200` with an empty array `[]` is the expected healthy result. Every `SELECT`
policy in `supabase-setup.sql` is granted `TO authenticated`, so an anon read
returns no rows — but the query still executes against the database, which is
what Supabase counts as activity.
