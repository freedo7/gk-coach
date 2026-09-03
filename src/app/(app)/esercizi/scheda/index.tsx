import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';

import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';

export default function SchedaScreen() {
  const { url } = useLocalSearchParams<{ url: string }>();
  const colors = useTheme();
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [webViewKey, setWebViewKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!url) return;
      setHtml(null);
      setError(false);
      fetch(url)
        .then((res) => res.text())
        .then((text) => {
          setHtml(text);
          setWebViewKey((k) => k + 1);
        })
        .catch(() => setError(true));
    }, [url])
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {!html && !error && (
          <ActivityIndicator style={styles.loader} color={colors.accent} />
        )}
        {html && (
          <WebView
            key={webViewKey}
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
