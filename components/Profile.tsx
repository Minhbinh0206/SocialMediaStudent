import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, LayoutAnimation } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import database from '@react-native-firebase/database';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../type';
import ListPost from './ListPost';

const Profile = () => {
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [myPostMark, setMyPostMark] = useState<any[]>([]);
    const currentUserId = getAuth().currentUser?.uid
    const [countFriends, setCountFriends] = useState(0);
    const [countFollowings, setCountFollowings] = useState(0);
    const [countFollowers, setCountFollowers] = useState(0);
    const [departmentName, setDepartmentName] = useState('');
    const [majorName, setMajorName] = useState('');
    const [courseText, setCourseText] = useState('');

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
        const fetchUserData = async () => {
            const userId = getAuth().currentUser?.uid; // Lấy CurrentUserId từ Firebase Auth
            console.log('Current User ID:', userId); // Log UserID

            if (userId) {
                const studentsRef = database().ref('Users');
                studentsRef.once('value', snapshot => {
                    const studentsData = snapshot.val();

                    if (studentsData) {
                        const studentList = Object.values(studentsData);
                        const currentUser = studentList.find((student: any) => student.userId === userId);
                        console.log('Found Current User:', currentUser); // Log người dùng tìm thấy

                        if (currentUser) {
                            setUserData(currentUser); // Lưu thông tin người dùng vào state
                        }
                    }
                    setLoading(false); // Dữ liệu đã được tải
                });
            }
        };

        fetchUserData();
    }, []);

    // Lấy thông tin các số lượng
    useEffect(() => {
        const countNumber = () => {
            if (currentUserId) {
                const yourRef = database().ref(`Friends/${currentUserId}`);

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
            const yourRef = database().ref(`Friends/${currentUserId}`);
            yourRef.off();
        };
    }, [currentUserId]);

    useEffect(() => {
        if (!currentUserId) return;

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
                        ? mark.includes(currentUserId)
                        : mark && Object.keys(mark).includes(currentUserId);

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
            setMyPostMark(markedPosts);
            setLoading(false);
        });

        // Dọn dẹp listener khi unmount
        return () => postDefaultsRef.off('value', listener);
    }, [currentUserId]);

    const iconPaths = {
        department: require('../icons/icon_department.png'),
        major: require('../icons/icon_major.png'),
        course: require('../icons/icon_course.png'),
    };

    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Image source={{ uri: userData.avatar }} style={styles.profileImage} />
                <Text style={styles.name}>{userData.studentName}</Text>
                <Text style={styles.bio}>{userData.studentNumber}</Text>
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
                <ListPost posts={myPostMark} loading={loading} />
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
    buttonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
    },
    button: {
        backgroundColor: '#007bff',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
    },
    postsContainer: {
        padding: 10,
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

export default Profile;
