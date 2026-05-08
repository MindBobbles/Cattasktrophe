import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MarketItem } from '../types';
import { GB } from '../constants/colors';

interface Props {
  items: MarketItem[];
  coins: number;
  catAlive: boolean;
  onBuy: (itemId: string) => string;
}

export default function MarketScreen({ items, coins, catAlive, onBuy }: Props) {
  const [lastMsg, setLastMsg] = useState('');

  function handleBuy(id: string) {
    const msg = onBuy(id);
    setLastMsg(msg);
    setTimeout(() => setLastMsg(''), 3000);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>CAT MARKET</Text>
        <View style={styles.coinBadge}>
          <Text style={styles.coinText}>🪙 {coins}</Text>
        </View>
      </View>

      {/* Feedback message */}
      {lastMsg ? (
        <View style={styles.msgBanner}>
          <Text style={styles.msgText}>{lastMsg}</Text>
        </View>
      ) : null}

      {!catAlive && (
        <View style={styles.deadBanner}>
          <Text style={styles.deadBannerText}>
            💀  YOUR CAT IS DEAD — buy Revive Potion or a New Cat below
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.list}>
        {items.map(item => {
          const canAfford = coins >= item.cost;
          return (
            <View key={item.id} style={styles.card}>
              <Text style={styles.itemEmoji}>{item.emoji}</Text>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemDesc}>{item.description}</Text>
              </View>
              <View style={styles.itemRight}>
                <Text style={[styles.itemCost, !canAfford && styles.itemCostRed]}>
                  🪙 {item.cost}
                </Text>
                <TouchableOpacity
                  style={[styles.buyBtn, !canAfford && styles.buyBtnDisabled]}
                  onPress={() => handleBuy(item.id)}
                  disabled={!canAfford}
                >
                  <Text style={[styles.buyBtnText, !canAfford && styles.buyBtnTextDim]}>
                    {canAfford ? 'BUY' : 'NEED'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        <Text style={styles.hint}>
          Complete tasks to earn coins.{'\n'}
          Special tasks pay more 🪙
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: GB.darkest },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10,
    borderBottomWidth: 2, borderBottomColor: GB.dark,
  },
  title: {
    fontFamily: 'monospace', fontSize: 16, fontWeight: 'bold',
    color: GB.light, letterSpacing: 2,
  },
  coinBadge: {
    backgroundColor: '#1a2e0a', borderWidth: 1,
    borderColor: GB.dark, borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  coinText: { fontFamily: 'monospace', fontSize: 13, color: GB.medium },

  msgBanner: {
    backgroundColor: '#0a2e0a', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: GB.dark,
  },
  msgText: { fontFamily: 'monospace', fontSize: 13, color: GB.light, textAlign: 'center' },

  deadBanner: {
    backgroundColor: '#1a0000', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#CC0000',
  },
  deadBannerText: {
    fontFamily: 'monospace', fontSize: 12, color: '#FF4444',
    textAlign: 'center', letterSpacing: 0.5,
  },

  list: { padding: 16, gap: 12, paddingBottom: 40 },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0a200a', borderWidth: 1, borderColor: GB.dark,
    borderRadius: 6, padding: 12, gap: 12,
  },
  itemEmoji: { fontSize: 28, width: 36, textAlign: 'center' },
  itemInfo: { flex: 1, gap: 3 },
  itemName: { fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold', color: GB.light },
  itemDesc: { fontFamily: 'monospace', fontSize: 11, color: GB.dark },

  itemRight: { alignItems: 'center', gap: 6 },
  itemCost: { fontFamily: 'monospace', fontSize: 12, color: GB.medium },
  itemCostRed: { color: '#CC4444' },

  buyBtn: {
    backgroundColor: GB.dark, borderRadius: 3,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  buyBtnDisabled: { backgroundColor: '#1a2e0a', opacity: 0.6 },
  buyBtnText: {
    fontFamily: 'monospace', fontSize: 12, fontWeight: 'bold',
    color: GB.light, letterSpacing: 1,
  },
  buyBtnTextDim: { color: GB.dark },

  hint: {
    fontFamily: 'monospace', fontSize: 11, color: GB.dark,
    textAlign: 'center', lineHeight: 18, marginTop: 8,
  },
});
