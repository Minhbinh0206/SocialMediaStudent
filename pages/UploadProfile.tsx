import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  ScrollView,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RadioButton } from 'react-native-paper';
import database from '@react-native-firebase/database';
import { ref, get } from '@react-native-firebase/database';
import { useRoute, RouteProp } from '@react-navigation/native';
import Modal from 'react-native-modal';
import { RootStackParamList } from '../type';
import { Image } from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';

// Xác định kiểu cho tham số route của màn hình UploadProfile
type UploadProfileRouteProp = RouteProp<RootStackParamList, 'UploadProfile'>;

const UploadProfile = () => {
  const route = useRoute<UploadProfileRouteProp>();
  const { userId } = route.params;
  const [avatar, setAvatar] = useState('');
  const [name, setName] = useState('');
  const [mssv, setMssv] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState('');
  const [className, setClassName] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [majorName, setMajorName] = useState('');
  const [classes, setClasses] = useState<{ label: string; value: string }[]>([]);
  const [departments, setDepartments] = useState<{ label: string; value: string }[]>([]);
  const [majors, setMajors] = useState<{ label: string; value: string }[]>([]);
  const [isModalClassVisible, setIsModalClassVisible] = useState(false);
  const [isModalDepartmentVisible, setIsModalDepartmentVisible] = useState(false);
  const [isModalMajorVisible, setIsModalMajorVisible] = useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedMajorId, setSelectedMajorId] = useState('');

  // Lấy dữ liệu người dùng
  useEffect(() => {
    if (userId) {
      const fetchUserData = async (userId: string) => {
        try {
          const userRef = ref(database(), `/Students/${userId}`); // Gọi đúng hàm để tạo ref
          const snapshot = await get(userRef); // Gọi đúng hàm để lấy dữ liệu
          if (snapshot.exists()) {
            const userData = snapshot.val();
            setName(userData.name || '');
            setMssv(userData.studentNumber || '');
            setEmail(userData.email || '');
          } else {
            console.log('No data available');
          }
        } catch (error) {
          console.error('Error fetching data:', error);
        }
      };

      fetchUserData(userId);
    }
  }, [userId]); // Chạy lại khi userId thay đổi

  // Lấy dữ liệu từ Firebase (Khoa)
  useEffect(() => {
    const fetchDepartment = async () => {
      try {
        const snapshot = await database().ref('/Departments').once('value');
        if (snapshot.exists()) {
          const data = snapshot.val();
          const list = Object.keys(data).map(key => ({
            label: data[key].departmentName,
            value: data[key].departmentId,
          }));
          setDepartments(list);
        }
      } catch (error) {
        console.error('Error fetching departments:', error);
      }
    };

    fetchDepartment();
  }, []);

  // Lấy Ngành dựa trên DepartmentId đã chọn
  useEffect(() => {
    const fetchMajor = async () => {
      try {
        const snapshot = await database()
          .ref(`/Majors`)
          .orderByChild('departmentId')
          .equalTo(selectedDepartmentId)
          .once('value');

        if (snapshot.exists()) {
          const data = snapshot.val();
          const list = Object.keys(data).map(key => ({
            label: data[key].majorName,
            value: data[key].majorId,
          }));
          setMajors(list);
        }
      } catch (error) {
        console.error('Error fetching majors:', error);
      }
    };

    fetchMajor();
  }, [selectedDepartmentId]);

  // Lấy Lớp dựa trên MajorId đã chọn
  useEffect(() => {
    if (!selectedMajorId) return;

    const fetchClasses = async () => {
      try {
        const snapshot = await database()
          .ref('/Classes')
          .orderByChild('majorId')
          .equalTo(selectedMajorId) // Giả sử bạn sẽ lưu ID ngành vào lớp
          .once('value');

        if (snapshot.exists()) {
          const data = snapshot.val();
          const classList = Object.keys(data).map(key => ({
            label: data[key].className,
            value: key,
          }));
          setClasses(classList);
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
      }
    };

    fetchClasses();
  }, [selectedMajorId]); // Chạy lại khi majorName thay đổi

  const handleDateChange = (_: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDob(selectedDate);
    }
  };

  const handleChooseAvatar = async () => {
    showImagePickerOptions();
  };
  
  const showImagePickerOptions = () => {
    Alert.alert(
      'Chọn ảnh',
      'Bạn muốn chọn ảnh từ ?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Camera', onPress: openCamera },
        { text: 'Thư viện ảnh', onPress: openImageLibrary },
      ],
    );
  };
  
  const openCamera = () => {
    launchCamera({ mediaType: 'photo' }, response => {
      console.log('Response from camera:', response);
      if (response.assets && response.assets.length > 0) {
        setAvatar(response.assets[0].uri || '');
      }
    });
  };
  
  const openImageLibrary = () => {
    launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 }, response => {
      console.log('Response from image library:', response);
      if (response.assets && response.assets.length > 0) {
        setAvatar(response.assets[0].uri || '');
      }
    });
  };

  const handleSubmit = () => {
    if (!name || !dob || !gender || !className || !majorName || !departmentName) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin!');
      return;
    }

    Alert.alert('Thông báo', 'Thông tin của bạn đã được lưu thành công!');
    // Thực hiện logic lưu thông tin vào Firebase hoặc xử lý khác ở đây
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Thông tin người dùng</Text>

      <TextInput
        style={styles.input}
        placeholder="Họ và tên"
        value={name}
        onChangeText={setName}
      />

      <TextInput
        style={styles.input}
        placeholder="Mã số sinh viên"
        value={mssv}
        onChangeText={setMssv}
        editable={false}
        selectTextOnFocus={false}
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        editable={false}
        selectTextOnFocus={false}
      />

      <TouchableOpacity
        style={styles.input}
        onPress={() => setShowDatePicker(true)}
      >
        <Text>{dob ? dob.toLocaleDateString() : 'Chọn ngày sinh'}</Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={dob}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}

      <View style={styles.genderContainer}>
        <Text style={styles.titleOption} >Giới tính:</Text>
        <RadioButton.Group onValueChange={setGender} value={gender}>
          <View style={styles.rowGender}>
            <View style={styles.genderOption}>
              <RadioButton value="Nam" color="#0066FF" uncheckedColor="#B0B0B0" />
              <Text style={styles.optionText}>Nam</Text>
            </View>
            <View style={styles.genderOption}>
              <RadioButton value="Nữ" color="#0066FF" uncheckedColor="#B0B0B0" />
              <Text style={styles.optionText}>Nữ</Text>
            </View>
            <View style={styles.genderOption}>
              <RadioButton value="Khác" color="#0066FF" uncheckedColor="#B0B0B0" />
              <Text style={styles.optionText}>Khác</Text>
            </View>
          </View>
        </RadioButton.Group>
      </View>

      {/* Modal for Department */}
      <Modal isVisible={isModalDepartmentVisible} onBackdropPress={() => setIsModalDepartmentVisible(false)}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Chọn Khoa</Text>
          <ScrollView contentContainerStyle={styles.scrollViewContent}>
            {departments.map(department => (
              <TouchableOpacity
                key={department.value}
                style={styles.modalItem}
                onPress={() => {
                  setDepartmentName(department.label);
                  setIsModalDepartmentVisible(false);
                  setSelectedDepartmentId(department.value)
                  setMajorName('');
                  setClassName('');
                }}
              >
                <Text>{department.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Modal for Major */}
      <Modal isVisible={isModalMajorVisible} onBackdropPress={() => setIsModalMajorVisible(false)}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Chọn Ngành</Text>
          <ScrollView contentContainerStyle={styles.scrollViewContent}>
            {majors.map(major => (
              <TouchableOpacity
                key={major.value}
                style={styles.modalItem}
                onPress={() => {
                  setMajorName(major.label);
                  setIsModalMajorVisible(false);
                  setSelectedMajorId(major.value)
                  setClassName('');
                }}
              >
                <Text>{major.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Modal for Class */}
      <Modal isVisible={isModalClassVisible} onBackdropPress={() => setIsModalClassVisible(false)}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Chọn Lớp</Text>
          <ScrollView contentContainerStyle={styles.scrollViewContent}>
            {classes.map(classItem => (
              <TouchableOpacity
                key={classItem.value}
                style={styles.modalItem}
                onPress={() => {
                  setClassName(classItem.label);
                  setIsModalClassVisible(false);
                }}
              >
                <Text>{classItem.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Department Selection Button */}
      <TouchableOpacity
        style={styles.input}
        onPress={() => {
          setIsModalDepartmentVisible(true);

        }}
      >
        <Text>{departmentName || 'Chọn Khoa'}</Text>
      </TouchableOpacity>

      {/* Major Selection Button */}
      <TouchableOpacity
        style={styles.input}
        onPress={() => departmentName && setIsModalMajorVisible(true)} // Only show if department is selected
      >
        <Text>{majorName || 'Chọn Ngành'}</Text>
      </TouchableOpacity>

      {/* Class Selection Button */}
      <TouchableOpacity
        style={styles.input}
        onPress={() => majorName && setIsModalClassVisible(true)} // Only show if major is selected
      >
        <Text>{className || 'Chọn Lớp'}</Text>
      </TouchableOpacity>

      {/* Chọn ảnh đại diện */}
      <View style={styles.avatarContainer}>
        <TouchableOpacity onPress={handleChooseAvatar}>
          <Image
            source={avatar ? { uri: avatar } : require('../images/avatar_choose_default.jpg')}
            style={styles.avatar}
          />
        </TouchableOpacity>
        <Text style={styles.avatarText}>Chọn ảnh đại diện</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Lưu thông tin</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 30,
    textAlign: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  avatarText: {
    marginTop: 10,
    fontSize: 14,
    color: '#555',
  },
  input: {
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
  },
  genderContainer: {
    marginVertical: 10,
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    filter: '#000',
  },
  rowGender: {
    flexDirection: 'row',
    alignItems: 'center',
    textAlign: 'center',
    marginHorizontal: 50
  },
  optionText: {
    marginLeft: 8,
    fontSize: 16,
  },
  titleOption: {
    fontSize: 16,
    marginHorizontal: 10
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContent: {
    width: '100%',
    maxHeight: 500,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
  },
  scrollViewContent: {
    paddingBottom: 10,
  },
  modalItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center'
  },
});

export default UploadProfile;
