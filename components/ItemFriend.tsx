import { equalTo, get, getDatabase, orderByChild, query, ref } from 'firebase/database';
import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';

interface ItemFriendProps {
    id: string;
    onAddFriend: () => void; // Hàm xử lý khi nhấn nút "Thêm bạn bè"
}

const ItemFriend: React.FC<ItemFriendProps> = ({ id, onAddFriend }) => {
    const [userName, setUserName] = useState<string>('');
    const [userAvatar, setUserAvatar] = useState<string>('');

    const findStudentByUserId = async (userId: string) => {
        const db = getDatabase();
        const studentsRef = ref(db, 'Students');
        const studentQuery = query(studentsRef, orderByChild('userId'), equalTo(userId));

        try {
            const snapshot = await get(studentQuery);

            if (snapshot.exists()) {
                const studentData = snapshot.val();
                const studentId = Object.keys(studentData)[0];
                setUserName(studentData[studentId].studentName);
                setUserAvatar(studentData[studentId].avatar)
            } else {
                console.log('No student found with userId:', userId);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    useEffect(() => {
        findStudentByUserId(id);
    }, [id]);

    return (
        <View style={styles.container}>
            <Image source={{ uri: userAvatar }} style={styles.avatar} />

            <View style={styles.details}>
                <Text style={styles.name}>{userName}</Text>
                <View style={styles.action}>
                    <TouchableOpacity style={styles.button1} onPress={onAddFriend}>
                        <Text style={styles.buttonStatus}>Bạn bè</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.button2} onPress={onAddFriend}>
                        <Text style={styles.buttonMessage}>Nhắn tin</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row', // Sắp xếp theo chiều ngang (Avatar bên trái, thông tin bên phải)
        alignItems: 'center',
        marginBottom: 10, // Khoảng cách giữa các phần tử
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    avatar: {
        width: 90,
        height: 90,
        borderRadius: 75,
        marginRight: 15,
    },
    details: {
        width: '100%',
        alignItems: 'baseline',
        flexDirection: 'column',
        justifyContent: 'center',
    },
    action: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    name: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    status: {
        fontSize: 14,
        color: '#555',
        marginBottom: 10,
    },
    button1: {
        width: '35%',
        backgroundColor: '#3399FF',
        paddingVertical: 5,
        paddingHorizontal: 15,
        elevation: 3, // Tạo bóng nhẹ
        borderRadius: 10,
        marginRight: 10,
        alignItems: 'center',
    },
    button2: {
        width: '35%',
        backgroundColor: '#e2e5e9',
        paddingVertical: 5,
        paddingHorizontal: 15,
        borderRadius: 10,
        elevation: 3, // Tạo bóng nhẹ
        marginRight: 10,
        alignItems: 'center',
    },
    buttonStatus: {
        color: 'white',
        fontSize: 15,
        paddingVertical: 5,
        fontWeight: 'bold'
    },
    buttonMessage: {
        color: 'black',
        fontSize: 15,
        paddingVertical: 5,
        fontWeight: 'bold'
    },
});

export default ItemFriend;
