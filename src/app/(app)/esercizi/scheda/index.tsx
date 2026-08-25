import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';

import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';

export default function SchedaScreen() {
  const { url } = useLocalSearchParams<{ url: string }>();
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!url) return;
    fetch(url)
      .then((res) => res.text())
      .then(setHtml)
      .catch(() => setError(true));
  }, [url]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {!html && !error && (
          <ActivityIndicator style={styles.loader} color={Colors.light.accent} />
        )}
        {html && (
          <WebView
            source={{ html, baseUrl: url }}
            style={styles.webview}
            javaScriptEnabled
            domStorageEnabled
            originWhitelist={['*']}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  loader: { flex: 1 },
  webview: { flex: 1 },
});
