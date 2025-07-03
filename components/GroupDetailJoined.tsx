import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Image, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, TextInput, ScrollView, LayoutAnimation, Modal, Alert, UIManager, findNodeHandle, TouchableWithoutFeedback, Dimensions } from 'react-native';
import database from '@react-native-firebase/database';
import { NavigationProp, useNavigation, useRoute } from '@react-navigation/native';
import HeaderBack from './HeaderBack';
import { getAuth } from 'firebase/auth';
import { launchImageLibrary, Asset } from 'react-native-image-picker';
import GroupDetailNotJoin from './GroupDetailNotJoin';
import uuid from 'react-native-uuid';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import ListPost from './ListPost';
import ItemPostApprove from './ItemPostApprove';
import { getDatabase, off, onValue, ref as dbRef, update, remove, set } from 'firebase/database';
import ItemPostStatus from './ItemPostStatus';
import { RootStackParamList } from '../type';

type Member = {
    id: string;
    name: string;
    avatar: string;
    role?: string;
};

const DEFAULT_QUESTIONS = [
    'Mục đích của bạn khi tham gia nhóm là gì?',
    'Bạn có tuân thủ nội quy của nhóm không?',
    'Bạn đã tham gia nhóm tương tự trước đây chưa?',
    'Bạn mong muốn điều gì từ nhóm này?',
    'Bạn có kinh nghiệm gì liên quan đến chủ đề của nhóm?',
    'Bạn sẽ đóng góp như thế nào cho nhóm?',
    'Bạn có sẵn sàng giúp đỡ thành viên khác không?',
    'Bạn có đồng ý với các nguyên tắc thảo luận của nhóm không?',
    'Bạn đã từng vi phạm quy định của nhóm nào trước đây không?',
    'Bạn mong muốn nhóm tổ chức những hoạt động gì?',
];

