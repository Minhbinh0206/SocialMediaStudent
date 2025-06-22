import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ImageBackground, ActivityIndicator, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../type';
import { database, auth } from '../firebaseConfig'; // Import auth và database từ firebaseConfig
import { ref, get, set } from "firebase/database"; // Import phương thức get để đọc dữ liệu từ Firebase Realtime Database
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth'; // Import phương thức đăng nhập của Firebase

// Define the navigation prop type
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [emailVerified, setEmailVerified] = useState('');
  const [password, setPassword] = useState('');
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(true); // Thêm trạng thái loading
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const checkAuthState = async () => {
      setLoading(true);

      const user = auth.currentUser;
      if (user) {
        console.log("✅ User đã đăng nhập trước đó:", user.uid);

        await user.reload();

        setShowModal(false); // Đã xác thực

        const userData = await findUserByUid(user.uid);
        if (!user.emailVerified) {
          console.log("⚠️ Email chưa xác thực!");
          setLoading(false);
          return; // ✅ Dừng ngay nếu chưa xác thực
        }
        else {
          if (userData) {
            if (!userData.studentName || userData.studentName.trim() === '') {
              navigation.navigate('UploadProfile', { userId: user.uid });
            } else {
              navigation.navigate('Home', { userId: user.uid });
            }
          } else {
            Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng!');
          }
        }
      }

      setLoading(false);
    };

    checkAuthState();

    // Kiểm tra xác thực mỗi 3s nếu cần
    const interval = setInterval(async () => {
      const user = auth.currentUser;
      if (user) {
        const userData = await findUserByUid(user.uid);
        await user.reload();
        console.log("🔄 Kiểm tra Email Verify:", user.emailVerified);

        if (user.emailVerified) {
          setShowModal(false);
          clearInterval(interval);
          if (userData) {
            if (!userData.studentName || userData.studentName.trim() === '') {
              navigation.navigate('UploadProfile', { userId: user.uid });
            } else {
              navigation.navigate('Home', { userId: user.uid });
            }
          } else {
            Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng!');
          }
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Hàm tìm user trong 'Students' với key là UID của Firebase Auth
  const findUserByUid = (uid: string): Promise<any | null> => {
    return new Promise((resolve, reject) => {
      const userRef = ref(database, `Users/${uid}`);
      get(userRef)
        .then((snapshot) => {
          if (snapshot.exists()) {
            const userData = snapshot.val();
            setEmailVerified(userData.email);
            resolve(userData);  // Trả về dữ liệu người dùng
          } else {
            console.log("No user data found for this UID.");
            resolve(null);  // Trả về null nếu không tìm thấy dữ liệu
          }
        })
        .catch((error) => {
          console.error("Error reading user data:", error);
          reject(error);  // Trả về lỗi nếu có vấn đề trong việc đọc dữ liệu
        });
    });
  };

  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
  
      await user.reload(); // cập nhật trạng thái emailVerified mới nhất
  
      const userRef = ref(database, `Users/${user.uid}`);
      const snapshot = await get(userRef);
  
      if (snapshot.exists()) {
        const userData = snapshot.val();
        const createdAt = userData.createdAt;
        const now = Date.now();
        const THIRTY_MINUTES = 30 * 60 * 1000;
  
        if (!user.emailVerified && createdAt && now - createdAt > THIRTY_MINUTES) {
          // Xóa khỏi Auth
          await user.delete().catch((err) => {
            console.error('Không thể xóa Auth user:', err.message);
          });
  
          // Xóa khỏi Realtime DB
          await set(userRef, null);
  
          Alert.alert(
            'Tài khoản bị xóa',
            'Bạn chưa xác thực email trong vòng 30 phút. Vui lòng đăng ký lại.'
          );
          return;
        }
  
        if (user.emailVerified) {
          // Chuyển vào app nếu email đã xác thực
          navigation.navigate('Home', { userId: user.uid });
        } else {
          setShowModal(true); // Hiện modal nếu email chưa xác thực
        }
  
      } else {
        Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng trong cơ sở dữ liệu.');
      }
  
    } catch (error: any) {
      Alert.alert('Lỗi đăng nhập', error.message);
    }
  };

  const handleSignUp = () => {
    navigation.navigate('Register');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }
  return (
    <ImageBackground
      source={require('../images/nen_background.jpg')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.container}>
        <Text style={styles.title}>Đăng nhập</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Mật khẩu"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Bạn chưa có tài khoản? </Text>
          <TouchableOpacity onPress={handleSignUp}>
            <Text style={styles.registerLink}>Đăng kí ngay</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Đăng nhập</Text>
        </TouchableOpacity>
      </View>
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>
              Đường link xác thực đã được gửi đến Email của bạn, hãy xác thực email để tiếp tục...
            </Text>
            <ActivityIndicator size="large" color="#007bff" />
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#fff',
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#007bff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
  },
  registerText: {
    color: '#fff',
    fontSize: 14,
  },
  registerLink: {
    color: '#FFFF33',
    fontSize: 14,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
});

export default Login;
