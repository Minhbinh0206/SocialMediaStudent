import { equalTo, get, getDatabase, orderByChild, query, ref } from 'firebase/database';
import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';

interface ItemFriendProps {
    id: string;
    onCheckFriend: () => void; // Hàm xử lý khi nhấn nút "Thêm bạn bè"
}

const ItemFriend: React.FC<ItemFriendProps> = ({ id, onCheckFriend }) => {
    const [userName, setUserName] = useState<string>('');
    const [userNumber, setUerNumber] = useState<string>('');
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
                setUerNumber(studentData[studentId].description)
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
                <Text style={styles.des}>{userNumber || `No bio`}</Text>
            </View>

            <View style={styles.action}>
                    <TouchableOpacity style={styles.button1} onPress={onCheckFriend}>
                        <View style={styles.buttonStatus}>
                            <Image source={require('../icons/icon_check_profile.png')} style={styles.icon} />
                        </View>
                    </TouchableOpacity>
                </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        flexDirection: 'row', // Sắp xếp theo chiều ngang (Avatar bên trái, thông tin bên phải)
        alignItems: 'center',
        marginBottom: 10,
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
        flex: 7, // Chiếm 7 phần không gian
        flexDirection: 'column',
        justifyContent: 'center',
    },
    icon: {
        width: 24,
        height: 24,
    },
    action: {
        flex: 2, // Chiếm 3 phần không gian
        flexDirection: 'row',
        justifyContent: 'flex-end', // Đẩy nút bấm sang bên phải
    },
    name: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    des: {
        fontSize: 15,
        opacity: 0.6
    },
    button1: {
        width: '100%',
        backgroundColor: '#3399FF',
        paddingVertical: 5,
        elevation: 3, // Tạo bóng nhẹ
        borderRadius: 10,
        alignItems: 'center',
    },
    buttonStatus: {
        color: 'white',
        fontSize: 15,
        paddingVertical: 5,
        fontWeight: 'bold'
    },
});


export default ItemFriend;
