import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { getDatabase, ref, onValue, set, get, query, orderByChild, equalTo, runTransaction, child } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../type';
import { database } from '../firebaseConfig';

interface ReplyCommentProps {
    replyId: string;
    userPostId: string;
    groupId: string;
    postId: string;
    commentId: string;
    userCommentId: string;
    userReplyId: string;
    content: string;
    createdAt: string;
    replyLike: {
        count: number;
        userIds: string[];
    };
    onTagUser: (userName: Tag) => void;
}

interface Tag {
    commentId: string;
    userCommentId: string;
    userReplyId: string;
    postId: string;
    userPostId: string;
}

const ItemReply: React.FC<ReplyCommentProps> = ({
    postId,
    replyId,
    groupId,
    commentId,
    userCommentId,
    userReplyId,
    content,
    createdAt,
    replyLike,
    userPostId,
    onTagUser,
}) => {
    const [userName, setUserName] = useState<string>('');
    const [userAvatar, setUserAvatar] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [liked, setLiked] = useState<boolean>(false);
    const [userNameReply, setUserNameReply] = useState<string>('');
    const currentUserId = getAuth().currentUser?.uid;
    const [replyLikeCount, setReplyLikeCount] = useState<number>(0);
    const navigation = useNavigation<NavigationProp>();
    const [commentReplys, setCommentReplys] = useState<ReplyCommentProps[]>([]);

    type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

    useEffect(() => {
        const db = getDatabase();
        const likePath = `Posts/${groupId}/${userPostId}/${postId}/comments/commentData/${commentId}/replies/replyData/${replyId}/replyLike`;
        const commentLikeRef = ref(db, likePath);

        const unsubscribe = onValue(commentLikeRef, (snapshot) => {
            const data = snapshot.val();
            if (data && data.userIds) {
                setReplyLikeCount(data.userIds.length);
                setLiked(data.userIds.includes(currentUserId));
            } else {
                setReplyLikeCount(0);
                setLiked(false);
            }
        });

        return () => {
            unsubscribe();
        };
    }, [groupId, userPostId, postId, commentId, currentUserId]);

    const handlePress = async () => {
        const db = getDatabase();
        const likePath = `Posts/${groupId}/${userPostId}/${postId}/comments/commentData/${commentId}/replies/replyData/${replyId}/replyLike`;
        const likeRef = ref(db, likePath);
        const currentUserId = getAuth().currentUser?.uid ?? '';

        try {
            const snapshot = await get(likeRef);
            const currentData = snapshot.val() || { count: 0, userIds: [] };
            let updatedUserIds = currentData.userIds || [];

            const isLiked = updatedUserIds.includes(currentUserId);

            if (isLiked) {
                updatedUserIds = updatedUserIds.filter((id: string) => id !== currentUserId);
            } else {
                updatedUserIds.push(currentUserId);
            }

            const newLikeData = {
                count: updatedUserIds.length,
                userIds: updatedUserIds,
            };

            await set(likeRef, newLikeData);

            setLiked(!liked);
        } catch (error) {
            console.error('Error updating like:', error);
        }
    };

    const fetchUserComment = async () => {
        const studentQuery = query(ref(database, 'Users'), orderByChild('userId'), equalTo(userReplyId));

        try {
            const snapshot = await get(studentQuery);
            if (snapshot.exists()) {
                const studentList = Object.values(snapshot.val());
                const student = studentList[0] as any; // Nếu cần, bạn có thể định kiểu rõ ràng

                setUserName(student.studentName);
                setUserAvatar(student.avatar);
                setLoading(false);
                return;
            }
        } catch (err) {
            console.error('Lỗi khi tìm student:', err);
        }

        const adminPaths = ['AdminDefaults', 'AdminDepartments', 'AdminBusinesses'];
        try {
            for (let path of adminPaths) {
                const snapshot = await get(child(ref(database), `Admins/${path}/${userReplyId}`));
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    setUserName(data.fullName || 'No name');
                    setUserAvatar(data.avatar || '/default-avatar.png');
                    setLoading(false);
                    return;
                }
            }

            console.log('Không tìm thấy userCommentId ở Students hoặc Admins:', userCommentId);
            setUserName('Không rõ');
            setUserAvatar('/default-avatar.png');
        } catch (err) {
            console.error('Lỗi khi tìm admin:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userCommentId) {
            fetchUserComment();
        }
    }, [userCommentId]);

    const iconPaths = {
        like: require('../icons/icon_like.png'),
        like_active: require('../icons/icon_like_active.png'),
        comment: require('../icons/icon_comment.png'),
        share: require('../icons/icon_share.png'),
    };

    const formatDate = (date: string) => {
        if (!date || isNaN(Date.parse(date))) return 'Không xác định';

        const now = new Date();
        const commentDate = new Date(date);
        const diff = Math.floor((now.getTime() - commentDate.getTime()) / 1000);

        if (diff < 60) return 'Vừa xong';
        if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
        return `${Math.floor(diff / 86400)} ngày trước`;
    };

    return (
        <View style={{ marginLeft: 50 }}>
            {/* <Text style={{ fontSize: 16, marginLeft: 50 }}>Phản hồi bình luận của {userNameReply}</Text> */}
            <View style={{ flexDirection: 'row' }}>
                <Image
                    source={{ uri: userAvatar }}
                    style={styles.avatar}
                />
                <View style={styles.commentCard}>
                    <View style={styles.header}>
                        <View style={styles.userInfo}>
                            <Text style={styles.userName}>{loading ? 'Đang tải...' : userName}</Text>
                            <Text style={styles.commentDate}>{formatDate(createdAt)}</Text>
                        </View>
                    </View>

                    <Text style={styles.commentContent}>{content}</Text>

                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.actionButton} onPress={handlePress}>
                            <Image source={liked ? iconPaths.like_active : iconPaths.like} style={styles.icon} />
                            <Text style={styles.actionText}>{replyLikeCount}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton} onPress={() => onTagUser({ commentId, userCommentId, postId, userPostId, userReplyId })}>
                            <Image source={iconPaths.comment} style={styles.icon} />
                            <Text style={styles.actionText}>Phản hồi</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    commentCard: {
        width: '85%',
        padding: 15,
        marginBottom: 20,
        backgroundColor: '#fff',
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    actionText: {
        fontSize: 14,
    },
    commentContent: {
        fontSize: 16,
        marginVertical: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
        marginVertical: 10,
    },
    userInfo: {
        flexDirection: 'row',
        position: 'relative',
        width: '100%',
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    commentDate: {
        position: 'absolute',
        right: 5,
        fontSize: 12,
        color: '#888',
    },
    footer: {
        flexDirection: 'row',
    },
    actionButton: {
        flexDirection: 'row',
        marginRight: 15,
    },
    icon: {
        width: 20,
        height: 20,
        marginRight: 10,
    },
});

export default ItemReply;

