import { getAuth } from 'firebase/auth';
import { equalTo, get, getDatabase, off, onValue, orderByChild, query, ref } from 'firebase/database';
import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';

type ItemFriendProps = {
    userId: string;
    onPress: (userId: string) => void; // Thêm hàm onPress
};

const ItemFriendMessage: React.FC<ItemFriendProps> = ({ userId, onPress }) => {
    const [userName, setUserName] = useState<string>('Unknown');
    const [messageRecent, setMessageRecent] = useState<any>(''); // Biến lưu tin nhắn gần đây
    const [userAvatar, setUserAvatar] = useState<string>('');
    const [messages, setMessages] = useState<any[]>([]);  // Declare state for storing messages
    const [lastMessageId, setLastMessageId] = useState<string>('');  // Lưu trữ lastMessageId
    const currentUserId = getAuth().currentUser?.uid;
    const [friendNameTag, setFriendNameTag] = useState('');

    useEffect(() => {
        const fetchNameTag = async () => {
            try {
                const db = getDatabase();
                const friendNameTagRef = ref(db, `Actives/${currentUserId}/Messenger/${userId}/NameTag/nickname`);

                const friendSnapshot = await get(friendNameTagRef);
                if (friendSnapshot.exists()) {
                    setFriendNameTag(friendSnapshot.val())
                } else {

                }
            } catch (error) {
                console.error('Lỗi khi tải sinh viên:', error);
            } finally {
            }
        };

        fetchNameTag();
    }, []);

    // Hàm lắng nghe dữ liệu cho userId cụ thể    
    useEffect(() => {
        const fetchData = (userId: string) => {
            const currentUserId = getAuth().currentUser?.uid; // Lấy ID người dùng hiện tại

            if (!currentUserId) {
                console.log('No user logged in');
                return;
            }

            const db = getDatabase();
            const messageRef = ref(db, `Actives/${currentUserId}/Messenger/${userId}/Read/lastMessageId`);

            onValue(messageRef, (snapshot) => {
                if (snapshot.exists()) {
                    const lastMessageId = snapshot.val();
                    setLastMessageId(lastMessageId);  // Lưu lastMessageId vào state
                    console.log(`Last message ID for user ${userId}: ${lastMessageId}`);
                } else {
                    console.log(`No last message found for user ${userId}`);
                }
            });
        };

        if (userId) {
            fetchData(userId); // Chỉ gọi hàm khi có userId
        }
    }, [userId]);

    const findStudentByUserId = async (userId: string) => {
        const db = getDatabase();
        const studentsRef = ref(db, 'Users');
        const studentQuery = query(studentsRef, orderByChild('userId'), equalTo(userId));

        try {
            const snapshot = await get(studentQuery);

            if (snapshot.exists()) {
                const studentData = snapshot.val();
                const studentId = Object.keys(studentData)[0];
                setUserName(studentData[studentId].studentName || 'Unknown');
                setUserAvatar(studentData[studentId].avatar || '');
            } else {
                console.log('No student found with userId:', userId);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    useEffect(() => {
        if (userId) {
            findStudentByUserId(userId);
        }
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

    return (
        <TouchableOpacity style={styles.container} onPress={() => onPress(userId)}>
            <Image
                source={{ uri: userAvatar || 'https://www.example.com/default-avatar.png' }}
                style={styles.avatar}
            />
            <View style={styles.details}>
                <Text style={styles.name}>{friendNameTag ? friendNameTag : userName}</Text>
                <Text style={styles.bio}>
                    {messages.length > 0 && messages[messages.length - 1].type === 'Send' ? (
                        // Không làm gì nếu type là 'Send'
                        'Bạn: ' + messages[messages.length - 1].content
                    ) : messages.length > 0 && messages[messages.length - 1].type === 'Get' ? (
                        lastMessageId === messages[messages.length - 1].id ?
                            // Giữ nguyên nếu lastMessageId trùng với tin nhắn mới nhất
                            messages[messages.length - 1].content :
                            // In đậm nếu lastMessageId không trùng với tin nhắn mới nhất
                            <Text style={{ fontWeight: 'bold', color: 'black' }}>
                                {messages[messages.length - 1].content}
                            </Text>
                    ) : (
                        'Chưa có tin nhắn'
                    )}
                </Text>
            </View>

            {messages.length > 0 && messages[messages.length - 1].type === 'Get' && lastMessageId !== messages[messages.length - 1].id && (
                <View style={styles.redDot} />
            )}

        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        margin: 1,
        backgroundColor: '#f9f9f9',
        marginBottom: 15,
        borderRadius: 10,
        elevation: 3
    },
    redDot: {
        position: 'absolute',
        right: 5,
        width: 11,
        height: 11,
        borderRadius: 15,
        margin: 20,
        backgroundColor: 'red',
    },
    avatar: {
        width: 70,
        height: 70,
        borderRadius: 35, // Tạo vòng tròn cho avatar
        marginRight: 15,
        borderWidth: 2,
        borderColor: '#ddd',
    },
    details: {
        flex: 1,
        justifyContent: 'center',
    },
    name: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    bio: {
        fontSize: 14,
        color: '#777',
        opacity: 0.8,
    },
    moreButton: {
        padding: 5,
        backgroundColor: '#fff',
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 2,
    },
    icon: {
        width: 20,
        height: 20,
    },
});

export default ItemFriendMessage;
