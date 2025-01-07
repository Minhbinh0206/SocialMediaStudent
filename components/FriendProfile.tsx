import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, TouchableHighlight, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import database from '@react-native-firebase/database';
import { getAuth } from 'firebase/auth';

interface FriendProfileProps {
    userId: string; // Nhận userId từ props
}

const FriendProfile = ({ userId }: FriendProfileProps) => {
    const [userData, setUserData] = useState<any>(null); // Lưu trữ dữ liệu người dùng
    const [loading, setLoading] = useState(true); // Trạng thái tải dữ liệu
    const currentUserId = getAuth().currentUser?.uid
    const [textStatusFriend, setTextStatusFriend] = useState('Theo dõi');
    const [buttonColor, setButtonColor] = useState('#007bff'); // Mặc định màu xanh dương
    const [countFriends, setCountFriends] = useState(0);
    const [countFollowings, setCountFollowings] = useState(0);
    const [countFollowers, setCountFollowers] = useState(0);

    // Lấy thông tin người dùng từ Firebase Database bằng userId
    useEffect(() => {
        const fetchUserData = async () => {
            console.log('User ID passed:', userId); // Log userId nhận được

            if (userId) {
                const studentsRef = database().ref('Students');
                studentsRef.once('value', snapshot => {
                    const studentsData = snapshot.val();

                    if (studentsData) {
                        const studentList = Object.values(studentsData);
                        const userFriend = studentList.find((student: any) => student.userId === userId);
                        console.log('Found User:', userFriend); // Log người dùng tìm thấy

                        if (userFriend) {
                            setUserData(userFriend); // Lưu thông tin người dùng vào state
                        }
                    }
                    setLoading(false); // Dữ liệu đã được tải
                });
            }
        };

        fetchUserData();
    }, [userId]); // Khi userId thay đổi, useEffect sẽ chạy lại

    // Lấy thông tin người dùng từ Firebase Database bằng userId
    useEffect(() => {
        const checkFriendStatus = () => {
            if (userId && currentUserId) {
                const myRef = database().ref(`Friends/${currentUserId}/${userId}`);
                const yourRef = database().ref(`Friends/${userId}/${currentUserId}`);

                myRef.on('value', (mySnapshot) => {
                    yourRef.on('value', (yourSnapshot) => {
                        let myStatus = 0;
                        let yourStatus = 0;

                        if (mySnapshot.exists()) {
                            myStatus = mySnapshot.val().status;
                        } else {
                            myRef.set({ status: 0 });
                        }

                        if (yourSnapshot.exists()) {
                            yourStatus = yourSnapshot.val().status;
                        } else {
                            yourRef.set({ status: 0 });
                        }

                        // Xác định trạng thái và màu sắc
                        if (myStatus === 0 && yourStatus === 0) {
                            setTextStatusFriend('Theo dõi');
                            setButtonColor('#007bff');
                        } else if (myStatus === 1 && yourStatus === 2) {
                            setTextStatusFriend('Đang theo dõi');
                            setButtonColor('#CCCCCC');
                        } else if (myStatus === 2 && yourStatus === 1) {
                            setTextStatusFriend('Theo dõi lại');
                            setButtonColor('#FF3366');
                        } else if (myStatus === 3 && yourStatus === 3) {
                            setTextStatusFriend('Bạn bè');
                            setButtonColor('#00CC00');
                        }
                    });
                });
            }
        };

        checkFriendStatus();

        // Cleanup listener
        return () => {
            const myRef = database().ref(`Friends/${currentUserId}/${userId}`);
            const yourRef = database().ref(`Friends/${userId}/${currentUserId}`);
            myRef.off();
            yourRef.off();
        };
    }, [userId, currentUserId]);

    const handleFollowFriend = async () => {
        if (userId && currentUserId) {
            // Tham chiếu đến đường dẫn của cả hai người dùng
            const myRef = database().ref(`Friends/${currentUserId}/${userId}`);
            const yourRef = database().ref(`Friends/${userId}/${currentUserId}`);

            // Lấy dữ liệu từ Firebase
            const mySnapshot = await myRef.once('value');
            const yourSnapshot = await yourRef.once('value');

            let myStatus = mySnapshot.val().status;

            // Xử lý các trường hợp và log kết quả
            if (myStatus === 0) {
                await myRef.set({ status: 1 });
                await yourRef.set({ status: 2 });

                setTextStatusFriend('Đang theo dõi')
            } else if (myStatus === 1) {
                await myRef.set({ status: 0 });
                await yourRef.set({ status: 0 });

                setTextStatusFriend('Theo dõi')
            } else if (myStatus === 2) {
                await myRef.set({ status: 3 });
                await yourRef.set({ status: 3 });

                setTextStatusFriend('Bạn bè')
            } else if (myStatus === 3) {
                console.log('Comming Soon');
            }
        }
    }

    // Lấy thông tin các số lượng
    useEffect(() => {
        const countNumber = () => {
            if (userId) {
                const yourRef = database().ref(`Friends/${userId}`);

                yourRef.on('value', (yourSnapshot) => {
                    let countFollowers = 0;
                    let countFollowings = 0;
                    let countFriends = 0;

                    if (yourSnapshot.exists()) {
                        const data = yourSnapshot.val();

                        // Lặp qua tất cả trạng thái của người dùng
                        Object.values(data).forEach((item: any) => {
                            if (item.status === 1) {
                                countFollowings++; // Đang theo dõi
                            } else if (item.status === 2) {
                                countFollowers++; // Người theo dõi
                            } else if (item.status === 3) {
                                countFriends++; // Bạn bè
                            }
                        });
                    }

                    // Set state cho từng trạng thái
                    setCountFollowings(countFollowings);
                    setCountFollowers(countFollowers);
                    setCountFriends(countFriends);
                });
            }
        };

        countNumber();

        // Cleanup listener
        return () => {
            const yourRef = database().ref(`Friends/${userId}`);
            yourRef.off();
        };
    }, [userId]);

    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    if (!userData) {
        return (
            <View style={styles.container}>
                <Text>No user data found.</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Image source={{ uri: userData.avatar }} style={styles.profileImage} />
                <Text style={styles.name}>{userData.studentName}</Text>
                <TouchableOpacity onPress={handleFollowFriend}>
                    <Text style={{
                        backgroundColor: buttonColor,
                        marginTop: 15,
                        paddingVertical: 10,
                        paddingHorizontal: 30,
                        borderRadius: 5,
                        color: '#fff',
                        fontSize: 16,
                        fontWeight: 'bold'
                    }}>
                        {textStatusFriend}
                    </Text>
                </TouchableOpacity>

            </View>
            <View style={styles.statsContainer}>
                <View style={styles.stat}>
                    <Text style={styles.statNumber}>{countFriends}</Text>
                    <Text style={styles.statLabel}>Friends</Text>
                </View>
                <View style={styles.stat}>
                    <Text style={styles.statNumber}>{countFollowers}</Text>
                    <Text style={styles.statLabel}>Followers</Text>
                </View>
                <View style={styles.stat}>
                    <Text style={styles.statNumber}>{countFollowings}</Text>
                    <Text style={styles.statLabel}>Following</Text>
                </View>
            </View>

            <View style={styles.postsContainer}>
                <Text style={styles.postsTitle}>Giới thiệu</Text>
                <Text style={styles.bio}>{userData.bio || 'No bio available'}</Text>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    loaderContainer: {
        flex: 1,
        height: 700,
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f8f8f8',
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 10,
    },
    bio: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginTop: 5,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e6e6e6',
    },
    stat: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    statLabel: {
        fontSize: 14,
        color: '#666',
    },
    buttonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
        paddingHorizontal: 20
    },
    postsContainer: {
        padding: 20,
    },
    postsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    post: {
        marginBottom: 20,
    },
    postImage: {
        width: '100%',
        height: 200,
        borderRadius: 10,
    },
    postDescription: {
        fontSize: 16,
        marginTop: 10,
    },
});

export default FriendProfile;
