import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import SalesEntryScreen from '../screens/SalesEntryScreen';
import WeeklyReportScreen from '../screens/WeeklyReportScreen';
import MonthlyReportScreen from '../screens/MonthlyReportScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const NAV_THEME = {
  dark: true,
  colors: {
    primary: '#60a5fa',
    background: '#0f0f0f',
    card: '#1c1c1c',
    text: '#ffffff',
    border: '#2a2a2a',
    notification: '#60a5fa',
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' },
    medium:  { fontFamily: 'System', fontWeight: '500' },
    bold:    { fontFamily: 'System', fontWeight: '700' },
    heavy:   { fontFamily: 'System', fontWeight: '900' },
  },
};

function DashboardStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1c1c1c' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: '#0f0f0f' },
      }}
    >
      <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Settlr', headerShown: false }} />
      <Stack.Screen name="WeeklyReport" component={WeeklyReportScreen} options={{ title: 'Weekly Report' }} />
      <Stack.Screen name="MonthlyReport" component={MonthlyReportScreen} options={{ title: 'Monthly Report' }} />
    </Stack.Navigator>
  );
}

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1c1c1c',
          borderTopColor: '#2a2a2a',
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: '#60a5fa',
        tabBarInactiveTintColor: '#555',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardStack}
        options={{ title: 'Dashboard', tabBarIcon: ({ color }) => <TabIcon label="📊" color={color} /> }}
      />
      <Tab.Screen
        name="LogSale"
        component={SalesEntryScreen}
        options={{ title: 'Log Sale', tabBarIcon: ({ color }) => <TabIcon label="➕" color={color} /> }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings', tabBarIcon: ({ color }) => <TabIcon label="⚙️" color={color} /> }}
      />
    </Tab.Navigator>
  );
}

function TabIcon({ label }) {
  return (
    <View style={iconStyles.wrap}>
      <React.Fragment>{label}</React.Fragment>
    </View>
  );
}

const iconStyles = StyleSheet.create({
  wrap: { justifyContent: 'center', alignItems: 'center' },
});

export default function AppNavigator() {
  const { session } = useAuth();

  // Show spinner while auth state resolves
  if (session === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#60a5fa" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={NAV_THEME}>
      {session ? <AppTabs /> : <LoginStack />}
    </NavigationContainer>
  );
}

function LoginStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
