import React, { useState, useEffect } from 'react';
import { View, FlatList, ActivityIndicator, StyleSheet, Dimensions, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { database } from '../firebaseConfig';
import { ref, onValue } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import ItemFriend from './ItemFriend';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../type';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const ListFriend: React.FC = () => {
    const [myFriends, setMyFriends] = useState<any[]>([]);
    const [suggestedFriends, setSuggestedFriends] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTab, setSelectedTab] = useState('suggestions');
    const [showPopup, setShowPopup] = useState(false);  // Trạng thái popup
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');  // Trạng thái sắp xếp

    const currentUserId = getAuth().currentUser?.uid;
    const navigation = useNavigation<NavigationProp>();

    useEffect(() => {
        if (currentUserId) {
            const fetchFriends = async () => {
                const friendsRef = ref(database, `Friends/${currentUserId}`);
                
                onValue(friendsRef, (snapshot) => {
                    const friends: any[] = [];
            
                    snapshot.forEach((childSnapshot) => {
                        const friendId = childSnapshot.key;
                        const status = childSnapshot.val().status;
            
                        friends.push({ friendId, status });
                    });
            
                    fetchFriendDetails(friends);
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
            
                        if (
                            suggestedFriendId !== currentUserId &&
                            !myFriends.some((friend) => friend.friendId === suggestedFriendId) &&
                            status === 3
                        ) {
                            const suggestedFriendRef = ref(database, `Students/${suggestedFriendId}`);
                            onValue(suggestedFriendRef, (snapshot) => {
                                if (snapshot.exists()) {
                                    const suggestedFriendData = snapshot.val();
            
                                    if (!suggestions.some((s) => s.friendId === suggestedFriendId)) {
                                        suggestions.push({
                                            friendId: suggestedFriendId,
                                            name: suggestedFriendData.studentName,
                                        });
                                    }
                                }
                            });
                        }
                    });
            
                    setSuggestedFriends(suggestions);
                });
            };

            fetchFriends();
        }
    }, [currentUserId]);

    const filteredFriends = selectedTab === 'friends'
        ? myFriends.filter(friend => friend.status === 3)
        : selectedTab === 'requests'
            ? myFriends.filter(friend => friend.status === 2)
            : selectedTab === 'sent'
                ? myFriends.filter(friend => friend.status === 1)
                : suggestedFriends;

    // Hàm sắp xếp theo chữ cái đầu tiên của tên
    const sortFriends = (friends: any[]) => {
        return friends.sort((a, b) => {
            const nameA = a.name[0].toUpperCase();
            const nameB = b.name[0].toUpperCase();
            
            if (sortOrder === 'asc') {
                return nameA < nameB ? -1 : 1;
            } else {
                return nameA > nameB ? -1 : 1;
            }
        });
    };

    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    const sortedFriends = sortFriends(filteredFriends);  // Sắp xếp danh sách bạn bè theo lựa chọn

    return (
        <View>
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

            <View style={{ flexDirection: 'row', width: '100%', alignItems: 'center', justifyContent: 'space-between', padding: 10 }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold' }}>
                    {selectedTab === 'friends' && 'Danh sách'}
                    {selectedTab === 'requests' && 'Lời mời kết bạn'}
                    {selectedTab === 'sent' && 'Lời mời đã gửi'}
                    {selectedTab === 'suggestions' && 'Gợi ý kết bạn'}
                </Text>
                <TouchableOpacity onPress={() => setShowPopup(!showPopup)}>
                    <Image source={require('../icons/icon_filter.png')} style={styles.icon} />
                </TouchableOpacity>
            </View>

            {/* Popup sắp xếp */}
            {showPopup && (
                <View style={styles.popup}>
                    <TouchableOpacity onPress={() => { setSortOrder('asc'); setShowPopup(false); }}>
                        <Text style={styles.popupText}>Theo chữ cái từ A - Z</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setSortOrder('desc'); setShowPopup(false); }}>
                        <Text style={styles.popupText}>Theo chữ cái từ Z - A</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Kiểm tra nếu danh sách rỗng */}
            {sortedFriends.length === 0 ? (
                <View style={styles.emptyListContainer}>
                    <Text style={styles.emptyListText}>Danh sách rỗng</Text>
                </View>
            ) : (
                <FlatList
                    data={sortedFriends}
                    keyExtractor={(item) => item.friendId}
                    renderItem={({ item }) => (
                        <ItemFriend
                            id={item.friendId}
                            onCheckFriend={(() => navigation.navigate('Friend', { userId: item.friendId }))}
                        />
                    )}
                />
            )}
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
    },
    popup: {
        position: 'absolute',
        top: 85,
        right: 10,
        backgroundColor: 'white',
        borderRadius: 8,
        shadowColor: 'black',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        padding: 10,
        width: 135,
        zIndex: 10,
    },
    popupText: {
        fontSize: 16,
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e5e9',
    },
    emptyListContainer: {
        height: 500,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    emptyListText: {
        fontSize: 18,
        color: '#999',
        fontWeight: 'bold',
        fontStyle: 'italic',
        textAlign: 'center',
    },
});

export default ListFriend;
