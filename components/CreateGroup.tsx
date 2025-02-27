import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image } from 'react-native';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getDatabase, ref as dbRef, push, set } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { StyleSheet } from 'react-native';
import { RadioButton } from 'react-native-paper';

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
    const [privacy, setPrivacy] = useState('public'); // ✅ Riêng tư hoặc công khai
    const [avatar, setAvatar] = useState<string>('');
    const [banner, setBanner] = useState<string>('');
    const [question, setQuestion] = useState(DEFAULT_QUESTIONS[0]); // Câu hỏi mặc định ban đầu

    const auth = getAuth();
    const database = getDatabase();
    const storage = getStorage();

    // 🔹 Upload ảnh lên Firebase Storage
    const uploadImage = async (uri: string, path: string) => {
        if (!uri) return '';
        const response = await fetch(uri);
        const blob = await response.blob();
        const storageRef = ref(storage, `${path}/${Date.now()}`);
        await uploadBytes(storageRef, blob);
        return await getDownloadURL(storageRef);
    };

    const swapQuestion = () => {
        let newQuestion;
        do {
            newQuestion = DEFAULT_QUESTIONS[Math.floor(Math.random() * DEFAULT_QUESTIONS.length)];
        } while (newQuestion === question); // Đảm bảo không bị trùng với câu hiện tại
        setQuestion(newQuestion);
    };

    // 🔹 Xử lý tạo nhóm
    const handleCreateGroup = async () => {
        if (!groupName.trim()) {
            return;
        }

        const avatarUrl = await uploadImage(avatar, 'group_avatars');
        const bannerUrl = await uploadImage(banner, 'group_banners');

        const newGroupRef = push(dbRef(database, 'groups')); // 🔹 Tạo ID nhóm tự động trong Database
        const groupId = newGroupRef.key;

        await set(newGroupRef, {
            id: groupId,
            name: groupName,
            description,
            avatar: avatarUrl || 'default_avatar_url', // Nếu không có ảnh thì dùng mặc định
            banner: bannerUrl || 'default_banner_url',
            privacy,
            adminId: auth.currentUser?.uid,
            createdAt: new Date().toISOString(),
        });

        // Reset form
        setGroupName('');
        setDescription('');
        setAvatar('');
        setBanner('');
        setPrivacy('public');
    };

    return (
        <View style={{ flex: 1, padding: 20 }}>
            <Text style={styles.header}>Tạo Nhóm</Text>

            {/* Nhập tên nhóm */}
            <TextInput placeholder="Tên nhóm" value={groupName} onChangeText={setGroupName} style={styles.input} />

            {/* Chọn avatar */}
            <TouchableOpacity style={styles.imagePicker}>
                {avatar ? <Image source={{ uri: avatar }} style={styles.image} /> : <Text>Chọn Avatar</Text>}
            </TouchableOpacity>

            {/* Chọn banner */}
            <TouchableOpacity style={styles.imagePicker}>
                {banner ? <Image source={{ uri: banner }} style={styles.image} /> : <Text>Chọn Banner</Text>}
            </TouchableOpacity>

            {/* Chế độ nhóm */}
            <View style={styles.optionContainer}>
                <Text style={styles.optionTitle}>Chế độ</Text>
                <RadioButton.Group onValueChange={setPrivacy} value={privacy}>
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
            {privacy === 'private' && (
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
            <TouchableOpacity style={styles.createButton} onPress={handleCreateGroup}>
                <Text style={styles.createButtonText}>Tạo nhóm</Text>
            </TouchableOpacity>
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
    image: {
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
    },
    createButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default CreateGroup;
