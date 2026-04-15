import { View, Text, StyleSheet } from 'react-native';

export default function RemindersScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.muted}>Reminders will be implemented here.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1b2d', padding: 16 },
  card: { backgroundColor: '#172033', borderRadius: 12, padding: 18, borderWidth: 1, borderColor: '#1e3050' },
  muted: { color: '#94a3b8', fontSize: 14 },
});