const GroupDetailJoined: React.FC = () => {
    const route = useRoute();
    const [posts, setPosts] = useState<any[]>([]);
    const { groupId = "" } = route.params as { groupId?: string };
    const [group, setGroup] = useState<any>(null);
    const [adminId, setAdminId] = useState<string | null>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [isJoined, setIsJoined] = useState(false);
    const [loading, setLoading] = useState(true);
    const [images, setImages] = useState<Asset[]>([]);
    const [postContent, setPostContent] = useState<string>('');
    const [isJoining, setIsJoining] = useState(false);
    const navigation = useNavigation<NavigationProp<RootStackParamList>>();
    const currentUserId = getAuth().currentUser?.uid;
    const [studentName, setStudentName] = useState<string>('');
    const [studentAvatar, setStudentAvatar] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'posts' | 'me' | 'manager' | 'members'>('posts');
    const [selectedTab, setSelectedTab] = useState('members');
    const [postModalVisible, setPostModalVisible] = useState(false);
    const [waitingPosts, setWaitingPosts] = useState<any[]>([]);
    const [myPosts, setMyPosts] = useState<any[]>([]);
    const openPostModal = () => setPostModalVisible(true);
    const closePostModal = () => setPostModalVisible(false);
    const [uploading, setUploading] = useState(false);
    const storage = getStorage();
    const [search, setSearch] = useState('');
    const [menuVisible, setMenuVisible] = useState(false);
    const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const SCREEN_WIDTH = Dimensions.get('window').width;
    const POPUP_WIDTH = 180;
    const [myRole, setMyRole] = useState<string | null>(null);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [avatar, setAvatar] = useState<string>('');
    const [banner, setBanner] = useState<string>('');
    const [groupName, setGroupName] = useState<string>('');
    const [isPrivate, setPrivate] = useState<boolean>(false);
    const [question, setQuestion] = useState<string>('');

    const moreRefs = useRef<{ [key: string]: View | null }>({});

    const openEditGroup = () => setEditModalVisible(true);
    const closeEditGroup = () => { setEditModalVisible(false) };

    const openMenu = (id: string) => {
        const ref = moreRefs.current[id];
        if (ref) {
            ref.measureInWindow((x: number, y: number) => {
                let adjustedX = x;

                if (x + POPUP_WIDTH > SCREEN_WIDTH) {
                    adjustedX = SCREEN_WIDTH - POPUP_WIDTH - 8;
                }

                setMenuPos({ x: adjustedX, y });
                setMenuVisible(true);
            });
        }
    };

    const closeMenu = () => {
        setMenuVisible(false);
        setSelectedMember(null);
    };

    const swapQuestion = () => {
        let newQ;
        do {
            newQ = DEFAULT_QUESTIONS[Math.floor(Math.random() * DEFAULT_QUESTIONS.length)];
        } while (newQ === question);
        setQuestion(newQ);
    };

    const uploadImage = async (uri: string, pathInBucket: string) => {
        const response = await fetch(uri);
        const blob = await response.blob();
        const storageRef = ref(storage, pathInBucket);
        await uploadBytes(storageRef, blob);
        return getDownloadURL(storageRef);
    };

    const needUpload = (pickedUri: string | null, currentUrl: string | null) => {
        if (!pickedUri) return false;

        if (pickedUri.startsWith('http')) return false;

        return pickedUri !== currentUrl;
    };


    const handleSaveGroupInfo = async () => {
        let avatarUrl = group.avatar || '';
        let bannerUrl = group.banner || '';

        if (group.private) {
            if (question.trim() === '') {
                Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ dữ liệu')
                return
            }
        }

        if (groupName.trim() === '') {
            Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ dữ liệu')
            return
        }

        try {
            // ◼ Upload avatar nếu cần
            if (needUpload(avatar, group.avatar)) {
                avatarUrl = await uploadImage(
                    avatar!,
                    `Group/avatar/${groupId}.jpg`
                );
            }

            // ◼ Upload banner nếu cần
            if (needUpload(banner, group.banner)) {
                bannerUrl = await uploadImage(
                    banner!,
                    `Group/banner/${groupId}.jpg`
                );
            }

            // 3. Cập nhật Firebase DB
            await database().ref(`/Groups/${groupId}`).update({
                avatar: avatarUrl,
                banner: bannerUrl,
                groupName,
                private: isPrivate,
                question: isPrivate ? question : null,
            });

            // 4. Cập nhật UI
            setGroup((prev: any) => ({
                ...prev,
                avatar: avatarUrl,
                banner: bannerUrl,
                groupName,
                private: isPrivate,
                question: isPrivate ? question : null,
            }));

            setEditModalVisible(false);
        } catch (err) {
            console.error('Lỗi khi cập nhật group:', err);
            // TODO: thông báo lỗi UI
        }
    };

    // Danh sách lọc theo từ khoá
    const filteredMembers = useMemo(() => {
        if (!search.trim()) return members;
        const keyword = search.trim().toLowerCase();
        return members.filter(m => (m.name || '').toLowerCase().includes(keyword));
    }, [members, search]);


    useEffect(() => {
        if (!groupId) return;

        const groupRef = database().ref(`/Groups/${groupId}`);

        groupRef.on('value', snapshot => {
            if (snapshot.exists()) {
                const groupData = snapshot.val();
                setGroup(groupData);
                setAdminId(groupData.adminId);
                setAvatar(groupData.avatar);
                setBanner(groupData.banner);
                setGroupName(groupData.groupName);
                setPrivate(groupData.private);
                if (isPrivate) {
                    setQuestion(groupData.question)
                }

                const memberList = groupData.members
                    ? Object.keys(groupData.members).map(id => ({
                        id,
                        name: groupData.members[id].name,
                        avatar: groupData.members[id].avatar,
                        role: groupData.members[id].role || groupData.members[id].position || 'Thành viên'
                    }))
                    : [];

                const requestList = groupData.requests
                    ? Object.keys(groupData.requests).map(id => ({
                        id,
                        name: groupData.requests[id].name,
                        avatar: groupData.requests[id].avatar,
                        answer: groupData.requests[id].answer
                    }))
                    : [];
                setRequests(requestList);
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

    const handleAccept = (id: string) => {
        console.log("Duyệt yêu cầu:", id);

        const memberRef = database().ref(`/Groups/${groupId}/members/${id}`);
        const requestRef = database().ref(`/Groups/${groupId}/requests/${id}`);

        requestRef.once('value').then(snapshot => {
            const requestData = snapshot.val();

            if (!requestData) {
                console.error("Không tìm thấy dữ liệu yêu cầu!");
                return;
            }

            // Tạo dữ liệu mới cho member, đổi answer thành position = "Thành viên"
            const newMemberData = {
                name: requestData.name,
                avatar: requestData.avatar,
                role: "Thành viên", // Gán giá trị cố định
            };

            // Thêm vào danh sách members
            memberRef.set(newMemberData).then(() => {
                setMembers(prev => [...prev, { id, ...newMemberData }]);

                // Xóa request sau khi duyệt
                requestRef.remove().then(() => {
                    setRequests(prev => prev.filter(req => req.id !== id));
                });
            });
        }).catch(error => console.error("Lỗi khi duyệt yêu cầu:", error));
    };

    const handleReject = (id: string) => {
        console.log("Từ chối yêu cầu:", id);

        const requestRef = database().ref(`/Groups/${groupId}/requests/${id}`);

        requestRef.remove().then(() => {
            // Cập nhật danh sách requests trên state
            setRequests(prev => prev.filter(req => req.id !== id));
        }).catch(error => {
            console.error("Lỗi khi từ chối yêu cầu:", error);
        });
    };

    const handleApprovePost = async (userId: string, postId: string) => {
        try {
            await database()
                .ref(`/Posts/${groupId}/${userId}/${postId}/status`)
                .set(1);

            await database()
                .ref(`/Posts/${groupId}/${userId}/${postId}/createAt`)
                .set(Date.now());
        } catch (err) {
            console.error('Lỗi duyệt bài:', err);
        }
    };

    const handleRejectPost = async (userId: string, postId: string) => {
        try {
            await database()
                .ref(`/Posts/${groupId}/${userId}/${postId}/status`)
                .set(2);
        } catch (err) {
            console.error('Lỗi duyệt bài:', err);
        }
    };

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
                avatar: studentAvatar,
                role: 'Thành viên'
            };

            memberRef.set(newMember).then(() => {
                setIsJoined(true);
                setMembers(prev => [...prev, { id: currentUserId, ...newMember }]);
            }).finally(() => setIsJoining(false));
        }
    };

    const handleViewProfile = (userId: string) => {
        closeMenu();
        navigation.navigate('FriendScreen', { userId: userId });
    };

    const handlePickAvatar = async () => {
        const result = await launchImageLibrary({ mediaType: 'photo' });
        if (!result.didCancel && result.assets?.[0] && result.assets[0].uri) {
            setAvatar(result.assets[0].uri);
        }
    };

    const handlePickBanner = async () => {
        const result = await launchImageLibrary({ mediaType: 'photo' });
        if (!result.didCancel && result.assets?.[0]) {
            setBanner(result.assets[0].uri ?? '');
        }
    };

    const handleSetCollaborator = async (groupId: string, userId: string) => {
        try {
            await database()
                .ref(`/Groups/${groupId}/members/${userId}/role`)
                .set('Cộng tác viên');

            // Nếu đổi vai trò cho chính mình → cập nhật lại UI
            if (userId === currentUserId) {
                const role = await fetchRoleMember(groupId, userId);
                setMyRole(role); // Cập nhật lại UI
            }

            closeMenu();
        } catch (error) {
            console.error('Lỗi cập nhật vai trò:', error);
        }
    };

    const handleCancelCollaborator = async (groupId: string, userId: string) => {
        try {
            await database()
                .ref(`/Groups/${groupId}/members/${userId}/role`)
                .set('Thành viên');

            // Nếu đổi vai trò cho chính mình → cập nhật lại UI
            if (userId === currentUserId) {
                const role = await fetchRoleMember(groupId, userId);
                setMyRole(role); // Cập nhật lại UI
            }

            closeMenu();
        } catch (error) {
            console.error('Lỗi cập nhật vai trò:', error);
        }
    };

    const handleRemoveMember = (groupId: string, userId: string) => {
        const db = getDatabase();
        closeMenu();
        const memberRef = dbRef(db, `Groups/${groupId}/members/${userId}`);
        remove(memberRef);
    };

    const fetchRoleMember = async (groupId: string, userId: string): Promise<string | null> => {
        try {
            const snapshot = await database()
                .ref(`/Groups/${groupId}/members/${userId}/role`)
                .once('value');

            const role = snapshot.val();

            // Nếu không có role thì fallback là 'Thành viên'
            return role || 'Thành viên';
        } catch (error) {
            console.error('Lỗi khi fetch role member:', error);
            return null;
        }
    };

    useEffect(() => {
        if (!groupId || !currentUserId) return;

        const roleRef = database().ref(`/Groups/${groupId}/members/${currentUserId}/role`);

        const listener = roleRef.on('value', snapshot => {
            const role = snapshot.val();
            setMyRole(role || 'Thành viên');
        });

        return () => roleRef.off('value', listener);
    }, [groupId, currentUserId]);

    useEffect(() => {
        if (!groupId || !currentUserId) return;

        setLoading(true);

        const db = getDatabase();
        const postsRef = dbRef(db, `Posts/${groupId}`);

        const unsubscribe = onValue(postsRef, snap => {
            const allPosts = snap.val() || {};
            const posts: any[] = [];
            const waiting: any[] = [];
            const my: any[] = [];

            Object.entries(allPosts).forEach(([userId, userPosts]: any) => {
                Object.entries(userPosts).forEach(([postId, post]: any) => {
                    const normalized = { ...post, postId, userId, groupId };

                    if (post.status === 1) {
                        posts.push(normalized);
                    } else if (post.status === 0) {
                        waiting.push(normalized);
                    }

                    // 👤 Nếu là bài viết của chính mình
                    if (userId === currentUserId) {
                        my.push(normalized);
                    }
                });
            });

            posts.sort((a, b) => b.createAt - a.createAt);
            waiting.sort((a, b) => b.createAt - a.createAt);
            my.sort((a, b) => b.createAt - a.createAt);

            setPosts(posts);
            setWaitingPosts(waiting);
            setMyPosts(my);
            setLoading(false);
        });

        return () => off(postsRef, 'value', unsubscribe);
    }, [groupId, currentUserId, myRole]);

    const pickImages = () => {
        launchImageLibrary(
            {
                mediaType: 'photo',
                selectionLimit: 10,        // 0 = không giới hạn, 1 = đơn, >1 = tối đa
                includeBase64: false,
                quality: 0.8,
            },
            res => {
                if (res.didCancel) return;
                if (res.errorCode) {
                    console.warn('ImagePicker error:', res.errorMessage);
                    return;
                }
                if (res.assets?.length) {
                    // Gộp vào mảng hiện tại (loại trùng bằng uri)
                    setImages(prev => {
                        const currentUris = prev.map(i => i.uri);
                        const newOnes = res.assets!.filter(a => !currentUris.includes(a.uri!));
                        return [...prev, ...newOnes];
                    });
                }
            },
        );
    };

    const handleTabChange = (tab: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSelectedTab(tab);
    };

    const handlePostSubmit = async () => {
        try {
            if (!postContent.trim()) return;
            const user = getAuth().currentUser;
            if (!user || !group) return;

            setUploading(true);                         // 🔵 bắt đầu loading

            const userId = user.uid;
            const postId = uuid.v4().toString();
            const imageUrls: string[] = [];

            for (const img of images) {
                if (!img.uri) continue;
                const fileName = uuid.v4();
                const bucketPath = `PostImages/${fileName}`;
                const url = await uploadImage(img.uri, bucketPath);
                imageUrls.push(url);
            }

            const postData = {
                content: postContent,
                createAt: Date.now(),
                groupId,
                postId,
                postImage: imageUrls,
                postLike: 0,
                status: userId === group.adminId ? 1 : 0,
                userId,
            };

            await database().ref(`Posts/${groupId}/${userId}/${postId}`).set(postData);

            // ✅ reset
            setPostContent('');
            setImages([]);
            closePostModal();
            Alert.alert('Thông báo', 'Đăng bài thành công');
        } catch (err: any) {
            console.error('Lỗi đăng bài:', err);
            Alert.alert('Lỗi', 'Không thể đăng bài, hãy thử lại!');
        } finally {
            setUploading(false);                        // 🔵 kết thúc loading
        }
    };

    if (!isJoined) {
        return <GroupDetailNotJoin groupId={groupId} />;
    }

    return (
        <ScrollView style={styles.wrapper} >
            <HeaderBack namePage={group.groupName}/>

            {/* Ảnh bìa */}
            <View style={styles.coverContainer}>
                {group.banner && <Image source={{ uri: group.banner }} style={styles.coverImg} />}
                {group.avatar && <Image source={{ uri: group.avatar }} style={styles.coverAvatar} />}
            </View>

            {/* Thông tin nhóm */}
            <View style={styles.infoCard}>
                <Text style={styles.groupNameTxt}>{group.groupName || 'Không có tên'}</Text>
                <Text style={styles.subTxt}>
                    {group.private ? "Nhóm riêng tư" : "Nhóm công khai"} · {members.length} thành viên
                </Text>

                {/* Nút hành động */}
                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => {
                        if (adminId === currentUserId) {
                            openEditGroup();
                        } else {
                            // Popup xác nhận rời nhóm
                            Alert.alert(
                                'Xác nhận',
                                'Bạn có chắc chắn muốn rời khỏi nhóm này không?',
                                [
                                    { text: 'Hủy', style: 'cancel' },
                                    {
                                        text: 'Rời nhóm',
                                        style: 'destructive',
                                        onPress: handleJoinLeave, // Gọi hàm rời nhóm
                                    },
                                ]
                            );
                        }
                    }}
                >
                    <Image
                        source={
                            adminId === currentUserId
                                ? require('../icons/icon_edit.png')
                                : require('../icons/icon_out_group.png')
                        }
                        style={styles.actionIcon}
                    />
                </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tabItem, activeTab === 'posts' && styles.tabItemActive]}
                    onPress={() => setActiveTab('posts')}
                >
                    <Text style={[styles.tabTxt, activeTab === 'posts' && styles.tabTxtActive]}>
                        Bài viết
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabItem, activeTab === 'members' && styles.tabItemActive]}
                    onPress={() => setActiveTab('members')}
                >
                    <Text style={[styles.tabTxt, activeTab === 'members' && styles.tabTxtActive]}>
                        Thành viên
                    </Text>
                </TouchableOpacity>

                {myRole === 'Quản trị viên' || myRole === 'Cộng tác viên' ? (
                    <TouchableOpacity
                        style={[styles.tabItem, activeTab === 'manager' && styles.tabItemActive]}
                        onPress={() => setActiveTab('manager')}
                    >
                        <Text style={[styles.tabTxt, activeTab === 'manager' && styles.tabTxtActive]}>
                            Quản lý
                        </Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[styles.tabItem, activeTab === 'me' && styles.tabItemActive]}
                        onPress={() => setActiveTab('me')}
                    >
                        <Text style={[styles.tabTxt, activeTab === 'me' && styles.tabTxtActive]}>Tôi</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Nội dung hiển thị theo tab */}
            {myRole === 'Quản trị viên' || myRole === 'Cộng tác viên' ? (
                activeTab === 'posts' ? (
                    <>
                        {/* Ô viết bài */}
                        <View style={styles.postBox}>
                            <Image source={{ uri: studentAvatar ?? undefined }} style={styles.postAvatar} />
                            <TouchableOpacity style={styles.postInput} onPress={openPostModal}>
                                <Text style={styles.postPlaceholder}>Bạn đang nghĩ gì?</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.contentContainer}>
                            <Text style={styles.contentText}>Danh sách bài viết</Text>
                        </View>
                        <View style={{ padding: 10 }}>
                            <ListPost posts={posts} />
                        </View>
                    </>
                ) : activeTab === 'members' ? (
                    <>
                        {/* Ô tìm kiếm */}
                        <View style={{ paddingHorizontal: 10, backgroundColor: '#fff', marginVertical: 5 }}>
                            <View style={styles.searchBox}>
                                <Image
                                    source={require('../icons/icon_search_black.png')}
                                    style={styles.searchIcon}
                                />
                                <TextInput
                                    placeholder="Nhập tên thành viên cần tìm..."
                                    value={search}
                                    onChangeText={setSearch}
                                    style={styles.searchInput}
                                    placeholderTextColor="#555"
                                />
                            </View>
                        </View>

                        <ScrollView style={{ maxHeight: 500 }}>
                            {filteredMembers.length === 0 ? (
                                <Text style={styles.emptyText}>Không tìm thấy thành viên</Text>
                            ) : (
                                filteredMembers.map((item) => (
                                    <View key={item.id} style={styles.memberItem}>
                                        <Image source={{ uri: item.avatar }} style={styles.memberAvatar} />
                                        <View style={styles.memberInfo}>
                                            <Text style={styles.memberText}>{item.name}</Text>
                                            <Text style={styles.positionText}>{item.role || 'Không xác định'}</Text>
                                        </View>

                                        {item.id !== currentUserId && (
                                            <TouchableOpacity
                                                ref={(ref) => (moreRefs.current[item.id] = ref)}
                                                onPress={() => {
                                                    setSelectedMember(item);
                                                    openMenu(item.id);
                                                }}
                                            >
                                                <Image source={require('../icons/icon_more.png')} style={styles.searchIcon} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ))
                            )}
                        </ScrollView>

                        {myRole === 'Quản trị viên' ? (
                            <Modal
                                transparent
                                visible={menuVisible}
                                animationType="fade"
                                onRequestClose={closeMenu}
                            >
                                <TouchableWithoutFeedback onPress={closeMenu}>
                                    <View style={styles.backdrop} />
                                </TouchableWithoutFeedback>

                                {selectedMember && (
                                    <View style={[styles.popup, { top: menuPos.y, left: menuPos.x }]}>
                                        <TouchableOpacity
                                            style={styles.popupItem}
                                            onPress={() => handleViewProfile(selectedMember.id)}
                                        >
                                            <Text style={styles.popupText}>Xem thông tin</Text>
                                        </TouchableOpacity>

                                        {selectedMember.role === 'Cộng tác viên' ? (
                                            <TouchableOpacity
                                                style={styles.popupItem}
                                                onPress={() => {
                                                    Alert.alert(
                                                        'Xác nhận',
                                                        `Bạn muốn bãi bỏ quyền Cộng tác viên của ${selectedMember.name}?`,
                                                        [
                                                            { text: 'Hủy', style: 'cancel' },
                                                            {
                                                                text: 'Bãi bỏ',
                                                                style: 'destructive',
                                                                onPress: () => handleCancelCollaborator(groupId, selectedMember.id),
                                                            },
                                                        ]
                                                    );
                                                }}
                                            >
                                                <Text style={styles.popupText}>Bãi bỏ Cộng tác viên</Text>
                                            </TouchableOpacity>
                                        ) : (
                                            <TouchableOpacity
                                                style={styles.popupItem}
                                                onPress={() => {
                                                    Alert.alert(
                                                        'Xác nhận',
                                                        `Bạn muốn trao quyền Cộng tác viên cho ${selectedMember.name}?`,
                                                        [
                                                            { text: 'Hủy', style: 'cancel' },
                                                            {
                                                                text: 'Đồng ý',
                                                                onPress: () => handleSetCollaborator(groupId, selectedMember.id),
                                                            },
                                                        ]
                                                    );
                                                }}
                                            >
                                                <Text style={styles.popupText}>Đặt làm Cộng tác viên</Text>
                                            </TouchableOpacity>
                                        )}

                                        <TouchableOpacity
                                            style={styles.popupItem}
                                            onPress={() => {
                                                Alert.alert(
                                                    'Xác nhận',
                                                    `Bạn có chắc chắn muốn đuổi ${selectedMember.name} khỏi nhóm không?`,
                                                    [
                                                        { text: 'Hủy', style: 'cancel' },
                                                        {
                                                            text: 'Đuổi',
                                                            style: 'destructive',
                                                            onPress: () => handleRemoveMember(groupId, selectedMember.id),
                                                        },
                                                    ]
                                                );
                                            }}
                                        >
                                            <Text style={[styles.popupText, { color: '#d00' }]}>Đuổi khỏi nhóm</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </Modal>
                        ) : (
                            <Modal
                                transparent
                                visible={menuVisible}
                                animationType="fade"
                                onRequestClose={closeMenu}
                            >
                                <TouchableWithoutFeedback onPress={closeMenu}>
                                    <View style={styles.backdrop} />
                                </TouchableWithoutFeedback>

                                {selectedMember && (
                                    <View style={[styles.popup, { top: menuPos.y, left: menuPos.x }]}>
                                        <TouchableOpacity
                                            style={styles.popupItem}
                                            onPress={() => handleViewProfile(selectedMember.id)}
                                        >
                                            <Text style={styles.popupText}>Xem thông tin</Text>
                                        </TouchableOpacity>

                                        {selectedMember.role !== 'Quản trị viên' ? (
                                            <TouchableOpacity
                                                style={styles.popupItem}
                                                onPress={() => {
                                                    Alert.alert(
                                                        'Xác nhận',
                                                        `Bạn có chắc chắn muốn đuổi ${selectedMember.name} khỏi nhóm không?`,
                                                        [
                                                            { text: 'Hủy', style: 'cancel' },
                                                            {
                                                                text: 'Đuổi',
                                                                style: 'destructive',
                                                                onPress: () => handleRemoveMember(groupId, selectedMember.id),
                                                            },
                                                        ]
                                                    );
                                                }}
                                            >
                                                <Text style={[styles.popupText, { color: '#d00' }]}>Đuổi khỏi nhóm</Text>
                                            </TouchableOpacity>
                                        ) : (
                                            <></>
                                        )}
                                    </View>
                                )}
                            </Modal>
                        )
                        }
                    </>
                ) : activeTab === 'manager' && (
                    <View>
                        <View style={styles.tabBar}>
                            <TouchableOpacity
                                style={[styles.tabItem, selectedTab === 'requests' && styles.tabItemActive]}
                                onPress={() => handleTabChange('requests')}
                            >
                                <Text style={[styles.tabTxt, selectedTab === 'requests' && styles.tabTxtActive]}>
                                    Duyệt thành viên
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.tabItem, selectedTab === 'postsApprove' && styles.tabItemActive]}
                                onPress={() => handleTabChange('postsApprove')}
                            >
                                <Text style={[styles.tabTxt, selectedTab === 'postsApprove' && styles.tabTxtActive]}>
                                    Duyệt bài viết
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {selectedTab === 'requests' && (
                            <ScrollView style={{ maxHeight: 500 }}>
                                {requests.length === 0 ? (
                                    <Text style={styles.emptyText}>Danh sách rỗng</Text>
                                ) : (
                                    requests.map(item => (
                                        <View key={item.id} style={styles.memberItem}>
                                            <Image source={{ uri: item.avatar }} style={styles.memberAvatar} />
                                            <View style={styles.memberInfo}>
                                                <Text style={styles.memberText}>{item.name}</Text>
                                                <Text style={styles.memberAnswer}>
                                                    {item.answer ? `"${item.answer}"` : 'Không xác định'}
                                                </Text>

                                                <View style={styles.buttonContainer}>
                                                    <TouchableOpacity
                                                        style={styles.rejectButton}
                                                        onPress={() => handleReject(item.id)}
                                                    >
                                                        <Text style={styles.buttonTextV2}>Từ chối</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={styles.acceptButton}
                                                        onPress={() => handleAccept(item.id)}
                                                    >
                                                        <Text style={styles.buttonTextV2}>Chấp nhận</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        </View>
                                    ))
                                )}
                            </ScrollView>
                        )}

                        {selectedTab === 'postsApprove' && (
                            <ScrollView>
                                {waitingPosts.length === 0 ? (
                                    <Text style={styles.emptyText}>Danh sách rỗng</Text>
                                ) : (
                                    waitingPosts.map((item: any, index: any) => (
                                        <ItemPostApprove
                                            key={item.id || index}
                                            id={item.id}
                                            userId={item.userId}
                                            createAt={item.createAt}
                                            content={item.content}
                                            images={item.postImage || []}
                                            onApprove={() => handleApprovePost(item.userId, item.postId)}
                                            onReject={() => handleRejectPost(item.userId, item.postId)}
                                        />
                                    ))
                                )}
                            </ScrollView>
                        )}

                    </View>
                )
            ) : (
                <>
                    {activeTab === 'posts' ? (
                        <>
                            {/* Ô viết bài */}
                            <View style={styles.postBox}>
                                <Image source={{ uri: studentAvatar ?? undefined }} style={styles.postAvatar} />
                                <TouchableOpacity style={styles.postInput} onPress={openPostModal}>
                                    <Text style={styles.postPlaceholder}>Bạn đang nghĩ gì?</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.contentText}>Danh sách bài viết</Text>

                            <View style={{ padding: 10 }}>
                                <ListPost posts={posts} />
                            </View>
                        </>
                    ) : activeTab === 'members' ? (
                        <>

                        </>
                    ) : (
                        <>
                            <Text style={styles.contentText}>Hoạt động gần đây</Text>

                            <View style={{ padding: 10 }}>
                                <ScrollView>
                                    {myPosts.length === 0 ? (
                                        <Text style={styles.emptyText}>Danh sách rỗng</Text>
                                    ) : (
                                        myPosts.map((item: any, index: any) => (
                                            <ItemPostStatus
                                                key={item.postId || index}
                                                postId={item.postId}
                                                userPostId={item.userId}
                                                content={item.content}
                                                createAt={item.createAt}
                                                postImage={item.postImage || []}
                                                postLike={item.postLike || { count: 0, userIds: [] }}
                                                groupId={item.groupId}
                                                status={item.status}
                                            />
                                        ))
                                    )}
                                </ScrollView>
                            </View>
                        </>
                    )}
                </>
            )}

            {/* === POPUP TẠO BÀI VIẾT === */}
            <Modal visible={postModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.customModalContainer}>
                        {/* Header */}
                        <Text style={styles.customModalTitle}>Tạo bài viết</Text>

                        {/* Avatar + tên */}
                        <View style={styles.userInfoRow}>
                            <Image source={{ uri: studentAvatar }} style={styles.userAvatar} />
                            <Text style={styles.userName}>{studentName}</Text>
                        </View>

                        {/* Ô nhập nội dung */}
                        <TextInput
                            value={postContent}
                            onChangeText={setPostContent}
                            placeholder="Nội dung bài viết..."
                            multiline
                            style={[
                                styles.textInputArea,
                            ]}
                        />

                        {images.length > 0 && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewRow}>
                                {images.map(img => (
                                    <View key={img.uri} style={styles.thumbWrapper}>
                                        <Image source={{ uri: img.uri }} style={styles.thumbImg} />
                                        {/* nút xoá 1 ảnh */}
                                        <TouchableOpacity
                                            style={styles.removeThumb}
                                            onPress={() =>
                                                setImages(prev => prev.filter(i => i.uri !== img.uri))
                                            }>
                                            <Text style={styles.removeTxt}>✕</Text>
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </ScrollView>
                        )}

                        {/* Dòng chứa định dạng + ảnh */}
                        <View style={styles.formatAndImageRow}>
                            <TouchableOpacity style={styles.imageBtn} onPress={pickImages}>
                                <Image source={require('../icons/icon_image.png')} style={styles.imageIcon} />
                                <Text style={styles.imageBtnText}>Ảnh</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Footer nút */}
                        <View style={styles.modalFooterRow}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={closePostModal}>
                                <Text style={styles.cancelTxt}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.nextBtn}
                                onPress={handlePostSubmit}
                            >
                                <Text style={styles.nextTxt}>Đăng</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={editModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setEditModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.editContainer}>
                        <Text style={styles.modalTitle}>Chỉnh sửa thông tin nhóm</Text>

                        {/* Avatar */}
                        <Text style={styles.label}>Ảnh đại diện</Text>
                        <TouchableOpacity onPress={handlePickAvatar}>
                            <Image source={{ uri: avatar }} style={styles.editAvatar} />
                        </TouchableOpacity>

                        {/* Banner */}
                        <Text style={styles.label}>Ảnh bìa</Text>
                        <TouchableOpacity onPress={handlePickBanner}>
                            <Image source={{ uri: banner }} style={styles.editBanner} />
                        </TouchableOpacity>

                        {/* Tên nhóm */}
                        <Text style={styles.label}>Tên nhóm</Text>

                        <View style={styles.containerQuestion}>
                            <TextInput
                                value={groupName}
                                onChangeText={setGroupName}
                                style={styles.input}
                                placeholder="Nhập tên nhóm..."
                            />
                        </View>

                        {/* Riêng tư / Công khai */}
                        <Text style={styles.label}>Chế độ</Text>
                        <View style={styles.radioRow}>
                            <TouchableOpacity onPress={() => setPrivate(false)} style={styles.radioBtn}>
                                <View style={[styles.radioCircle, !isPrivate && styles.radioSelected]} />
                                <Text style={styles.radioText}>Công khai</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setPrivate(true)} style={styles.radioBtn}>
                                <View style={[styles.radioCircle, isPrivate && styles.radioSelected]} />
                                <Text style={styles.radioText}>Riêng tư</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Câu hỏi khi riêng tư */}
                        {isPrivate && (
                            <>
                                <Text style={styles.label}>Câu hỏi khi vào nhóm</Text>

                                <View style={styles.containerQuestion}>
                                    <TextInput
                                        value={question}
                                        onChangeText={setQuestion}
                                        style={styles.input}
                                        placeholder="Nhập câu hỏi..."
                                        multiline
                                    />

                                    <TouchableOpacity onPress={swapQuestion}>
                                        <Image source={require('../icons/icon_swap.png')} style={styles.iconSwap} />
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}

                        {/* Footer */}
                        <View style={styles.footerRow}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModalVisible(false)}>
                                <Text style={styles.cancelTxt}>Hủy</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveGroupInfo}>
                                <Text style={styles.saveTxt}>Lưu</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

        </ScrollView >
    );
};

