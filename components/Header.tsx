import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { getAuth } from 'firebase/auth'; // Firebase Auth
import { getDatabase, ref, get } from 'firebase/database'; // Firebase Realtime Database
import { NavigationProp, useNavigation } from '@react-navigation/native'; // Import useNavigation
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../type';

// Giả sử kiểu dữ liệu Student
type Student = {
  userId: string;
  studentName: string;
  email: string;
  avatar: string;
  gender: string;
};

type HomeHeaderProps = {
  title: string;
  pageName: string; // Nhận thêm prop để xác định trang
};

const Header: React.FC<HomeHeaderProps> = ({ title, pageName }) => {
  type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Default'>;

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [messageCount, setMessageCount] = useState<number>(5); // Giả lập số tin nhắn
  const [userName, setUserName] = useState<string | null>(null);
  const [gender, setGender] = useState<string | null>(null);
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    // Lấy UID của người dùng từ Firebase Authentication
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
      const currentUserUID = user.uid;
      // Truy vấn Firebase Realtime Database để lấy thông tin người dùng từ `students/{userId}`
      const db = getDatabase();
      const userRef = ref(db, 'Students/' + currentUserUID); // Giả sử các thông tin sinh viên được lưu trong `students/{userId}`

      get(userRef)
        .then((snapshot) => {
          if (snapshot.exists()) {
            const studentData = snapshot.val() as Student;
            setUserName(studentData.studentName); // Lấy tên người dùng
            setAvatarUrl(studentData.avatar || null); // Nếu không có avatar, sẽ set null
            setGender(studentData.gender || 'Khác');
          } else {
            console.log('Không tìm thấy người dùng');
          }
        })
        .catch((error) => {
          console.error('Lỗi lấy dữ liệu người dùng: ', error);
        });
    }
  }, []);

  // Hàm render icon động dựa trên trang
  const renderRightIcons = () => {
    switch (pageName) {
      case 'home': // Trang chủ
        return (
          <TouchableOpacity>
            <Image
              source={require('../icons/icon_message.png')}
              style={styles.iconImage}
            />
            {messageCount > 0 && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>{messageCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      case 'friend': // Trang bạn bè
        return (
          <TouchableOpacity onPress={handleSearch}>
            <Image
              source={require('../icons/icon_search.png')}
              style={styles.iconImage}
            />
          </TouchableOpacity>
        );
      case 'group': // Trang nhóm
        return (
          <TouchableOpacity>
            <Image
              source={require('../icons/icon_add.png')}
              style={styles.iconImage}
            />
          </TouchableOpacity>
        );
      case 'profile': // Trang cá nhân
        return (
          <TouchableOpacity>
            <Image
              source={require('../icons/icon_setting.png')}
              style={styles.iconImage}
            />
          </TouchableOpacity>
        );
      default:
        return null;
    }
  };

  // Hàm xác định avatar cần hiển thị
  const getAvatar = () => {
    if (avatarUrl) {
      return { uri: avatarUrl };
    }
    if (gender === 'Nam') {
      return require('../images/user_avatar_male.jpg'); // Avatar mặc định cho nam
    }
    if (gender === 'Nữ') {
      return require('../images/user_avatar_female.jpg'); // Avatar mặc định cho nữ
    }
    return require('../images/avatar_choose_default.jpg'); // Avatar mặc định nếu không có giới tính
  };

  const handleSearch = () => {
    navigation.navigate('SearchFriend');
  }

  return (
    <View style={styles.headerContainer}>
      <Text style={styles.titleHome}>{title}</Text>
      <View style={styles.rightContainer}>
        {renderRightIcons()}
        <Image source={getAvatar()} style={styles.avatar} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    width: '100%',
    height: 70,
    backgroundColor: '#3399FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleHome: {
    color: 'white',
    fontSize: 23,
    fontWeight: 'bold',
    paddingHorizontal: 10,
  },
  iconImage: {
    width: 30,
    height: 30,
    marginHorizontal: 10,
  },
  badgeContainer: {
    position: 'absolute',
    right: 3,
    top: -6,
    backgroundColor: 'red',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 10,
  },
});

export default Header;
