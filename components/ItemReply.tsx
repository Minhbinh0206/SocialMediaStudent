import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { getDatabase, ref, onValue, set, get, query, orderByChild, equalTo } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../type';

interface ReplyCommentProps {
    replyId: string;
    userPostId: string;
    postId: string;
    commentId: string;
    userCommentId: string;
    userReplyId: string;
    content: string;
    createdAt: string;
    replyLike: number;
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
    const [loading, setLoading] = useState<boolean>(true);
    const [liked, setLiked] = useState<boolean>(false);
    const [likeCount, setLikeCount] = useState<number>(replyLike);
    const [userNameReply, setUserNameReply] = useState<string>('');
    const currentUserId = getAuth().currentUser?.uid;
    const navigation = useNavigation<NavigationProp>();
    const [commentReplys, setCommentReplys] = useState<ReplyCommentProps[]>([]);

    type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

    // Cập nhật trạng thái like cho bình luận theo thời gian thực
    useEffect(() => {
        const db = getDatabase();
        const likeRef = ref(db, `Like/ReplyLikes/${userPostId}/${postId}/${userCommentId}/${commentId}/${userReplyId}/${replyId}/${currentUserId}`);

        // Lắng nghe thay đổi trạng thái like
        const unsubscribe = onValue(likeRef, (snapshot) => {
            if (snapshot.exists()) {
                setLiked(snapshot.val().liked);  // Cập nhật trạng thái liked
            }
        });

        // Lắng nghe thay đổi số lượng like cho bình luận
        const likeCountRef = ref(db, `Reply/Comments/${userPostId}/${postId}/${userCommentId}/${commentId}/replyLike`);
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

    const fetchCommentReplys = async () => {
        const db = getDatabase();
        const commentsRef = ref(db, `Reply/Comments/${userPostId}/${postId}/${userCommentId}/${commentId}`);

        try {
            const snapshot = await get(commentsRef);

            if (snapshot.exists()) {
                const commentsData = snapshot.val();
                const commentList = Object.keys(commentsData).map(key => ({
                    ...commentsData[key],
                    replyId: key,
                }));

                // Fetch tên người dùng cho mỗi comment
                const commentNames: { [userId: string]: string } = {};
                for (const comment of commentList) {
                    const userId = comment.userCommentId;
                    const userRef = ref(db, `Students/${userId}`); // Giả sử bạn lưu tên người dùng ở đây

                    const userSnapshot = await get(userRef);
                    if (userSnapshot.exists()) {
                        commentNames[userId] = userSnapshot.val().studentName;
                    } else {
                        commentNames[userId] = 'Unknown'; // Nếu không tìm thấy tên người dùng
                    }
                }

                // Cập nhật tên người dùng cho mỗi comment
                setCommentReplys(commentList);
            } else {
                console.log('Không có phản hồi nào cho' + snapshot.key);
            }
        } catch (error) {
            console.error('Lỗi khi lấy phản hồi:', error);
        }
    };

    useEffect(() => {
        fetchCommentReplys();
    }, [postId, userPostId]);

    const handlePress = async () => {
        const db = getDatabase();
        const likeRef = ref(db, `Like/ReplyLikes/${userPostId}/${postId}/${userCommentId}/${commentId}/${userReplyId}/${replyId}/${currentUserId}`);
        const commentRef = ref(db, `Reply/Comments/${userPostId}/${postId}/${userCommentId}/${commentId}/${replyId}/replyLike`);

        // Tính toán trước giá trị mới để cập nhật giao diện ngay lập tức
        const newLikeStatus = !liked;
        const newLikeCount = newLikeStatus ? likeCount + 1 : likeCount - 1;

        // Cập nhật ngay trên giao diện
        setLiked(newLikeStatus);
        setLikeCount(newLikeCount);

        try {
            // Gửi dữ liệu lên Firebase
            await set(likeRef, { liked: newLikeStatus });
            await set(commentRef, newLikeCount);
        } catch (error) {
            console.error('Error updating like:', error);
            // Khôi phục lại giá trị nếu có lỗi
            setLiked(!newLikeStatus);
            setLikeCount(likeCount);
        }
    };

    // Kiểm tra trạng thái like ban đầu cho bình luận
    const checkLikeStatus = async () => {
        const db = getDatabase();
        const likeRef = ref(db, `Like/ReplyLikes/${userPostId}/${postId}/${userCommentId}/${commentId}/${userReplyId}/${replyId}/${currentUserId}`);

        try {
            const snapshot = await get(likeRef);
            if (snapshot.exists()) {
                setLiked(snapshot.val().liked);
            }
        } catch (error) {
            console.error('Error checking like status:', error);
        }
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

    const findStudentByUserReplyId = async (userId: string) => {
        const db = getDatabase();
        const studentsRef = ref(db, 'Students');
        const studentQuery = query(studentsRef, orderByChild('userId'), equalTo(userId));

        try {
            const snapshot = await get(studentQuery);

            if (snapshot.exists()) {
                const studentData = snapshot.val();
                const studentId = Object.keys(studentData)[0];
                setUserNameReply(studentData[studentId].studentName);
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
        findStudentByUserId(userReplyId);
        findStudentByUserReplyId(userCommentId);
        checkLikeStatus();
    }, [userReplyId]);

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
        <View style={{ marginLeft: 50 }}>
            {/* <Text style={{ fontSize: 16, marginLeft: 50 }}>Phản hồi bình luận của {userNameReply}</Text> */}
            <View style={{ flexDirection: 'row' }}>
                <Image
                    source={{ uri: 'https://tse3.mm.bing.net/th?id=OIP.gYaUpJvv-3E-stUjZ-Pd2AHaHa&pid=Api&P=0&h=180' }}
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
                            <Text style={styles.actionText}>{likeCount}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton} onPress={() => onTagUser({ commentId, userCommentId , postId, userPostId, userReplyId })}>
                            <Image source={iconPaths.comment} style={styles.icon} />
                            <Text style={styles.actionText}>{replyLike}</Text>
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

