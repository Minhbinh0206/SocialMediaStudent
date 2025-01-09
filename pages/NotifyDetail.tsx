import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import database from '@react-native-firebase/database';
import moment from 'moment';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../type';
import { ActivityIndicator } from 'react-native-paper';

interface NotifyDetailProps {
    route: RouteProp<RootStackParamList, 'NotifyDetail'>; // Fixed here
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'NotifyDetail'>;

const NotifyDetail: React.FC<NotifyDetailProps> = ({ route }) => {
    const { idAnnouncer, id } = route.params; // Nhận tham số từ route.params
    const [isPressing, setIsPressing] = useState(false); // Trạng thái nhấn nút
    const [notify, setNotify] = useState<any>(null); // State to store the notify data
    const [announcerInfo, setAnnouncerInfo] = useState<any>(null); // State to store announcer info
    const [loading, setLoading] = useState<boolean>(true); // State to track loading

    const navigation = useNavigation<NavigationProp>();

    const handlePress = () => {
        if (!isPressing) {
            setIsPressing(true);
            navigation.goBack();

            // Đặt lại trạng thái sau một khoảng thời gian để ngừng nhấn liên tục
            setTimeout(() => {
                setIsPressing(false);
            }, 500); // 500ms là khoảng thời gian cho phép nhấn lại
        }
    };

    // Fetch thông báo
    useEffect(() => {
        const fetchNotify = async () => {
            try {
                const snapshot = await database()
                    .ref(`Notifies/${idAnnouncer}/${id}`)
                    .once('value');

                if (snapshot.exists()) {
                    setNotify(snapshot.val());
                } else {
                    console.log('Thông báo không tồn tại.');
                }
            } catch (error) {
                console.log('Lỗi khi lấy thông báo: ', error);
            } finally {
                setLoading(false);
            }
        };

        fetchNotify();
    }, [idAnnouncer, id]);

    // Fetch thông tin người đăng bài từ 'Students'
    useEffect(() => {
        const fetchAnnouncerInfo = async () => {
            try {
                const snapshot = await database()
                    .ref(`Students/${idAnnouncer}`) // Truy vấn thông tin người đăng bài từ 'Students'
                    .once('value');

                if (snapshot.exists()) {
                    setAnnouncerInfo(snapshot.val()); // Lưu thông tin vào state
                } else {
                    console.log('Không tìm thấy thông tin người đăng.');
                }
            } catch (error) {
                console.log('Lỗi khi lấy thông tin người đăng: ', error);
            }
        };

        fetchAnnouncerInfo();
    }, [idAnnouncer]);

    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    if (!notify || !announcerInfo) {
        return (
            <View style={styles.container}>
                <Text style={styles.error}>Không tìm thấy thông báo hoặc người đăng bài.</Text>
            </View>
        );
    }

    const { announcerName, announcerAvatar, title, content, createAt } = notify;
    const { studentName, avatar } = announcerInfo; // Lấy tên và avatar từ thông tin người đăng

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

    return (
        <View style={styles.container}>
            <Text style={styles.headerTitle}>THÔNG BÁO</Text>

            <View style={styles.header}>
                <Image
                    source={{ uri: avatar || announcerAvatar }}
                    style={styles.avatar}
                />
                <View style={styles.announcerInfo}>
                    <Text style={styles.announcerName}>{studentName || announcerName}</Text>
                    <Text style={styles.time}>{formatDate(createAt)}</Text>
                </View>
                <TouchableOpacity style={styles.closeButton} onPress={handlePress}>
                    <Text style={styles.closeButtonText}>Đóng</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.body}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.content}>{content}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    loaderContainer: {
        flex: 1,
        height: 700,
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: 'white',
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        color: 'black',
        marginBottom: 10,
        marginVertical: 20
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between', // This will space out the elements (title, avatar, close button)
        marginBottom: 20,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 15,
    },
    announcerInfo: {
        flex: 1,
    },
    announcerName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    time: {
        fontSize: 12,
        color: '#999',
        marginTop: 5,
    },
    closeButton: {
        backgroundColor: '#FFD700',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 8,
    },
    closeButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
        paddingHorizontal: 10,
        paddingVertical: 3,
        color: '#666',
    },
    body: {
        marginTop: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
    },
    content: {
        fontSize: 16,
        color: '#333',
        lineHeight: 24,
    },
    error: {
        fontSize: 18,
        color: 'red',
    },
});


export default NotifyDetail;
