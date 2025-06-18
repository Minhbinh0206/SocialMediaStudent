import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { getDatabase, ref, onValue, set, get, query, orderByChild, equalTo } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../type';
import ItemReply from './ItemReply';

interface CommentProps {
    userPostId: string;
    postId: string;
    groupId: string;
    commentId: string;
    userCommentId: string;
    content: string;
    commentCreateAt: string;
    commentLike: {
        count: number;
        userIds: string[];
    };
    onTagUser: (userName: Tag) => void;
}

interface ReplyProps {
    content: string;
    createdAt: string;
    replyLike: {
        count: number;
        userIds: string[];
    };
    replyId: string;
    userReplyId: string;
}

interface Tag {
    commentId: string;
    userCommentId: string;
    postId: string;
    userReplyId: string;
    userPostId: string;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

const ItemComment: React.FC<CommentProps> = ({
    groupId,
    postId,
    commentId,
    userCommentId,
    content,
    commentCreateAt,
    commentLike,
    userPostId,
    onTagUser,
}) => {
    const [userName, setUserName] = useState<string>('');
    const [userAvatar, setUserAvatar] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [replyCount, setReplyCount] = useState<number>(0);
    const [liked, setLiked] = useState<boolean>(false);
    const [likeCount, setLikeCount] = useState<number>(commentLike?.count || 0);
    const currentUserId = getAuth().currentUser?.uid ?? '';
    const navigation = useNavigation<NavigationProp>();
    const [replies, setReplies] = useState<ReplyProps[]>([]);
    const [isExpanded, setIsExpanded] = useState<boolean>(false);

    useEffect(() => {
        const db = getDatabase();
        const likePath = `Posts/${groupId}/${userPostId}/${postId}/comments/commentData/${commentId}/commentLike`;
        const commentLikeRef = ref(db, likePath);

        const unsubscribe = onValue(commentLikeRef, (snapshot) => {
            const data = snapshot.val();
            if (data && data.userIds) {
                setLikeCount(data.userIds.length);
                setLiked(data.userIds.includes(currentUserId));
            } else {
                setLikeCount(0);
                setLiked(false);
            }
        });

        return () => {
            unsubscribe();
        };
    }, [groupId, userPostId, postId, commentId, currentUserId]);

    const handlePress = async () => {
        const db = getDatabase();
        const likePath = `Posts/${groupId}/${userPostId}/${postId}/comments/commentData/${commentId}/commentLike`;
        const commentLikeRef = ref(db, likePath);

        try {
            const snapshot = await get(commentLikeRef);
            const currentData = snapshot.val() || { count: 0, userIds: [] };
            let updatedUserIds = currentData.userIds || [];

            const newLikeStatus = !liked;

            if (newLikeStatus) {
                if (!updatedUserIds.includes(currentUserId)) {
                    updatedUserIds.push(currentUserId);
                }
            } else {
                updatedUserIds = updatedUserIds.filter((id: string) => id !== currentUserId);
            }

            const newLikeData = {
                count: updatedUserIds.length,
                userIds: updatedUserIds,
            };

            await set(commentLikeRef, newLikeData);
            setLiked(newLikeStatus);
            setLikeCount(updatedUserIds.length);
        } catch (error) {
            console.error('Error updating comment like:', error);
        }
    };

    const handleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    const findStudentByUserId = async (userId: string) => {
        const db = getDatabase();
        const studentsRef = ref(db, 'Students');
        const studentQuery = query(studentsRef, orderByChild('userId'), equalTo(userId));

        try {
            const snapshot = await get(studentQuery);
            if (snapshot.exists()) {
                const studentData = snapshot.val();
                const studentId = Object.keys(studentData)[0];
                setUserName(studentData[studentId].studentName);
                setUserAvatar(studentData[studentId].avatar);
            }
        } catch (error) {
            console.error('Error fetching student:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        findStudentByUserId(userCommentId);
    }, [userCommentId]);

    const iconPaths = {
        like: require('../icons/icon_like.png'),
        like_active: require('../icons/icon_like_active.png'),
        comment: require('../icons/icon_comment.png'),
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

    const fetchReplies = () => {
        const db = getDatabase();
        const repliesRef = ref(db, `Posts/${groupId}/${userPostId}/${postId}/comments/commentData/${commentId}/replies`);

        onValue(repliesRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const count = data.count || 0;
                const repliesObject = data.replyData || {};

                const repliesList: ReplyProps[] = Object.values(repliesObject)
                    .map((item: any): ReplyProps => ({
                        content: item.content,
                        createdAt: item.commentCreateAt,
                        replyLike: {
                            count: item.commentLike?.count || 0,
                            userIds: item.commentLike?.userIds || []
                        },
                        replyId: item.replyId,
                        userReplyId: item.userReplyId,
                    }))
                    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

                setReplies(repliesList);
                setReplyCount(count);
            } else {
                setReplies([]);
                setReplyCount(0);
            }
        });
    };

    useEffect(() => {
        fetchReplies();
    }, [groupId, userPostId, postId, commentId]);

    return (
        <View>
            <View style={{ flexDirection: 'row' }}>
                <Image source={{ uri: userAvatar }} style={styles.avatar} />
                <View style={styles.commentCard}>
                    <View style={styles.header}>
                        <View style={styles.userInfo}>
                            <Text style={styles.userName}>{loading ? 'Đang tải...' : userName}</Text>
                            <Text style={styles.commentDate}>{formatDate(commentCreateAt)}</Text>
                        </View>
                    </View>

                    <Text style={styles.commentContent}>{content}</Text>

                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.actionButton} onPress={handlePress}>
                            <Image source={liked ? iconPaths.like_active : iconPaths.like} style={styles.icon} />
                            <Text style={styles.actionText}>{likeCount}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() =>
                                onTagUser({ commentId, userCommentId, postId, userPostId, userReplyId: '' })
                            }>
                            <Image source={iconPaths.comment} style={styles.icon} />
                            <Text style={styles.actionText}>{replyCount}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <View>
                <TouchableOpacity onPress={handleExpand}>
                    {!isExpanded && replies.length > 0 && (
                        <Text style={styles.textExpand}>Hiển thị thêm {replies.length} phản hồi...</Text>
                    )}
                    {isExpanded && <Text style={styles.textExpand}>Thu gọn</Text>}
                </TouchableOpacity>
                {isExpanded && (
                    <ScrollView>
                        {replies.map((reply) => (
                            <ItemReply
                                key={reply.replyId}
                                groupId={groupId}
                                replyId={reply.replyId}
                                userPostId={userPostId}
                                userReplyId={reply.userReplyId}
                                commentId={commentId}
                                createdAt={reply.createdAt}
                                replyLike={reply.replyLike}
                                userCommentId={userCommentId}
                                content={reply.content}
                                postId={postId}
                                onTagUser={onTagUser}
                            />
                        ))}
                    </ScrollView>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    commentCard: {
        width: '87%',
        padding: 15,
        marginTop: 15,
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
    textExpand: {
        fontSize: 13,
        marginLeft: 50,
        marginVertical: 10,
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

export default ItemComment;
