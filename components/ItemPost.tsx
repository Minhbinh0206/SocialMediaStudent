import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions, Platform, UIManager, Animated, useWindowDimensions } from 'react-native';
import { getDatabase, ref, onValue, set, get } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../type';
import { ActivityIndicator } from 'react-native-paper';
import RenderHTML from 'react-native-render-html';
import { LogBox } from 'react-native';
import truncate from 'html-truncate';

LogBox.ignoreLogs([
  'Support for defaultProps will be removed from function components'
]);

interface PostProps {
  postId: string;
  userPostId: string;
  content: string;
  createAt: number;
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
  createAt,
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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const translateY = useRef(new Animated.Value(-20)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();
  const [showFullContent, setShowFullContent] = useState(false);

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

  const formatDate = (timestamp: number) => {
    console.log('timestamp', timestamp);
    if (!timestamp || isNaN(timestamp)) return 'Thời gian không hợp lệ';

    const now = Date.now();
    const diffInSeconds = Math.floor((now - timestamp) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'Vừa xong';
    if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
    if (diffInHours < 24) return `${diffInHours} giờ trước`;
    return `${diffInDays} ngày trước`;
  };

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading]);

  const images: string[] = Array.isArray(postImage)
    ? postImage.filter((img) => img && img.trim() !== '')
    : postImage && postImage !== ''
      ? [postImage]
      : [];

  return (
    <Animated.View style={[styles.postCard, { transform: [{ translateY }], opacity }]}>
      <View style={styles.header}>
        <Image
          source={{ uri: avatar || 'https://tse3.mm.bing.net/th?id=OIP.gYaUpJvv-3E-stUjZ-Pd2AHaHa&pid=Api&P=0&h=180' }}
          style={styles.avatar}
        />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.postDate}>{formatDate(createAt)}</Text>
        </View>
        <TouchableOpacity style={{ position: 'absolute', right: 10 }}>
          <Image source={require('../icons/icon_more.png')} style={{ width: 20, height: 20 }} />
        </TouchableOpacity>
      </View>

      <RenderHTML
        baseStyle={styles.postContent}
        contentWidth={width}
        source={{ html: showFullContent ? content : truncate(content, 100) }}
      />
      {content.length > 100 && (
        <TouchableOpacity onPress={() => setShowFullContent(!showFullContent)}>
          <Text style={{ color: '#007AFF', marginBottom: 10 }}>
            {showFullContent ? 'Ẩn bớt' : 'Xem thêm'}
          </Text>
        </TouchableOpacity>
      )}


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
    </Animated.View>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
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
    marginTop: 10,
    flexDirection: 'row',
    marginHorizontal: 15,
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
