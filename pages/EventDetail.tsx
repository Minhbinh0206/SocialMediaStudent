import React, { useEffect, useState, useRef, memo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    ActivityIndicator,
    ScrollView,
    Image,
    FlatList,
    Animated,
    Pressable,
    Button,
    TouchableOpacity,
    ImageBackground,
    Alert,
    Modal,
    Platform,
    Linking,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { database } from '../firebaseConfig';
import { ref, onValue, off, get, set, update } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import Header from '../components/Header';
import HeaderBack from '../components/HeaderBack';
import { Question, QuestionNumber } from '../components/ItemSurvey';
import Slider from '@react-native-community/slider';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import QRScanner from './QRScanner';
const makeZxingIntent = (callback: string) =>
    `intent://scan/?ret=${encodeURIComponent(callback)}&SCAN_FORMATS=QR_CODE`
    + '#Intent;scheme=zxing;package=com.google.zxing.client.android;end';
dayjs.extend(customParseFormat);
const FORMAT = 'HH:mm:ss DD/MM/YYYY';
interface NumProps { qid: string; q: QuestionNumber; idx: number; saved: number | undefined; onSave: (id: string, v: number) => void; disabled: boolean; }

const NumberQuestion: React.FC<NumProps> = memo(
    ({ qid, q, idx, saved, onSave, disabled }) => {
        const min = q.min ?? 0;
        const max = q.max ?? 10;
        const initial = saved ?? Math.round((min + max) / 2);

        /* chỉ 1 state duy nhất */
        const [value, setValue] = useState<number>(initial);

        /* khi `saved` (từ Firebase) thay đổi */
        useEffect(() => {
            if (saved !== undefined) setValue(saved);
        }, [saved]);

        const progress = (value - min) / (max - min || 1);
        const color =
            progress < 0.25
                ? '#e74c3c'
                : progress < 0.5
                    ? '#e67e22'
                    : progress < 0.75
                        ? '#f1c40f'
                        : '#2ecc71';

        return (
            <ImageBackground
                key={qid}
                source={require('../images/image_note.jpg')}
                style={styles.qBlock}
                imageStyle={{ borderRadius: 8 }}
            >
                <Text style={styles.qContent}>{`${idx + 1}. ${q.content}`}</Text>

                <Slider
                    disabled={disabled}
                    minimumValue={min}
                    maximumValue={max}
                    step={1}
                    value={value}                      // 👍 luôn sync
                    onValueChange={setValue}           // kéo đến đâu, state đổi đến đó
                    onSlidingComplete={(v) => onSave(qid, v)}
                    style={{ height: 25 }}
                />

                <View style={styles.numLabels}>
                    <Text>{min}</Text>
                    <Text style={[styles.valueText, { color }]}>{value}</Text>
                    <Text>{max}</Text>
                </View>
            </ImageBackground>
        );
    },
    (p, n) => p.saved === n.saved && p.disabled === n.disabled,
);

const generateQrCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const levelMap = { 1: 'Rất tệ', 2: 'Không thích', 3: 'Bình thường', 4: 'Thích', 5: 'Rất thích' } as const;
const levelColors = ['#e74c3c', '#e67e22', '#f1c40f', '#27ae60', '#2ecc71'];

type RouteParams = {
    EventDetail: {
        userId: string;
        eventId: string;
    };
};

const { width } = Dimensions.get('window');
const TAB_WIDTH = width / 2;

const IMG_W = width - 32;

const statusText = (s: number) =>
    s === 0 ? '🟡 Sắp bắt đầu' : s === 1 ? '🟢 Đang diễn ra' : '🔴 Đã kết thúc';
const statusColor = (s: number) =>
    s === 0 ? '#FFA500' : s === 1 ? '#2E8B57' : '#FA3636';

const EventDetail: React.FC = () => {
    const {
        params: { userId, eventId },
    } = useRoute<RouteProp<RouteParams, 'EventDetail'>>();

    const [event, setEvent] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'intro' | 'other'>('intro');
    const [countdown, setCountdown] = useState('');
    const [student, setStudent] = useState<any | null>(null);
    const auth = getAuth();
    const [isCheckedIn, setIsCheckedIn] = useState(false);
    const [sending, setSending] = useState(false);
    const titleEvent = event?.titleEvent || '';
    const contentEvent = event?.contentEvent || '';
    const imageEvents = event?.imageEvents || [];
    const beginAt = event?.beginAt || '';
    const finishAt = event?.finishAt || '';
    const createAt = event?.createAt || '';
    const status = event?.status ?? 0;
    const [survey, setSurvey] = useState<any | null>(null);
    const [selected, setSelected] = useState<Record<string, any>>({});
    const [answered, setAnswered] = useState(false);         // ✅ đã khảo sát?
    const [isScannerVisible, setScannerVisible] = useState(false);
    const [showCam, setShowCam] = useState(false);
    const openScanner = () => setShowCam(true);
    const closeScanner = () => setShowCam(false);

    useEffect(() => {
        const uid = auth.currentUser?.uid;
        if (!uid) return;

        const checkInRef = ref(
            database,
            `Events/${userId}/${eventId}/checkIn/${uid}`,
        );

        const handler = (snap: any) => setIsCheckedIn(snap.exists());

        onValue(checkInRef, handler);   // lắng nghe realtime: nếu admin xoá check‑in, UI cũng cập nhật
        return () => off(checkInRef, 'value', handler);
    }, [userId, eventId]);

    const onScanned = async (data: string) => {
        if (data !== event.currentQrCode) {
            Alert.alert('Thông báo', 'Mã QR không hợp lệ hoặc đã được sử dụng!');
            return;
        }

        try {
            const uid = auth.currentUser?.uid;
            if (!uid || !student) throw new Error('Chưa đăng nhập hoặc thiếu hồ sơ');

            /* 1. Lưu điểm danh */
            const payload = {
                mssv: student.studentNumber,
                name: student.studentName,
                class: student.className,
                department: student.departmentName,
                code: data,
                checkedAt: Date.now(),              // tuỳ chọn: lưu thời gian
            };
            await set(
                ref(database, `Events/${userId}/${eventId}/checkIn/${uid}`),
                payload,
            );

            /* 2. Tạo và ghi mã QR mới */
            const newCode = generateQrCode();       // ← gọi hàm để lấy chuỗi
            await set(                               // ghi thẳng vào currentQrCode
                ref(database, `Events/${userId}/${eventId}/currentQrCode`),
                newCode,
            );

            Alert.alert('Thông báo', 'Điểm danh thành công!');
            setIsCheckedIn(true);
        } catch (err) {
            console.error(err);
            Alert.alert('Lỗi', 'Không thể ghi điểm danh, vui lòng thử lại!');
        }
    };

    const handleQr = (data: string) => {
        closeScanner();
        onScanned(data);
    };


    const setAnswer = (qid: string, value: any) => {
        if (answered) return;
        setSelected(prev => ({ ...prev, [qid]: value }));
    };

    const normalizeAnswers = (
        answersIdx: Record<string, any>,          // {0:"B",1:5}
        questionsObj: Record<string, Question>,   // survey.questions
    ) => {
        const qids = Object.keys(questionsObj);   // ['q1','q2', ...] đúng thứ tự
        const result: Record<string, any> = {};

        qids.forEach((qid, idx) => {
            if (answersIdx[idx] !== undefined) {
                result[qid] = answersIdx[idx];
            }
        });

        return result;
    };

    useEffect(() => {
        const uid = auth.currentUser?.uid;
        if (!uid || !survey?.questions) return;   // chờ survey có câu hỏi đã

        const resultRef = ref(
            database,
            `Events/${userId}/${eventId}/survey/answers/${uid}`,
        );

        const handler = (snap: any) => {
            if (!snap.exists()) return;

            const answersIdx = snap.val();          // {0:"B",1:5}
            setAnswered(true);

            setSelected(
                normalizeAnswers(answersIdx, survey.questions)   // 🔄 map về {qid: value}
            );
        };

        onValue(resultRef, handler);
        return () => off(resultRef, 'value', handler);
    }, [userId, eventId, survey?.questions]);

    const handleSubmitSurvey = async () => {
        if (answered) return;
        try {
            // kiểm tra đủ câu trả lời
            const unanswered = Object.keys(survey.questions).filter(
                (qid) => selected[qid] === undefined,
            );
            if (unanswered.length) {
                return Alert.alert('Thông báo', 'Bạn chưa trả lời hết câu hỏi!');
            }

            setSending(true);

            const uid = auth.currentUser?.uid;
            if (!uid) throw new Error('Chưa đăng nhập');

            /* ---- Chuẩn hoá payload ghi lên Firebase ---- */
            const answerPayload: Record<string, boolean> = {};
            Object.entries(survey.questions).forEach(([qid, q]) => {
                if ((q as Question).type === 'option') {
                    const letter = selected[qid];                 // 'A' | 'B' | ...
                    answerPayload[`${qid}/answers/${letter}/userChooseIds/${uid}`] = true;
                } else if ((q as Question).type === 'number') {
                    answerPayload[`${qid}/answer`] = selected[qid]; // số
                } else if ((q as Question).type === 'level') {
                    const lvl = selected[qid];                     // 1‑5
                    answerPayload[`${qid}/answer/${lvl}/userChooseIds/${uid}`] = true;
                }
            });

            const refPath = `Events/${userId}/${eventId}/survey/answers`; // folder gom kết quả
            await set(ref(database, refPath + '/' + uid), selected);      // lưu bản đầy đủ
            await update(ref(database, `Events/${userId}/${eventId}/survey/questions`), answerPayload);

            setAnswered(true);
            Alert.alert('Thông báo', 'Cảm ơn bạn đã hoàn thành khảo sát!');
        } catch (err) {
            console.error(err);
            Alert.alert('Gửi khảo sát thất bại!');
        } finally {
            setSending(false);
        }
    };

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

    useEffect(() => {
        const refPath = ref(database, `Events/${userId}/${eventId}`);
        const handler = (snap: any) => {
            setEvent(snap.exists() ? snap.val() : null);
            setLoading(false);
        };
        onValue(refPath, handler);
        return () => off(refPath, 'value', handler);
    }, [userId, eventId]);

    useEffect(() => {
        const surveyRef = ref(database, `Events/${userId}/${eventId}/survey`);
        const handler = (snap: any) => {
            setSurvey(snap.exists() ? snap.val() : null);
        };
        onValue(surveyRef, handler);
        return () => off(surveyRef, 'value', handler);
    }, [userId, eventId]);

    useEffect(() => {
        if (!beginAt || !finishAt || typeof status !== 'number') return;

        const parseDate = (str: string) => {
            const [time, date] = str.split(' ');
            const [hh, mm, ss] = time.split(':').map(Number);
            const [dd, MM, yyyy] = date.split('/').map(Number);
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

        const begin = parseDate(beginAt);
        const finish = parseDate(finishAt);

        const interval = setInterval(() => {
            const now = new Date();
            let target = status === 0 ? begin : status === 1 ? finish : null;

            if (!target) {
                setCountdown('');
                return;
            }

            const diff = target.getTime() - now.getTime();

            if (diff <= 0) {
                // Cập nhật status
                const newStatus = status === 0 ? 1 : status === 1 ? 2 : status;
                if (newStatus !== status) {
                    const eventRef = ref(database, `Events/${userId}/${eventId}`);
                    set(eventRef, { ...event, status: newStatus });
                }
            }

            setCountdown(diffToString(diff));
        }, 1000);

        return () => clearInterval(interval);
    }, [event]);

    useEffect(() => {
        const uid = auth.currentUser?.uid;
        if (!uid) return; // chưa đăng nhập

        const fetchStudent = async () => {
            try {
                const snap = await get(ref(database, `Users/${uid}`));
                setStudent(snap.exists() ? snap.val() : null);
            } catch (err) {
                console.warn('Lỗi lấy hồ sơ sinh viên:', err);
            }
        };

        fetchStudent();
    }, []);

    const flatRef = useRef<FlatList>(null);
    const [curIdx, setCurIdx] = useState(0);

    const scrollX = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (imageEvents.length <= 1) return;

        const timer = setInterval(() => {
            setCurIdx((prev) => {
                const next = (prev + 1) % imageEvents.length;
                flatRef.current?.scrollToOffset({ offset: next * IMG_W, animated: true });
                return next;
            });
        }, 5000);

        return () => clearInterval(timer);
    }, [imageEvents.length]);

    const indicator = useRef(new Animated.Value(0)).current;

    const switchTab = (tab: 'intro' | 'other', index: number) => {
        setActiveTab(tab);
        Animated.spring(indicator, {
            toValue: index * TAB_WIDTH,
            useNativeDriver: true,
        }).start();
    };

    const isExpired = dayjs().isAfter(dayjs(finishAt, FORMAT));
    const disableSubmit = sending || isExpired;

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#0077cc" />
            </View>
        );
    }

    if (!event) {
        return (
            <View style={styles.center}>
                <Text>Không tìm thấy sự kiện.</Text>
            </View>
        );
    }

    return (
        <>
            <ScrollView >
                <HeaderBack namePage='Chi tiết sự kiện' />
                <View style={styles.container}>
                    {imageEvents.length > 0 && (
                        <>
                            <Animated.FlatList
                                ref={flatRef}
                                data={imageEvents}
                                keyExtractor={(uri) => uri}
                                horizontal
                                pagingEnabled
                                showsHorizontalScrollIndicator={false}
                                onMomentumScrollEnd={(e) => {
                                    const newIndex = Math.round(e.nativeEvent.contentOffset.x / IMG_W);
                                    setCurIdx(newIndex);
                                }}
                                onScroll={Animated.event(
                                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                                    { useNativeDriver: true }
                                )}
                                renderItem={({ item }) => <Image source={{ uri: item }} style={styles.image} />}
                            />
                            <View style={styles.dotRow}>
                                {imageEvents.map((_: any, i: any) => {
                                    const opacity = scrollX.interpolate({
                                        inputRange: [(i - 1) * IMG_W, i * IMG_W, (i + 1) * IMG_W],
                                        outputRange: [0.3, 1, 0.3],
                                        extrapolate: 'clamp',
                                    });
                                    return <Animated.View key={i} style={[styles.dot, { opacity }]} />;
                                })}
                            </View>
                        </>
                    )}

                    <Text style={styles.title}>{titleEvent}</Text>

                    {/* Thời gian custom */}
                    <View style={styles.timeContainer}>
                        {/* status + countdown cùng hàng */}
                        <View style={styles.statusRow}>
                            <View style={styles.statusBox}>
                                <Text style={[styles.statusText, { color: statusColor(status) }]}>
                                    {statusText(status)}
                                </Text>
                            </View>

                            {countdown !== '' && (
                                <Text style={styles.countdown}>{countdown}</Text>
                            )}
                        </View>

                        {/* block thời gian */}
                        <View style={styles.timeBox}>
                            <View style={[styles.timeCustom, styles.leftTime]}>
                                <Text style={styles.timeTitle}>Bắt đầu</Text>
                                <Text style={styles.timeValue}>{beginAt}</Text>
                            </View>

                            <View style={[styles.timeCustom, styles.rightTime]}>
                                <Text style={styles.timeTitle}>Kết thúc</Text>
                                <Text style={styles.timeValue}>{finishAt}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Tabs */}
                    <View style={styles.tabBar}>
                        {/* indicator */}
                        <Animated.View
                            style={[
                                styles.indicator,
                                { transform: [{ translateX: indicator }] },
                            ]}
                        />
                        {/* tab buttons */}
                        <Pressable style={styles.tabBtnWrap} onPress={() => switchTab('intro', 0)}>
                            <Text style={activeTab === 'intro' ? styles.tabActive : styles.tabTxt}>Giới thiệu</Text>
                        </Pressable>
                        <Pressable style={styles.tabBtnWrap} onPress={() => switchTab('other', 1)}>
                            <Text style={activeTab === 'other' ? styles.tabActive : styles.tabTxt}>Hoạt động</Text>
                        </Pressable>
                    </View>

                    {/* Nội dung theo tab */}
                    {activeTab === 'intro' ? (
                        <>
                            <Text style={styles.content}>{event.contentEvent}</Text>
                        </>
                    ) : (
                        <>
                            {/* Tiêu đề thông tin học sinh */}
                            <View style={{ backgroundColor: '#fff', padding: 15, borderRadius: 10 }}>
                                <View style={{ marginBottom: 8, display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#000', marginBottom: 10, marginTop: 2 }}>
                                        Thông tin học sinh
                                    </Text>
                                    <Text style={{
                                        color: isCheckedIn ? '#28a745' : '#ffc107',
                                        fontWeight: 'bold',
                                        fontSize: 16,
                                        textAlign: 'right',
                                        marginRight: 15,
                                        marginVertical: 4
                                    }}>
                                        {isCheckedIn ? '✅ Đã điểm danh' : '🕒 Chưa điểm danh'}
                                    </Text>
                                </View>

                                {student ? (
                                    <>
                                        {/* Student Card */}
                                        <View style={[
                                            styles.studentBox,
                                            {
                                                borderColor: isCheckedIn ? '#0FEE59' : '#ffc107',
                                                backgroundColor: isCheckedIn ? '#f6ffed' : '#fffbe6',
                                            }
                                        ]}>
                                            <Image source={{ uri: student.avatar }} style={styles.avatar} />
                                            <View style={styles.studentInfo}>
                                                <Text style={styles.studentName}>{student.studentName}</Text>
                                                <Text style={styles.infoText}>📧 {student.email}</Text>
                                                <Text style={styles.infoText}>🎓 MSSV: {student.studentNumber}</Text>
                                                <Text style={styles.infoText}>🏫 Khoa: {student.departmentName}</Text>
                                                <Text style={styles.infoText}>📚 Lớp: {student.className}</Text>
                                            </View>
                                        </View>

                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                                            {/* Đăng ký tham gia */}
                                            <TouchableOpacity
                                                disabled={status !== 0}
                                                onPress={() => console.log('Đăng ký tham gia')}
                                                style={[
                                                    styles.buttonMark,
                                                    status !== 0 && { backgroundColor: '#ccc' }
                                                ]}
                                            >
                                                <Text style={styles.buttonText}>Đăng ký tham gia</Text>
                                            </TouchableOpacity>

                                            {/* Điểm danh */}
                                            <TouchableOpacity
                                                disabled={status !== 1 || isCheckedIn}
                                                onPress={openScanner}
                                                style={[
                                                    styles.buttonMark,
                                                    (status !== 1 || isCheckedIn) && { backgroundColor: '#ccc' },
                                                ]}
                                            >
                                                <Text style={styles.buttonText}>Điểm danh</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </>
                                ) : (
                                    <View style={styles.studentBox}>
                                        <Text style={{ fontSize: 16, color: '#777' }}>Không tìm thấy hồ sơ sinh viên.</Text>
                                    </View>
                                )}
                            </View>

                            {/* Event Survey */}
                            <View style={{ backgroundColor: '#fff', marginVertical: 15, padding: 15, borderRadius: 10 }}>
                                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#000', marginBottom: 10, marginTop: 2 }}>
                                    Khảo sát sự kiện
                                </Text>
                                {survey ? (
                                    <ScrollView
                                        style={{ paddingHorizontal: 20, backgroundColor: '#ffffd8' }}
                                        contentContainerStyle={{ paddingVertical: 12 }}
                                        showsVerticalScrollIndicator={false}
                                    >
                                        {Object.entries(survey.questions as Record<string, Question>)
                                            .map(([qid, q], i) => renderQuestion([qid, q], i))}

                                        {!answered && !isExpired && (                  // ẩn luôn nếu đã hết giờ
                                            <TouchableOpacity
                                                style={[
                                                    styles.submitBtn,
                                                    disableSubmit && styles.submitDisabled,
                                                ]}
                                                onPress={handleSubmitSurvey}
                                                disabled={disableSubmit}                  // khóa khi đang gửi
                                            >
                                                {sending ? (
                                                    <ActivityIndicator size="small" color="#fff" />
                                                ) : (
                                                    <Text style={styles.submitTxt}>Hoàn thành</Text>
                                                )}
                                            </TouchableOpacity>
                                        )}

                                        {/* Thông báo khi sự kiện đã kết thúc nhưng user chưa gửi */}
                                        {!answered && isExpired && (
                                            <Text style={{ textAlign: 'center', color: '#f00', marginTop: 12 }}>
                                                Sự kiện đã kết thúc – bạn không thể gửi khảo sát.
                                            </Text>
                                        )}

                                    </ScrollView>
                                ) : (
                                    <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                                        <Text style={{ marginTop: 4 }}>Hiện chưa có khảo sát</Text>
                                    </View>
                                )}
                            </View>
                        </>
                    )}

                </View>
                {showCam && (
                    <Modal visible onRequestClose={closeScanner}>
                        <QRScanner onResult={handleQr} onClose={closeScanner} />
                    </Modal>
                )}
            </ScrollView >
        </>
    );
};

