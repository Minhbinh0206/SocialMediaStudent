import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import database from '@react-native-firebase/database';

interface FriendProfileProps {
    userId: string; // Nhận userId từ props
}

const FriendProfile = ({ userId }: FriendProfileProps) => {
    const [userData, setUserData] = useState<any>(null); // Lưu trữ dữ liệu người dùng
    const [loading, setLoading] = useState(true); // Trạng thái tải dữ liệu
    const navigation = useNavigation();

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
                        const currentUser = studentList.find((student: any) => student.userId === userId);
                        console.log('Found User:', currentUser); // Log người dùng tìm thấy

                        if (currentUser) {
                            setUserData(currentUser); // Lưu thông tin người dùng vào state
                        }
                    }
                    setLoading(false); // Dữ liệu đã được tải
                });
            }
        };

        fetchUserData();
    }, [userId]); // Khi userId thay đổi, useEffect sẽ chạy lại

    if (loading) {
        return (
            <View style={styles.container}>
                <Text>Loading...</Text>
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
                <Text style={styles.bio}>{userData.bio || 'No bio available'}</Text>
            </View>
            <View style={styles.statsContainer}>
                <View style={styles.stat}>
                    <Text style={styles.statNumber}>{userData.postsCount || 0}</Text>
                    <Text style={styles.statLabel}>Friends</Text>
                </View>
                <View style={styles.stat}>
                    <Text style={styles.statNumber}>{userData.followersCount || 0}</Text>
                    <Text style={styles.statLabel}>Followers</Text>
                </View>
                <View style={styles.stat}>
                    <Text style={styles.statNumber}>{userData.followingCount || 0}</Text>
                    <Text style={styles.statLabel}>Following</Text>
                </View>
            </View>
            <View style={styles.postsContainer}>
                <Text style={styles.postsTitle}>Giới thiệu</Text>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
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
    button: {
        backgroundColor: '#007bff',
        marginTop: 15,
        paddingVertical: 10,
        paddingHorizontal: 40,
        borderRadius: 5,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
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
