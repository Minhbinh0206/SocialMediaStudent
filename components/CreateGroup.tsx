import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image } from 'react-native';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getDatabase, ref as dbRef, push, set } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { StyleSheet } from 'react-native';
import { RadioButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import databasee from '@react-native-firebase/database';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ImageLibraryOptions, launchImageLibrary, MediaType } from 'react-native-image-picker';
import { RootStackParamList } from '../type';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'CreateGroup'>;

const DEFAULT_QUESTIONS = [
    "Mục đích của bạn khi tham gia nhóm là gì?",
    "Bạn có tuân thủ nội quy của nhóm không?",
    "Bạn đã tham gia nhóm tương tự trước đây chưa?",
    "Bạn mong muốn điều gì từ nhóm này?",
    "Bạn có kinh nghiệm gì liên quan đến chủ đề của nhóm?",
    "Bạn sẽ đóng góp như thế nào cho nhóm?",
    "Bạn có sẵn sàng giúp đỡ thành viên khác không?",
    "Bạn có đồng ý với các nguyên tắc thảo luận của nhóm không?",
    "Bạn đã từng vi phạm quy định của nhóm nào trước đây không?",
    "Bạn mong muốn nhóm tổ chức những hoạt động gì?"
];

const CreateGroup = () => {
    const [groupName, setGroupName] = useState('');
    const [description, setDescription] = useState('');
    const [privacy, setPrivacy] = useState(false);
    const [avatar, setAvatar] = useState<string>('');
    const [banner, setBanner] = useState<string>('');
    const [question, setQuestion] = useState(DEFAULT_QUESTIONS[0]); // Câu hỏi mặc định ban đầu
    const [isJoining, setIsJoining] = useState(false);
    const [isJoined, setIsJoined] = useState(false);
    const [studentName, setStudentName] = useState("");
    const [studentAvatar, setStudentAvatar] = useState("");

    const auth = getAuth();
    const database = getDatabase();
    const storage = getStorage();
    const navigation = useNavigation<NavigationProp>();
    const currentUserId = auth.currentUser?.uid;

    // 🔹 Upload ảnh lên Firebase Storage
    const uploadImage = async (uri: string, path: string) => {
        if (!uri) return '';
        const response = await fetch(uri);
        const blob = await response.blob();
        const storageRef = ref(storage, `${path}/${Date.now()}`);
        await uploadBytes(storageRef, blob);
        return await getDownloadURL(storageRef);
    };

    useEffect(() => {
        if (!currentUserId) return;

        const studentRef = databasee().ref(`/Students/${currentUserId}`);

        studentRef.once('value').then(snapshot => {
            if (snapshot.exists()) {
                const studentData = snapshot.val();
                setStudentName(studentData.studentName || "Không có tên");
                setStudentAvatar(studentData.avatar || "URL_avatar_mặc_định");
            }
        });
    }, [currentUserId]);

    const swapQuestion = () => {
        let newQuestion;
        do {
            newQuestion = DEFAULT_QUESTIONS[Math.floor(Math.random() * DEFAULT_QUESTIONS.length)];
        } while (newQuestion === question); // Đảm bảo không bị trùng với câu hiện tại
        setQuestion(newQuestion);
    };

    const pickImage = async (type: 'avatar' | 'banner') => {
        const options: ImageLibraryOptions = {
            mediaType: 'photo', 
            quality: 1,
        };
        
        launchImageLibrary(options, response => {
            if (response.assets && response.assets.length > 0) {
                const selectedImageUri = response.assets[0].uri;
                
                if (selectedImageUri) { // Kiểm tra không phải undefined
                    if (type === 'avatar') {
                        setAvatar(selectedImageUri);
                    } else {
                        setBanner(selectedImageUri);
                    }
                }
            }
        });
    };
    
    // 🔹 Xử lý tạo nhóm
    const handleCreateGroup = async () => {
        if (!groupName.trim()) {
            return;
        }

        const avatarUrl = await uploadImage(avatar, 'avatar');
        const bannerUrl = await uploadImage(banner, 'banner');

        const newGroupRef = push(dbRef(database, 'Groups')); // 🔹 Tạo ID nhóm tự động trong Database
        const groupId = newGroupRef.key;

        await set(newGroupRef, {
            groupId: groupId,
            groupName: groupName,
            avatar: avatarUrl || 'default_avatar_url', // Nếu không có ảnh thì dùng mặc định
            banner: bannerUrl || 'default_banner_url',
            private: privacy,
            adminId: auth.currentUser?.uid,
            groupDefault: false,
        });

        if (privacy) {
            // Nếu nhóm riêng tư thì thêm câu hỏi xét duyệt
            await set(dbRef(database, `Groups/${groupId}/question`), question);
        }

        // Reset form
        setGroupName('');
        setDescription('');
        setAvatar('');
        setBanner('');
        setPrivacy(false);

        setIsJoining(true);

        databasee()
            .ref(`/Groups/${groupId}/members/${currentUserId}`)
            .set({
                name: studentName,
                avatar: studentAvatar,
                role: 'Quản trị viên',
            })
            .then(() => {
                setIsJoined(true);
            })
            .finally(() => setIsJoining(false));

        navigation.navigate("GroupDetailJoined", { groupId: groupId ?? "" });
    };

    return (
        <View style={{ flex: 1, padding: 20 }}>
            <Text style={styles.header}>Tạo Nhóm</Text>

            {/* Nhập tên nhóm */}
            <TextInput placeholder="Tên nhóm" value={groupName} onChangeText={setGroupName} style={styles.input} />

            {/* Chọn avatar */}
            <TouchableOpacity style={styles.imagePickerAvatar} onPress={() => pickImage('avatar')}>
                {avatar ? <Image source={{ uri: avatar }} style={styles.imageAvatar} /> : <Text>Chọn Avatar</Text>}
            </TouchableOpacity>

            {/* Chọn banner */}
            <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage('banner')}>
                {banner ? <Image source={{ uri: banner }} style={styles.imageBanner} /> : <Text>Chọn Banner</Text>}
            </TouchableOpacity>

            {/* Chế độ nhóm */}
            <View style={styles.optionContainer}>
                <Text style={styles.optionTitle}>Chế độ</Text>
                <RadioButton.Group onValueChange={(value) => setPrivacy(value === 'private')}
                    value={privacy ? 'private' : 'public'}>
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

            {/* Nếu nhóm riêng tư thì có thêm câu hỏi xét duyệt */}
            {privacy === true && (
                <View style={styles.containerQuestion}>
                    <TextInput
                        style={styles.inputQuestion}
                        placeholder="Câu hỏi xét duyệt"
                        value={question}
                        multiline={true}
                        onChangeText={setQuestion}
                    />
                    <TouchableOpacity onPress={swapQuestion}>
                        <Image source={require('../icons/icon_swap.png')} style={styles.icon} />
                    </TouchableOpacity>
                </View>
            )}

            {/* Nút tạo nhóm */}
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
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
    header: {
        fontSize: 23,
        fontWeight: 'bold',
        textAlign: 'center',
        margin: 20,
    },
    input: {
        maxWidth: '100%',
        flexDirection: 'row',
        marginVertical: 5,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    imagePicker: {
        marginVertical: 10,
        height: 120,
        width: '100%',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f8f8',
    },
    imagePickerAvatar: {
        marginVertical: 10,
        height: 150,
        width: '40%',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f8f8',
    },
    imageAvatar: {
        width: 200,
        height: 200,
        borderRadius: 10,
    },
    imageBanner: {
        width: '100%',
        height: '100%',
        borderRadius: 10,
    },
    containerQuestion: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 20,
        paddingHorizontal: 15,
        marginVertical: 10,
        width: '100%',
        justifyContent: 'space-between',
    },
    inputQuestion: {
        flex: 1,
    },
    icon: {
        width: 20,
        height: 20,
        marginLeft: 10,
    },
    optionContainer: {
        marginTop: 15,
        marginHorizontal: 5,
        justifyContent: 'space-around',
    },
    optionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    optionItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 20,
    },
    optionText: {
        fontSize: 16,
    },
    createButton: {
        marginTop: 20,
        backgroundColor: '#0066FF',
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
        paddingHorizontal: 25,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    backButton: {
        marginTop: 20,
        backgroundColor: '#e2e5e9',
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    backButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default CreateGroup;
