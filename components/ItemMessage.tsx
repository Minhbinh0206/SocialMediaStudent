import { getAuth } from 'firebase/auth';
import { get, getDatabase, ref } from 'firebase/database';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

const ItemMessage: React.FC<{ content: string, type: string, createAt: string, userId: string, showAvatar: boolean }> = ({ content, type, createAt, userId, showAvatar }) => {
  // Kiểm tra type để quyết định người gửi hoặc nhận tin nhắn
  const isSender = type === 'Send'; // Nếu type là 'Send', là tin nhắn gửi
  const currentUserId = getAuth().currentUser?.uid;
  const [friendAvatar, setFriendAvatar] = useState('');
  const [myAvatar, setMyAvatar] = useState('');
  const [isVisible, setIsVisible] = useState(false); // State để kiểm tra xem CreateAt có hiển thị không

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

  // Xử lý sự kiện khi nhấn vào tin nhắn
  const handleItemPress = () => {
    setIsVisible(!isVisible); // Đổi trạng thái hiển thị
  };

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const db = getDatabase(); // Kết nối database
        const studentRef = ref(db, `Students/${userId}`); // Tham chiếu đến node Students và id

        const snapshot = await get(studentRef);
        if (snapshot.exists()) {
          const studentData = snapshot.val();
          setFriendAvatar(studentData.avatar);
        } else {
          // Handle case when no data found
        }
      } catch (error) {
        console.error('Lỗi khi tải sinh viên:', error);
      }
    };

    fetchStudent();
  }, [userId]);

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const db = getDatabase(); // Kết nối database
        const studentRef = ref(db, `Students/${currentUserId}`); // Tham chiếu đến node Students và id

        const snapshot = await get(studentRef);
        if (snapshot.exists()) {
          const studentData = snapshot.val();
          setMyAvatar(studentData.avatar);
        } else {
          // Handle case when no data found
        }
      } catch (error) {
        console.error('Lỗi khi tải sinh viên:', error);
      }
    };

    fetchStudent();
  }, [currentUserId]);

  return (
    <View style={[styles.container, isSender ? styles.senderContainer : styles.receiverContainer]}>
      <TouchableOpacity onPress={handleItemPress} style={isSender ? styles.messageWrapperSender : styles.messageWrapperReceive}>
        {showAvatar ? (
          <Image
            source={{ uri: isSender ? myAvatar : friendAvatar }}
            style={styles.avatar}
          />
        ) : (
          <View
            style={[styles.avatar, { opacity: 0 }]} // Ẩn hình ảnh hoặc tạo hiệu ứng ẩn
          />
        )}
        <View style={[styles.messageBubble, isSender ? styles.senderBubble : styles.receiverBubble]}>
          <Text style={[styles.content, isSender ? styles.senderText : styles.receiverText]}>
            {content}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Hiển thị thông tin thời gian khi click vào item */}
      {isVisible && (
        <Text style={[styles.timestamp, isSender ? styles.timestampSender : styles.timestampReceiver]}>
          {formatDate(createAt)}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 5,
    marginHorizontal: 10,
    flexDirection: 'column',  // Sửa lại flexDirection thành 'row' thay vì 'column-reverse'
    alignItems: 'flex-start',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginHorizontal: 5,
  },
  senderContainer: {
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
  },
  receiverContainer: {
    justifyContent: 'flex-start',
    alignSelf: 'flex-start',
  },
  content: {
    fontSize: 14,
    paddingHorizontal: 10,
    textAlign: 'left',
  },
  senderText: {
    color: '#fff', // Màu chữ trắng cho tin nhắn gửi
  },
  receiverText: {
    color: '#000', // Màu chữ đen cho tin nhắn nhận
  },
  timestamp: {
    fontSize: 12,
    color: '#888',
  },
  timestampSender: {
    textAlign: 'right',
    marginRight: 10,
  },
  timestampReceiver: {
    textAlign: 'left',
    marginLeft: 10,
  },
  senderBubble: {
    backgroundColor: '#0084FF', // Màu nền xanh cho tin nhắn gửi
    borderRadius: 15,
    maxWidth: '75%',
  },
  receiverBubble: {
    backgroundColor: '#E5E5EA', // Màu nền xám cho tin nhắn nhận
    borderRadius: 15,
    maxWidth: '75%',
  },
  messageBubble: {
    padding: 10,
    borderRadius: 15,
  },
  messageWrapperSender: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  messageWrapperReceive: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default ItemMessage;
