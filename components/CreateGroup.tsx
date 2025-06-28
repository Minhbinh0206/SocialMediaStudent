import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, StyleSheet } from 'react-native';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getDatabase, ref as dbRef, push, set } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { RadioButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import databasee from '@react-native-firebase/database';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ImageLibraryOptions, launchImageLibrary } from 'react-native-image-picker';
import { RootStackParamList } from '../type';

const defaultAvatarImg = require('../images/avatar-default.png');
const defaultBannerImg = require('../images/banner-default.jpg');

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'CreateGroup'>;

const DEFAULT_QUESTIONS = [
  'Mục đích của bạn khi tham gia nhóm là gì?',
  'Bạn có tuân thủ nội quy của nhóm không?',
  'Bạn đã tham gia nhóm tương tự trước đây chưa?',
  'Bạn mong muốn điều gì từ nhóm này?',
  'Bạn có kinh nghiệm gì liên quan đến chủ đề của nhóm?',
  'Bạn sẽ đóng góp như thế nào cho nhóm?',
  'Bạn có sẵn sàng giúp đỡ thành viên khác không?',
  'Bạn có đồng ý với các nguyên tắc thảo luận của nhóm không?',
  'Bạn đã từng vi phạm quy định của nhóm nào trước đây không?',
  'Bạn mong muốn nhóm tổ chức những hoạt động gì?',
];

