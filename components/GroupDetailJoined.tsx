import React, { useEffect, useState } from 'react';
import { View, Text, Image, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, TextInput, ScrollView, LayoutAnimation } from 'react-native';
import database from '@react-native-firebase/database';
import { useNavigation, useRoute } from '@react-navigation/native';
import HeaderBack from './HeaderBack';
import { getAuth } from 'firebase/auth';
import GroupDetailNotJoin from './GroupDetailNotJoin';
import { set } from 'firebase/database';

const GroupDetailJoined: React.FC = () => {
    const route = useRoute();
    const { groupId = "" } = route.params as { groupId?: string };
    const [group, setGroup] = useState<any>(null);
    const [adminId, setAdminId] = useState<string | null>(null);
    const [postContent, setPostContent] = useState('');
    const [members, setMembers] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [isJoined, setIsJoined] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isJoining, setIsJoining] = useState(false);
    const navigation = useNavigation();
    const currentUserId = getAuth().currentUser?.uid;
    const [studentName, setStudentName] = useState<string | null>(null);
    const [studentAvatar, setStudentAvatar] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'posts' | 'me' | 'manager'>('posts');
    const [selectedTab, setSelectedTab] = useState('members');

    console.log('Route params:', route.params);
    console.log('Group ID received:', groupId);

    useEffect(() => {
        if (!groupId) return;

        const groupRef = database().ref(`/Groups/${groupId}`);

        groupRef.on('value', snapshot => {
            if (snapshot.exists()) {
                const groupData = snapshot.val();
                setGroup(groupData);
                setAdminId(groupData.adminId);

                const memberList = groupData.members
                    ? Object.keys(groupData.members).map(id => ({
                        id,
                        name: groupData.members[id].name,
                        avatar: groupData.members[id].avatar,
                        position: groupData.members[id].position
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
                console.log("Danh sách members:", members);

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
                position: "Thành viên", // Gán giá trị cố định
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

    if (!isJoined) {
        return <GroupDetailNotJoin groupId={groupId} />;
    }

    const handleTabChange = (tab: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSelectedTab(tab);
    };

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
                    {adminId === currentUserId ? (
                        <TouchableOpacity style={styles.button}>
                            <Image source={require('../icons/icon_more.png')} style={styles.icon} />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.button} onPress={handleJoinLeave}>
                            <Image source={require('../icons/icon_out_group.png')} style={styles.icon} />
                        </TouchableOpacity>
                    )}
                </View>

                {adminId === currentUserId ? (
                    // Nếu là admin
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[styles.buttonTab, activeTab === 'posts' && styles.activeTab]}
                            onPress={() => setActiveTab('posts')}
                        >
                            <Text style={[styles.memberCount, activeTab === 'posts' && styles.activeText]}>Bài viết</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.buttonTab, activeTab === 'manager' && styles.activeTab]}
                            onPress={() => setActiveTab('manager')}
                        >
                            <Text style={[styles.memberCount, activeTab === 'manager' && styles.activeText]}>Quản lý</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    // Nếu không phải admin
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[styles.buttonTab, activeTab === 'posts' && styles.activeTab]}
                            onPress={() => setActiveTab('posts')}
                        >
                            <Text style={[styles.memberCount, activeTab === 'posts' && styles.activeText]}>Bài viết</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.buttonTab, activeTab === 'me' && styles.activeTab]}
                            onPress={() => setActiveTab('me')}
                        >
                            <Text style={[styles.memberCount, activeTab === 'me' && styles.activeText]}>Tôi</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.postBox}>
                    <Image source={{ uri: studentAvatar ?? undefined }} style={styles.avatarPost} />
                    <TouchableOpacity style={styles.input}>
                        <Text> Bạn đang nghĩ gì </Text>
                    </TouchableOpacity>
                </View>

                {/* Nội dung hiển thị theo tab */}
                {adminId === currentUserId ? (
                    activeTab === 'posts' ? (
                        <View>
                            {/* Thêm danh sách bài viết ở đây */}
                        </View>
                    ) : activeTab === 'manager' ? (
                        <View>
                            {/* Thêm quản lý nhóm ở đây */}
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View style={styles.tabContainer}>
                                    <TouchableOpacity
                                        style={[styles.button, selectedTab === 'members' && styles.activeButton]}
                                        onPress={() => handleTabChange('members')}>
                                        <Text style={[styles.buttonText, selectedTab === 'members' && styles.activeText]}>Danh sách thành viên</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.button, selectedTab === 'requests' && styles.activeButton]}
                                        onPress={() => handleTabChange('requests')}>
                                        <Text style={[styles.buttonText, selectedTab === 'requests' && styles.activeText]}>Danh sách yêu cầu vào nhóm</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.button, selectedTab === 'postsApprove' && styles.activeButton]}
                                        onPress={() => handleTabChange('postsApprove')}>
                                        <Text style={[styles.buttonText, selectedTab === 'postsApprove' && styles.activeText]}>Danh sách bài viết cần duyệt</Text>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>

                            {selectedTab === 'members' && (
                                <FlatList
                                    data={members}
                                    keyExtractor={item => item.id}
                                    renderItem={({ item }) => (
                                        <View style={styles.memberItem}>
                                            <Image source={{ uri: item.avatar }} style={styles.memberAvatar} />
                                            <View style={styles.memberInfo}>
                                                <Text style={styles.memberText}>{item.name}</Text>
                                                <Text style={styles.positionText}>{item.position || 'Không xác định'}</Text>
                                            </View>
                                        </View>
                                    )}
                                />
                            )}

                            {selectedTab === 'requests' && (
                                <FlatList
                                    data={requests}
                                    keyExtractor={item => item.id}
                                    renderItem={({ item }) => (
                                        <View style={styles.memberItemRequest}>
                                            <Image source={{ uri: item.avatar }} style={styles.memberAvatar} />
                                            <View style={styles.memberInfo}>
                                                <Text style={styles.memberText}>{item.name}</Text>
                                                <Text style={styles.memberText}>{item.answer || 'Không xác định'}</Text>

                                                {/* Thêm 2 nút "Duyệt" và "Từ chối" */}
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
                                    )}
                                />
                            )}
                        </View>
                    ) : () => { }
                ) : (
                    <View style={styles.contentContainer}>
                        {activeTab === 'posts' ? (
                            <View>
                                <Text style={styles.contentText}>Danh sách bài viết</Text>
                                {/* Thêm danh sách bài viết ở đây */}
                            </View>
                        ) : (
                            <View>
                                <Text style={styles.contentText}>Thông tin của tôi</Text>
                                {/* Thêm thông tin cá nhân ở đây */}
                            </View>
                        )}
                    </View>
                )}
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
    activeButton: {
        backgroundColor: '#007BFF',
    },
    tabContainer: {
        flexDirection: 'row',
        padding: 5,
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        paddingHorizontal: 16,
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
        paddingHorizontal: 15,
        borderRadius: 20,
        alignItems: 'center',
        margin: 5,
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
        color: '#000',
        fontSize: 16,
    },
    buttonTextV2: {
        color: '#fff',
        fontSize: 16,
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
        backgroundColor: '#fff',
        borderTopColor: '#ddd',
        borderBottomColor: '#ddd',
        borderWidth: 1,
        paddingVertical: 15,
    },
    memberItemRequest: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 10,
        backgroundColor: '#fff',
        borderTopColor: '#ddd',
        borderBottomColor: '#ddd',
        borderWidth: 1,
        paddingVertical: 15,
    },
    memberAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
    },
    memberInfo: {
        flex: 1,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    memberText: {
        fontSize: 16,
        fontWeight: '500',
    },
    positionText: {
        fontSize: 14,
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
        backgroundColor: '#fff',
        paddingTop: 10,
    },
    tabManagerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 10,
    },
    tabManagerItem: {
        padding: 10,
    },
    tabManagerText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    buttonContainer: {
        flexDirection: 'row',
        marginTop: 5,
    },
    acceptButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 5,
        marginTop: 10
    },
    rejectButton: {
        backgroundColor: '#FF4D4D',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 5,
        marginRight: 10,
        marginTop: 10
    },
});

export default GroupDetailJoined;
