import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { auth, database } from '../firebaseConfig';
import { ref, set } from 'firebase/database';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ImageBackground,
} from 'react-native';
import { RootStackParamList } from '../type';

// Define the navigation prop type
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Register'>;

const SignUp: React.FC = () => {
  const [mssv, setMssv] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigation = useNavigation<NavigationProp>(); // Type the navigation object

  const handleSignUp = async () => {
    if (!mssv || !email || !password || !confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin!');
      return;
    }
  
    if (password !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu và xác nhận mật khẩu không khớp!');
      return;
    }
  
    try {
      // Đăng ký tài khoản với Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
  
      // Tạo dữ liệu người dùng trong Realtime Database
      await set(ref(database, `Students/${user.uid}`), {
        avatar: '',
        classId: '',
        departmentId: '',
        majorId: '',
        isOnline: false,
        birthday: '',
        gender: '',
        studentName: '',
        studentNumber: mssv,
        email: email,
        password: password,
        roleId: 5,
      });
  
      navigation.navigate('UploadProfile', { userId: user.uid });
    } catch (error) {
      Alert.alert('Thông báo', 'Tài khoản đã tồn tại');
    }
  };

  const handleLogin = () => {
    navigation.navigate('Login'); // Now TypeScript knows 'Register' is a valid route
  };

  return (
    <ImageBackground
      source={require('../images/nen_background.jpg')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.container}>
        <Text style={styles.title}>Đăng ký</Text>

        <TextInput
          style={styles.input}
          placeholder="MSSV"
          value={mssv}
          onChangeText={setMssv}
        />

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

        <TextInput
          style={styles.input}
          placeholder="Xác nhận mật khẩu"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Đã có tài khoản? </Text>
          <TouchableOpacity onPress={handleLogin}>
            <Text style={styles.registerLink}>Đăng nhập ngay</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSignUp}>
          <Text style={styles.buttonText}>Đăng ký</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Hiệu ứng làm tối nền
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
    marginTop: 12
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

export default SignUp;