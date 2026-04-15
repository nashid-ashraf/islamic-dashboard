import { View, Text, StyleSheet } from 'react-native';

export default function DashboardScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Islamic Daily Dashboard</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Prayer Times</Text>
        <Text style={styles.muted}>Prayer times will appear here.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Continue Reading</Text>
        <Text style={styles.muted}>Quran reading progress will appear here.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Upcoming Reminders</Text>
        <Text style={styles.muted}>Your next reminders will appear here.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1b2d', padding: 16 },
  title: { color: '#3ecf8e', fontSize: 22, fontWeight: '700', marginBottom: 16 },
  card: { backgroundColor: '#172033', borderRadius: 12, padding: 18, borderWidth: 1, borderColor: '#1e3050', marginBottom: 16 },
  cardTitle: { color: '#3ecf8e', fontSize: 15, fontWeight: '600', marginBottom: 8 },
  muted: { color: '#94a3b8', fontSize: 14 },
});
