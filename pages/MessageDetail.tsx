import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, Button, Modal } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getDatabase, ref, get, push, set, onValue } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import ListMessage from '../components/ListMessage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../type';
import { logToLogBoxAndConsole } from 'react-native-reanimated/lib/typescript/logger';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'MessageDetail'>;

const MessageDetail = () => {
    const [latestMessageKey, setLatestMessageKey] = useState<string | null>(null); // Lưu trữ key của tin nhắn mới nhất
    const [isPressing, setIsPressing] = useState(false);
    const [student, setStudent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [myAvatar, setMyAvatar] = useState('');
    const [friendAvatar, setFriendAvatar] = useState('');
    const [friendName, setFriendName] = useState('');
    const [myName, setMyName] = useState('');
    const currentUserId = getAuth().currentUser?.uid
    const route = useRoute();
    const [isAllowNotify, setIsAllowNotify] = useState<any>();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const navigation = useNavigation<NavigationProp>();
    const { userId } = route.params as { userId: string }; // Nhận id từ params 
    const [isNameTagVisible, setIsNameTagVisible] = useState(false);
    const [myNameTag, setMyNameTag] = useState('');
    const [friendNameTag, setFriendNameTag] = useState('');

    const handleOpenNameTag = () => {
        setIsNameTagVisible(true);
    };

    const handleCloseNameTag = () => {
        setIsNameTagVisible(false);
    };

    const handleToggleModal = () => {
        setIsModalVisible(!isModalVisible);
    };

    useEffect(() => {
        if (!currentUserId || !userId) {
            console.log('User ID is not valid');
            return;
        }

        // Đường dẫn đến tin nhắn
        const db = getDatabase();
        const messagesRef = ref(db, `Messages/${currentUserId}/${userId}`);

        const messageListener = onValue(messagesRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const messagesArray = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key],
                }));

                // Sắp xếp tin nhắn theo thời gian từ mới nhất đến cũ nhất
                const sortedMessages = messagesArray.sort((a, b) => a.createAt - b.createAt);

                // Lấy key của tin nhắn mới nhất
                const latestMessageKey = sortedMessages[messagesArray.length - 1]?.id || null;
                setLatestMessageKey(latestMessageKey);

                // Lưu key vào đường dẫn mới
                if (latestMessageKey) {
                    const messageRef = ref(db, `Actives/${currentUserId}/Messenger/${userId}/Read/lastMessageId`);
                    set(messageRef, latestMessageKey) // Ghi key của tin nhắn mới nhất vào đường dẫn
                        .then(() => {
                            console.log('Last message ID saved successfully');
                        })
                        .catch((error) => {
                            console.error('Error saving last message ID:', error);
                        });
                }
            } else {
                console.log('No messages found');
                setLatestMessageKey(null);
            }
        });

        return () => {
            // Dọn dẹp listener khi component unmount
            messageListener();
        };
    }, [currentUserId, userId]);

    useEffect(() => {
        const fetchStudent = async () => {
            try {
                const db = getDatabase(); // Kết nối database
                const studentRef = ref(db, `Users/${userId}`); // Tham chiếu đến node Students và id

                const snapshot = await get(studentRef);
                if (snapshot.exists()) {
                    const studentData = snapshot.val();
                    setStudent({
                        userId,
                        name: studentData.studentName || 'Không rõ', // Đảm bảo luôn có giá trị
                        avatar: studentData.avatar || 'default_avatar_url', // Nếu không có avatar, sử dụng avatar mặc định
                    });

                    setFriendAvatar(studentData.avatar)
                    setFriendName(studentData.studentName)
                } else {
                    setStudent(null); // Không tìm thấy sinh viên
                }
            } catch (error) {
                console.error('Lỗi khi tải sinh viên:', error);
            } finally {
                setLoading(false); // Kết thúc tải dữ liệu
            }
        };

        fetchStudent();
    }, [userId]);

    useEffect(() => {
        const fetchStudent = async () => {
            try {
                const db = getDatabase(); // Kết nối database
                const studentRef = ref(db, `Users/${currentUserId}`); // Tham chiếu đến node Students và id

                const snapshot = await get(studentRef);
                if (snapshot.exists()) {
                    const studentData = snapshot.val();
                    setMyAvatar(studentData.avatar)
                    setMyName(studentData.studentName)
                } else {
                }
            } catch (error) {
                console.error('Lỗi khi tải sinh viên:', error);
            } finally {
                setLoading(false); // Kết thúc tải dữ liệu
            }
        };

        fetchStudent();
    }, [currentUserId]);

    useEffect(() => {
        const fetchAllowNotify = async () => {
            try {
                const db = getDatabase();
                const messagesRefSend = ref(db, `Actives/${currentUserId}/Messenger/${userId}/Notify/status`);

                const snapshot = await get(messagesRefSend);
                if (snapshot.exists()) {
                    setIsAllowNotify(snapshot.val())
                } else {
                }
            } catch (error) {
                console.error('Lỗi khi tải sinh viên:', error);
            } finally {
            }
        };

        fetchAllowNotify();
    }, []);

    useEffect(() => {
        const fetchNameTag = async () => {
            try {
                const db = getDatabase();
                const friendNameTagRef = ref(db, `Actives/${currentUserId}/Messenger/${userId}/NameTag/nickname`);
                const myNameTagRef = ref(db, `Actives/${userId}/Messenger/${currentUserId}/NameTag/nickname`);

                const friendSnapshot = await get(friendNameTagRef);
                if (friendSnapshot.exists()) {
                    setFriendNameTag(friendSnapshot.val())
                } else {

                }

                const mySnapshot = await get(myNameTagRef);
                if (mySnapshot.exists()) {
                    setMyNameTag(mySnapshot.val())
                } else {

                }
            } catch (error) {
                console.error('Lỗi khi tải sinh viên:', error);
            } finally {
            }
        };

        fetchNameTag();
    }, []);

    const handleBackPress = () => {
        if (!isPressing) {
            setIsPressing(true);
            navigation.goBack();

            setTimeout(() => {
                setIsPressing(false);
            }, 500);
        }
    };

    const handleNavToProfile = () => {
        setIsModalVisible(false);
        if (!isPressing) {
            setIsPressing(true);
            navigation.navigate('FriendScreen', { userId: userId })

            setTimeout(() => {
                setIsPressing(false);
            }, 500);
        }
    };

    const handleSendMessage = async () => {
        if (!message.trim()) return;  // Tránh gửi tin nhắn rỗng

        const currentTime = new Date().toISOString(); // Lấy thời gian hiện tại
        const newMessageSend = {
            content: message,
            type: 'Send',  // Loại tin nhắn
            createAt: currentTime,
        };

        const newMessageGet = {
            content: message,
            type: 'Get',  // Loại tin nhắn
            createAt: currentTime,
        };

        try {
            const db = getDatabase();
            const messagesRefSend = ref(db, `Messages/${currentUserId}/${userId}`);
            const messagesRefGet = ref(db, `Messages/${userId}/${currentUserId}`);

            // Tạo key mới cho tin nhắn và thêm tin nhắn vào Firebase
            const newMessageRefSend = push(messagesRefSend);
            const newMessageRefGet = push(messagesRefGet);

            await set(newMessageRefSend, newMessageSend);
            await set(newMessageRefGet, newMessageGet);

            // Xóa nội dung tin nhắn sau khi gửi
            setMessage('');
        } catch (error) {
            console.error('Lỗi khi gửi tin nhắn:', error);
        }
    }

    const handleProcessNotify = async () => {
        try {
            const newStatus = !isAllowNotify; // Tính toán giá trị mới trước
            setIsAllowNotify(newStatus); // Cập nhật trạng thái

            const db = getDatabase();
            const messagesRefSend = ref(db, `Actives/${currentUserId}/Messenger/${userId}/Notify/status`);

            await set(messagesRefSend, newStatus); // Sử dụng giá trị mới
        } catch (error) {
            console.error(error); // Bắt lỗi nếu cần
        }
    };

    const handleSetNameTag = async () => {
        try {
            const db = getDatabase();
            const friendNameTagRef = ref(db, `Actives/${currentUserId}/Messenger/${userId}/NameTag/nickname`);
            const myNameTagRef = ref(db, `Actives/${userId}/Messenger/${currentUserId}/NameTag/nickname`);

            if (friendNameTag.trim()) {
                await set(friendNameTagRef, friendNameTag);
            }

            if (myNameTag.trim()) {
                await set(myNameTagRef, myNameTag);
            }

            setIsNameTagVisible(false)

        } catch (error) {
            console.error('Lỗi khi tải sinh viên:', error);
        } finally {
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: 'white' }}>
            {/* Thanh tiêu đề */}
            <View style={styles.header}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={handleBackPress}>
                        <Image
                            source={require('../icons/icon_back_black.png')}
                            style={styles.iconBack}
                        />
                    </TouchableOpacity>

                    {/* Hiển thị Avatar và tên người dùng */}
                    <View style={styles.userInfoContainer}>
                        {student ? (
                            <>
                                <Image
                                    source={{ uri: student.avatar }}
                                    style={styles.avatar}
                                />
                                <View style={styles.nameContainer}>
                                    <Text style={styles.userName}>{friendNameTag ? friendNameTag : student.name}</Text>
                                    <View style={styles.onlineContainer}>
                                        <View style={styles.dotOnline}></View>
                                        <Text style={styles.statusText}>Đang hoạt động</Text>
                                    </View>
                                </View>
                            </>
                        ) : (
                            <Text style={styles.userName}>Đang tải...</Text>
                        )}
                    </View>
                </View>

                <TouchableOpacity onPress={handleToggleModal}>
                    <Image
                        source={require('../icons/icon_more_vertical.png')}
                        style={styles.iconMore}
                    />
                </TouchableOpacity>
            </View>

            <ListMessage userId={userId} />

            {/* Phần nhập tin nhắn */}
            <View style={styles.messageInputContainer}>
                <Image
                    source={{ uri: myAvatar }}
                    style={styles.avatar}
                />
                <TextInput
                    style={styles.messageInput}
                    value={message}
                    onChangeText={setMessage}
                    placeholder="Nhập tin nhắn..."
                    placeholderTextColor="#888"
                />
                <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
                    <Text style={styles.sendButtonText}>Gửi</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Dark overlay
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalNameTag: {
        width: '80%',
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    modalTitleNameTag: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    userInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10
    },
    avatarNameTag: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 15,
    },
    nameContainer: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    onlineContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    nameTagInput: {
        flex: 1,
        borderBottomWidth: 1,
        borderBottomColor: '#888',
        paddingVertical: 5,
        fontSize: 14,
        color: '#333',
    },
    closeModal: {
        marginTop: 15,
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
        backgroundColor: '#007BFF',
        paddingHorizontal: 20,
        paddingVertical: 5,
        borderRadius: 10
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingVertical: 10,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    dotOnline: {
        width: 10,
        height: 10,
        backgroundColor: 'green',
        borderRadius: 10,
        marginRight: 5,
        marginTop: 2
    },
    parentIconModel: {
        width: 50,
        paddingLeft: 6,
        height: 50,
        backgroundColor: '#EEE',
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 15
    },
    crossLine: {
        position: 'absolute',
        width: '100%',
        height: 2,
        opacity: 0.8,
        backgroundColor: 'black',
        transform: [{ rotate: '-45deg' }],
    },
    textGoProfile: {
        backgroundColor: '#EEEE',
        paddingVertical: 10,
        paddingHorizontal: 25,
        marginTop: 10,
        borderRadius: 20,
        fontWeight: '400',
    },
    iconBack: {
        width: 20,
        height: 20,
        tintColor: '#333',
        marginRight: 15
    },
    iconClose: {
        width: 30,
        height: 30,
        tintColor: 'black',
        marginRight: 5,
    },
    iconMore: {
        width: 20,
        height: 25,
        tintColor: '#333',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginHorizontal: 10,
    },
    avatarModel: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginHorizontal: 5,
        marginVertical: 15
    },
    statusText: {
        fontSize: 14,
        color: '#6c757d',
    },
    messageInputContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingTop: 15,
        paddingBottom: 15,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#ccc',
    },
    messageInput: {
        flex: 1,
        height: 40,
        borderRadius: 20,
        paddingHorizontal: 15,
        backgroundColor: '#f1f1f1',
        marginRight: 10,
    },
    sendButton: {
        backgroundColor: '#3399FF',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
    },
    titleOption: {
        fontSize: 16,
        fontWeight: 'bold'
    },
    sendButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    modalContent: {
        position: 'absolute',
        flex: 1,
        top: 0,
        bottom: 0,
        right: 0,
        width: '75%', // Nửa màn hình
        backgroundColor: '#fff',
        padding: 10,
        shadowColor: '#000',
        shadowOffset: { width: -2, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5,
        flexDirection: 'column',
        alignItems: 'center', // Hoặc 'stretch', tùy ý
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    nullMessageContainer: {
        alignItems: 'center',
        width: '85%',
        backgroundColor: '#fff',
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#ccc',
    },
    optionIcon: {
        width: 24,
        height: 24,
        marginRight: 15,
        tintColor: '#4CAF50', // Đổi màu icon
    },
    optionText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
    },
    optionContainer: {
        marginVertical: 15,
        borderTopWidth: 1,
        borderTopColor: '#ccc',
        paddingTop: 10,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderRadius: 8,
        marginVertical: 5,
        backgroundColor: '#f9f9f9', // Tạo nền nhẹ
        shadowColor: '#000', // Tạo bóng
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
        elevation: 3, // Hiệu ứng nâng nổi trên Android
    },
});

export default MessageDetail;
