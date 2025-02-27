import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { getDatabase, ref, onValue, off } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import ItemFriendMessage from './ItemFriendMessage';
import { database } from '../firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../type';

type Friend = {
  friendId: string; // Key (ID của bạn bè)
  status: number;   // Trạng thái
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Default'>;

const ListFriendsMessage: React.FC = () => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const currentUserId = getAuth().currentUser?.uid;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Default'>>();

  const handleMessageDetail = (userId: string) => {
    navigation.navigate('MessageDetail', { userId });
    console.log("Truyền" , userId);
  };

  useEffect(() => {
    if (!currentUserId) return;

    const friendsRef = ref(database, `Friends/${currentUserId}`);

    onValue(friendsRef, (snapshot) => {
      const friendList: Friend[] = [];
      snapshot.forEach((childSnapshot) => {
        const friendId = childSnapshot.key;
        const status = childSnapshot.val()?.status;

        if (status === 3) {
          friendList.push({ friendId, status });
        }
      });
      setFriends(friendList);
    });

    return () => off(friendsRef);
  }, [currentUserId]);

  const renderItem = ({ item }: { item: Friend }) => (
    <ItemFriendMessage
      userId={item.friendId}
      onPress={() => handleMessageDetail(item.friendId)} // Đảm bảo hàm này chỉ gọi khi nhấn
    />
  );

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Danh sách bạn bè</Text>
      <FlatList
        data={friends}
        keyExtractor={(item) => item.friendId}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.emptyText}>Không có bạn bè nào.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    marginLeft: 10
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default ListFriendsMessage;
