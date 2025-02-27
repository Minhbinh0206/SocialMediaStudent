import { equalTo, get, getDatabase, orderByChild, query, ref } from 'firebase/database';
import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';

interface ItemFriendProps {
    id: string;
    onCheckFriend: () => void;
}

const ItemGroup: React.FC<ItemFriendProps> = ({ id, onCheckFriend }) => {
    const [groupName, setGroupName] = useState<string>('');
    const [groupAvatar, setGroupAvatar] = useState<string>('');
    const [groupPrivate, setGroupPrivate] = useState<boolean>(false);
    const [groupDefault, setGroupDefault] = useState<boolean>(false);

    const findGroupBykey = async (groupId: string) => {
        const db = getDatabase();
        const studentsRef = ref(db, 'Groups');
        const studentQuery = query(studentsRef, orderByChild('groupId'), equalTo(groupId));

        try {
            const snapshot = await get(studentQuery);

            if (snapshot.exists()) {
                const groupData = snapshot.val();
                const groupId = Object.keys(groupData)[0];
                setGroupName(groupData[groupId].groupName);
                setGroupAvatar(groupData[groupId].avatar);
                setGroupPrivate(groupData[groupId].private);
                setGroupDefault(groupData[groupId].groupDefault);
            } else {
                console.log('No group found with groupId:', groupId);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    useEffect(() => {
        findGroupBykey(id);
    }, [id]);

    return (
        <View style={styles.container}>
            <Image source={{ uri: groupAvatar }} style={styles.avatar} />

            <View style={styles.details}>
                <Text style={styles.name}>{groupName}</Text>
                <Text style={styles.des}>{groupDefault ? 'Mặc định' : groupPrivate ? 'Riêng tư' : 'Công khai'}</Text>
            </View>

            <TouchableOpacity style={styles.addButton} onPress={onCheckFriend}>
                <Text style={styles.addText}>Xem</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        marginVertical: 6,
        backgroundColor: '#fff',
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3, // Tạo bóng trên Android
    },
    avatar: {
        width: 70,
        height: 70,
        borderRadius: 70,
        marginRight: 15,
    },
    details: {
        flex: 1,
        justifyContent: 'center',
    },
    name: {
        fontSize: 19,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    des: {
        fontSize: 14,
        color: '#777',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1877F2', // Màu xanh Facebook
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    icon: {
        width: 18,
        height: 18,
        marginRight: 5,
        tintColor: '#fff', // Đổi màu icon thành trắng
    },
    addText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
});

export default ItemGroup;
