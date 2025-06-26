import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import database from '@react-native-firebase/database';
import moment from 'moment';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../type';
import { ActivityIndicator } from 'react-native-paper';
import { get, getDatabase, ref } from 'firebase/database';

interface NotifyDetailProps {
    route: RouteProp<RootStackParamList, 'NotifyDetailScreen'>;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'NotifyDetailScreen'>;

const NotifyDetailScreen: React.FC<NotifyDetailProps> = ({ route }) => {
    const { userId, notifyId } = route.params;
    const [isPressing, setIsPressing] = useState(false);
    const [notify, setNotify] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [userName, setUserName] = useState<string>('No name');
    const [avatar, setAvatar] = useState<string>('');

    const navigation = useNavigation<NavigationProp>();

    const handlePress = () => {
        if (!isPressing) {
            setIsPressing(true);
            navigation.goBack();

            setTimeout(() => {
                setIsPressing(false);
            }, 500);
        }
    };

    useEffect(() => {
        const fetchNotify = async () => {
            try {
                const snapshot = await database()
                    .ref(`Notifies/${userId}/${notifyId}`)
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
    }, [userId, notifyId]);

    const formatDate = (timestamp: number) => {
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
        const findAdminByUserId = async (userId: string) => {
            const db = getDatabase();
            const adminPaths = ['AdminDefaults', 'AdminDepartments', 'AdminBussinesses'];

            for (const path of adminPaths) {
                const adminRef = ref(db, `Admins/${path}/${userId}`);
                const snapshot = await get(adminRef);
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    setUserName(data.fullName || 'No name');
                    setAvatar(data.avatar || '');
                    return;
                }
            }
        };

        findAdminByUserId(userId);
    }, [userId]);

    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    if (!notify) {
        return (
            <View style={styles.container}>
                <Text style={styles.error}>Không tìm thấy thông báo.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.headerTitle}>THÔNG BÁO</Text>

            <View style={styles.header}>
                <Image
                    source={{ uri: avatar }}
                    style={styles.avatar}
                />
                <View style={styles.announcerInfo}>
                    <Text style={styles.announcerName}>{userName}</Text>
                    <Text style={styles.time}>{formatDate(notify.createAt)}</Text>
                </View>
                <TouchableOpacity style={styles.closeButton} onPress={handlePress}>
                    <Text style={styles.closeButtonText}>Đóng</Text>
                </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.body}>
                    <Text style={styles.title}>{notify.title}</Text>
                    <Text style={styles.content}>{notify.content}</Text>
                </View>
            </ScrollView>
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
        justifyContent: 'space-between',
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

export default NotifyDetailScreen;
