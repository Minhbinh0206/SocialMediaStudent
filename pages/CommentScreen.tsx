import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Keyboard, Platform } from 'react-native';
import { getDatabase, ref, get, set, onValue, push, child, update } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../type';
import HeaderBack from '../components/HeaderBack';
import ItemComment from '../components/ItemComment';
import { Chip } from 'react-native-paper';
import { database } from '../firebaseConfig';
import ItemPost from '../components/ItemPost';

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
  const { postId, userPostId, groupId = '' } = route.params;
  const currentUserId = getAuth().currentUser?.uid;
  const [commentText, setCommentText] = useState('');
  const [userNametag, setUserNameTag] = useState<string[]>([]);
  const [tag, setTag] = useState<Tag | null>(null);
  const [postDetails, setPostDetails] = useState<PostProps | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);

  const onTextChange = (text: string) => setCommentText(text);

  const fetchComments = async () => {
    const db = getDatabase();
    const commentsRef = ref(db, `Posts/${groupId}/${userPostId}/${postId}/comments`);
    onValue(commentsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const commentsObject = data.commentData || {};
        const commentList: Comment[] = Object.values(commentsObject)
          .map((item: any): Comment => ({
            commentId: item.commentId,
            userCommentId: item.userCommentId,
            content: item.content,
            commentCreateAt: item.commentCreateAt,
            commentLike: item.commentLike,
            onReplyPress: () =>
              handleTagUser({
                commentId: item.commentId,
                userCommentId: item.userCommentId,
                userReplyId: '',
                userPostId,
                postId,
              }),
          }))
          .sort((a, b) => a.commentCreateAt - b.commentCreateAt);

        setComments(commentList);
      } else {
        setComments([]);
      }
    });
  };

  useEffect(() => {
    fetchComments();
  }, [userPostId]);

  useEffect(() => {
    const fetchPost = async () => {
      const db = getDatabase();
      const postRef = ref(db, `Posts/${groupId}/${userPostId}/${postId}`);
      try {
        const snapshot = await get(postRef);
        if (snapshot.exists()) {
          const postData = snapshot.val();
          setPostDetails(postData);
        }
      } catch (e) {
        console.error('Lỗi khi lấy bài viết:', e);
      }
    };

    fetchPost();
  }, [postId, userPostId]);

  const findUserByUserIdReply = async (userId: string) => {
    try {
      const studentSnapshot = await get(child(ref(database), `Users/${userId}`));
      if (studentSnapshot.exists()) {
        const data = studentSnapshot.val();
        setUserNameTag(data.studentName || 'No name');
        return;
      }

      const adminPaths = ['AdminDefaults', 'AdminDepartments', 'AdminBussinesses'];
      for (let path of adminPaths) {
        const adminSnapshot = await get(child(ref(database), `Admins/${path}/${userId}`));
        if (adminSnapshot.exists()) {
          const data = adminSnapshot.val();
          setUserNameTag(data.fullName || 'No name');
          return;
        }
      }

      console.log('Không tìm thấy user:', userId);
    } catch (e) {
      console.error('Lỗi khi tìm user:', e);
    }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;

    const db = getDatabase();
    const commentRoot = `Posts/${groupId}/${userPostId}/${postId}/comments`;
    const defaultRoot = `PostDefaults/${postId}/comments`;

    if (tag) {
      const replyListPath = `${commentRoot}/commentData/${tag.commentId}/replies/replyData`;
      const newReplyRef = push(ref(db, replyListPath));
      const replyId = newReplyRef.key!;
      const replyData = {
        content: commentText,
        createdAt: Date.now(),
        replyLike: 0,
        replyId,
        userReplyId: currentUserId,
      };

      const countSnap = await get(ref(db, `${commentRoot}/commentData/${tag.commentId}/replies/count`));
      const current = countSnap.exists() ? countSnap.val() : 0;
      const newCount = current + 1;

      await update(ref(db), {
        [`${replyListPath}/${replyId}`]: replyData,
        [`${defaultRoot}/commentData/${tag.commentId}/replies/replyData/${replyId}`]: replyData,
        [`${commentRoot}/commentData/${tag.commentId}/replies/count`]: newCount,
        [`${defaultRoot}/commentData/${tag.commentId}/replies/count`]: newCount,
      });

      setTag(null);
    } else {
      const commentListPath = `${commentRoot}/commentData`;
      const newCommentRef = push(ref(db, commentListPath));
      const commentId = newCommentRef.key!;
      const commentData = {
        userCommentId: currentUserId,
        commentId,
        content: commentText,
        commentCreateAt: Date.now(),
        commentLike: 0,
      };

      const countSnap = await get(ref(db, `${commentRoot}/count`));
      const current = countSnap.exists() ? countSnap.val() : 0;
      const newCount = current + 1;

      await update(ref(db), {
        [`${commentListPath}/${commentId}`]: commentData,
        [`${defaultRoot}/commentData/${commentId}`]: commentData,
        [`${commentRoot}/count`]: newCount,
        [`${defaultRoot}/count`]: newCount,
      });
    }

    setCommentText('');
    Keyboard.dismiss();
  };

  const handleTagUser = (userTag: Tag) => {
    const userId = userTag.userReplyId !== '' ? userTag.userReplyId : userTag.userCommentId;
    findUserByUserIdReply(userId);
    setTag(userTag);
  };

  const removeTag = () => setTag(null);

  if (!postDetails) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={{ position: 'relative', height: '100%', paddingBottom: 100 }}>
      <HeaderBack namePage="Bình luận bài viết" />

      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <ItemPost
            content={postDetails.content}
            createAt={postDetails.createAt}
            groupId={groupId}
            postId={postId}
            postImage={postDetails.postImage}
            userPostId={userPostId}
            postLike={postDetails.postLike}
            postMark={postDetails.postMark}
          />

          <View style={styles.commentsSection}>
            <Text style={styles.commentTitle}>Bình luận</Text>
            {comments.map((comment) => (
              <ItemComment
                key={comment.commentId}
                groupId={groupId}
                userPostId={userPostId}
                commentId={comment.commentId}
                commentCreateAt={comment.commentCreateAt}
                commentLike={comment.commentLike}
                userCommentId={comment.userCommentId}
                content={comment.content}
                postId={postId}
                onTagUser={handleTagUser}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity onPress={Keyboard.dismiss}>
            <View style={styles.inputContainer}>
              <View style={styles.tagsContainer}>
                {tag && <Chip onClose={removeTag}>{userNametag}</Chip>}
              </View>

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
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 15, width: '100%' },
  inputContainer: {
    padding: 10,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentsSection: { marginBottom: 20 },
  commentTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    paddingTop: 10,
    paddingLeft: 5,
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
    fontWeight: 'bold',
  },
});

export default CommentScreen;
