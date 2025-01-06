import React, { useState, useEffect } from 'react';
import { View, FlatList, ActivityIndicator, StyleSheet, Dimensions, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { database } from '../firebaseConfig';
import { ref, onValue } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import ItemFriend from './ItemFriend';

const { width } = Dimensions.get('window');

const ListFriend: React.FC = () => {
    const [myFriends, setMyFriends] = useState<any[]>([]);
    const [suggestedFriends, setSuggestedFriends] = useState<any[]>([]); // Danh sách gợi ý kết bạn
    const [loading, setLoading] = useState(true);
    const [selectedTab, setSelectedTab] = useState('suggestions'); // Đặt mặc định là "Gợi ý kết bạn"

    const currentUserId = getAuth().currentUser?.uid;

    useEffect(() => {
        if (currentUserId) {
            const fetchFriends = async () => {
                const friendsRef = ref(database, `Friends/${currentUserId}`);
                const friends: any[] = [];

                // Lấy danh sách bạn bè từ Firebase
                onValue(friendsRef, (snapshot) => {
                    snapshot.forEach((childSnapshot) => {
                        const friendId = childSnapshot.key;
                        const status = childSnapshot.val().status;

                        friends.push({ friendId, status });
                    });

                    fetchFriendDetails(friends);
                }, {
                    onlyOnce: true
                });
            };

            const fetchFriendDetails = async (friends: any[]) => {
                const friendsWithDetails: any[] = [];
                const suggestions: any[] = [];

                const promises = friends.map((friend) => {
                    return new Promise((resolve) => {
                        const friendRef = ref(database, `Students/${friend.friendId}`);
                        onValue(friendRef, (snapshot) => {
                            if (snapshot.exists()) {
                                const friendData = snapshot.val();
                                friendsWithDetails.push({
                                    ...friend,
                                    name: friendData.studentName,
                                });

                                // Tìm bạn của bạn
                                fetchFriendSuggestions(friend.friendId, suggestions);
                            }
                            resolve(null);
                        }, {
                            onlyOnce: true
                        });
                    });
                });

                await Promise.all(promises);

                setMyFriends(friendsWithDetails);
                setSuggestedFriends(suggestions);
                setLoading(false);
            };

            const fetchFriendSuggestions = (friendId: string, suggestions: any[]) => {
                const friendsOfFriendRef = ref(database, `Friends/${friendId}`);

                onValue(friendsOfFriendRef, (snapshot) => {
                    snapshot.forEach((childSnapshot) => {
                        const suggestedFriendId = childSnapshot.key;
                        const status = childSnapshot.val().status;

                        // Kiểm tra nếu không phải bạn của tôi và status = 3 (là bạn bè)
                        if (
                            suggestedFriendId !== currentUserId &&
                            !myFriends.some((friend) => friend.friendId === suggestedFriendId) &&
                            status === 3
                        ) {
                            const suggestedFriendRef = ref(database, `Students/${suggestedFriendId}`);
                            onValue(suggestedFriendRef, (snapshot) => {
                                if (snapshot.exists()) {
                                    const suggestedFriendData = snapshot.val();

                                    // Tránh trùng lặp
                                    if (!suggestions.some((s) => s.friendId === suggestedFriendId)) {
                                        suggestions.push({
                                            friendId: suggestedFriendId,
                                            name: suggestedFriendData.studentName,
                                        });
                                    }
                                }
                            }, { onlyOnce: true });
                        }
                    });
                }, { onlyOnce: true });
            };

            fetchFriends();
        }
    }, [currentUserId]);

    // Lọc danh sách theo tab
    const filteredFriends = selectedTab === 'friends'
        ? myFriends.filter(friend => friend.status === 3)
        : selectedTab === 'requests'
            ? myFriends.filter(friend => friend.status === 2)
            : selectedTab === 'sent'
                ? myFriends.filter(friend => friend.status === 1)
                : suggestedFriends; // Tab Gợi ý kết bạn

    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    return (
        <View>
            {/* Tab lựa chọn */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.button, selectedTab === 'suggestions' && styles.activeButton]}
                        onPress={() => setSelectedTab('suggestions')}>
                        <Text style={[styles.buttonText, selectedTab === 'suggestions' && styles.activeText]}>Gợi ý kết bạn</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, selectedTab === 'requests' && styles.activeButton]}
                        onPress={() => setSelectedTab('requests')}>
                        <Text style={[styles.buttonText, selectedTab === 'requests' && styles.activeText]}>Lời mời kết bạn</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, selectedTab === 'sent' && styles.activeButton]}
                        onPress={() => setSelectedTab('sent')}>
                        <Text style={[styles.buttonText, selectedTab === 'sent' && styles.activeText]}>Lời mời đã gửi</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={[styles.button, selectedTab === 'friends' && styles.activeButton]}
                        onPress={() => setSelectedTab('friends')}>
                        <Text style={[styles.buttonText, selectedTab === 'friends' && styles.activeText]}>Danh sách bạn bè</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Tiêu đề động */}
            <View style={{ flexDirection: 'row', width: '100%', alignItems: 'center', justifyContent: 'space-between', padding: 10 }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold' }}>
                    {selectedTab === 'friends' && 'Danh sách'}
                    {selectedTab === 'requests' && 'Lời mời kết bạn'}
                    {selectedTab === 'sent' && 'Lời mời đã gửi'}
                    {selectedTab === 'suggestions' && 'Gợi ý kết bạn'}
                </Text>
                <TouchableOpacity onPress={() => console.log('Filter clicked')}>
                    <Image source={require('../icons/icon_filter.png')} style={styles.icon} />
                </TouchableOpacity>
            </View>

            {/* Danh sách bạn bè */}
            <FlatList
                data={filteredFriends}
                keyExtractor={(item) => item.friendId}
                renderItem={({ item }) => (
                    <ItemFriend
                        id={item.friendId}
                        onAddFriend={() => console.log("Clicked")}
                    />
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    loaderContainer: {
        flex: 1,
        height: 700,
        justifyContent: 'center',
        alignItems: 'center',
    },
    icon: {
        width: 24,
        height: 24,
    },
    tabContainer: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    button: {
        backgroundColor: '#e2e5e9',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 25,
        marginRight: 10,
        alignItems: 'center',
    },
    activeButton: {
        backgroundColor: '#007BFF',
    },
    buttonText: {
        color: 'black',
        fontSize: 15,
        fontWeight: 'bold',
    },
    activeText: {
        color: 'white',
    }
});

export default ListFriend;
