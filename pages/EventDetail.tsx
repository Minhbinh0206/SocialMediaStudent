import React, { useEffect, useState, useRef } from 'react';
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
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { database } from '../firebaseConfig';
import { ref, onValue, off, get, set } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import Header from '../components/Header';
import HeaderBack from '../components/HeaderBack';

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
    // ngay sau const [event, setEvent] = useState(null);
    const titleEvent = event?.titleEvent || '';
    const contentEvent = event?.contentEvent || '';
    const imageEvents = event?.imageEvents || [];
    const beginAt = event?.beginAt || '';
    const finishAt = event?.finishAt || '';
    const createAt = event?.createAt || '';
    const status = event?.status ?? 0;   // 0 mặc định


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
                <HeaderBack namePage='Chi tiết sự kiện'/>
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
                            <Text style={activeTab === 'other' ? styles.tabActive : styles.tabTxt}>Thông tin khác</Text>
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
                                                onPress={() => console.log('Điểm danh')}
                                                style={[
                                                    styles.buttonMark,
                                                    (status !== 1 || isCheckedIn) && { backgroundColor: '#ccc' }
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
                                <View style={styles.eventSurveyBox}>
                                    <Text style={{ color: '#555' }}>Chưa có khảo sát nào được gắn với sự kiện này.</Text>
                                </View>
                            </View>
                        </>
                    )}

                </View>
            </ScrollView >
        </>
    );
};

const styles = StyleSheet.create({
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
        marginBottom: 10
    },
    indicator: {
        position: 'absolute',
        width: TAB_WIDTH,
        height: '100%',
        backgroundColor: '#3498db',
        borderRadius: 30,
        elevation: 3,
    },
    tabBtnWrap: {
        width: TAB_WIDTH,
        paddingVertical: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabTxt: { color: '#555', fontWeight: '600' },
    tabActive: { color: '#fff', fontWeight: '700' },

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
