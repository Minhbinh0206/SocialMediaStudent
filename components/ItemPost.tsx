import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { getDatabase, ref, onValue, set, get, query, orderByChild, equalTo } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../type';

interface PostProps {
  postId: string;
  userPostId: string;
  content: string;
  createdAt: string;
  postImage: string;
  postLike: number;
}

const ItemPost: React.FC<PostProps> = ({
  postId,
  userPostId,
  content,
  createdAt,
  postImage,
  postLike,
}) => {
  const [userName, setUserName] = useState<string>(''); 
  const [loading, setLoading] = useState<boolean>(true);
  const [avatar, setAvatar] = useState<string>(''); 
  const [liked, setLiked] = useState<boolean>(false); 
  const [likeCount, setLikeCount] = useState<number>(postLike);
  const [commentCount, setCommentCount] = useState<number>(0);
  const currentUserId = getAuth().currentUser?.uid;
  const navigation = useNavigation<NavigationProp>();

  type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

  // Cập nhật trạng thái thích theo thời gian thực
  useEffect(() => {
    const db = getDatabase();
    const likeRef = ref(db, `Like/PostLikes/${userPostId}/${postId}/${currentUserId}`);
    
    // Lắng nghe thay đổi trạng thái like
    const unsubscribe = onValue(likeRef, (snapshot) => {
      if (snapshot.exists()) {
        setLiked(snapshot.val().liked);  // Cập nhật trạng thái liked
      }
    });
  
    // Lắng nghe thay đổi số lượng like
    const likeCountRef = ref(db, `Posts/${userPostId}/${postId}/postLike`);
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
  }, [userPostId, postId, currentUserId]);

  useEffect(() => {
    const db = getDatabase();
    // Lắng nghe sự thay đổi trong các bình luận của bài đăng
    const commentRef = ref(db, `Comments/${userPostId}/${postId}`);
    
    // Lắng nghe khi có thay đổi trong các bình luận
    const commentCountUnsubscribe = onValue(commentRef, (snapshot) => {
      if (snapshot.exists()) {
        const comments = snapshot.val();
        const commentCount = Object.keys(comments).length; // Số lượng bình luận
        setCommentCount(commentCount);
      } else {
        setCommentCount(0); // Nếu không có bình luận
      }
    });
  
    // Cleanup khi component unmount
    return () => {
      commentCountUnsubscribe();
    };
  }, [userPostId, postId]);  

  const handlePress = async () => {
    const db = getDatabase();
    const likeRef = ref(db, `Like/PostLikes/${userPostId}/${postId}/${currentUserId}`);
    const postRef = ref(db, `Posts/${userPostId}/${postId}/postLike`);

    const newLikeStatus = !liked;
    setLiked(newLikeStatus);
    const newLikeCount = newLikeStatus ? likeCount + 1 : likeCount - 1;

    try {
      await set(likeRef, { liked: newLikeStatus });
      await set(postRef, newLikeCount); // Cập nhật lượt thích trong bài đăng
    } catch (error) {
      console.error('Error updating like:', error);
    }
  };

  // Kiểm tra trạng thái like ban đầu
  const checkLikeStatus = async () => {
    const db = getDatabase();
    const likeRef = ref(db, `Like/PostLikes/${userPostId}/${postId}/${currentUserId}`);

    try {
      const snapshot = await get(likeRef);
      if (snapshot.exists()) {
        setLiked(snapshot.val().liked);
      }
    } catch (error) {
      console.error('Error checking like status:', error);
    }
  };

  const handleComment = () => {
    navigation.navigate('CommentScreen', { postId, userPostId });
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
        setAvatar(studentData[studentId].avatar);
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
    findStudentByUserId(userPostId);
    checkLikeStatus();
  }, [userPostId]);

  const iconPaths = {
    like: require('../icons/icon_like.png'),
    like_active: require('../icons/icon_like_active.png'),
    comment: require('../icons/icon_comment.png'),
    share: require('../icons/icon_share.png'),
  };

  const formatDate = (date: string) => {
    const now = new Date();
    const postDate = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'Vừa xong';
    if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
    if (diffInHours < 24) return `${diffInHours} giờ trước`;
    return `${diffInDays} ngày trước`;
  };

  return (
    <View style={styles.postCard}>
      <View style={styles.header}>
        <Image
          source={{ uri: avatar || 'https://tse3.mm.bing.net/th?id=OIP.gYaUpJvv-3E-stUjZ-Pd2AHaHa&pid=Api&P=0&h=180' }}
          style={styles.avatar}
        />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{loading ? 'Đang tải...' : userName}</Text>
          <Text style={styles.postDate}>{formatDate(createdAt)}</Text>
        </View>

        <TouchableOpacity style={{ position: 'absolute', right: 10 }}>
          <Image source={require('../icons/icon_more.png')} style={{ width: 20, height: 20 }} />
        </TouchableOpacity>
      </View>

      {postImage && <Image source={{ uri: postImage }} style={styles.postImage} />}

      <Text style={styles.postContent}>{content}</Text>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.actionButton} onPress={handlePress}>
          <Image source={liked ? iconPaths.like_active : iconPaths.like} style={styles.icon} />
          <Text style={styles.actionText}>{likeCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleComment}>
          <Image source={iconPaths.comment} style={styles.icon} />
          <Text style={styles.actionText}>{commentCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Image source={iconPaths.share} style={styles.icon} />
          <Text style={styles.actionText}>0</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  postCard: {
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
  postContent: {
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
  },
  userInfo: {
    flexDirection: 'column',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  postDate: {
    fontSize: 12,
    color: '#888',
  },
  postImage: {
    height: 200,
    borderRadius: 15,
    marginVertical: 10,
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

export default ItemPost;
