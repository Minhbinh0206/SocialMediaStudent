import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    findNodeHandle,
    Animated,
    Image
} from 'react-native';
import ItemNotify from './ItemNotify';
import { get, getDatabase, onValue, ref, set } from 'firebase/database';
import { auth, database } from '../firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../type';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'NotifyDetailScreen'>;

const ListNotify = () => {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [rawNotifications, setRawNotifications] = useState<any[]>([]);
    const [pinnedNotifications, setPinnedNotifications] = useState<any[]>([]);
    const scrollRef = useRef<ScrollView>(null);
    const itemRefs = useRef<{ [key: string]: View | null }>({});
    const [showAllPinned, setShowAllPinned] = useState(false);
    const navigation = useNavigation<NavigationProp>();
    const [loading, setLoading] = useState<boolean>(true);
    const scrollX = useRef(new Animated.Value(0)).current;
    const [selectedFilter, setSelectedFilter] = useState<'all' | 'school' | 'department' | 'bussiness'>('all');
    const [admins, setAdmins] = useState<{ fullName: string, adminId: string, type: string }[]>([]);
    const [selectedAdminId, setSelectedAdminId] = useState<string>('all');

    useEffect(() => {
        const userId = auth.currentUser?.uid;
        if (!userId) return;
        const userRef = ref(database, `Users/${userId}`);
        onValue(userRef, (snap) => {
            const data = snap.val();
            setCurrentUser({ ...data, userId });
        });
    }, []);

    useEffect(() => {
        const notifiesRef = ref(database, 'Notifies');
        const unsubscribe = onValue(notifiesRef, (snap) => {
            const data = snap.val();
            if (data) {
                const list = Object.keys(data).flatMap((uid) =>
                    Object.keys(data[uid]).map((nid) => ({
                        notifyId: nid,
                        userId: uid,
                        ...data[uid][nid],
                    }))
                );
                setRawNotifications(list);
            } else setRawNotifications([]);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!currentUser || rawNotifications.length === 0) {
            setNotifications([]);
            setPinnedNotifications([]);
            return;
        }

        let filtered = rawNotifications.filter((n) => {
            const { filterData } = n;
            const user = currentUser;

            // Lọc theo filterType như trước
            let matchFilterType = false;
            switch (filterData?.filterType) {
                case 'allStudents': matchFilterType = true; break;
                case 'departmentStudents':
                case 'myDepartment':
                case 'departmentCollabStudents':
                    matchFilterType = filterData.departmentIds?.includes(user.departmentId); break;
                case 'personalStudents':
                case 'personalDepartmentStudents':
                    matchFilterType = filterData.userIds?.includes(user.userId); break;
                case 'byClass':
                    matchFilterType = filterData.classIds?.includes(user.classId); break;
                case 'majors':
                    matchFilterType = filterData.majorIds?.includes(user.majorId); break;
                default: matchFilterType = false;
            }

            // Nếu đang chọn 1 admin cụ thể, lọc thêm theo userId
            let matchAdmin = false;

            if (selectedAdminId === 'all') {
                if (selectedFilter === 'all') {
                    matchAdmin = true;
                } else {
                    const matchedAdminIds = admins
                        .filter((admin) => {
                            if (selectedFilter === 'school') return admin.type === 'AdminDefaults';
                            if (selectedFilter === 'department') return admin.type === 'AdminDepartments';
                            if (selectedFilter === 'bussiness') return admin.type === 'AdminBussinesses';
                            return false;
                        })
                        .map((admin) => admin.adminId);

                    matchAdmin = matchedAdminIds.includes(n.userId);
                }
            } else {
                matchAdmin = n.userId === selectedAdminId;
            }

            return matchFilterType && matchAdmin;
        });

        filtered.sort((a, b) => b.createAt - a.createAt);
        setNotifications(filtered);
        setLoading(false);

        // Lọc pinned notifications RIÊNG, không phụ thuộc bộ lọc
        const pinned = rawNotifications.filter(
            (n) => n.actives?.pins?.[currentUser.userId]
        );
        setPinnedNotifications(pinned);
    }, [currentUser, rawNotifications, selectedFilter, selectedAdminId, admins]);

    useEffect(() => {
        const fetchAdmins = async () => {
            const db = getDatabase();

            const fetchPath = async (path: string) => {
                const snapshot = await get(ref(db, `Admins/${path}`));
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    return Object.keys(data).map((key) => ({
                        adminId: key,
                        fullName: data[key].fullName || 'Chưa có tên',
                        avatar: data[key].avatar || null,       // Nếu có avatar
                        type: path,
                    }));
                }
                return [];
            };

            const [defaultAdmins, departmentAdmins, bussinessAdmins] = await Promise.all([
                fetchPath('AdminDefaults'),
                fetchPath('AdminDepartments'),
                fetchPath('AdminBussinesses'),
            ]);

            setAdmins([
                ...defaultAdmins,
                ...departmentAdmins,
                ...bussinessAdmins,
            ]);
        };

        fetchAdmins();
    }, []);

    // Xử lý pin thông báo
    const handleUnpin = async (n: any) => {
        if (!currentUser?.userId) return;

        const pinRef = ref(
            database,
            `Notifies/${n.userId}/${n.notifyId}/actives/pins/${currentUser.userId}`
        );

        try {
            await set(pinRef, null);

            // Cập nhật UI ngay
            setPinnedNotifications((prev) =>
                prev.filter((p) => p.notifyId !== n.notifyId)
            );
        } catch (err) {
            console.error('Lỗi khi gỡ ghim:', err);
        }
    };

    // Lọc admin theo loại filter
    const filteredAdmins = admins.filter((admin) => {
        if (selectedFilter === 'school') return admin.type === 'AdminDefaults';
        if (selectedFilter === 'department') return admin.type === 'AdminDepartments';
        if (selectedFilter === 'bussiness') return admin.type === 'AdminBussinesses';
        return false; // 'all' thì không hiển thị danh sách
    });

    return (
        <View style={{ flex: 1, height: '100%'}}>
            <ScrollView ref={scrollRef} style={styles.container}>
                <View style={styles.pinnedWrapper}>
                    <View style={styles.pinnedItem}>
                        <Text style={styles.popupTitle}>📌</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.pinnedTitle}>Ghim thông báo</Text>
                            <Text style={styles.pinnedContent}>
                                Số lượng: {pinnedNotifications.length}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.pinButton}
                            onPress={() => setShowAllPinned((prev) => !prev)}
                        >
                            <Text style={styles.pinButtonText}>
                                {showAllPinned ? 'Thu gọn ▲' : 'Xem thêm ▼'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {showAllPinned && (
                        <View style={styles.pinnedOverlayBelow}>
                            {pinnedNotifications.length > 0 ? (
                                pinnedNotifications.map((n) => (
                                    <TouchableOpacity
                                        key={n.notifyId}
                                        onPress={() => {
                                            const readRef = ref(database, `Notifies/${n.userId}/${n.notifyId}/actives/reads/${currentUser.userId}`);
                                            set(readRef, true);

                                            navigation.navigate('NotifyDetailScreen', {
                                                userId: n.userId,
                                                notifyId: n.notifyId,
                                            });
                                        }}
                                    >
                                        <View key={n.notifyId} style={styles.pinnedItemInPopup}>
                                            <View style={styles.textContainer}>
                                                <Text style={styles.pinnedTitle}>
                                                    {(n.title || 'Tiêu đề thông báo').slice(0, 40)}
                                                    {n.title?.length > 40 ? '...' : ''}
                                                </Text>
                                                <View style={styles.marqueeContainer}>
                                                    <Animated.Text
                                                        style={[
                                                            styles.marqueeText,
                                                            {
                                                                transform: [
                                                                    {
                                                                        translateX: scrollX.interpolate({
                                                                            inputRange: [0, 1000],
                                                                            outputRange: [0, -300],
                                                                        }),
                                                                    },
                                                                ],
                                                            },
                                                        ]}
                                                    >
                                                        {n.content || 'Nội dung thông báo'}
                                                    </Animated.Text>
                                                </View>
                                            </View>
                                            <TouchableOpacity
                                                style={styles.unpinButton}
                                                onPress={() => handleUnpin(n)}
                                            >
                                                <Text style={styles.unpinButtonText}>Gỡ</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <Text style={styles.pinnedTitle}>Không có thông báo nào được ghim</Text>
                            )}
                        </View>
                    )}
                </View>

                <View>
                    <View style={styles.radioContainer}>
                        {[
                            { label: 'Tất cả', value: 'all' },
                            { label: 'Trường', value: 'school' },
                            { label: 'Khoa', value: 'department' },
                            { label: 'Doanh nghiệp', value: 'bussiness' }
                        ].map((item) => (
                            <TouchableOpacity
                                key={item.value}
                                style={styles.radioItem}
                                onPress={() => setSelectedFilter(item.value as typeof selectedFilter)}
                            >
                                <View style={styles.radioCircle}>
                                    {selectedFilter === item.value && <View style={styles.radioDot} />}
                                </View>
                                <Text style={styles.radioLabel}>{item.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={{ marginVertical: 10, paddingHorizontal: 10, marginBottom: 20 }}>
                        <Text style={{ fontWeight: 'bold', marginBottom: 6 }}>Chọn người gửi:</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <TouchableOpacity
                                style={[
                                    styles.selectOption,
                                    selectedAdminId === 'all' && styles.selectedOption,
                                ]}
                                onPress={() => setSelectedAdminId('all')}
                            >
                                <Text style={[
                                    styles.selectOptionText,
                                    selectedAdminId === 'all' && styles.selectedOptionText,
                                ]}>
                                    Tất cả thông báo
                                </Text>
                            </TouchableOpacity>


                            {selectedFilter !== 'all' && filteredAdmins.map((admin) => (
                                <TouchableOpacity
                                    key={admin.adminId}
                                    style={[
                                        styles.selectOption,
                                        selectedAdminId === admin.adminId && styles.selectedOption,
                                    ]}
                                    onPress={() => setSelectedAdminId(admin.adminId)}
                                >
                                    <Text style={[
                                        styles.selectOptionText,
                                        selectedAdminId === admin.adminId && styles.selectedOptionText,
                                    ]}>{admin.fullName}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                </View>

                {notifications.length > 0 ? (
                    notifications.map((n) => (
                        <ItemNotify
                            key={n.notifyId}
                            ref={(ref) => (itemRefs.current[n.notifyId] = ref)}
                            {...n}
                        />
                    ))
                ) : (
                    <Text style={{ textAlign: 'center', marginTop: 20, color: '#666' }}>
                        Hiện không có thông báo
                    </Text>
                )}


            </ScrollView >
        </View >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 10,
        paddingBottom: 10,
        height: '100%'
    },
    popupTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginRight: 8,
    },
    pinnedHeader: {
        backgroundColor: '#f0f8ff',
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#aaa',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        flexDirection: 'column',
        gap: 6,
    },

    pinnedCount: {
        fontSize: 14,
        color: '#555',
    },

    toggleButton: {
        fontSize: 13,
        color: '#1877F2',
        fontWeight: '600',
    },
    pinnedOverlayBelow: {
        position: 'absolute',
        top: 65, // chỉnh theo chiều cao pinnedItem
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        padding: 10,
        borderColor: '#ccc',
        borderWidth: 1,
        zIndex: 10,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },

    pinnedWrapper: {
        flexDirection: 'column',
        marginBottom: 20,
        gap: 10,
    },

    pinnedItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 10,
        borderColor: '#ddd',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        zIndex: 9999
    },

    pinnedTitle: {
        fontWeight: 'bold',
        fontSize: 15,
        color: '#333',
        marginBottom: 4,
    },

    pinnedContent: {
        color: '#555',
        fontSize: 13,
    },

    pinButton: {
        marginLeft: 10,
        backgroundColor: '#1877F2',
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },

    pinButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 13,
    },

    pinnedItemInPopup: {
        display: 'flex',
        flexDirection: 'row',
        backgroundColor: '#FFFFCC',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 14,
        marginBottom: 12,
    },
    shimmerBox: {
        height: 110,
        backgroundColor: '#eee',
        borderRadius: 10,
        marginBottom: 16,
    },
    avatar: { flex: 1, width: 40, height: 40, borderRadius: 1000, marginRight: 10 },
    textContainer: { flex: 6, justifyContent: 'center' },
    unpinButtonText: { color: 'white', fontWeight: '600', fontSize: 12, alignItems: 'center', alignSelf: 'center', textAlign: 'center' },
    marqueeContainer: {
        overflow: 'hidden',
        height: 18,
    },
    marqueeText: {
        fontSize: 13,
        color: '#555',
    },
    unpinButton: {
        marginLeft: 10,
        backgroundColor: '#FF4444',
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 10,
        alignSelf: 'center',
        flex: 0.5,
        display: 'flex',
        alignContent: 'center',
        justifyContent: 'center'
    },
    radioContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginVertical: 10,
    },

    radioItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    radioCircle: {
        height: 20,
        width: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#1877F2',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 6,
    },

    radioDot: {
        height: 10,
        width: 10,
        borderRadius: 5,
        backgroundColor: '#1877F2',
    },

    radioLabel: {
        fontSize: 14,
        color: '#333',
    },
    selectOption: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        backgroundColor: '#fff',
        borderRadius: 20,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#888',
    },

    selectedOption: {
        backgroundColor: '#1877F2',
        borderColor: '#1877F2',
    },

    selectOptionText: {
        color: '#000',
        fontSize: 13,
    },

    selectedOptionText: {
        color: '#fff',
        fontSize: 13,
    },
});

export default ListNotify;