const CreateGroup = () => {
  const [groupName, setGroupName] = useState('');
  const [privacy, setPrivacy] = useState(false);
  const [avatar, setAvatar] = useState<string>('');
  const [banner, setBanner] = useState<string>('');
  const [question, setQuestion] = useState(DEFAULT_QUESTIONS[0]);
  const [studentName, setStudentName] = useState('');
  const [studentAvatar, setStudentAvatar] = useState('');

  const auth = getAuth();
  const database = getDatabase();
  const storage = getStorage();
  const navigation = useNavigation<NavigationProp>();
  const currentUserId = auth.currentUser?.uid;

  const uploadImage = async (uri: string, pathInBucket: string) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const storageRef = ref(storage, pathInBucket);
    await uploadBytes(storageRef, blob);
    return getDownloadURL(storageRef);
  };

  useEffect(() => {
    if (!currentUserId) return;
    databasee()
      .ref(`/Users/${currentUserId}`)
      .once('value')
      .then((snap) => {
        if (snap.exists()) {
          const d = snap.val();
          setStudentName(d.studentName || 'Không có tên');
          setStudentAvatar(d.avatar || 'URL_avatar_mặc_định');
        }
      });
  }, [currentUserId]);

  const swapQuestion = () => {
    let newQ;
    do {
      newQ = DEFAULT_QUESTIONS[Math.floor(Math.random() * DEFAULT_QUESTIONS.length)];
    } while (newQ === question);
    setQuestion(newQ);
  };

  const pickImage = (type: 'avatar' | 'banner') => {
    const options: ImageLibraryOptions = { mediaType: 'photo', quality: 1 };
    launchImageLibrary(options, (res) => {
      if (res.assets && res.assets.length > 0) {
        const uri = res.assets[0].uri;
        if (!uri) return;
        type === 'avatar' ? setAvatar(uri) : setBanner(uri);
      }
    });
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;

    const newGroupRef = push(dbRef(database, 'Groups'));
    const groupId = newGroupRef.key as string;

    const avatarSrcUri = avatar || Image.resolveAssetSource(defaultAvatarImg).uri;
    const bannerSrcUri = banner || Image.resolveAssetSource(defaultBannerImg).uri;

    const avatarUrl = await uploadImage(avatarSrcUri, `Group/avatar/${groupId}.jpg`);
    const bannerUrl = await uploadImage(bannerSrcUri, `Group/banner/${groupId}.jpg`);

    await set(newGroupRef, {
      groupId,
      groupName,
      avatar: avatarUrl,
      banner: bannerUrl,
      private: privacy,
      adminId: auth.currentUser?.uid,
      groupDefault: false,
    });

    if (privacy) {
      await set(dbRef(database, `Groups/${groupId}/question`), question);
    }

    databasee()
      .ref(`/Groups/${groupId}/members/${currentUserId}`)
      .set({ name: studentName, avatar: studentAvatar, role: 'Quản trị viên' });

    navigation.navigate('GroupDetailJoined', { groupId });
  };

  const today = new Date();
  const formattedDate = `Ngày khởi tạo: ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}`;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
        <TouchableOpacity style={styles.bannerImage} onPress={() => pickImage('banner')}>
          {banner ? (
            <Image source={{ uri: banner }} style={styles.imageBanner} />
          ) : (
            <Image source={defaultBannerImg} style={styles.imageBanner} />
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.avatarWrapper} onPress={() => pickImage('avatar')}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.imageAvatar} />
          ) : (
            <Image source={defaultAvatarImg} style={styles.imageAvatar} />
          )}
        </TouchableOpacity>

        <Text style={styles.createDate}>{formattedDate}</Text>

        <TextInput
          placeholder="Tên nhóm"
          value={groupName}
          onChangeText={setGroupName}
          style={styles.input}
        />

        <View style={styles.optionContainer}>
          <Text style={styles.optionTitle}>Chế độ nhóm</Text>
          <RadioButton.Group value={privacy ? 'private' : 'public'} onValueChange={(v) => setPrivacy(v === 'private')}>
            <View style={styles.optionRow}>
              <View style={styles.optionItem}>
                <RadioButton value="public" color="#0066FF" uncheckedColor="#B0B0B0" />
                <Text style={styles.optionText}>Công khai</Text>
              </View>
              <View style={styles.optionItem}>
                <RadioButton value="private" color="#0066FF" uncheckedColor="#B0B0B0" />
                <Text style={styles.optionText}>Riêng tư</Text>
              </View>
            </View>
          </RadioButton.Group>
        </View>

        {privacy && (
          <View style={styles.containerQuestion}>
            <TextInput
              style={styles.inputQuestion}
              placeholder="Câu hỏi xét duyệt"
              value={question}
              multiline
              onChangeText={setQuestion}
            />
            <TouchableOpacity onPress={swapQuestion}>
              <Image source={require('../icons/icon_swap.png')} style={styles.icon} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Quay về</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.createButton} onPress={handleCreateGroup}>
          <Text style={styles.createButtonText}>Tạo nhóm</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  bannerImage: {
    width: '100%', height: 160, borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12, backgroundColor: '#ccc', justifyContent: 'center', alignItems: 'center',
  },
  imageBanner: { width: '100%', height: '100%', borderRadius: 12 },
  avatarWrapper: {
    alignSelf: 'center', marginTop: -50, marginBottom: 10, borderWidth: 3, borderColor: '#fff',
    borderRadius: 60, overflow: 'hidden', width: 100, height: 100, backgroundColor: '#eee', justifyContent: 'center'
  },
  imageAvatar: { width: 100, height: 100, borderRadius: 60 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 12,
    paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, marginHorizontal: 16, marginTop: 10,
  },
  createDate: {
    marginHorizontal: 16, marginBottom: 10, fontSize: 14, color: '#666'
  },
  optionContainer: {
    marginHorizontal: 16, marginTop: 10, backgroundColor: '#fff', padding: 10, borderRadius: 12,
  },
  optionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#333' },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionItem: { flexDirection: 'row', alignItems: 'center', marginRight: 20 },
  optionText: { fontSize: 16, color: '#333' },
  containerQuestion: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1,
    borderColor: '#ccc', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 10,
    marginHorizontal: 16, marginVertical: 10,
  },
  inputQuestion: { flex: 1, fontSize: 16 },
  icon: { width: 22, height: 22, marginLeft: 10 },
  backButton: {
    backgroundColor: '#E0E0E0', paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', paddingHorizontal: 20,
  },
  backButtonText: { color: '#333', fontSize: 16, fontWeight: 'bold' },
  createButton: {
    backgroundColor: '#1877F2', paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', paddingHorizontal: 25,
  },
  createButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  buttonRow: {
    position: 'absolute', bottom: 20, left: 16, right: 16,
    flexDirection: 'row', justifyContent: 'space-between'
  },
});

export default CreateGroup;
