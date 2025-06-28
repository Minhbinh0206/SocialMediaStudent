import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions, Platform, UIManager, Animated, useWindowDimensions } from 'react-native';
import { getDatabase, ref, onValue, set, get, update } from 'firebase/database';
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
  postMark: { count: number; userIds: string[] };
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
  postMark,
  groupId
}) => {
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [avatar, setAvatar] = useState<string>('');
  const [liked, setLiked] = useState<boolean>(false);
  const [marked, setMarked] = useState<boolean>(false);
  const [likeCount, setLikeCount] = useState<number>(postLike?.count || 0);
  const [markCount, setMarkCount] = useState<number>(postMark?.count || 0);
  const [commentCount, setCommentCount] = useState<number>(0);
  const currentUserId = getAuth().currentUser?.uid ?? '';
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const translateY = useRef(new Animated.Value(-20)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();
  const [showFullContent, setShowFullContent] = useState(false);
  const [isAdmin, setAdmin] = useState<boolean>(false);

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
    const db = getDatabase();
    const postMarkRef = ref(db, `Posts/${groupId}/${userPostId}/${postId}/postMark`);

    const unsubscribe = onValue(postMarkRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setMarkCount(data.count || 0);
        setMarked(data.userIds?.includes(currentUserId) || false);
      } else {
        setMarkCount(0);
        setMarked(false);
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
    const likePath = `Posts/${groupId}/${userPostId}/${postId}/postLike`;
    const defaultPath = `PostDefaults/${postId}/postLike`;

    try {
      // B1: kiểm tra người đăng có phải admin không
      const adminPaths = ['AdminDefaults', 'AdminDepartments', 'AdminBusinesses'];
      let isAdmin = false;

      for (const path of adminPaths) {
        const adminRef = ref(db, `Admins/${path}/${userPostId}`);
        const snap = await get(adminRef);
        if (snap.exists()) {
          isAdmin = true;
          break;
        }
      }

      // B2: đọc dữ liệu like hiện tại
      const snap = await get(ref(db, likePath));
      const current = snap.val() || { count: 0, userIds: [] };

      const newLiked = !liked;
      let userIds = [...current.userIds];

      if (newLiked) {
        if (!userIds.includes(currentUserId)) userIds.push(currentUserId);
      } else {
        userIds = userIds.filter(id => id !== currentUserId);
      }

      const newPostLike = { count: userIds.length, userIds };

      // B3: cập nhật like
      const updates: any = {};
      updates[likePath] = newPostLike;

      if (isAdmin) {
        updates[defaultPath] = newPostLike;
      }

      await update(ref(db), updates);
    } catch (err) {
      console.error('Error updating like:', err);
    }
  };

  const handlePressMark = async () => {
    const db = getDatabase();
    const likePath = `Posts/${groupId}/${userPostId}/${postId}/postMark`;
    const defaultPath = `PostDefaults/${postId}/postMark`;

    try {
      // B1: kiểm tra người đăng có phải admin không
      const adminPaths = ['AdminDefaults', 'AdminDepartments', 'AdminBusinesses'];
      let isAdmin = false;

      for (const path of adminPaths) {
        const adminRef = ref(db, `Admins/${path}/${userPostId}`);
        const snap = await get(adminRef);
        if (snap.exists()) {
          isAdmin = true;
          break;
        }
      }

      // B2: đọc dữ liệu like hiện tại
      const snap = await get(ref(db, likePath));
      const current = snap.val() || { count: 0, userIds: [] };

      const newMark = !marked;
      let userIds = [...current.userIds];

      if (newMark) {
        if (!userIds.includes(currentUserId)) userIds.push(currentUserId);
      } else {
        userIds = userIds.filter(id => id !== currentUserId);
      }

      const newPostMark = { count: userIds.length, userIds };

      // B3: cập nhật like
      const updates: any = {};
      updates[likePath] = newPostMark;

      if (isAdmin) {
        updates[defaultPath] = newPostMark;
      }

      await update(ref(db), updates);
    } catch (err) {
      console.error('Error updating like:', err);
    }
  };

  const handleComment = () => {
    navigation.navigate('CommentScreen', { postId, userPostId, groupId });
  };

  const findAdminOrStudentByUserId = async (userId: string) => {
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
        setAdmin(true);
        return;
      }
    }

    // Không tìm thấy trong Admins → kiểm tra Users
    const userRef = ref(db, `Users/${userId}`);
    const userSnap = await get(userRef);
    if (userSnap.exists()) {
      const data = userSnap.val();
      setUserName(data.studentName || 'No name');
      setAvatar(data.avatar || '');
    } else {
      setUserName('Không tìm thấy người dùng');
      setAvatar('');
    }

    setLoading(false);
  };

  useEffect(() => {
    findAdminOrStudentByUserId(userPostId);
  }, [userPostId]);

  const iconPaths = {
    like: require('../icons/icon_like.png'),
    like_active: require('../icons/icon_like_active.png'),
    comment: require('../icons/icon_comment.png'),
    mark: require('../icons/icon_mark.png'),
    mark_active: require('../icons/icon_mark_active.png'),
  };

  const formatDate = (timestamp: number) => {
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
        {isAdmin && (
          <TouchableOpacity style={styles.actionButton} onPress={handlePressMark}>
            <Image source={marked ? iconPaths.mark_active : iconPaths.mark} style={styles.iconMark} />
            <Text style={styles.actionText}>{markCount}</Text>
          </TouchableOpacity>
        )}
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
    marginBottom: 10,
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
  iconMark: {
    width: 16,
    height: 16,
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
