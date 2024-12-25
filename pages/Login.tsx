import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ImageBackground } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../type';
import { database, auth } from '../firebaseConfig'; // Import auth và database từ firebaseConfig
import { ref, get } from "firebase/database"; // Import phương thức get để đọc dữ liệu từ Firebase Realtime Database
import { signInWithEmailAndPassword } from 'firebase/auth'; // Import phương thức đăng nhập của Firebase

// Define the navigation prop type
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [users, setUsers] = useState<any[]>([]); // State để lưu dữ liệu người dùng
  const navigation = useNavigation<NavigationProp>();

  // Hàm tìm user trong 'Students' với key là UID của Firebase Auth
  const findUserByUid = (uid: string): Promise<any | null> => {
    return new Promise((resolve, reject) => {
      const userRef = ref(database, `Students/${uid}`);
      get(userRef)
        .then((snapshot) => {
          if (snapshot.exists()) {
            const userData = snapshot.val();
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


  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập email và mật khẩu!');
      return;
    }
  
    // Đăng nhập bằng Firebase Auth
    signInWithEmailAndPassword(auth, email, password)
      .then(async (userCredential) => {
        const user = userCredential.user;
  
        try {
          // Tìm người dùng trong 'Students' với UID của Firebase Auth
          const userData = await findUserByUid(user.uid);  // Ensure this function resolves to user data
  
          if (userData) {
            if (!userData.studentName || userData.studentName.trim() === '') {
              navigation.navigate('UploadProfile', { userId: user.uid });
            } else {
              //navigation.navigate('Home');
              navigation.navigate('Home', { userId: user.uid });
            }
          } else {
            Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng!');
          }
        } catch (error) {
          Alert.alert('Lỗi', `Có lỗi xảy ra khi tìm kiếm người dùng`);
        }
      })
      .catch((error) => {
        Alert.alert('Thông báo', `Tài khoản hoặc mặt khẩu không chính xác:`);
      });
  };
  
  const handleSignUp = () => {
    navigation.navigate('Register');
  };

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
});

export default Login;
