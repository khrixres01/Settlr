import React from 'react';
import { StatusBar, View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  componentDidCatch(error, info) {
    this.setState({ error: error.toString() + '\n\n' + info.componentStack });
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.errContainer}>
          <Text style={styles.errTitle}>Crash Report</Text>
          <ScrollView>
            <Text style={styles.errText}>{this.state.error}</Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errContainer: { flex: 1, backgroundColor: '#0f0f0f', padding: 20, paddingTop: 60 },
  errTitle: { color: '#ef4444', fontSize: 18, fontWeight: '800', marginBottom: 16 },
  errText: { color: '#ccc', fontSize: 12, fontFamily: 'monospace', lineHeight: 18 },
});

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#0f0f0f" />
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
