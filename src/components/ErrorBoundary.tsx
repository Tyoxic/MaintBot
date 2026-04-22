import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { sendBugReport } from '../utils/bugReport';
import { addBreadcrumb } from '../utils/errorLog';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack?: string | null }): void {
    console.error('ErrorBoundary:', error.message, errorInfo.componentStack ?? '');
    addBreadcrumb('error-boundary', 'Render error caught', {
      message: error.message,
    });
  }

  reset = (): void => {
    addBreadcrumb('error-boundary', 'User tapped Try Again');
    this.setState({ error: null });
  };

  sendReport = async (): Promise<void> => {
    addBreadcrumb('error-boundary', 'User tapped Send Bug Report');
    try {
      await sendBugReport();
    } catch {
      // Email failure shouldn't crash the fallback UI
    }
  };

  render(): ReactNode {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message}>
          MaintBot ran into an error. You can try again, or send a bug report
          so we can fix it.
        </Text>
        <ScrollView style={styles.errorScroll} contentContainerStyle={styles.errorScrollContent}>
          <Text style={styles.errorText}>{this.state.error.message}</Text>
          {this.state.error.stack ? (
            <Text style={styles.stackText}>{this.state.error.stack}</Text>
          ) : null}
        </ScrollView>
        <TouchableOpacity style={styles.primaryBtn} onPress={this.sendReport}>
          <Text style={styles.primaryBtnText}>Send Bug Report</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={this.reset}>
          <Text style={styles.secondaryBtnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 24,
    justifyContent: 'center',
  },
  icon: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  errorScroll: {
    maxHeight: 200,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eee',
  },
  errorScrollContent: {
    paddingBottom: 4,
  },
  errorText: {
    fontSize: 13,
    color: '#d32f2f',
    fontWeight: '600',
    marginBottom: 8,
  },
  stackText: {
    fontSize: 11,
    color: '#888',
    fontFamily: 'monospace',
  },
  primaryBtn: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
  },
});
