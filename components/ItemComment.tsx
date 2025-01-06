import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { getDatabase, ref, onValue, set, get, query, orderByChild, equalTo } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../type';
import { FlatList } from 'react-native-gesture-handler';
import ItemReply from './ItemReply';
import { Avatar } from 'react-native-paper';

interface CommentProps {
    userPostId: string;
    postId: string;
    commentId: string;
    userCommentId: string;
    content: string;
    commentCreateAt: string;
    commentLike: number;
    onTagUser: (userName: Tag) => void;
}

interface ReplyProps {
    userPostId: string;
    postId: string;
    commentId: string;
    userCommentMainId: string;
    content: string;
    createdAt: string;
    replyLike: number;
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

const ItemComment: React.FC<CommentProps> = ({
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
    const [selectedUserName, setSelectedUserName] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [liked, setLiked] = useState<boolean>(false);
    const [likeCount, setLikeCount] = useState<number>(commentLike);
    const currentUserId = getAuth().currentUser?.uid;
    const navigation = useNavigation<NavigationProp>();
    const [replies, setReplies] = useState<ReplyProps[]>([]);
    const [isExpanded, setIsExpanded] = useState<boolean>(false);

    type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

    const handleShowUserName = () => {
        setSelectedUserName(userName); // Lưu tên của người comment
    };

    // Cập nhật trạng thái like cho bình luận theo thời gian thực
    useEffect(() => {
        const db = getDatabase();
        const likeRef = ref(db, `Like/CommentLikes/${userPostId}/${postId}/${userCommentId}/${commentId}/${currentUserId}`);

        // Lắng nghe thay đổi trạng thái like
        const unsubscribe = onValue(likeRef, (snapshot) => {
            if (snapshot.exists()) {
                setLiked(snapshot.val().liked);  // Cập nhật trạng thái liked
            }
        });

        // Lắng nghe thay đổi số lượng like cho bình luận
        const likeCountRef = ref(db, `Comments/${userPostId}/${postId}/${commentId}/commentLike`);
        const likeCountUnsubscribe = onValue(likeCountRef, (snapshot) => {
            if (snapshot.exists()) {
                setLikeCount(snapshot.val());  // Cập nhật số lượng like
            }
        });

        // Cleanup khi component unmount
        return () => {
            unsubscribe();
            likeCountUnsubscribe();
        };
    }, [userCommentId, commentId, currentUserId]);

    const fetchReplies = () => {
        const db = getDatabase();
        const path = `Reply/Comments/${userPostId}/${postId}/${userCommentId}/${commentId}`;

        const repliesRef = ref(db, path);

        // Lắng nghe thay đổi theo thời gian thực
        const unsubscribe = onValue(repliesRef, (snapshot) => {
            if (snapshot.exists()) {
                const repliesData = snapshot.val();
                const replyList = Object.keys(repliesData).map((replyId) => {
                    const reply = repliesData[replyId];
                    return {
                        replyId: replyId,
                        userReplyId: reply.userReplyId,
                        content: reply.content,
                        createdAt: reply.createdAt,
                        replyLike: reply.replyLike,
                        postId: reply.postId,
                        userCommentMainId: reply.userCommentMainId,
                        commentId: reply.commentId,
                        userPostId: reply.userPostId,
                    };
                });

                console.log('Replies:', replyList);
                setReplies(replyList); // Cập nhật state khi có thay đổi
            } else {
                console.log('Không có phản hồi nào.');
                setReplies([]); // Nếu không có phản hồi, đảm bảo state là mảng rỗng
            }
        });

        // Cleanup khi component unmount
        return () => unsubscribe();
    };


    useEffect(() => {
        fetchReplies();
    }, [postId, userPostId]);

    const handlePress = async () => {
        const db = getDatabase();
        const likeRef = ref(db, `Like/CommentLikes/${userPostId}/${postId}/${userCommentId}/${commentId}/${currentUserId}`);
        const commentRef = ref(db, `Comments/${userPostId}/${postId}/${commentId}/commentLike`);

        const newLikeStatus = !liked;
        setLiked(newLikeStatus);
        const newLikeCount = newLikeStatus ? likeCount + 1 : likeCount - 1;

        try {
            await set(likeRef, { liked: newLikeStatus });
            await set(commentRef, newLikeCount); // Cập nhật lượt thích trong bình luận
        } catch (error) {
            console.error('Error updating like:', error);
        }
    };

    // Kiểm tra trạng thái like ban đầu cho bình luận
    const checkLikeStatus = async () => {
        const db = getDatabase();
        const likeRef = ref(db, `Like/CommentLikes/${userPostId}/${postId}/${userCommentId}/${commentId}/${currentUserId}`);
        try {
            const snapshot = await get(likeRef);
            if (snapshot.exists()) {
                setLiked(snapshot.val().liked);
            }
        } catch (error) {
            console.error('Error checking like status:', error);
        }
    };

    const handleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    // Lấy thông tin người dùng từ userCommentId
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
                setUserAvatar(studentData[studentId].avatar)
                setLoading(false);
            } else {
                console.log('No student found with userId:', userId);
                setLoading(false);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        findStudentByUserId(userCommentId);
        checkLikeStatus();
    }, [userCommentId]);

