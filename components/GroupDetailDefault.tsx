import React, { useEffect, useState } from 'react';
import { View, Text, Image, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, TextInput } from 'react-native';
import database from '@react-native-firebase/database';
import { useNavigation, useRoute } from '@react-navigation/native';
import HeaderBack from './HeaderBack';
import { getAuth } from 'firebase/auth';
import GroupDetailNotJoin from './GroupDetailNotJoin';

const GroupDetailDefault: React.FC = () => {
    const route = useRoute();
    const { groupId = "" } = route.params as { groupId?: string };
    const [group, setGroup] = useState<any>(null);
    const [postContent, setPostContent] = useState('');
    const [members, setMembers] = useState<any[]>([]);
    const [isJoined, setIsJoined] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isJoining, setIsJoining] = useState(false);
    const navigation = useNavigation();
    const currentUserId = getAuth().currentUser?.uid;
    const [studentName, setStudentName] = useState<string | null>(null);
    const [studentAvatar, setStudentAvatar] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'posts' | 'events'>('posts');

    useEffect(() => {
        if (!groupId) return;

        const groupRef = database().ref(`/Groups/${groupId}`);

        groupRef.on('value', snapshot => {
            if (snapshot.exists()) {
                const groupData = snapshot.val();
                setGroup(groupData);

                const memberList = groupData.members
                    ? Object.keys(groupData.members).map(id => ({
                        id,
                        name: groupData.members[id].name,
                        avatar: groupData.members[id].avatar
                    }))
                    : [];
                setMembers(memberList);
                setIsJoined(currentUserId ? !!groupData.members?.[currentUserId] : false);
            } else {
                setGroup(null);
            }
            setLoading(false);
        });

        return () => groupRef.off();
    }, [groupId]);

    useEffect(() => {
        if (!currentUserId) return;

        const studentRef = database().ref(`/Users/${currentUserId}`);

        studentRef.once('value').then(snapshot => {
            if (snapshot.exists()) {
                const studentData = snapshot.val();
                setStudentName(studentData.studentName || "Không có tên");
                setStudentAvatar(studentData.avatar || "URL_avatar_mặc_định");
            }
        });
    }, [currentUserId]);

    const handleJoinLeave = () => {
        if (!groupId || isJoining) return;
        setIsJoining(true);
        const memberRef = database().ref(`/Groups/${groupId}/members/${currentUserId}`);

        if (isJoined) {
            memberRef.remove().then(() => {
                setIsJoined(false);
                setMembers(prev => prev.filter(member => member.id !== currentUserId));
            }).finally(() => setIsJoining(false));
        } else {
            const newMember = {
                name: studentName,
                avatar: studentAvatar
            };

            memberRef.set(newMember).then(() => {
                setIsJoined(true);
                setMembers(prev => [...prev, { id: currentUserId, ...newMember }]);
            }).finally(() => setIsJoining(false));
        }
    };

    if (loading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color="#007bff" />
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            <HeaderBack />

            <View style={styles.container}>
                {group.banner && <Image source={{ uri: group.banner }} style={styles.banner} />}
                <View style={styles.groupHeader}>
                    {group.avatar && <Image source={{ uri: group.avatar }} style={styles.avatar} />}
                    <View style={styles.groupInfo}>
                        <Text style={styles.name}>{group.groupName || "Không có tên"}</Text>
                        <Text style={styles.memberCount}>{members.length} thành viên</Text>
                    </View>
                </View>

                {/* Thanh tab */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.buttonTab, activeTab === 'posts' && styles.activeTab]}
                        onPress={() => setActiveTab('posts')}
                    >
                        <Text style={[styles.memberCount, activeTab === 'posts' && styles.activeText]}>Bài viết</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.buttonTab, activeTab === 'events' && styles.activeTab]}
                        onPress={() => setActiveTab('events')}
                    >
                        <Text style={[styles.memberCount, activeTab === 'events' && styles.activeText]}>Sự kiện</Text>
                    </TouchableOpacity>
                </View>

                {/* Nội dung hiển thị theo tab */}
                <View style={styles.contentContainer}>
                    {activeTab === 'posts' ? (
                        <View>
                            <Text style={styles.contentText}>Danh sách bài viết</Text>
                            {/* Thêm danh sách bài viết ở đây */}
                        </View>
                    ) : (
                        <View>
                            <Text style={styles.contentText}>Danh sách sự kiện</Text>
                            {/* Thêm thông tin cá nhân ở đây */}
                        </View>
                    )}
                </View>

            </View>


        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#e2e5e9',
    },
    btnContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end'
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 15,
    },
    tabContainer: {
        flexDirection: 'row',
        padding: 5,
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        marginBottom: 5,
        paddingBottom: 10,
    },
    banner: {
        backgroundColor: '#fff',
        width: '100%',
        height: 200,
        resizeMode: 'cover',
    },
    icon: {
        width: 20,
        height: 20,
    },
    postBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 10,
        paddingHorizontal: 16,
        marginVertical: 5,
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    groupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
    },
    avatar: {
        width: 70,
        height: 70,
        borderRadius: 50,
        marginRight: 15,
    },
    avatarPost: {
        width: 50,
        height: 50,
        borderRadius: 50,
        marginRight: 15,
    },
    groupInfo: {
        flex: 1,
    },
    name: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    activeTab: {
        backgroundColor: '#007bff', // Màu xanh khi tab được chọn
    },
    memberCount: {
        color: '#000',
        fontSize: 16,
    },
    activeText: {
        color: '#fff', // Chữ màu trắng khi tab được chọn
        fontWeight: 'bold',
    },
    button: {
        backgroundColor: '#e2e5e9',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 6,
        alignItems: 'center',
        margin: 10,
    },
    buttonTab: {
        width: '48%',
        backgroundColor: '#e2e5e9',
        paddingVertical: 10,
        paddingHorizontal: 20,
        fontWeight: 'bold',
        fontSize: 20,
        borderRadius: 6,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 5,
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    memberAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
    },
    memberInfo: {
        flex: 1,
    },
    memberText: {
        fontSize: 16,
        fontWeight: '500',
    },
    errorText: {
        fontSize: 18,
        textAlign: 'center',
        color: 'red',
        marginTop: 20,
    },
    contentContainer: {
        backgroundColor: '#fff',
        padding: 16,
    },
    contentText: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
});

export default GroupDetailDefault;
