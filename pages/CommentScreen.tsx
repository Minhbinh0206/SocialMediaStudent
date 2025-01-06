import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Keyboard, Platform } from 'react-native';
import { getDatabase, ref, get, set, query, orderByChild, equalTo, onValue, push } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../type'; // Đảm bảo import đúng RootStackParamList
import HeaderBack from '../components/HeaderBack';
import ItemComment from '../components/ItemComment';
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';
import { Chip } from 'react-native-paper';

interface Post {
  postId: string;
  userPostId: string;
  content: string;
  createdAt: string;
  postImage: string;
  postLike: number;
}

interface Comment {
  commentId: string;
  userCommentId: string;
  userPostId: string;
  content: string;
  commentCreateAt: string;
  commentLike: number;
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
  const [commentCount, setCommentCount] = useState<number>(0);

  const [postDetails, setPostDetails] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);

  const onTextChange = (text: string) => {
    setCommentText(text);
  };

  // Lắng nghe sự thay đổi của các bình luận và cập nhật lại tổng số bình luận
  useEffect(() => {
    const db = getDatabase();
    const commentRef = ref(db, `Comments/${userPostId}/${postId}`);

    // Lắng nghe sự thay đổi trong các bình luận của bài viết
    const commentCountUnsubscribe = onValue(commentRef, (snapshot) => {
      if (snapshot.exists()) {
        const commentsData = snapshot.val();
        const commentList = Object.keys(commentsData).map(key => ({
          ...commentsData[key],
          commentId: key,
        }));
        setCommentCount(commentList.length); // Cập nhật tổng số bình luận
        setComments(commentList); // Cập nhật danh sách bình luận
      } else {
        setCommentCount(0); // Nếu không có bình luận
      }
    });

    return () => {
      commentCountUnsubscribe(); // Hủy lắng nghe khi component unmount
    };
  }, [userPostId, postId]); // Chạy lại khi userPostId hoặc postId thay đổi

  // Cập nhật trạng thái thích theo thời gian thực
  useEffect(() => {
    const db = getDatabase();
    const likeCountRef = ref(db, `Posts/${userPostId}/${postId}/postLike`);

    const unsubscribe = onValue(likeCountRef, (snapshot) => {
      if (snapshot.exists()) {
        setLikeCount(snapshot.val());
      }
    });

    return () => unsubscribe();
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

  const findStudentByUserId = async (userId: string) => {
    const db = getDatabase();
    const studentsRef = ref(db, 'Students');
    const studentQuery = query(studentsRef, orderByChild('userId'), equalTo(userId));

    try {
      const snapshot = await get(studentQuery);

      if (snapshot.exists()) {
        const studentData = snapshot.val();
        const studentId = Object.keys(studentData)[0];
        setUserPostName(studentData[studentId].studentName);
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

  const fetchComments = async () => {
    const db = getDatabase();
    const commentsRef = ref(db, `Comments/${userPostId}/${postId}`);

    try {
      const snapshot = await get(commentsRef);
      if (snapshot.exists()) {
        const commentsData = snapshot.val();
        const commentList = Object.keys(commentsData).map(key => ({
          ...commentsData[key],
          commentId: key,
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
        setUserCommentNames(commentNames);
        setComments(commentList);
      } else {
        console.log('Không có bình luận nào');
      }
    } catch (error) {
      console.error('Lỗi khi lấy bình luận:', error);
    }
  };

  const iconPaths = {
    like: require('../icons/icon_like.png'),
    like_active: require('../icons/icon_like_active.png'),
    comment: require('../icons/icon_comment.png'),
    share: require('../icons/icon_share.png'),
  };

  useEffect(() => {
    fetchComments();
  }, [postId, userPostId]);

  useEffect(() => {
    findStudentByUserId(userPostId);
    checkLikeStatus();
  }, [userPostId]);

  useEffect(() => {
    const fetchPost = async () => {
      const db = getDatabase();
      const postRef = ref(db, `Posts/${userPostId}/${postId}`);

      try {
        const snapshot = await get(postRef);
        if (snapshot.exists()) {
          const postData = snapshot.val();
          setPostDetails(postData);
          setLikeCount(postData.postLike)
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

  const findStudentByUserIdReply = async (userId: string) => {
    const db = getDatabase();
    const studentsRef = ref(db, 'Students');
    const studentQuery = query(studentsRef, orderByChild('userId'), equalTo(userId));

    try {
      const snapshot = await get(studentQuery);

      if (snapshot.exists()) {
        const studentData = snapshot.val();
        const studentId = Object.keys(studentData)[0];
        setUserNameTag(studentData[studentId].studentName);
      } else {
        console.log('No student found with userId:', userId);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };
  
  const handleComment = async () => {
    if (!commentText.trim()) return;

    if (tag != null) {
      // Xử lý khi có tag
      const db = getDatabase();
      const replyRef = ref(db, `Reply/Comments/${userPostId}/${postId}/${tag.userCommentId}/${tag.commentId}`);
      const newReplyRef = push(replyRef);
  
      const replyData = {
        userPostId: tag.userPostId || '',
        postId: tag.postId || '',
        userCommentId: tag.userCommentId || '',
        commentId: tag.commentId || '',
        content: commentText,
        createdAt: new Date().toISOString(),
        replyLike: 0,
        replyId: newReplyRef.key || '',
        userReplyId: currentUserId || '',
      };
  
      await set(newReplyRef, replyData);

      setTag(null);
    }
    else {
      const db = getDatabase();
      const commentRef = ref(db, `Comments/${userPostId}/${postId}`);
      const newCommentRef = push(commentRef);
  
      const commentData = {
        userPostId: userPostId,
        userCommentId: currentUserId || '',
        commentId: newCommentRef.key || '',
        content: commentText,
        commentCreateAt: new Date().toISOString(),
        commentLike: 0,
      };
  
      await set(newCommentRef, commentData);
    }

    setCommentText('');
    Keyboard.dismiss();
  };

  const { postImage, content, createdAt } = postDetails;

  // Xử lý khi nhấn vào icon bình luận
  const handleTagUser = (userTag: Tag) => {
    if (userTag.userReplyId != '') {
      findStudentByUserIdReply(userTag.userReplyId);
    }
    else{
      findStudentByUserIdReply(userTag.userCommentId);
    }

    console.log('Clicked:', userNametag); // Kiểm tra log
    if (tag == null) {
      setTag(userTag); // Thêm tag nếu danh sách tag rỗng
    } else {
      setTag(userTag); // Cập nhật lại danh sách tag với một tag duy nhất
    }
  };  

  const removeTag = () => {
    setTag(null); // Xóa tag
  };


  return (
    <View style={{ position: 'relative', height: '100%', paddingBottom: 100 }}>
      <HeaderBack title="Bình luận" pageName='Comment' />

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

            {postImage && <Image source={{ uri: postImage }} style={styles.postImage} />}
            <Text style={styles.postContent}>{content}</Text>

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