import React, { useEffect, useState } from 'react';
import { View, Text, Image, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, TextInput, ScrollView } from 'react-native';
import database from '@react-native-firebase/database';
import { useNavigation, useRoute } from '@react-navigation/native';
import HeaderBack from './HeaderBack';
import { getAuth } from 'firebase/auth';
import GroupDetailNotJoin from './GroupDetailNotJoin';
import ListPost from './ListPost';

const GroupDetailDefault: React.FC = () => {
    const route = useRoute();
    const { groupId = "" } = route.params as { groupId?: string };
    const [group, setGroup] = useState<any>(null);
    const [postContent, setPostContent] = useState('');
    const [members, setMembers] = useState<any[]>([]);
    const [isJoined, setIsJoined] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isJoining, setIsJoining] = useState(false);
    const currentUserId = getAuth().currentUser?.uid;
    const [studentName, setStudentName] = useState<string | null>(null);
    const [studentAvatar, setStudentAvatar] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'posts' | 'events'>('posts');
    const [posts, setPosts] = useState<any[]>([]);
    const navigation = useNavigation(); // Khai báo useNavigation
    const [isPressing, setIsPressing] = useState(false); // Trạng thái nhấn nút

    const handleBackPress = () => {
        if (!isPressing) {
            setIsPressing(true);
            navigation.goBack();

            // Đặt lại trạng thái sau một khoảng thời gian để ngừng nhấn liên tục
            setTimeout(() => {
                setIsPressing(false);
            }, 500); // 500ms là khoảng thời gian cho phép nhấn lại
        }
    };

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

    const fetchGroupPosts = async (groupId: string): Promise<any[]> => {
        const postsRef = database().ref(`Posts/${groupId}`);
        const snapshot = await postsRef.once('value');

        if (!snapshot.exists()) return [];

        const groupPosts = snapshot.val();
        const loadedPosts: any[] = [];

        for (const userId in groupPosts) {
            const userPosts = groupPosts[userId];

            for (const postId in userPosts) {
                const post = userPosts[postId];

                loadedPosts.push({
                    postId,
                    userId,
                    groupId,
                    ...post
                });
            }
        }

        // Sắp xếp theo thời gian mới nhất
        loadedPosts.sort((a, b) => Number(b.createAt) - Number(a.createAt));

        return loadedPosts;
    };

    useEffect(() => {
        if (!groupId) return;

        const loadPosts = async () => {
            setLoading(true);
            const groupPosts = await fetchGroupPosts(groupId);
            setPosts(groupPosts);
            setLoading(false);
        };

        loadPosts();
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

    if (!group) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#007bff" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.wrapper}>
            {/* ===== Header có nút back ===== */}
            <HeaderBack namePage={group.groupName}/>

            {/* ===== Ảnh bìa + avatar ===== */}
            <View style={styles.coverWrap}>
                {group.banner && <Image source={{ uri: group.banner }} style={styles.coverImg} />}
                {group.avatar && <Image source={{ uri: group.avatar }} style={styles.coverAvatar} />}
            </View>

            {/* ===== Thông tin nhóm ===== */}
            <View style={styles.infoCard}>
                <Text style={styles.groupNameTxt}>{group.groupName || 'Không có tên'}</Text>
                <Text style={styles.subTxt}>Nhóm mặc định</Text>
            </View>

            {/* ===== TabBar chỉ còn 2 tab ===== */}
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tabItem, activeTab === 'posts' && styles.tabItemActive]}
                    onPress={() => setActiveTab('posts')}
                >
                    <Text style={[styles.tabTxt, activeTab === 'posts' && styles.tabTxtActive]}>Bài viết</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabItem, activeTab === 'events' && styles.tabItemActive]}
                    onPress={() => setActiveTab('events')}
                >
                    <Text style={[styles.tabTxt, activeTab === 'events' && styles.tabTxtActive]}>Sự kiện</Text>
                </TouchableOpacity>
            </View>

            {/* ===== Nội dung theo tab ===== */}
            {activeTab === 'posts' ? (
                <>
                    <Text style={styles.sectionTitle}>Danh sách bài viết</Text>
                    <ListPost posts={posts} loading={loading} />
                </>
            ) : (
                <>
                    <Text style={styles.sectionTitle}>Danh sách sự kiện</Text>
                </>
            )}
        </ScrollView>
    );

};

const styles = StyleSheet.create({
    wrapper: { flex: 1, backgroundColor: '#f1f3f5' },

    /* Header */
    headerBar: {
        height: 56,
        backgroundColor: '#3399FF',
        justifyContent: 'center',
        paddingHorizontal: 12,
    },
    iconBack: { width: 28, height: 28 },

    /* Cover + Avatar */
    coverWrap: { width: '100%', height: 200, backgroundColor: '#ccc' },
    coverImg: { width: '100%', height: '100%' },
    coverAvatar: {
        position: 'absolute',
        bottom: -35,
        left: 16,
        width: 70,
        height: 70,
        zIndex: 9999,
        borderRadius: 35,
        borderWidth: 3,
        borderColor: '#fff',
    },

    /* Info card */
    infoCard: {
        backgroundColor: '#fff',
        paddingTop: 48,           // để lệch xuống vì avatar overlap
        paddingBottom: 16,
        paddingHorizontal: 16,
    },
    groupNameTxt: { fontSize: 20, fontWeight: 'bold' },
    subTxt: { color: '#666', marginTop: 4 },

    /* Tab bar */
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#ececec',
        marginVertical: 5
    },
    tabItem: { flex: 1, alignItems: 'center', paddingVertical: 12 },
    tabItemActive: { borderBottomWidth: 3, borderBottomColor: '#3399FF' },
    tabTxt: { fontSize: 15, color: '#666' },
    tabTxtActive: { color: '#3399FF', fontWeight: '600' },

    /* Post box */
    postBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    postAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
    postInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 14,
    },
    postPlaceholder: { color: '#888' },

    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        backgroundColor: '#fff',
        padding: 20,
        paddingVertical: 15,
        marginBottom: 6,
        paddingHorizontal: 16,
    },
});

export default GroupDetailDefault;
