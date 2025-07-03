import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { ref as dbRef, update } from 'firebase/database';
import { database } from '../firebaseConfig';

interface EventItemProps {
  adminId: string;
  eventId: string;
  title: string;
  content?: string;
  imageUrl?: string[];
  beginAt?: string;
  finishAt?: string;
  createAt?: string;
  status: number; // 0 | 1 | 2
  onClick: () => void;
}

const { width } = Dimensions.get('window');
const CARD_W = width * 0.75;
const PAD = 15;

/* ---------- helpers ---------- */
const parseDate = (str?: string) => {
  if (!str || typeof str !== 'string') return new Date(); // fallback
  const [time, date] = str.split(' ');
  if (!time || !date) return new Date();
  const [hh = 0, mm = 0, ss = 0] = time.split(':').map(Number);
  const [dd = 1, MM = 1, yyyy = 1970] = date.split('/').map(Number);
  return new Date(yyyy, MM - 1, dd, hh, mm, ss);
};

const diffToString = (ms: number) => {
  if (ms <= 0) return '0s';
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h > 0 ? `${h}h ` : ''}${m > 0 ? `${m}m ` : ''}${s}s`;
};

const statusText = (s: number) =>
  s === 0 ? 'Sắp bắt đầu' : s === 1 ? 'Đang diễn ra' : 'Đã kết thúc';

const statusColor = (s: number) =>
  s === 0 ? '#FFA500' : s === 1 ? '#2E8B57' : '#E53935';

const ItemEvent: React.FC<EventItemProps> = ({
  adminId,
  eventId,
  title,
  content = '',
  imageUrl = [],
  beginAt,
  finishAt,
  status,
  onClick
}) => {
  /* ---------- slide ảnh ---------- */
  const [idx, setIdx] = useState(0);
  const fadeCur = useRef(new Animated.Value(1)).current;
  const fadeNext = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (imageUrl.length <= 1) return;

    fadeCur.setValue(1);
    fadeNext.setValue(0);

    const timer = setTimeout(() => {
      const next = (idx + 1) % imageUrl.length;

      Animated.parallel([
        Animated.timing(fadeCur, { toValue: 0, duration: 2000, useNativeDriver: true }),
        Animated.timing(fadeNext, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ]).start(() => setIdx(next));
    }, 10000);

    return () => clearTimeout(timer); // dọn dẹp khi unmount hoặc idx thay đổi
  }, [idx, imageUrl]);

  /* ---------- status + countdown ---------- */
  const [curStatus, setCurStatus] = useState(status);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    const begin = parseDate(beginAt);
    const finish = parseDate(finishAt);

    const tick = () => {
      const now = new Date();
      let target: Date | null = null;

      if (curStatus === 0) target = begin;
      else if (curStatus === 1) target = finish;

      if (target) {
        const diff = target.getTime() - now.getTime();
        setCountdown(diffToString(diff));

        if (diff <= 0) {
          const newStatus = curStatus === 0 ? 1 : 2;
          setCurStatus(newStatus);
          update(dbRef(database, `Events/${adminId}/${eventId}`), {
            status: newStatus,
          });
        }
      } else {
        setCountdown('');
      }
    };

    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [curStatus, beginAt, finishAt, adminId, eventId]);

  return (
    <TouchableOpacity style={styles.card} onPress={onClick}>
      <View style={styles.row}>
        {countdown !== '' ? <Text style={styles.count}>{countdown}</Text> : <Text style={styles.count}>-- : --</Text>}
        <Text style={[styles.statusLabel, { color: statusColor(curStatus) }]}>
          {statusText(curStatus)}
        </Text>
      </View>

      {/* ảnh */}
      <View style={styles.imgWrap}>
        <Animated.Image
          source={{ uri: imageUrl[idx] }}
          style={[styles.img, { opacity: fadeCur }]}
        />
        {imageUrl.length > 1 && (
          <Animated.Image
            source={{ uri: imageUrl[(idx + 1) % imageUrl.length] }}
            style={[styles.img, StyleSheet.absoluteFillObject, { opacity: fadeNext }]}
          />
        )}
      </View>

      {/* title + desc */}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.desc}>
        {content.length > 60 ? content.slice(0, 60) + '…' : content}
      </Text>
    </TouchableOpacity>
  );
};

/* ---------- styles ---------- */
const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    padding: PAD,
    paddingTop: 0,
    marginBottom: 20,
    borderRadius: 15,
    backgroundColor: '#fff',
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  imgWrap: {
    width: CARD_W - PAD * 2,
    height: 190,
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 10,
  },
  img: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    marginTop: 10,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  count: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E53935',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  desc: {
    fontSize: 15,
    color: '#555',
    marginTop: 6,
    lineHeight: 22,
  },
});

export default ItemEvent;
