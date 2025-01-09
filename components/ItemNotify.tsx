import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Animated } from 'react-native';
import { ref, onValue, set } from 'firebase/database'; // Thêm 'set' để cập nhật giá trị trong Firebase
import { database } from '../firebaseConfig';
import moment from 'moment';
import { getAuth } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../type';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface ItemNotifyProps {
    idAnnouncer: string;
    id: string;
    title: string;
    content: string;
    createAt: string;
    filter: boolean;
    onReadPress: () => void;
}

const ItemNotify: React.FC<ItemNotifyProps> = ({ id, idAnnouncer, title, content, createAt, filter, onReadPress }) => {
    const [announcer, setAnnouncer] = useState({ name: '', avatar: '' });
    const [isPinned, setIsPinned] = useState(false); // Trạng thái của pin
    const [pinStatus, setPinStatus] = useState<boolean | null>(null);
    const [isRead, setIsRead] = useState(false);

    const navigation = useNavigation<NavigationProp>();

    const currentUserId = getAuth().currentUser?.uid; // Lấy userId hiện tại

    // Lấy thông tin từ Students
    useEffect(() => {
        const announcerRef = ref(database, `Students/${idAnnouncer}`);
        const unsubscribe = onValue(announcerRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setAnnouncer({
                    name: data.studentName || 'Người thông báo',
                    avatar: data.avatar || '',
                });
            } else {
                console.log(`No data found for idAnnouncer: ${idAnnouncer}`);
            }
        });

        return () => unsubscribe();
    }, [idAnnouncer]);

    // Kiểm tra trạng thái đọc từ Firebase
    useEffect(() => {
        if (currentUserId) {
            const readStatusRef = ref(database, `Actives/${currentUserId}/Notifies/Reads/${id}/status`);
            const unsubscribeRead = onValue(readStatusRef, (snapshot) => {
                const readStatus = snapshot.val();
                setIsRead(!!readStatus); // true nếu đã đọc
                console.log('LLLL', readStatus); 
            });

            return () => unsubscribeRead();
        }
    }, [currentUserId, id]);

    // Đổi trạng thái "đọc thông báo"
    const handleReadNotification = () => {
        if (currentUserId) {
            const readRef = ref(database, `Actives/${currentUserId}/Notifies/Reads/${id}/status`);
            set(readRef, true) // Luôn đặt giá trị là true
                .then(() => console.log(`Set read status to true for ${id}`))
                .catch((error) => console.error("Error setting read status:", error));

            navigation.navigate('NotifyDetail', {idAnnouncer: idAnnouncer, id: id})
        }
    };

    // Kiểm tra trạng thái pin trong Firebase
    useEffect(() => {
        if (currentUserId) {
            const statusRef = ref(database, `Actives/${currentUserId}/Notifies/Pins/${id}`);
            const unsubscribeStatus = onValue(statusRef, (snapshot) => {
                const pinStatus = snapshot.val();
                if (pinStatus !== null) {
                    setPinStatus(pinStatus.status); // Cập nhật trạng thái pin
                    setIsPinned(pinStatus.status); // Cập nhật trạng thái pin
                }
            });

            return () => unsubscribeStatus();
        }
    }, [currentUserId, id]);

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

    const formatDate = (date: string) => {
        const now = new Date();
        const postDate = new Date(date);
        const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        const diffInHours = Math.floor(diffInMinutes / 60);
        const diffInDays = Math.floor(diffInHours / 24);

        if (diffInMinutes < 1) return 'Vừa xong';
        if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
        if (diffInHours < 24) return `${diffInHours} giờ trước`;
        return `${diffInDays} ngày trước`;
    };

    // Hàm xử lý sự kiện khi nhấn vào pin
    const togglePinStatus = () => {
        if (currentUserId) {
            const statusRef = ref(database, `Actives/${currentUserId}/Notifies/Pins/${id}`);
            const newStatus = !isPinned; // Đổi trạng thái pin
            set(statusRef, { status: newStatus }) // Cập nhật trạng thái vào Firebase
                .then(() => {
                    setIsPinned(newStatus); // Cập nhật trạng thái pin trên UI
                })
                .catch((error) => {
                    console.log("Error updating pin status: ", error);
                });
        }
    };

    return (
        <View style={{ alignItems: 'center' }}>
            <View style={styles.pinContainer}>
                <TouchableOpacity onPress={togglePinStatus}>
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
                            source={{ uri: announcer.avatar }}
                            style={styles.avatar}
                        />
                        <Text style={styles.announcer}>{announcer.name}</Text>
                    </View>
                    <Animated.Image
                        source={require('../icons/icon_bell_animation.png')}
                        style={[
                            styles.icon,
                            !isRead ? animatedStyle : {}, // Animation chỉ áp dụng khi chưa đọc
                        ]}
                    />

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

                <TouchableOpacity style={styles.readButton} onPress={handleReadNotification}>
                    <Text style={styles.readButtonText}>Đọc</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
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
});

export default ItemNotify;
