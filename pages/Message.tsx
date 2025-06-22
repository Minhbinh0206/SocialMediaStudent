import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { ref, onValue } from 'firebase/database';
import { database } from '../firebaseConfig';
import ListFriendsMessage from '../components/ListFriendsMessage';
import ListNote from '../components/ListNote';

// Giả sử kiểu dữ liệu Student
type Student = {
    userId: string;
    studentName: string;
    email: string;
    avatar: string;
    gender: string;
};

const Message = () => {
    const [isPressing, setIsPressing] = useState(false); // Trạng thái nhấn nút
    const navigation = useNavigation(); // Khai báo useNavigation
    const [userName, setUserName] = useState('');
    const currentUserId = getAuth().currentUser?.uid;

    // Lấy thông tin từ Students
    useEffect(() => {
        if (!currentUserId) return;

        const announcerRef = ref(database, `Users/${currentUserId}`);
        const unsubscribe = onValue(announcerRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setUserName(data.studentName);
            } else {
                console.log(`No data found for idAnnouncer: ${currentUserId}`);
            }
        });

        return () => unsubscribe();
    }, [currentUserId]);

    const handleBackPress = () => {
        if (!isPressing) {
            setIsPressing(true);
            navigation.goBack();

            // Đặt lại trạng thái sau một khoảng thời gian để ngừng nhấn liên tục
            setTimeout(() => {
                setIsPressing(false);
            }, 500); // 500ms là khoảng thời gian cho phép nhấn lại
        }
    };

    return (
        <View style={{ flex: 1 }}>
            {/* Thanh tiêu đề */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBackPress}>
                    <Image
                        source={require('../icons/icon_back_black.png')}
                        style={styles.iconBack}
                    />
                </TouchableOpacity>
                <Text style={styles.userName}>{userName}</Text>
                <TouchableOpacity>
                    <Image
                        source={require('../icons/icon_add_message.png')}
                        style={styles.iconAdd}
                    />
                </TouchableOpacity>
            </View>
            {/* Danh sách tin nhắn */}
            <View style={styles.listContainer}>
                <ListNote />
                <ListFriendsMessage />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingVertical: 15,
        backgroundColor: '#F5FCFF',
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    iconAdd: {
        width: 30,
        height: 30,
        tintColor: '#333',
    },
    iconBack: {
        width: 20,
        height: 20,
        tintColor: '#333',
    },
    userName: {
        fontSize: 20,
        fontWeight: '600',
        flex: 1,
        textAlign: 'center',
    },
    listContainer: {
        flex: 1,
        flexDirection: 'column',
        padding: 10,
        backgroundColor: '#f9f9f9',
    },
});

export default Message;