const styles = StyleSheet.create({
    scannerBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scannerBox: {
        backgroundColor: '#fff',
        padding: 24,
        borderRadius: 12,
        alignItems: 'center',
    },
    scannerTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 16,
    },
    closeBtn: {
        marginTop: 16,
        backgroundColor: '#333',
        paddingVertical: 8,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    submitBtn: {
        alignSelf: 'center',
        paddingVertical: 10,
        paddingHorizontal: 28,
        backgroundColor: '#1890ff',
        borderRadius: 8,
    },
    submitTxt: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    submitDisabled: { backgroundColor: '#ccc' },
    levelDesc: { textAlign: 'center', marginBottom: 4, fontWeight: '500' },
    levelEmojis: { flexDirection: 'row', justifyContent: 'space-around' },
    emojiText: { fontSize: 28, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },
    activeEmoji: { fontSize: 34, textShadowColor: '#2ecc71', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10, },
    optLetter: { fontWeight: '700', marginRight: 6 },
    optBox: { flex: 1 },
    optRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, padding: 6, borderRadius: 6 },
    optRowActive: { backgroundColor: '#e1f5fe' },
    numLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
    valueText: { fontWeight: '700', fontSize: 16 },
    qBlock: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 20, elevation: 7, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, borderColor: '#ccc', borderWidth: 1 },
    surveyBox: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
    },
    surveyMeta: { fontSize: 14, color: '#555', marginBottom: 8 },
    questionCard: {
        marginBottom: 12,
        padding: 10,
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 8,
        backgroundColor: '#fafafa',
    },
    qContent: { fontSize: 15, fontWeight: '600', color: '#222', marginBottom: 6 },
    optLine: { fontSize: 14, color: '#444' },
    optResult: { color: '#888' },
    notFound: { fontSize: 14, color: '#777' },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        textAlign: 'center',
    },

    buttonMark: {
        backgroundColor: '#3498db',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        flex: 1
    },
    studentBox: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
        borderWidth: 3,
    },
    avatar: {
        width: 70,
        height: 70,
        borderRadius: 35,
        marginRight: 14,
        backgroundColor: '#ccc',
    },
    studentInfo: { flex: 1 },
    studentName: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 6,
        color: '#003366',
    },
    infoText: {
        fontSize: 14,
        color: '#333',
        marginBottom: 2,
    },
    statusBoxContainer: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#f9f9f9',
        padding: 12,
        borderRadius: 10,
    },
    eventSurveyBox: {
        backgroundColor: '#fffbe6',
        padding: 12,
        borderRadius: 10,
    },
    timeContainer: { backgroundColor: '#fff', padding: 10, borderRadius: 10, marginVertical: 10 },

    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingRight: 10,
        marginBottom: 5,
    },
    statusBox: {
        backgroundColor: '#fff',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    statusText: { fontSize: 15, fontWeight: '600' },
    countdown: {
        fontSize: 15,
        fontWeight: '600',
        color: '#E53935',
    },

    /* block thời gian */
    timeBox: {
        flexDirection: 'row',
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        padding: 12,
    },
    timeCustom: { flex: 1 },
    leftTime: { alignItems: 'flex-start' },
    rightTime: { alignItems: 'flex-end' },
    timeTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#555',
    },
    timeValue: {
        fontSize: 15,
        color: '#222',
        marginTop: 2,
    },
    tabBar: {
        flexDirection: 'row',
        position: 'relative',
        borderRadius: 30,
        overflow: 'hidden',
        backgroundColor: '#fff',
        marginBottom: 10,
        alignItems: 'center',
    },
    indicator: {
        position: 'absolute',
        left: 0,
        right: 0,
        width: TAB_WIDTH,
        height: '100%',
        backgroundColor: '#3498db',
        borderRadius: 30,
        alignItems: 'center',
        elevation: 3,
    },
    tabBtnWrap: {
        width: TAB_WIDTH,
        paddingVertical: 12,
        justifyContent: 'center',
    },
    tabTxt: { color: '#555', fontWeight: '600', textAlign: 'center', width: '100%' },
    tabActive: { color: '#fff', fontWeight: '700', textAlign: 'center' },

    container: { flex: 1, backgroundColor: '#f1f1f1', padding: 16 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    image: { width: IMG_W, height: 220, borderRadius: 10 },
    dotRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 6,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#0077cc',
        margin: 4,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#222',
    },
    timeTitleFinish: {
        flex: 1,
        textAlign: 'right',
        alignSelf: 'flex-end',
        fontSize: 14,
        fontWeight: '600',
        color: '#555',
    },
    tabRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 12,
    },
    tabBtn: {
        paddingVertical: 6,
        paddingHorizontal: 20,
        borderRadius: 20,
        backgroundColor: '#eee',
    },
    activeTab: {
        backgroundColor: '#0077cc',
    },
    tabText: { color: '#333', fontWeight: '600' },
    activeTabText: { color: '#fff', fontWeight: '700' },
    tabContent: { marginTop: 8 },
    content: {
        fontSize: 16,
        color: '#444',
        lineHeight: 24,
        textAlign: 'justify',
        marginTop: 0
    },
});

export default EventDetail;