const styles = StyleSheet.create({
    iconSwap: { width: 22, height: 22 },
    containerQuestion: {
        position: 'relative', flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', borderWidth: 1,
        borderColor: '#ccc', borderRadius: 12, paddingHorizontal: 15, marginVertical: 10,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    editContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        width: '100%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
        color: '#333',
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        marginTop: 10,
        marginBottom: 4,
        color: '#444',
    },
    input: {
        borderRadius: 8,
        fontSize: 14,
        color: '#000',
        width: '95%'
    },
    editAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignSelf: 'center',
        marginVertical: 8,
    },
    editBanner: {
        width: '100%',
        height: 120,
        borderRadius: 8,
        marginBottom: 8,
    },
    radioRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        gap: 24,
        marginVertical: 8,
    },
    radioBtn: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    radioCircle: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: '#444',
        marginRight: 6,
    },
    radioSelected: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    radioText: {
        fontSize: 14,
        color: '#333',
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 20,
    },
    cancelBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
        backgroundColor: '#ddd',
        marginRight: 10,
    },
    cancelTxt: {
        color: '#333',
        fontWeight: '500',
    },
    saveBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
        backgroundColor: '#007AFF',
    },
    saveTxt: {
        color: '#fff',
        fontWeight: '500',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.1)',
    },

    popup: {
        position: 'absolute',
        minWidth: 180,
        backgroundColor: '#fff',
        borderRadius: 8,
        elevation: 5,          // Android
        shadowColor: '#000',   // iOS
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
    },

    popupItem: {
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    popupText: {
        fontSize: 14,
    },
    icon: {
        width: 24,
        height: 24,
    },
    formatBtnActive: {
        backgroundColor: '#00CFE8',
    },
    formatBtnActiveText: { color: '#fff' },
    previewRow: { marginBottom: 12 },
    thumbWrapper: {
        marginRight: 8,
    },
    thumbImg: {
        width: 70,
        height: 70,
        borderRadius: 6,
    },
    removeThumb: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 10,
        paddingHorizontal: 4,
    },
    removeTxt: { color: '#fff', fontSize: 12 },

    wrapper: { flex: 1, backgroundColor: '#f0f2f5' },
    emptyText: {
        textAlign: 'center',
        paddingVertical: 20,
        color: '#888',
        fontStyle: 'italic',
    },
    coverContainer: { backgroundColor: '#ccc' },
    coverImg: { width: '100%', height: 200, resizeMode: 'cover' },
    coverAvatar: {
        position: 'absolute',
        bottom: -40,
        left: 16,
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 4,
        borderColor: '#fff',
        overflow: 'visible',
        zIndex: 1000,
    },
    infoCard: {
        backgroundColor: '#fff',
        paddingTop: 48,
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderColor: '#ddd',
    },
    groupNameTxt: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#050505',
    },
    subTxt: {
        fontSize: 14,
        color: '#65676b',
        marginTop: 4,
    },
    actionBtn: {
        position: 'absolute',
        right: 16,
        top: 48,
        backgroundColor: '#e4e6eb',
        padding: 8,
        borderRadius: 20,
    },
    actionIcon: {
        width: 20,
        height: 20,
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: '#ddd',
    },
    tabItem: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
    },
    tabItemActive: {
        borderBottomWidth: 3,
        borderColor: '#1877f2',
    },
    tabTxt: {
        fontSize: 16,
        color: '#050505',
    },
    tabTxtActive: {
        color: '#1877f2',
        fontWeight: 'bold',
    },
    postBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    postAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
    },
    postInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ccd0d5',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: '#f0f2f5',
    },
    postPlaceholder: {
        color: '#65676b',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginVertical: 10,
        textAlign: 'center',
    },
    managerTabs: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    managerTabBtn: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: '#e4e6eb',
        borderRadius: 20,
        marginRight: 10,
    },
    managerTabTxt: {
        color: '#050505',
        fontSize: 14,
    },
    activeManagerBtn: {
        backgroundColor: '#1877f2',
    },
    activeText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#fff',
        padding: 12,
        borderBottomWidth: 1,
        borderColor: '#f0f2f5',
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
        fontSize: 17,
        fontWeight: '500',
    },
    memberAnswer: {
        fontSize: 15,
        marginVertical: 5
    },
    positionText: {
        fontSize: 13,
        color: '#666',
    },
    buttonContainer: {
        flexDirection: 'row',
        marginTop: 6,
    },
    acceptButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
        marginLeft: 8,
    },
    rejectButton: {
        backgroundColor: '#FF4D4D',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
    },
    buttonTextV2: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    contentContainer: {
        backgroundColor: '#fff',
    },
    contentText: {
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'left',
        padding: 10,
        paddingHorizontal: 20,
        backgroundColor: '#fff',
    },

    /* ========================= MODAL TẠO BÀI VIẾT ========================= */
    customModalContainer: {
        width: '90%',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
    },
    customModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 12,
    },
    userInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    userAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 10,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
    },
    textInputArea: {
        minHeight: 100,
        maxHeight: 200,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 10,
        textAlignVertical: 'top',
        marginBottom: 12,
        fontSize: 15,
    },
    formatAndImageRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    textFormatGroup: {
        flexDirection: 'row',
    },
    formatBtn: {
        width: 36,
        height: 36,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 6,
    },
    bold: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    italic: {
        fontStyle: 'italic',
        fontSize: 16,
    },
    underline: {
        textDecorationLine: 'underline',
        fontSize: 16,
    },
    imageBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e4e6eb',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    imageIcon: {
        width: 16,
        height: 16,
        marginRight: 6,
    },
    imageBtnText: {
        fontSize: 14,
        fontWeight: '500',
    },
    modalFooterRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    nextBtn: {
        backgroundColor: '#00CFE8',
        paddingVertical: 8,
        paddingHorizontal: 18,
        borderRadius: 8,
    },
    nextTxt: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 15,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f2f5',
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 12,
        margin: 10,
    },

    searchIcon: {
        width: 20,
        height: 20,
        tintColor: '#888',
        marginRight: 8,
        marginLeft: 8
    },

    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#000',
        paddingVertical: 0,
    },
});

export default GroupDetailJoined;