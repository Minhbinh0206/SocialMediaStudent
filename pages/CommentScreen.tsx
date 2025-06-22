import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Keyboard, Platform } from 'react-native';
import { getDatabase, ref, get, set, query, orderByChild, equalTo, onValue, push, child } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../type'; // Đảm bảo import đúng RootStackParamList
import HeaderBack from '../components/HeaderBack';
import ItemComment from '../components/ItemComment';
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';
import { Chip } from 'react-native-paper';
import { database } from '../firebaseConfig';

interface Post {
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
  commentCreateAt: number;
  commentLike: {
    count: number;
    userIds: string[];
  };
  onReplyPress: (username: string) => void;
}

interface Tag {
  commentId: string;
  userCommentId: string;
  postId: string;
  userReplyId: string;
  userPostId: string;
}

const CommentScreen = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'CommentScreen'>>();
  const { postId, userPostId } = route.params;
  const groupId = route.params.groupId || '';
  const [userPostName, setUserPostName] = useState<string>('');
  const [userCommentNames, setUserCommentNames] = useState<{ [userId: string]: string }>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [avatar, setAvatar] = useState<string>('');
  const [liked, setLiked] = useState<boolean>(false);
  const [commentText, setCommentText] = useState('');
  const [likeCount, setLikeCount] = useState<number>(0);
  const currentUserId = getAuth().currentUser?.uid;
  const [userNametag, setUserNameTag] = useState<string[]>([]);
  const [tag, setTag] = useState<Tag | null>();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [commentCount, setCommentCount] = useState<number>(0);
  const [createdAt, setCreatedAt] = useState<number>(0);
  const [postImage, setPostImage] = useState<string[]>([]);
  const [content, setContent] = useState<string>('');

  const [postDetails, setPostDetails] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);

  const onTextChange = (text: string) => {
    setCommentText(text);
  };

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

  // Kiểm tra trạng thái like ban đầu
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

  const findAdminByUserId = async (userId: string) => {
    const db = getDatabase();
    const adminPaths = ['AdminDefaults', 'AdminDepartments', 'AdminBusinesses'];

    for (const path of adminPaths) {
      const adminRef = ref(db, `Admins/${path}/${userId}`);
      const snapshot = await get(adminRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        setUserPostName(data.fullName || 'No name');
        setAvatar(data.avatar || '');
        setLoading(false);
        return;
      }
    }

    setLoading(false);
  };

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
        setComments(commentList);
      } else {
        setCommentCount(0);
        setComments([]);
      }
    });
  };

  useEffect(() => {
    fetchComments();
    findAdminByUserId(userPostId);
  }, [userPostId]);

  const iconPaths = {
    like: require('../icons/icon_like.png'),
    like_active: require('../icons/icon_like_active.png'),
    comment: require('../icons/icon_comment.png'),
    share: require('../icons/icon_share.png'),
  };

  useEffect(() => {
    const fetchPost = async () => {
      const db = getDatabase();
      const postRef = ref(db, `Posts/${groupId}/${userPostId}/${postId}`);

      try {
        const snapshot = await get(postRef);
        if (snapshot.exists()) {
          const postData = snapshot.val();
          setPostImage(postData.postImage || []);
          setContent(postData.content || '');
          setCreatedAt(postData.createAt || Date.now());
          setLikeCount(postData.postLike?.count || 0);
          setPostDetails(postData);
        } else {
          console.log('Bài viết không tồn tại');
        }
      } catch (error) {
        console.error('Lỗi khi lấy bài viết:', error);
      }
    };

    fetchPost();
  }, [postId, userPostId]);

  if (!postDetails) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Đang tải...</Text>
      </View>
    );
  }

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

  const findUserByUserIdReply = async (userId: string) => {
    try {
      // 1. Tìm trong Students
      const studentSnapshot = await get(child(ref(database), `Users/${userId}`));
      if (studentSnapshot.exists()) {
        const data = studentSnapshot.val();
        setUserNameTag(data.studentName || 'No name');
        setLoading(false);
        return;
      }

      // 2. Tìm trong Admins theo các nhánh
      const adminPaths = ['AdminDefaults', 'AdminDepartments', 'AdminBusinesses'];
      for (let path of adminPaths) {
        const adminSnapshot = await get(child(ref(database), `Admins/${path}/${userId}`));
        if (adminSnapshot.exists()) {
          const data = adminSnapshot.val();
          setUserNameTag(data.fullName || 'No name');
          setLoading(false);
          return;
        }
      }

      // 3. Không tìm thấy ai
      console.log('Không tìm thấy userId ở Students hoặc Admins:', userId);
    } catch (err) {
      console.error('Lỗi khi tìm user:', err);
    } finally {
      setLoading(false);
    }
  };


  const handleComment = async () => {
    if (!commentText.trim()) return;

    if (tag != null) {
      // Xử lý khi có tag
      const db = getDatabase();
      const replyRef = ref(db, `Posts/${groupId}/${userPostId}/${postId}/comments/commentData/${tag.commentId}/replies/replyData`);
      const newReplyRef = push(replyRef);

      const replyData = {
        content: commentText,
        createdAt: Date.now(),
        replyLike: 0,
        replyId: newReplyRef.key || '',
        userReplyId: currentUserId || '',
      };

      await set(newReplyRef, replyData);

      // Cập nhật lại count
      const countRef = ref(db, `Posts/${groupId}/${userPostId}/${postId}/comments/commentData/${tag.commentId}/replies/count`);
      await get(countRef).then(snapshot => {
        const currentCount = snapshot.exists() ? snapshot.val() : 0;
        set(countRef, currentCount + 1);
      });

      setTag(null);
    }
    else {
      const db = getDatabase();
      const commentDataRef = ref(db, `Posts/${groupId}/${userPostId}/${postId}/comments/commentData`);
      const newCommentRef = push(commentDataRef); // Đẩy vào commentData

      const commentData = {
        userCommentId: currentUserId || '',
        commentId: newCommentRef.key || '',
        content: commentText,
        commentCreateAt: Date.now(),
        commentLike: 0,
      };

      // Ghi dữ liệu bình luận
      await set(newCommentRef, commentData);

      // Cập nhật lại count
      const countRef = ref(db, `Posts/${groupId}/${userPostId}/${postId}/comments/count`);
      await get(countRef).then(snapshot => {
        const currentCount = snapshot.exists() ? snapshot.val() : 0;
        set(countRef, currentCount + 1);
      });
    }

    setCommentText('');
    Keyboard.dismiss();
  };


  // Xử lý khi nhấn vào icon bình luận
  const handleTagUser = (userTag: Tag) => {
    const userId = userTag.userReplyId !== '' ? userTag.userReplyId : userTag.userCommentId;
    findUserByUserIdReply(userId); // Gọi hàm tổng hợp

    console.log('Clicked:', userNametag); // Debug log

    setTag(userTag); // Gán hoặc cập nhật tag
  };


  const removeTag = () => {
    setTag(null); // Xóa tag
  };

  return (
    <View style={{ position: 'relative', height: '100%', paddingBottom: 100 }}>
      <HeaderBack />

      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.postCard}>
            <View style={styles.header}>
              <Image
                source={{ uri: avatar || 'https://tse3.mm.bing.net/th?id=OIP.gYaUpJvv-3E-stUjZ-Pd2AHaHa&pid=Api&P=0&h=180' }}
                style={styles.avatar}
              />
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{userPostName}</Text>
                <Text style={styles.postDate}>{formatDate(createdAt)}</Text>
              </View>

              <TouchableOpacity style={{ position: 'absolute', right: 10 }}>
                <Image source={require('../icons/icon_more.png')} style={{ width: 20, height: 20 }} />
              </TouchableOpacity>
            </View>

            <Text style={styles.postContent}>{content}</Text>

            {postImage.length > 0 && (
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
                  source={{ uri: postImage[currentImageIndex] }}
                  style={styles.postImage}
                  resizeMode="cover"
                />

                {currentImageIndex < postImage.length - 1 && (
                  <TouchableOpacity
                    style={styles.rightArrow}
                    onPress={() => setCurrentImageIndex(prev => Math.min(prev + 1, postImage.length - 1))}
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
              <TouchableOpacity style={styles.actionButton}>
                <Image source={iconPaths.comment} style={styles.icon} />
                <Text style={styles.actionText}>{commentCount}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Image source={iconPaths.share} style={styles.icon} />
                <Text style={styles.actionText}>0</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.commentsSection}>
            <Text style={styles.commentTitle}>Bình luận</Text>
            <ScrollView>
              {comments.map((comment) => (
                <ItemComment
                  groupId={groupId}
                  userPostId={userPostId}
                  key={comment.commentId}
                  commentId={comment.commentId}
                  commentCreateAt={comment.commentCreateAt}
                  commentLike={comment.commentLike}
                  userCommentId={comment.userCommentId}
                  content={comment.content}
                  postId={postId}
                  onTagUser={handleTagUser}
                />
              ))}
            </ScrollView>
          </View>
        </ScrollView>
      </View>

      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }}>
              {/* Phần comment dính dưới */}
              <View style={styles.inputContainer}>
                {/* Thẻ tag nằm trên phần nhập bình luận */}
                <View style={styles.tagsContainer}>
                  {tag &&
                    <Chip onClose={() => removeTag()}>
                      {userNametag}
                    </Chip>
                  }
                </View>

                {/* TextInput nằm dưới thẻ tag */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput
                    style={styles.input}
                    placeholder="Viết bình luận..."
                    value={commentText}
                    onChangeText={onTextChange}
                  />

                  <TouchableOpacity style={styles.sendButton} onPress={handleComment}>
                    <Text style={styles.sendButtonText}>Gửi</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
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
  container: {
    padding: 15,
    width: '100%',
  },
  inputContainer: {
    padding: 10,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap', // Để các thẻ không bị tràn ra ngoài màn hình
    marginBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postCard: {
    padding: 15,
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
    flex: 1,
  },
  userName: {
    fontWeight: 'bold',
  },
  postDate: {
    fontSize: 12,
    color: '#888',
  },
  postImage: {
    width: '100%',
    height: 200,
    marginVertical: 10,
    borderRadius: 10,
  },
  footer: {
    flexDirection: 'row',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  icon: {
    width: 20,
    height: 20,
    marginRight: 6,
  },
  commentsSection: {
    marginBottom: 20
  },
  commentTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    paddingTop: 10,
    paddingLeft: 5,
  },
  commentItem: {
    marginBottom: 15,
  },
  commentUser: {
    fontWeight: 'bold',
  },
  commentContent: {
    fontSize: 14,
    marginTop: 5,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold'
  },
});

export default CommentScreen;