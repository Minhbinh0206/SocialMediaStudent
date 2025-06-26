import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Animated } from 'react-native';
import { ref as dbRef, onValue, set, getDatabase, get } from 'firebase/database';
import { database } from '../firebaseConfig';
import { getAuth } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../type';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'NotifyDetailScreen'>;

interface FilterData {
    filterType: string;
    departmentIds?: string[];
    classIds?: string[];
    userIds?: string[];
    majorIds?: string[];
}

interface ItemNotifyProps {
    notifyId: string;
    userId: string;
    title: string;
    content: string;
    createAt: number;
    filterData: FilterData;
}

const ItemNotify = React.forwardRef<View, ItemNotifyProps>((props, ref) => {
    const { notifyId, userId, title, content, createAt, filterData } = props;
    const [userName, setUserName] = useState('');
    const [avatar, setAvatar] = useState('');
    const [isPinned, setIsPinned] = useState(false); // Trạng thái của pin
    const [isRead, setIsRead] = useState(false);
    const [loading, setLoading] = useState<boolean>(true);
    const translateY = useRef(new Animated.Value(-20)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    const navigation = useNavigation<NavigationProp>();

    const currentUserId = getAuth().currentUser?.uid; // Lấy userId hiện tại

    const containerRef = useRef<View>(null);

    React.useImperativeHandle(ref, () => containerRef.current!, []);

    // Lấy thông tin người gửi thông báo
    useEffect(() => {
        const findAdminByUserId = async (userId: string) => {
            const db = getDatabase();
            const adminPaths = ['AdminDefaults', 'AdminDepartments', 'AdminBussinesses'];

            for (const path of adminPaths) {
                const adminRef = dbRef(db, `Admins/${path}/${userId}`);
                const snapshot = await get(adminRef);
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    setUserName(data.fullName || 'No name');
                    setAvatar(data.avatar || '');
                    setLoading(false)
                    return;
                }
            }
        };
        
        findAdminByUserId(userId);
    }, [userId]);

    // Đổi icon dựa vào trạng thái pin
    const pinIcon = isPinned ? require('../icons/icon_pin_active.png') : require('../icons/icon_pin.png');
    const rotation = useRef(new Animated.Value(0)).current;

    // Bắt đầu animation khi component được render
    useEffect(() => {
        const shakeAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(rotation, {
                    toValue: 15,
                    duration: 100,
                    useNativeDriver: true,
                }),
                Animated.timing(rotation, {
                    toValue: -15,
                    duration: 100,
                    useNativeDriver: true,
                }),
                Animated.timing(rotation, {
                    toValue: 0,
                    duration: 100,
                    useNativeDriver: true,
                }),
            ])
        );

        // Bắt đầu animation
        shakeAnimation.start();

        // Dừng animation khi component bị unmount
        return
    }, []);

    const animatedStyle = {
        transform: [
            {
                rotateZ: rotation.interpolate({
                    inputRange: [-15, 0, 15],
                    outputRange: ['-15deg', '0deg', '15deg'],
                }),
            },
        ],
    };

    const formatDate = (timestamp: number) => {
        console.log('timestamp', timestamp);
        if (!timestamp || isNaN(timestamp)) return 'Thời gian không hợp lệ';

        const now = Date.now();
        const diffInSeconds = Math.floor((now - timestamp) / 1000);
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        const diffInHours = Math.floor(diffInMinutes / 60);
        const diffInDays = Math.floor(diffInHours / 24);

        if (diffInMinutes < 1) return 'Vừa xong';
        if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
        if (diffInHours < 24) return `${diffInHours} giờ trước`;
        return `${diffInDays} ngày trước`;
    };

    useEffect(() => {
        if (!loading) {
            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: 100,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 100,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [loading]);

    // Kiểm tra trạng thái đọc của thông báo
    useEffect(() => {
        if (!currentUserId) return;

        const readPath = dbRef(database, `Notifies/${userId}/${notifyId}/actives/reads/${currentUserId}`);
        const unsubscribe = onValue(readPath, (snapshot) => {
            setIsRead(!!snapshot.val());
        });

        return () => unsubscribe();
    }, [currentUserId, notifyId, userId]);

    // Xử lý read thông báo
    const handleReadNotification = () => {
        if (!currentUserId) return;

        const readPath = dbRef(database, `Notifies/${userId}/${notifyId}/actives/reads/${currentUserId}`);
        set(readPath, true)
            .then(() => {
                setIsRead(true);
                navigation.navigate('NotifyDetailScreen', {
                    userId: userId,
                    notifyId: notifyId,
                });
            })
            .catch((error) => console.error("Lỗi khi cập nhật trạng thái đọc:", error));
    };

    // Kiểm tra trạng thái gim của thông báo
    useEffect(() => {
        if (!currentUserId) return;

        const pinPath = dbRef(database, `Notifies/${userId}/${notifyId}/actives/pins/${currentUserId}`);
        const unsubscribe = onValue(pinPath, (snapshot) => {
            const pinValue = snapshot.val();
            setIsPinned(!!pinValue);
        });

        return () => unsubscribe();
    }, [currentUserId, notifyId, userId]);

    // Xử lý pin thông báo
    const togglePinStatus = () => {
        if (!currentUserId) return;

        const pinRef = dbRef(database, `Notifies/${userId}/${notifyId}/actives/pins/${currentUserId}`);
        const newStatus = !isPinned;

        set(pinRef, newStatus)
            .then(() => setIsPinned(newStatus))
            .catch((err) => console.error('Lỗi khi cập nhật trạng thái pin:', err));
    };

    return (
        <View ref={containerRef} style={{ alignItems: 'center', width: '100%' }}>
            <View style={styles.pinContainer}>
                <TouchableOpacity onPress={() => { togglePinStatus(); }}>
                    <Image
                        source={pinIcon}
                        style={styles.pinIcon}
                    />
                </TouchableOpacity>
            </View>
            <View style={styles.container}>
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Image
                            source={{ uri: avatar }}
                            style={styles.avatar}
                        />
                        <Text style={styles.announcer}>{userName}</Text>
                    </View>
                    <View style={{ position: 'relative' }}>
                        <Animated.Image
                            source={require('../icons/icon_bell_animation.png')}
                            style={[
                                styles.icon,
                                !isRead ? animatedStyle : {}, // Animation nếu chưa đọc
                            ]}
                        />
                        {!isRead && <View style={styles.badge} />}
                    </View>

                </View>

                <View style={styles.textContainer}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message} numberOfLines={2}>{content}</Text>
                    <View style={styles.footer}>
                        <Image
                            source={require('../icons/icon_time.png')}
                            style={styles.timeIcon}
                        />
                        <Text style={styles.time}>{formatDate(createAt)}</Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.readButton} onPress={() => { handleReadNotification(); }}>
                    <Text style={styles.readButtonText}>Đọc</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        marginBottom: 20,
    },
    pinContainer: {
        width: 70,
        height: 20,
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        backgroundColor: 'white',
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
        alignItems: 'center'
    },
    pinSquare: {
        width: 15,
        marginTop: 5,
        height: 15,
        borderBlockColor: 'black',
        borderWidth: 1,
        borderRadius: 3
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        borderBottomColor: '#BBBBBB',
        borderBottomWidth: 1.5,
        paddingBottom: 10
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
    },
    icon: {
        width: 35,
        height: 35,
    },
    timeIcon: {
        width: 25,
        height: 25,
    },
    pinIcon: {
        position: 'absolute',
        top: -7,
        left: -5,
        width: 30,
        height: 20,
        zIndex: 100
    },
    announcer: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'black',
    },
    textContainer: {
        marginBottom: 10,
        borderBottomColor: '#BBBBBB',
        borderBottomWidth: 1,
        paddingBottom: 10
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    message: {
        fontSize: 14,
        color: '#666',
        marginVertical: 5,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    time: {
        marginVertical: 7,
        fontSize: 12,
        color: '#999',
        marginHorizontal: 10
    },
    readButton: {
        backgroundColor: '#FFD700',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    readButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    badge: {
        position: 'absolute',
        top: 3,
        right: 4,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: 'red',
        zIndex: 100,
    },

});

ItemNotify.displayName = 'ItemNotify';

export default ItemNotify;
