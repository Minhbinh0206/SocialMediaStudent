import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { getDatabase, ref, onValue, set, get } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../type';
import { ActivityIndicator } from 'react-native-paper';

interface PostProps {
  postId: string;
  userPostId: string;
  content: string;
  createdAt: string;
  postImage: string[];
  postLike: { count: number; userIds: string[] };
  groupId: string;
}

interface Comment {
  commentId: string;
  userCommentId: string;
  content: string;
  commentCreateAt: string;
  commentLike: number;
  onReplyPress: (username: string) => void;
}

const ItemPost: React.FC<PostProps> = ({
  postId,
  userPostId,
  content,
  createdAt,
  postImage,
  postLike,
  groupId
}) => {
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [avatar, setAvatar] = useState<string>('');
  const [liked, setLiked] = useState<boolean>(false);
  const [likeCount, setLikeCount] = useState<number>(postLike?.count || 0);
  const [commentCount, setCommentCount] = useState<number>(0);
  const currentUserId = getAuth().currentUser?.uid ?? '';
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const SLIDER_WIDTH = Dimensions.get('window').width;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const db = getDatabase();
    const postLikeRef = ref(db, `Posts/${groupId}/${userPostId}/${postId}/postLike`);

    const unsubscribe = onValue(postLikeRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setLikeCount(data.count || 0);
        setLiked(data.userIds?.includes(currentUserId) || false);
      } else {
        setLikeCount(0);
        setLiked(false);
      }
    });

    return () => unsubscribe();
  }, [groupId, userPostId, postId, currentUserId]);

  useEffect(() => {
      const fetchComments = async () => {
        const db = getDatabase();
        const commentsRef = ref(db, `Posts/${groupId}/${userPostId}/${postId}/comments`);
    
        onValue(commentsRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const count = data.count || 0;
            const commentsObject = data.commentData || {};
    
            const commentList: Comment[] = Object.values(commentsObject)
              .map((item: any): Comment => ({
                commentId: item.commentId,
                userCommentId: item.userCommentId,
                content: item.content,
                commentCreateAt: item.commentCreateAt,
                commentLike: item.commentLike,
                onReplyPress: () => { }, // placeholder, bạn có thể xử lý khác
              }))
              .sort(
                (a, b) =>
                  new Date(a.commentCreateAt).getTime() -
                  new Date(b.commentCreateAt).getTime()
              );
    
            setCommentCount(count);
          } else {
            setCommentCount(0);
          }
        });
      };

      fetchComments();
  }, [userPostId, postId]);

  const handlePress = async () => {
    const db = getDatabase();
    const postRef = ref(db, `Posts/${groupId}/${userPostId}/${postId}/postLike`);

    try {
      const snapshot = await get(postRef);
      let currentPostLike = snapshot.val() || { count: 0, userIds: [] };
      const newLikeStatus = !liked;

      let updatedUserIds = [...(currentPostLike.userIds || [])];
      if (newLikeStatus) {
        if (!updatedUserIds.includes(currentUserId)) {
          updatedUserIds.push(currentUserId);
        }
      } else {
        updatedUserIds = updatedUserIds.filter(id => id !== currentUserId);
      }

      const newPostLike = {
        count: updatedUserIds.length,
        userIds: updatedUserIds,
      };

      await set(postRef, newPostLike);
    } catch (error) {
      console.error('Error updating like:', error);
    }
  };

  const handleComment = () => {
    navigation.navigate('CommentScreen', { postId, userPostId, groupId });
  };

  const findAdminByUserId = async (userId: string) => {
    const db = getDatabase();
    const adminPaths = ['AdminDefaults', 'AdminDepartments', 'AdminBusinesses'];

    for (const path of adminPaths) {
      const adminRef = ref(db, `Admins/${path}/${userId}`);
      const snapshot = await get(adminRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        setUserName(data.fullName || 'No name');
        setAvatar(data.avatar || '');
        setLoading(false);
        return;
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    findAdminByUserId(userPostId);
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

  const images: string[] = Array.isArray(postImage) ? postImage : [postImage];

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.postCard}>
      <View style={styles.header}>
        <Image
          source={{ uri: avatar || 'https://tse3.mm.bing.net/th?id=OIP.gYaUpJvv-3E-stUjZ-Pd2AHaHa&pid=Api&P=0&h=180' }}
          style={styles.avatar}
        />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.postDate}>{formatDate(createdAt)}</Text>
        </View>
        <TouchableOpacity style={{ position: 'absolute', right: 10 }}>
          <Image source={require('../icons/icon_more.png')} style={{ width: 20, height: 20 }} />
        </TouchableOpacity>
      </View>

      <Text style={styles.postContent}>{content}</Text>

      {images.length > 0 && (
        <View>
          {currentImageIndex > 0 && (
            <TouchableOpacity
              style={styles.leftArrow}
              onPress={() => setCurrentImageIndex(prev => Math.max(prev - 1, 0))}
            >
              <Text style={styles.arrowText}>{'<'}</Text>
            </TouchableOpacity>
          )}

          <Image
            source={{ uri: images[currentImageIndex] }}
            style={styles.postImage}
            resizeMode="cover"
          />

          {currentImageIndex < images.length - 1 && (
            <TouchableOpacity
              style={styles.rightArrow}
              onPress={() => setCurrentImageIndex(prev => Math.min(prev + 1, images.length - 1))}
            >
              <Text style={styles.arrowText}>{'>'}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

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
  loaderContainer: {
    flex: 1,
    height: 700,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
    alignItems: 'center',
  },
  icon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  leftArrow: {
    position: 'absolute',
    left: 10,
    top: '45%',
    zIndex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 5,
    borderRadius: 20,
  },
  rightArrow: {
    position: 'absolute',
    right: 10,
    top: '45%',
    zIndex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 5,
    borderRadius: 20,
  },
  arrowText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default ItemPost;