    const iconPaths = {
        like: require('../icons/icon_like.png'),
        like_active: require('../icons/icon_like_active.png'),
        comment: require('../icons/icon_comment.png'),
        share: require('../icons/icon_share.png'),
    };

    const formatDate = (date: string) => {
        // Kiểm tra giá trị rỗng hoặc không hợp lệ
        if (!date || isNaN(Date.parse(date))) {
            return 'Không xác định';
        }

        const now = new Date();
        const commentDate = new Date(date);
        const diffInSeconds = Math.floor((now.getTime() - commentDate.getTime()) / 1000);
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        const diffInHours = Math.floor(diffInMinutes / 60);
        const diffInDays = Math.floor(diffInHours / 24);

        if (diffInMinutes < 1) return 'Vừa xong';
        if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
        if (diffInHours < 24) return `${diffInHours} giờ trước`;
        return `${diffInDays} ngày trước`;
    };

    return (
        <View>
            <View style={{ flexDirection: 'row' }}>
                <Image
                    source={{ uri: userAvatar }}
                    style={styles.avatar}
                />
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
                        <TouchableOpacity style={styles.actionButton} onPress={() => onTagUser({ commentId, userCommentId, postId, userPostId, userReplyId: '' })}>
                            <Image source={iconPaths.comment} style={styles.icon} />
                            <Text style={styles.actionText}>{replies.length}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {selectedUserName && (
                <Text style={styles.tagUserName}>
                    @{selectedUserName}
                </Text>
            )}

            <View>
                <TouchableOpacity onPress={handleExpand}>
                    {!isExpanded && replies.length > 0 && <Text style={styles.textExpand}> Hiển thị thêm {replies.length} phản hồi...</Text>}
                    {isExpanded && <Text style={styles.textExpand}> Thu gọn</Text>}
                </TouchableOpacity>
                {isExpanded && <ScrollView>
                        {replies.map((reply) => (
                            <ItemReply
                                replyId={reply.replyId}
                                userReplyId={reply.userReplyId}
                                userPostId={userPostId}
                                key={reply.replyId}
                                commentId={commentId}
                                createdAt={reply.createdAt}
                                replyLike={reply.replyLike}
                                userCommentId={userCommentId}
                                content={reply.content}
                                postId={postId}
                                onTagUser={onTagUser}
                            />
                        ))}
                    </ScrollView>}
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
    tagUserName: {
        fontSize: 14,
        color: '#007BFF',
        fontWeight: 'bold',
        marginTop: 5,
        marginLeft: 15,
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
        marginVertical: 10
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