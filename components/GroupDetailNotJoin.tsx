import React, { useEffect, useState } from 'react';
import { View, Text, Image, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import database from '@react-native-firebase/database';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import HeaderBack from './HeaderBack';
import { RootStackParamList } from '../type';
import GroupDetailJoined from './GroupDetailJoined';
import { getAuth } from 'firebase/auth';

interface GroupDetailNotJoinProps {
    groupId: string;
}

const GroupDetailNotJoin: React.FC<GroupDetailNotJoinProps> = ({ groupId }) => {
    const [group, setGroup] = useState<any>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [isJoined, setIsJoined] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isJoining, setIsJoining] = useState(false);
    const currentUserId = getAuth().currentUser?.uid;
    const [studentName, setStudentName] = useState<string | null>(null);
    const [studentAvatar, setStudentAvatar] = useState<string | null>(null);

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
                        avatar: groupData.members[id].avatar,
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

        const studentRef = database().ref(`/Students/${currentUserId}`);

        studentRef.once('value').then(snapshot => {
            if (snapshot.exists()) {
                const studentData = snapshot.val();
                setStudentName(studentData.studentName || "Không có tên");
                setStudentAvatar(studentData.avatar || "URL_avatar_mặc_định");
            }
        });
    }, [currentUserId]);

    const handleJoin = () => {
        if (!currentUserId || !studentName) return;

        setIsJoining(true);

        database()
            .ref(`/Groups/${groupId}/members/${currentUserId}`)
            .set({
                name: studentName,
                avatar: studentAvatar
            })
            .then(() => {
                setIsJoined(true);
            })
            .finally(() => setIsJoining(false));
    };

    if (loading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color="#007bff" />
            </View>
        );
    }

    if (!group) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Nhóm không tồn tại!</Text>
            </View>
        );
    }

    if (isJoined) {
        return <GroupDetailJoined />;
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
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {!group.private ?
                                (
                                    <Image source={require('../icons/icon_public.png')} style={styles.icon} />
                                ) : (
                                    <Image source={require('../icons/icon_private.png')} style={styles.icon} />
                                )}
                            <Text style={styles.memberCount}>{!group.private ? 'Công khai' : 'Riêng tư'}</Text>
                        </View>
                    </View>
                </View>

                <View style={{ backgroundColor: '#fff' }}>
                    <TouchableOpacity style={styles.button} onPress={handleJoin} disabled={isJoining}>
                        {isJoining ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Tham gia nhóm</Text>}
                    </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>Thành viên:</Text>
                {members.length > 0 ? (
                    <FlatList
                        data={members}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <View style={styles.memberItem}>
                                <Image source={{ uri: item.avatar }} style={styles.memberAvatar} />
                                <View style={styles.memberInfo}>
                                    <Text style={styles.memberText}>{item.name}</Text>
                                </View>
                            </View>
                        )}
                    />
                ) : (
                    <Text style={{ flex: 1, textAlign: 'center', backgroundColor: '#fff', fontSize: 20, color: '#ccc' }}>Nhóm chưa có thành viên</Text>
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
    banner: {
        width: '100%',
        height: 200,
        resizeMode: 'cover',
    },
    groupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        backgroundColor: '#fff',
        paddingHorizontal: 15,
    },
    avatar: {
        width: 70,
        height: 70,
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
    memberCount: {
        fontSize: 14,
        color: '#666',
    },
    button: {
        backgroundColor: '#007bff',
        padding: 10,
        borderRadius: 6,
        alignItems: 'center',
        margin: 10,
    },
    icon: {
        width: 20,
        height: 20,
        margin: 5
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 5,
        paddingHorizontal: 15,
        backgroundColor: '#fff',
        padding: 10,
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        backgroundColor: '#fff',
        paddingHorizontal: 15,
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
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: 18,
        textAlign: 'center',
        color: 'red',
        marginTop: 20,
    },
});

export default GroupDetailNotJoin;
