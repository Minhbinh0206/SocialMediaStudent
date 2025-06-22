import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { getDatabase, ref, onValue, off, query, orderByChild, equalTo, get } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import ItemNote from './ItemNote';
import { database } from '../firebaseConfig';

type Friend = {
    friendId: string; // Key (ID của bạn bè)
    status: number;   // Trạng thái
};

const ListNote: React.FC = () => {
    const [friends, setFriends] = useState<Friend[]>([]);
    const [userAvatar, setUserAvatar] = useState(''); // Avatar người dùng
    const [userNote, setUserNote] = useState(''); // Ghi chú người dùng
    const currentUserId = getAuth().currentUser?.uid;

    useEffect(() => {
        if (!currentUserId) return;

        const friendsRef = ref(database, `Friends/${currentUserId}`);

        const unsubscribe = onValue(friendsRef, (snapshot) => {
            const friendList: Friend[] = [];
            snapshot.forEach((childSnapshot) => {
                const friendId = childSnapshot.key; // Lấy key làm friendId
                const status = childSnapshot.val().status;

                // Chỉ lấy bạn bè có status === 3
                if (status === 3) {
                    friendList.push({ friendId, status });
                }
            });
            setFriends(friendList); // Cập nhật danh sách bạn bè
        });

        // Hủy lắng nghe Firebase khi component unmount
        return () => off(friendsRef);
    }, [currentUserId]);

    const findStudentByUserId = async (userId: string) => {
        const db = getDatabase();
        const studentsRef = ref(db, 'Users');
        const studentQuery = query(studentsRef, orderByChild('userId'), equalTo(userId));

        try {
            const snapshot = await get(studentQuery);

            if (snapshot.exists()) {
                const studentData = snapshot.val();
                const studentId = Object.keys(studentData)[0];
                setUserAvatar(studentData[studentId].avatar || '');
                setUserNote(studentData[studentId].note || ''); // Lấy ghi chú người dùng
            } else {
                console.log('No student found with userId:', userId);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    useEffect(() => {
        if (currentUserId) {
            findStudentByUserId(currentUserId);
        }
    }, [currentUserId]);

    const renderItem = ({ item }: { item: Friend }) => (
        <ItemNote userId={item.friendId} />
    );

    return (
        <View style={styles.container}>
            <Text style={styles.text}>Ghi chú</Text>
            <View style={styles.inputContainer}>
                <FlatList
                    data={friends}
                    keyExtractor={(item) => item.friendId}
                    horizontal={true}
                    renderItem={renderItem}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>Không có bạn bè nào.</Text>
                    }
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        padding: 10,
    },
    text: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    inputContainer: {
        flexDirection: 'row',
        paddingHorizontal: 10,
        paddingVertical: 15,
        alignItems: 'center',
    },
    avatarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    inputBox: {
        backgroundColor: '#f1f1f1',
        borderRadius: 25,
        paddingVertical: 10,
        paddingHorizontal: 20,
        maxWidth: '70%',
    },
    inputText: {
        color: '#888',
        fontSize: 16,
    },
    emptyText: {
        fontSize: 16,
        color: '#888',
        textAlign: 'center',
        marginTop: 20,
    },
});

export default ListNote;
