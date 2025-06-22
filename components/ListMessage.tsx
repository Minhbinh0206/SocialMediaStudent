import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { getDatabase, ref, onValue, off, get } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import ItemMessage from './ItemMessage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../type';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'NotifyDetailScreen'>;

const ListMessage: React.FC<{ userId: string }> = ({ userId }) => {
    const [messages, setMessages] = useState<any[]>([]);  // Declare state for storing messages
    const currentUserId = getAuth().currentUser?.uid;
    const [friendAvatar, setFriendAvatar] = useState('');
    const [friendName, setFriendName] = useState('');
    const [isPressing, setIsPressing] = useState(false);
    const navigation = useNavigation<NavigationProp>();
    const flatListRef = useRef<FlatList<any>>(null); // ref for FlatList

    const handleGoProfile = () => {
        if (!isPressing) {
            setIsPressing(true);
            navigation.navigate('FriendScreen', { userId: userId });

            setTimeout(() => {
                setIsPressing(false);
            }, 500);
        }
    };

    useEffect(() => {
        const fetchStudent = async () => {
            try {
                const db = getDatabase(); // Kết nối database
                const studentRef = ref(db, `Users/${userId}`); // Tham chiếu đến node Users và id

                const snapshot = await get(studentRef);
                if (snapshot.exists()) {
                    const studentData = snapshot.val();
                    setFriendAvatar(studentData.avatar);
                    setFriendName(studentData.studentName);
                } else {
                    // Handle case when no data found
                }
            } catch (error) {
                console.error('Lỗi khi tải sinh viên:', error);
            }
        };

        fetchStudent();
    }, [userId]);

    useEffect(() => {
        if (!currentUserId || !userId) return;

        const db = getDatabase();
        const messagesRef = ref(db, `Messages/${currentUserId}/${userId}`); // Adjust path based on your DB structure

        const messagesListener = onValue(messagesRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const messagesArray = Object.keys(data).map((key) => ({
                    id: key,
                    ...data[key],
                }));
                // Sắp xếp tin nhắn theo thời gian từ cũ đến mới
                const sortedMessages = messagesArray.sort(
                    (a, b) => a.createAt - b.createAt
                );
                setMessages(sortedMessages);
            } else {
                setMessages([]);
            }
        });

        return () => off(messagesRef, 'value', messagesListener); // Clean up listener on unmount
    }, [currentUserId, userId]);


    const renderItem = ({ item, index }: { item: any, index: number }) => {
        const isLastItem = index === 0; // Vì FlatList sử dụng inverted, phần tử đầu tiên (trên cùng) là cuối danh sách.
        const nextItem = isLastItem ? null : messages[index + 1];

        return (
            <ItemMessage
                userId={userId}
                content={item.content}
                type={item.type}
                createAt={item.createAt}
                showAvatar={!isLastItem && (!nextItem || nextItem.type !== item.type)}
            />
        );
    };

    useEffect(() => {
        // Cuộn xuống cuối mỗi khi tin nhắn thay đổi
        if (flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: true });
        }
    }, [messages]); // Khi messages thay đổi, cuộn đến cuối

    return (
        <View style={styles.container}>
            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={
                    <View style={styles.nullMessageContainer}>
                        <Image
                            source={{ uri: friendAvatar }}
                            style={styles.avatar}
                        />
                        <Text style={styles.userName}>{friendName}</Text>
                        <Text style={styles.statusText}>Gửi tin nhắn nào đó để chào bạn và làm quen bạn mới nào!</Text>
                        <TouchableOpacity onPress={handleGoProfile}>
                            <Text style={styles.textGoProfile}> Xem trang cá nhân </Text>
                        </TouchableOpacity>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        marginBottom: 70,
        paddingBottom: 10,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    userName: {
        fontSize: 20,
        fontWeight: '600',
        marginTop: 10,
    },
    statusText: {
        fontSize: 14,
        marginTop: 5,
        color: '#6c757d',
        flexWrap: 'wrap',
        width: '70%',
        textAlign: 'center',
    },
    textGoProfile: {
        backgroundColor: '#EEEE',
        paddingVertical: 10,
        paddingHorizontal: 25,
        marginTop: 10,
        borderRadius: 20,
        fontWeight: '400',
    },
    emptyText: {
        fontSize: 16,
        color: '#888',
        textAlign: 'center',
        marginTop: 20,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginHorizontal: 5,
    },
    nullMessageContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: 700,
        backgroundColor: '#fff',
    },
});

export default ListMessage;
