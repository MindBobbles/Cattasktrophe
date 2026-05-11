import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MarketItem } from '../types';
import { GB } from '../constants/colors';
import {
  PixelCoin, PixelItemIcon, PixelPriority,
} from '../components/PixelIcons';

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
          <PixelCoin size={2} />
          <Text style={styles.coinText}>{coins}</Text>
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
            💀  YOUR CAT IS DEAD — buy Revive Potion (50c) below
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.list}>
        {items.map(item => {
          const canAfford = coins >= item.cost;
          return (
            <View key={item.id} style={styles.card}>
              {/* Pixel item icon */}
              <View style={styles.itemIconBox}>
                <PixelItemIcon id={item.id} size={3} />
              </View>

              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemDesc}>{item.description}</Text>
              </View>

              <View style={styles.itemRight}>
                <View style={styles.costRow}>
                  <PixelCoin size={2} />
                  <Text style={[styles.itemCost, !canAfford && styles.itemCostRed]}>
                    {item.cost}
                  </Text>
                </View>
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

        {/* Priority legend */}
        <View style={styles.legendBox}>
          <Text style={styles.legendTitle}>TASK REWARDS</Text>
          {(['high', 'medium', 'low'] as const).map(lvl => (
            <View key={lvl} style={styles.legendRow}>
              <PixelPriority level={lvl} size={3} />
              <Text style={styles.legendText}>
                {lvl.toUpperCase()} = {lvl === 'high' ? 10 : lvl === 'medium' ? 5 : 3}
              </Text>
              <PixelCoin size={2} />
            </View>
          ))}
        </View>
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
    flexDirection: 'row', alignItems: 'center', gap: 6,
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
  itemIconBox: {
    width: 40, height: 40, flexShrink: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  itemInfo: { flex: 1, minWidth: 0, gap: 3 },
  itemName: { fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold', color: GB.light },
  itemDesc: { fontFamily: 'monospace', fontSize: 11, color: GB.dark },

  itemRight: { alignItems: 'center', gap: 6 },
  costRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
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

  legendBox: {
    marginTop: 8, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: GB.dark,
    gap: 8, alignItems: 'center',
  },
  legendTitle: {
    fontFamily: 'monospace', fontSize: 10, color: GB.dark,
    letterSpacing: 2, marginBottom: 4,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendText: { fontFamily: 'monospace', fontSize: 11, color: GB.dark },
});
