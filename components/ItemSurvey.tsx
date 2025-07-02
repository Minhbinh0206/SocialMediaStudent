import React, { memo, useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Alert,
  Modal,
  ScrollView,
  ImageBackground,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { getDatabase, ref, onValue, off, get, runTransaction, set } from 'firebase/database';
import { getAuth } from 'firebase/auth';

/* --------------------------------------------------
 * Types
 * --------------------------------------------------*/
export interface OptionAnswer { content: string; userChooseIds: string[]; }
export interface LevelAnswer { value: number; userChooseIds: string[]; }

export type QuestionOption = {
  content: string;
  type: 'option';
  answers: { A: OptionAnswer; B: OptionAnswer; C: OptionAnswer; D: OptionAnswer };
  index?: number;
};
export type QuestionNumber = {
  content: string;
  type: 'number';
  min?: number;
  max?: number;
  answers: '';
  index?: number;
};
export type QuestionLevel = {
  content: string;
  type: 'level';
  answers: Record<1 | 2 | 3 | 4 | 5, LevelAnswer>;
  index?: number;
};
export type Question = QuestionOption | QuestionNumber | QuestionLevel;

export interface Survey {
  surveyId: string;
  title: string;
  startedAt: number;
  finishedAt: number;
  createdAt: number;
  userId: string;
  questions: Record<string, Question>;
}
interface ItemSurveyProps { survey: Survey; }

/* --------------------------------------------------
 * Helpers
 * --------------------------------------------------*/
const formatTime = (msLeft: number) => {
  if (msLeft <= 0) return 'Đã kết thúc';
  const sec = Math.floor(msLeft / 1000);
  const h = String(Math.floor(sec / 3600)).padStart(2, '0');
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const levelMap = { 1: 'Rất tệ', 2: 'Không thích', 3: 'Bình thường', 4: 'Thích', 5: 'Rất thích' } as const;
const levelColors = ['#e74c3c', '#e67e22', '#f1c40f', '#27ae60', '#2ecc71'];

/* --------------------------------------------------
 * NumberQuestion (memo)
 * --------------------------------------------------*/
interface NumProps { qid: string; q: QuestionNumber; idx: number; saved: number | undefined; onSave: (id: string, v: number) => void; disabled: boolean; }

const NumberQuestion: React.FC<NumProps> = memo(({ qid, q, idx, saved, onSave, disabled }) => {
  const min = q.min ?? 0;
  const max = q.max ?? 10;
  const initialValue = saved ?? Math.round((min + max) / 2);

  useEffect(() => { if (saved !== undefined) setDisplay(saved); }, [saved]);

  const [display, setDisplay] = useState<number>(initialValue);
  const [preview, setPreview] = useState<number>(initialValue);
  const progress = (display - min) / (max - min || 1);
  const color = progress < .25 ? '#e74c3c' : progress < .5 ? '#e67e22' : progress < .75 ? '#f1c40f' : '#2ecc71';

  return (
    <ImageBackground
      key={qid}
      source={require('../images/image_note.jpg')} // hoặc ảnh khác theo loại câu hỏi
      style={styles.qBlock}
      imageStyle={{ borderRadius: 8 }}
    >
      <Text style={styles.qContent}>{`${idx + 1}. ${q.content}`}</Text>
      <Slider
        disabled={disabled}
        minimumValue={min}
        maximumValue={max}
        step={1}
        value={preview}
        onValueChange={(v) => setDisplay(v)}
        onSlidingComplete={(v) => {
          setDisplay(v)
          onSave(qid, v);
        }}
        style={{ height: 25 }}
      />

      <View style={styles.numLabels}>
        <Text>{min}</Text>
        <Text style={[styles.valueText, { color }]}>{display}</Text>
        <Text>{max}</Text>
      </View>
    </ImageBackground>
  );
}, (p, n) => p.saved === n.saved && p.disabled === n.disabled);

/* --------------------------------------------------
 * ItemSurvey
 * --------------------------------------------------*/
const ItemSurvey: React.FC<ItemSurveyProps> = ({ survey }) => {
  const auth = getAuth();
  const userId = auth.currentUser?.uid || 'anonymous';
  const totalQuestions = Object.keys(survey.questions).length;

  const [timeLeft, setTimeLeft] = useState(survey.finishedAt - Date.now());
  const [selected, setSelected] = useState<Record<string, any>>({});
  const [answered, setAnswered] = useState(false);         // ✅ đã khảo sát?
  const [modalVisible, setModalVisible] = useState(false);
  const [respondentCount, setRespondentCount] = useState(0);
  const [adminName, setAdminName] = useState('');
  const [adminAvatar, setAdminAvatar] = useState('');

  /* ---------------- Lấy kết quả của riêng user ---------------- *//* ---------------- Đếm số người tham gia --------------------- */
  useEffect(() => {
    const db = getDatabase();
    const doneRef = ref(db, `Surveys/${survey.surveyId}/userDone`);
    const unsub = onValue(doneRef, snap => setRespondentCount(snap.exists() ? Object.keys(snap.val()).length : 0));
    return () => off(doneRef, 'value', unsub as any);
  }, [survey.surveyId]);

  /* ---------------- (bỏ listener cũ SurveyResults) --------------------- */
  useEffect(() => {
    const db = getDatabase();
    const resultRef = ref(db, `SurveyResults/${survey.surveyId}`);
    const unsub = onValue(resultRef, snap => setRespondentCount(snap.exists() ? Object.keys(snap.val()).length : 0));
    return () => off(resultRef, 'value', unsub as any);
  }, [survey.surveyId]);

  /* ---------------- Thông tin admin --------------------------- */
  useEffect(() => {
    (async () => {
      const db = getDatabase();
      const paths = ['AdminDefaults', 'AdminDepartments', 'AdminBussinesses'];
      for (const p of paths) {
        const snap = await get(ref(db, `Admins/${p}/${survey.userId}`));
        if (snap.exists()) { const d = snap.val(); setAdminName(d.fullName || 'Admin'); setAdminAvatar(d.avatar || ''); break; }
      }
    })();
  }, [survey.userId]);

  /* ---------------- Đồng hồ đếm ngược ------------------------ */
  useEffect(() => { const id = setInterval(() => setTimeLeft(survey.finishedAt - Date.now()), 1000); return () => clearInterval(id); }, [survey.finishedAt]);

  /* ---------------- Helpers ----------------------------------- */
  const setAnswer = (qid: string, value: any) => {
    if (answered) return;                 // chặn chỉnh sửa nếu đã khảo sát
    setSelected(prev => ({ ...prev, [qid]: value }));
  };

  /* ---------------- Render Question --------------------------- */
  const renderQuestion = ([qid, q]: [string, Question], idx: number) => {
    if (q.type === 'option') {
      const current = selected[qid];
      return (
        <ImageBackground
          key={qid}
          source={require('../images/image_note.jpg')} // hoặc ảnh khác theo loại câu hỏi
          style={styles.qBlock}
          imageStyle={{ borderRadius: 8 }}
        >
          <Text style={styles.qContent}>{`${idx + 1}. ${q.content}`}</Text>
          {(['A', 'B', 'C', 'D'] as const).map(letter => (
            <Pressable
              key={letter}
              disabled={answered}
              style={[styles.optRow, current === letter && styles.optRowActive, answered && { opacity: 0.5 }]}
              onPress={() => setAnswer(qid, letter)}
            >
              <Text style={styles.optLetter}>{letter}.</Text>
              <View style={styles.optBox}><Text>{q.answers[letter].content}</Text></View>
            </Pressable>
          ))}
        </ImageBackground>
      );
    }

    if (q.type === 'number') {
      return <NumberQuestion key={qid} qid={qid} q={q} idx={idx} saved={selected[qid]} onSave={setAnswer} disabled={answered} />;
    }

    if (q.type === 'level') {
      const current = (selected[qid] ?? 3) as 1 | 2 | 3 | 4 | 5;
      return (
        <ImageBackground
          key={qid}
          source={require('../images/image_note.jpg')} // hoặc ảnh khác theo loại câu hỏi
          style={styles.qBlock}
          imageStyle={{ borderRadius: 8 }}
        >
          <Text style={[styles.qContent, { fontWeight: 'bold' }]}>{`${idx + 1}. ${q.content}`}</Text>
          <Text style={[styles.levelDesc, { color: levelColors[current - 1] }]}>{levelMap[current]}</Text>
          <View style={styles.levelEmojis}>
            {[1, 2, 3, 4, 5].map(num => (
              <Pressable key={num} disabled={answered} onPress={() => setAnswer(qid, num)}>
                <Text style={num === current ? styles.activeEmoji : styles.emojiText}>{['😞', '🙂', '😊', '😁', '😍'][num - 1]}</Text>
              </Pressable>
            ))}
          </View>
        </ImageBackground>
      );
    }
    return null;
  };

  const handleSubmit = async () => {
    if (answered) return;
    const unanswered = Object.keys(survey.questions).filter(id => selected[id] === undefined);
    if (unanswered.length) { Alert.alert('Thiếu câu trả lời', 'Vui lòng trả lời tất cả các câu hỏi.'); return; }

    const db = getDatabase();

    await Promise.all(Object.entries(selected).map(async ([qid, ans]) => {
      const q = survey.questions[qid];

      if (q.type === 'option') {
        const p = `Surveys/${survey.surveyId}/questions/${qid}/answers/${ans}/userChooseIds`;
        await runTransaction(ref(db, p), (ids: string[] | null) => ids?.includes(userId) ? ids : (ids ? [...ids, userId] : [userId]));
      } else if (q.type === 'number') {
        const base = `Surveys/${survey.surveyId}/questions/${qid}/answers/${ans}`;
        await runTransaction(ref(db, `${base}/userChooseIds`), (ids: string[] | null) => ids?.includes(userId) ? ids : (ids ? [...ids, userId] : [userId]));
      } else if (q.type === 'level') {
        const lvl = ans as 1 | 2 | 3 | 4 | 5;
        const path = `Surveys/${survey.surveyId}/questions/${qid}/answers/${lvl}/userChooseIds`;
        await runTransaction(ref(db, path), (ids: string[] | null) => ids?.includes(userId) ? ids : (ids ? [...ids, userId] : [userId]));
        // cập nhật average
        await runTransaction(ref(db, `Surveys/${survey.surveyId}/questions/${qid}`), (node: any) => {
          if (!node?.answers) return node;
          let total = 0, count = 0;
          Object.values(node.answers).forEach((a: any) => { total += a.value * (a.userChooseIds?.length || 0); count += (a.userChooseIds?.length || 0); });
          node.average = count ? +(total / count).toFixed(2) : 0;
          return node;
        });
      }
    }));

    // lưu kết quả của riêng user để lần sau load lại
    await set(ref(getDatabase(), `SurveyResults/${survey.surveyId}/${userId}`), selected);
    // ✔ thêm user vào danh sách userDone trong Surveys
    await runTransaction(ref(getDatabase(), `Surveys/${survey.surveyId}/userDone`), (ids: any) => {
      if (ids?.[userId]) return ids;           // đã tồn tại
      return { ...ids, [userId]: true };      // lưu dạng map {userId: true }
    });
    setAnswered(true);
    setModalVisible(false);
    Alert.alert('Thông báo', 'Cảm ơn bạn đã tham gia khảo sát!');
  };

  const isExpired = Date.now() > survey.finishedAt;

  /* ------------------------------------------------------------ */
  return (
    <>
      <View style={[styles.itemSurvey, styles.container]}>
        {/* Header */}
        <View style={styles.surveyHeader}>
          <View style={styles.author}>
            <View style={styles.authorInfo}>
              <Image style={styles.avatar} source={{ uri: adminAvatar || 'https://i.pravatar.cc/300' }} />
              <Text style={styles.name}>{adminName || 'Admin'}</Text>
            </View>
            {!modalVisible && <Text style={{ fontSize: 15, color: '#2A8CCB', fontWeight: 'bold', textAlign: 'right', margin: 10 }}>📊 Khảo sát</Text>}
          </View>
        </View>
        <Text style={styles.titleTextMiddle}>{survey.title}</Text>
        {!modalVisible && <Text style={styles.summary}>{`${totalQuestions} câu hỏi · ${respondentCount} người đã tham gia`}</Text>}
        {modalVisible && Object.entries(survey.questions).sort(([, a], [, b]) => (a.index ?? 0) - (b.index ?? 0)).map((e, i) => renderQuestion(e, i))}

        {/* Footer */}
        <View style={styles.actionContainer}>
          <Pressable onPress={() => setModalVisible(true)} style={styles.expandRow}>
            <Image source={require('../icons/icon_eye.png')} style={styles.iconImg} />
            <Text style={styles.toggleTxt}>Xem thêm</Text>
          </Pressable>

          <Text style={styles.countdown}>{formatTime(timeLeft)}</Text>
        </View>
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.centerBox}>
            {/* ----- Header ----- */}
            <View style={styles.headerRow}>
              <Text style={styles.title}>📊 Khảo sát</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Text style={styles.closeTxt}>✕</Text>
              </Pressable>
            </View>

            {/* ----- Nội dung cuộn ----- */}
            <ScrollView
              style={{ maxHeight: 400, padding: 20 }}   // 👈 Giới hạn cao (tùy bạn)
              contentContainerStyle={{ paddingVertical: 12 }}
              showsVerticalScrollIndicator={false}
            >

              {Object.entries(survey.questions)
                .sort(([, a], [, b]) => (a.index ?? 0) - (b.index ?? 0))
                .map((e, i) => renderQuestion(e, i))}

            </ScrollView>

            {/* ----- Footer ----- */}
            <View style={styles.footer}>
              {answered ? (
                /* 1. Đã gửi rồi */
                <Text style={[styles.submitTxt, { color: '#777' }]}>Đã gửi</Text>
              ) : isExpired ? (
                /* 2. Hết hạn */
                <Text style={[styles.submitTxt, { color: '#e74c3c' }]}>Khảo sát đã hết hạn</Text>
              ) : (
                /* 3. Còn hạn và chưa trả lời */
                <TouchableOpacity style={styles.btnSend} onPress={handleSubmit}>
                  <Text style={styles.submitTxt}>Gửi</Text>
                </TouchableOpacity>
              )}
            </View>

          </View>
        </View>
      </Modal >
    </>
  );
};
export default ItemSurvey;

/* --------------------------------------------------
 * Styles
 * --------------------------------------------------*/
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',   // ➜ căn giữa dọc
    alignItems: 'center',       // ➜ căn giữa ngang
    padding: 16,                // chừa viền an toàn
  },

  // hộp trắng ở giữa
  centerBox: {
    width: '100%',          // 100 % chiều ngang safe‑area
    maxWidth: 420,          // không rộng quá tablet
    maxHeight: '85%',       // cao tối đa 85 %
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',

    // bóng nhẹ
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },

  /* Header */
  headerRow: {
    backgroundColor: '#ffffd8',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  title: { fontSize: 18, fontWeight: '700', flex: 1, color: '#ddd4r3', textAlign: 'center' },
  closeTxt: { fontSize: 22, color: '#999', paddingHorizontal: 4 },

  /* Footer */
  footer: {
    backgroundColor: '#ffffd8',
    borderTopWidth: 1,
    borderColor: '#eee',
    padding: 12,
    alignItems: 'flex-end',
  },
  btnSend: {
    backgroundColor: '#2ecc71',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
  },
  submitTxt: { color: '#fff', fontWeight: '600', fontSize: 16 },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    padding: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    color: '#333',
  },
  modalClose: {
    fontSize: 24,
    color: '#999',
    fontWeight: '600',
  },
  modalContent: {
    padding: 16,
    paddingBottom: 40,
  },
  modalFooter: {
    borderTopWidth: 1,
    borderColor: '#eee',
    padding: 12,
    alignItems: 'flex-end',
    backgroundColor: '#fff',
  },
  modalButton: {
    backgroundColor: '#2ecc71',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 8,
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  modalCard: {
    width: '90%',
    height: '85%',          // tuỳ chỉnh
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  container: {
    borderWidth: 1,
    borderColor: '#B9D7EA',        // xanh dịu
    backgroundColor: '#fff',    // nền nhẹ
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,

    // Bóng nhẹ
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  summary: { fontSize: 15, fontStyle: 'italic', color: '#fff', marginVertical: 10, textAlign: 'center', backgroundColor: '#00CD00', padding: 10, fontWeight: 'bold', marginHorizontal: 50, borderRadius: 20 },
  itemSurvey: { backgroundColor: '#ffffd8', borderRadius: 8, padding: 16, marginBottom: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },
  surveyHeader: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#ccc', paddingBottom: 5, marginBottom: 4 },
  author: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  authorInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 8 },
  name: { fontWeight: '500' },
  titleText: { fontStyle: 'italic', fontWeight: 'bold', marginEnd: 10 },
  titleTextMiddle: { fontSize: 20, fontWeight: 'bold', marginVertical: 15, textAlign: 'center', marginBottom: 10 },
  qBlock: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 20, elevation: 7, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, borderColor: '#ccc', borderWidth: 1 },
  qContent: { marginBottom: 6, fontWeight: '600', borderBottomWidth: 1, borderColor: '#000', paddingBottom: 5, fontSize: 16 },
  optRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, padding: 6, borderRadius: 6 },
  optRowActive: { backgroundColor: '#e1f5fe' },
  optLetter: { fontWeight: '700', marginRight: 6 },
  optBox: { flex: 1 },
  numLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  valueText: { fontWeight: '700', fontSize: 16 },
  levelDesc: { textAlign: 'center', marginBottom: 4, fontWeight: '500' },
  levelEmojis: { flexDirection: 'row', justifyContent: 'space-around' },
  emojiText: { fontSize: 28, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },
  activeEmoji: { fontSize: 34, textShadowColor: '#2ecc71', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10, },
  expandRow: { flexDirection: 'row', alignItems: 'center' },
  iconImg: { width: 16, height: 16, marginRight: 6, resizeMode: 'contain' },
  toggleTxt: { color: '#3498db', fontWeight: '600' },
  actionContainer: { borderTopWidth: 1, borderColor: '#ccc', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 10 },
  submitBtn: { backgroundColor: '#2ecc71', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8, marginTop: 8 },
  countdown: { fontWeight: '600', color: '#e74c3c' },
});
