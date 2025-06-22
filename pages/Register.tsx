import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, getAuth, onAuthStateChanged, sendEmailVerification } from 'firebase/auth';
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
  Modal,
  ActivityIndicator,
} from 'react-native';
import { RootStackParamList } from '../type';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Register'>;

const SignUp: React.FC = () => {
  const [mssv, setMssv] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigation = useNavigation<NavigationProp>();
  const [showModal, setShowModal] = useState(false);


  useEffect(() => {
    setEmail(mssv ? `${mssv}@mail.tdc.edu.vn` : '');
  }, [mssv]);

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  const handleSignUp = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await sendEmailVerification(user);

      const userRef = ref(database, `Users/${user.uid}`);
      await set(userRef, {
        avatar: '',
        classId: '',
        departmentId: '',
        majorId: '',
        isOnline: false,
        description: '',
        birthday: '',
        gender: '',
        studentName: '',
        studentNumber: mssv,
        email: user.email,
        userId: user.uid,
        createdAt: Date.now(),
      });

      setShowModal(true);

    } catch (error: any) {
      Alert.alert('Lỗi đăng ký', error.message);
    }
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
          keyboardType="numeric" // Chỉ cho nhập số
          onChangeText={(text) => setMssv(text.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
        />
        <TextInput
          style={[styles.input, { backgroundColor: '#ddd' }]}
          placeholder="Email"
          value={email}
          editable={false} // Không cho chỉnh sửa email
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
          <Text style={styles.registerText}>Bạn đã có tài khoản? </Text>
          <TouchableOpacity onPress={handleLogin}>
            <Text style={styles.registerLink}>Đăng nhập ngay</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSignUp}>
          <Text style={styles.buttonText}>Đăng ký</Text>
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
  background: { flex: 1 },
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
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#007bff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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

export default SignUp;
