import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, LayoutAnimation } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import database from '@react-native-firebase/database';
import { getAuth } from 'firebase/auth';
import ListPost from './ListPost';
import { auth } from '../firebaseConfig';
import { getDatabase, ref, set } from 'firebase/database';
import messaging from '@react-native-firebase/messaging';

interface FriendProfileProps {
    userId: string;
}
const FriendProfile = ({ userId }: FriendProfileProps) => {
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const currentUserId = getAuth().currentUser?.uid;
    const [textStatusFriend, setTextStatusFriend] = useState('Theo dõi');
    const [buttonColor, setButtonColor] = useState('#007bff');
    const [countFriends, setCountFriends] = useState(0);
    const [countFollowings, setCountFollowings] = useState(0);
    const [countFollowers, setCountFollowers] = useState(0);
    const [departmentName, setDepartmentName] = useState('');
    const [majorName, setMajorName] = useState('');
    const [courseText, setCourseText] = useState('');
    const [friendPostMark, setFriendPostMark] = useState<any[]>([]);

    useEffect(() => {
        const fetchUserData = async () => {
            if (userId) {
                const studentsRef = database().ref('Users');
                studentsRef.once('value', snapshot => {
                    const studentsData = snapshot.val();
                    if (studentsData) {
                        const studentList = Object.values(studentsData);
                        const userFriend = studentList.find((student: any) => student.userId === userId);
                        if (userFriend) {
                            setUserData(userFriend);
                        }
                    }
                    setLoading(false);
                });
            }
        };
        fetchUserData();
    }, [userId]);

    useEffect(() => {
        if (userId && currentUserId) {
            const myRef = database().ref(`Friends/${currentUserId}/${userId}`);
            const yourRef = database().ref(`Friends/${userId}/${currentUserId}`);

            const onStatusChange = () => {
                myRef.on('value', mySnapshot => {
                    yourRef.on('value', yourSnapshot => {
                        const myStatus = mySnapshot.val()?.status ?? 0;
                        const yourStatus = yourSnapshot.val()?.status ?? 0;

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
            };

            onStatusChange();

            // Cleanup listener khi unmount
            return () => {
                myRef.off();
                yourRef.off();
            };
        }
    }, [userId, currentUserId]);

    useEffect(() => {
        if (!userId) return;

        const postDefaultsRef = database().ref('PostDefaults');

        // Lắng nghe realtime để luôn cập nhật
        const listener = postDefaultsRef.on('value', snap => {
            const allData = snap.val();
            const markedPosts: any[] = [];

            if (allData) {
                Object.entries(allData).forEach(([postId, post]: any) => {
                    // Có thể là mảng hoặc object – xử lý cả hai
                    const mark = post?.postMark?.userIds;
                    const isMarked = Array.isArray(mark)
                        ? mark.includes(userId)
                        : mark && Object.keys(mark).includes(userId);

                    if (isMarked) {
                        markedPosts.push({
                            id: postId,
                            postId,
                            ...post,
                        });
                    }
                });
            }

            // Mới nhất lên đầu
            markedPosts.sort((a, b) => Number(b.createAt) - Number(a.createAt));

            // Hoạt ảnh mượt mà khi thay đổi
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setFriendPostMark(markedPosts);
            setLoading(false);
        });

        // Dọn dẹp listener khi unmount
        return () => postDefaultsRef.off('value', listener);
    }, [currentUserId]);

    const handleFollowFriend = async () => {
        if (!userId || !currentUserId) return;

        const myRef = database().ref(`Friends/${currentUserId}/${userId}`);
        const yourRef = database().ref(`Friends/${userId}/${currentUserId}`);

        const [mySnap, yourSnap] = await Promise.all([
            myRef.once('value'),
            yourRef.once('value'),
        ]);

        const myStatus = mySnap.val()?.status ?? 0;

        // ========== 1. Gửi lời mời kết bạn ==========
        if (myStatus === 0) {
            await database().ref().update({
                [`Friends/${currentUserId}/${userId}/status`]: 1,
                [`Friends/${userId}/${currentUserId}/status`]: 2,
            });

            setTextStatusFriend('Đang theo dõi');
            setButtonColor('#CCCCCC');
        }

        // ========== 2. Hủy lời mời ==========
        else if (myStatus === 1) {
            await database().ref().update({
                [`Friends/${currentUserId}/${userId}/status`]: 0,
                [`Friends/${userId}/${currentUserId}/status`]: 0,
            });

            setTextStatusFriend('Theo dõi');
            setButtonColor('#007bff');
        }

        // ========== 3. Đồng ý kết bạn ==========
        else if (myStatus === 2) {
            await database().ref().update({
                [`Friends/${currentUserId}/${userId}/status`]: 3,
                [`Friends/${userId}/${currentUserId}/status`]: 3,
            });

            setTextStatusFriend('Bạn bè');
            setButtonColor('#00CC00');
        }

        // ========== 4. Đã là bạn bè ==========
        else if (myStatus === 3) {
            console.log('Đã là bạn bè');
        }
    };


    useEffect(() => {
        if (!userData) return;

        const { departmentId, majorId, studentNumber } = userData;

        if (departmentId) {
            database()
                .ref(`Departments/${departmentId}`)
                .once('value')
                .then(snap => {
                    const dep = snap.val();
                    setDepartmentName(dep?.departmentName ?? '');
                });
        }

        if (departmentId && majorId) {
            database()
                .ref(`Departments/${departmentId}/majors/${majorId}`)
                .once('value')
                .then(snap => {
                    const maj = snap.val();
                    setMajorName(maj?.majorName ?? '');
                });
        }

        if (studentNumber) {
            const course = String(studentNumber).slice(0, 2); // VD: “21”
            setCourseText(`Sinh viên khóa ${course}`);
        }
    }, [userData]);

    useEffect(() => {
        const yourRef = database().ref(`Friends/${userId}`);
        yourRef.on('value', (snapshot) => {
            let followers = 0, followings = 0, friends = 0;
            const data = snapshot.val();
            if (data) {
                Object.values(data).forEach((item: any) => {
                    if (item.status === 1) followings++;
                    else if (item.status === 2) followers++;
                    else if (item.status === 3) friends++;
                });
            }
            setCountFollowers(followers);
            setCountFollowings(followings);
            setCountFriends(friends);
        });

        return () => yourRef.off();
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
                <Text>Không tìm thấy người dùng.</Text>
            </View>
        );
    }

    const iconPaths = {
        department: require('../icons/icon_department.png'),
        major: require('../icons/icon_major.png'),
        course: require('../icons/icon_course.png'),
    };

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
            </View>

            <View style={styles.introContainer}>
                {!!departmentName && (
                    <View style={styles.introRow}>
                        <Image source={iconPaths.department} style={styles.icon} />
                        <Text style={styles.introText}>Khoa: {departmentName}</Text>
                    </View>
                )}
                {!!majorName && (
                    <View style={styles.introRow}>
                        <Image source={iconPaths.major} style={styles.icon} />
                        <Text style={styles.introText}>Ngành: {majorName}</Text>
                    </View>
                )}
                {!!courseText && (
                    <View style={styles.introRow}>
                        <Image source={iconPaths.course} style={styles.icon} />
                        <Text style={styles.introText}>{courseText}</Text>
                    </View>
                )}
            </View>

            <View style={styles.postsContainer}>
                <Text style={styles.postsTitle}>Đăng lại</Text>
            </View>

            <View style={{ paddingHorizontal: 15 }}>
                <ListPost posts={friendPostMark} loading={loading} />
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    iconWrapper: {
        marginRight: 8,
    },
    introContainer: {
        paddingHorizontal: 15,
        gap: 8,
        marginBottom: 15
    },
    introRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        width: 30,
        height: 30,
        marginRight: 10,
    },
    introText: {
        fontSize: 16,
        color: '#333',
    },
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
    postsContainer: {
        padding: 10,
        paddingHorizontal: 20,
        paddingBottom: 5,
        borderColor: '#ccc',
        borderBottomWidth: 1,
        borderTopWidth: 1,
        marginBottom: 10
    },
    postsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
});

export default FriendProfile;
