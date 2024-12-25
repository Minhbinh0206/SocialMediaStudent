import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { getDatabase, ref, onValue, set, get, query, orderByChild, equalTo } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../type';

interface CommentProps {
    userPostId: string;
    postId: string;
    commentId: string;
    userCommentId: string;
    content: string;
    createdAt: string;
    commentLike: number;
}

const ItemComment: React.FC<CommentProps> = ({
    postId,
    commentId,
    userCommentId,
    content,
    createdAt,
    commentLike,
    userPostId
}) => {
    const [userName, setUserName] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [liked, setLiked] = useState<boolean>(false);
    const [likeCount, setLikeCount] = useState<number>(commentLike);
    const currentUserId = getAuth().currentUser?.uid;
    const navigation = useNavigation<NavigationProp>();

    type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

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
                        <TouchableOpacity style={styles.actionButton}>
                            <Image source={iconPaths.comment} style={styles.icon} />
                            <Text style={styles.actionText}>{0}</Text>
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

export default ItemComment;
