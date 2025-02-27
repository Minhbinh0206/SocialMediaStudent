import { getAuth } from 'firebase/auth';
import { equalTo, get, getDatabase, orderByChild, query, ref } from 'firebase/database';
import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';

type ItemFriendProps = {
    userId: string;
};

const ItemFriendMessage: React.FC<ItemFriendProps> = ({ userId }) => {
    const [userName, setUserName] = useState<string>('Unknown');
    const [messageRecent, setMessageRecent] = useState<string>('');
    const [userAvatar, setUserAvatar] = useState<string>('');

    console.log(userId);

    const findStudentByUserId = async (userId: string) => {
        const db = getDatabase();
        const studentsRef = ref(db, 'Students');
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

    return (
        <View style={styles.container}>
            <Image
                source={{ uri: userAvatar || 'https://www.example.com/default-avatar.png' }}
                style={styles.avatar}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        margin: 1,
        backgroundColor: '#fff',
        marginBottom: 15,
    },
    avatar: {
        width: 90,
        height: 90,
        borderRadius: 55, // Tạo vòng tròn cho avatar
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
