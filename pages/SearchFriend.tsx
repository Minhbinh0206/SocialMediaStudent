import React, { useState, useEffect } from 'react';
import { View, TextInput, FlatList, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import database from '@react-native-firebase/database';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../type';

// Define the navigation prop type
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'SearchFriend'>;

const SearchFriend = () => {
    const [searchQuery, setSearchQuery] = useState(''); // Lưu trữ truy vấn tìm kiếm
    const [results, setResults] = useState<any[]>([]); // Lưu trữ kết quả tìm kiếm
    const [allStudents, setAllStudents] = useState<any[]>([]); // Lưu trữ toàn bộ danh sách sinh viên

  const navigation = useNavigation<NavigationProp>(); // Type the navigation object

        // Lấy dữ liệu từ Firebase Realtime Database
        useEffect(() => {
            const fetchData = async () => {
                const studentsRef = database().ref('Students');
                studentsRef.once('value', snapshot => {
                    const studentsData = snapshot.val();
                    if (studentsData) {
                        const studentList = Object.values(studentsData); // Chuyển đổi dữ liệu thành mảng
                        setAllStudents(studentList); // Lưu toàn bộ danh sách sinh viên vào state allStudents
                        setResults(studentList); // Lưu kết quả ban đầu là toàn bộ sinh viên
                    }
                });
            };

            fetchData();
        }, []);

    // Hàm xử lý tìm kiếm và lọc dữ liệu theo tên hoặc mã sinh viên
    const handleSearch = (query: string) => {
        setSearchQuery(query); // Cập nhật truy vấn tìm kiếm

        if (query.trim() === '') {
            // Nếu không có dữ liệu tìm kiếm, hiển thị tất cả sinh viên
            setResults(allStudents);
        } else {
            // Nếu có dữ liệu tìm kiếm, lọc kết quả theo tên hoặc mã sinh viên
            const filteredResults = allStudents.filter(student =>
                student.studentName.toLowerCase().includes(query.toLowerCase()) ||
                student.studentNumber.includes(query) // Tìm kiếm theo mã sinh viên
            );
            setResults(filteredResults);
        }
    };

    const handleBackPress = () => {
        navigation.goBack(); // Quay lại trang trước đó
    };

    return (
        <View style={styles.container}>
            {/* Header với nút back và thanh tìm kiếm */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
                    <Image source={require('../icons/icon_back.png')} style={styles.icon} />
                </TouchableOpacity>
                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Tìm bạn"
                        value={searchQuery}
                        onChangeText={handleSearch} // Cập nhật kết quả tìm kiếm ngay khi người dùng nhập
                        placeholderTextColor="#888"
                    />
                </View>
            </View>

            {/* Hiển thị kết quả tìm kiếm */}
            {searchQuery.trim() !== '' && (
                <FlatList
                    data={results}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={({ item }) => (
                        <TouchableOpacity onPress={() => navigation.navigate('Friend', { userId: item.userId })}>
                            <View style={styles.resultItem}>
                                {/* Avatar */}
                                <Image source={{ uri: item.avatar }} style={styles.avatar} />

                                {/* Thông tin sinh viên */}
                                <View style={styles.infoContainer}>
                                    <Text style={styles.resultText}>{item.studentName}</Text>
                                    <Text style={styles.studentId}>{item.studentNumber}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    )}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#3399FF',
        elevation: 3,
    },
    backButton: {
        marginRight: 20,
    },
    icon: {
        width: 24,
        height: 24,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        backgroundColor: '#f1f1f1',
        borderRadius: 25,
        paddingHorizontal: 15,
        height: 40,
    },
    input: {
        flex: 1,
        backgroundColor: 'transparent',
        fontSize: 16,
        color: '#333',
    },
    resultItem: {
        flexDirection: 'row',
        paddingVertical: 15,
        paddingHorizontal: 20,
        marginVertical: 5,
        backgroundColor: '#f9f9f9',
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        alignItems: 'center',
    },
    avatar: {
        width: 70,
        height: 70,
        borderRadius: 15,
        marginRight: 15,
    },
    infoContainer: {
        flex: 1,
    },
    resultText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    studentId: {
        fontSize: 14,
        color: '#888',
    },
});

export default SearchFriend;
