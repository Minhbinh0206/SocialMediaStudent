import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, LayoutAnimation, Modal, Alert, TouchableWithoutFeedback, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import database from '@react-native-firebase/database';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../type';
import ListPost from './ListPost';
import { TextInput } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { launchImageLibrary } from 'react-native-image-picker';
import storage from '@react-native-firebase/storage';

const Profile = () => {
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [myPostMark, setMyPostMark] = useState<any[]>([]);
    const currentUserId = getAuth().currentUser?.uid
    const [countFriends, setCountFriends] = useState(0);
    const [countFollowings, setCountFollowings] = useState(0);
    const [countFollowers, setCountFollowers] = useState(0);
    const [departmentName, setDepartmentName] = useState('');
    const [majorName, setMajorName] = useState('');
    const [courseText, setCourseText] = useState('');

    const [showEditModal, setShowEditModal] = useState(false);

    // Form field tạm
    const [name, setName] = useState('');
    const [mssv, setMssv] = useState('');
    const [dob, setDob] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [className, setClassName] = useState('');
    const [avatar, setAvatar] = useState('');

    // Và dropdown dynamic
    const [departments, setDepartments] = useState<Array<{ label: string; value: string }>>([]);
    const [majors, setMajors] = useState<Array<{ label: string; value: string }>>([]);
    const [classes, setClasses] = useState<Array<{ label: string; value: string }>>([]);
    const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
    const [selectedMajorId, setSelectedMajorId] = useState('');

    const [dropdownTop, setDropdownTop] = useState(0);
    const departmentRef = useRef<View>(null);
    const majorRef = useRef<View>(null);
    const classRef = useRef<View>(null);

    const [opened, setOpened] = useState<null | 'department' | 'major' | 'class'>(null);
    const [depTop, setDepTop] = useState(0);
    const [majTop, setMajTop] = useState(0);
    const [clsTop, setClsTop] = useState(0);

    const measureAndOpen = (
        ref: React.RefObject<View>,
        type: 'department' | 'major' | 'class'
    ) => {
        if (!ref.current) return;
        ref.current.measure((_fx, _fy, _w, h, _px, py) => {
            if (type === 'department') setDepTop(py + h);
            if (type === 'major') setMajTop(py + h);
            if (type === 'class') setClsTop(py + h);
            setOpened(type);
        });
    };

    useEffect(() => {
        if (!userData) return;

        const { departmentId, majorId, studentNumber } = userData;

        if (departmentId) {
            database()
                .ref(`Departments/${departmentId}`)
                .once('value')
                .then(snap => {
                    const dep = snap.val();
                    setDepartmentName(dep?.departmentName ?? '');
                });
        }

        if (departmentId && majorId) {
            database()
                .ref(`Departments/${departmentId}/majors/${majorId}`)
                .once('value')
                .then(snap => {
                    const maj = snap.val();
                    setMajorName(maj?.majorName ?? '');
                });
        }

        if (studentNumber) {
            const course = String(studentNumber).slice(0, 2); // VD: “21”
            setCourseText(`Sinh viên khóa ${course}`);
        }
    }, [userData]);

    useEffect(() => {
        const fetchUserData = async () => {
            const userId = getAuth().currentUser?.uid; // Lấy CurrentUserId từ Firebase Auth
            console.log('Current User ID:', userId); // Log UserID

            if (userId) {
                const studentsRef = database().ref('Users');
                studentsRef.once('value', snapshot => {
                    const studentsData = snapshot.val();

                    if (studentsData) {
                        const studentList = Object.values(studentsData);
                        const currentUser = studentList.find((student: any) => student.userId === userId);
                        console.log('Found Current User:', currentUser); // Log người dùng tìm thấy

                        if (currentUser) {
                            setUserData(currentUser); // Lưu thông tin người dùng vào state
                        }
                    }
                    setLoading(false); // Dữ liệu đã được tải
                });
            }
        };

        fetchUserData();
    }, []);

    // Lấy thông tin các số lượng
    useEffect(() => {
        const countNumber = () => {
            if (currentUserId) {
                const yourRef = database().ref(`Friends/${currentUserId}`);

                yourRef.on('value', (yourSnapshot) => {
                    let countFollowers = 0;
                    let countFollowings = 0;
                    let countFriends = 0;

                    if (yourSnapshot.exists()) {
                        const data = yourSnapshot.val();

                        // Lặp qua tất cả trạng thái của người dùng
                        Object.values(data).forEach((item: any) => {
                            if (item.status === 1) {
                                countFollowings++; // Đang theo dõi
                            } else if (item.status === 2) {
                                countFollowers++; // Người theo dõi
                            } else if (item.status === 3) {
                                countFriends++; // Bạn bè
                            }
                        });
                    }

                    // Set state cho từng trạng thái
                    setCountFollowings(countFollowings);
                    setCountFollowers(countFollowers);
                    setCountFriends(countFriends);
                });
            }
        };

        countNumber();

        // Cleanup listener
        return () => {
            const yourRef = database().ref(`Friends/${currentUserId}`);
            yourRef.off();
        };
    }, [currentUserId]);

    useEffect(() => {
        if (!currentUserId) return;

        const postDefaultsRef = database().ref('PostDefaults');

        // Lắng nghe realtime để luôn cập nhật
        const listener = postDefaultsRef.on('value', snap => {
            const allData = snap.val();
            const markedPosts: any[] = [];

            if (allData) {
                Object.entries(allData).forEach(([postId, post]: any) => {
                    // Có thể là mảng hoặc object – xử lý cả hai
                    const mark = post?.postMark?.userIds;
                    const isMarked = Array.isArray(mark)
                        ? mark.includes(currentUserId)
                        : mark && Object.keys(mark).includes(currentUserId);

                    if (isMarked) {
                        markedPosts.push({
                            id: postId,
                            postId,
                            ...post,
                        });
                    }
                });
            }

            // Mới nhất lên đầu
            markedPosts.sort((a, b) => Number(b.createAt) - Number(a.createAt));

            // Hoạt ảnh mượt mà khi thay đổi
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setMyPostMark(markedPosts);
            setLoading(false);
        });

        // Dọn dẹp listener khi unmount
        return () => postDefaultsRef.off('value', listener);
    }, [currentUserId]);

    useEffect(() => {
        database()
            .ref('Departments')
            .once('value')
            .then(snap => {
                const data = snap.val();
                if (data) {
                    const arr = Object.entries<any>(data).map(([id, obj]) => ({
                        label: obj.departmentName,
                        value: id,
                    }));
                    setDepartments(arr);
                }
            });
    }, []);

    const loadMajors = async (depId: string) => {
        const snap = await database().ref(`Departments/${depId}/majors`).once('value');
        const data = snap.val();
        if (data) return Object.entries<any>(data).map(([id, m]) => ({ label: m.majorName, value: id }));
        return [];
    };

    const loadClasses = async (depId: string, majorId: string) => {
        const snap = await database().ref(`Departments/${depId}/majors/${majorId}/classes`).once('value');
        const data = snap.val();
        if (data) return Object.entries<any>(data).map(([id, c]) => ({ label: c.className, value: id }));
        return [];
    };

    const openDropdown = () => {
        if (departmentRef.current) {
            departmentRef.current.measure((fx, fy, width, height, px, py) => {
                setDropdownTop(py + height); // py là top tuyệt đối trên màn hình
                setOpened('department');
            });
        }
    };

    const onSelectDepartment = (opt: any) => {
        setDepartmentName(opt.label);
        setSelectedDepartmentId(opt.value);
        setOpened(null); // đóng dropdown

        // reset major & class
        setMajorName('');
        setSelectedMajorId('');
        setClassName('');
        setMajors([]);
        setClasses([]);

        // fetch majors
        database()
            .ref(`Departments/${opt.value}/majors`)
            .once('value')
            .then(snap => {
                const data = snap.val();
                if (data) {
                    setMajors(Object.entries<any>(data).map(([id, m]) => ({
                        label: m.majorName,
                        value: id,
                    })));
                }
            });
    };

    const onSelectMajor = (opt: any) => {
        setMajorName(opt.label);
        setSelectedMajorId(opt.value);
        setOpened(null); // đóng dropdown

        // reset class
        setClassName('');
        setClasses([]);

        // fetch classes
        database()
            .ref(`Departments/${selectedDepartmentId}/majors/${opt.value}/classes`)
            .once('value')
            .then(snap => {
                const data = snap.val();
                if (data) {
                    setClasses(Object.entries<any>(data).map(([id, c]) => ({
                        label: c.className,
                        value: id,
                    })));
                }
            });
    };

    const onSelectClass = (opt: any) => {
        setClassName(opt.label);
        setOpened(null); // đóng dropdown
    };

    const handleChooseAvatar = () => {
        launchImageLibrary({ mediaType: 'photo', quality: 0.7 }, res => {
            if (res.didCancel || res.errorCode) return;
            if (res.assets && res.assets.length) {
                setAvatar(res.assets[0].uri || '');
            }
        });
    };

    const handleSubmit = async () => {
        if (!currentUserId) return;

        let finalAvatar = userData.avatar;   // mặc định giữ ảnh cũ

        /* Nếu user đã chọn file mới (avatar là path local, thường bắt đầu bằng 'file:///') */
        if (avatar && avatar !== userData.avatar) {
            try {
                const ext = avatar.split('.').pop() || 'jpg';
                const fileName = `${Date.now()}.${ext}`;
                const storageRef = storage().ref(`avatars/${currentUserId}/${fileName}`);

                await storageRef.putFile(avatar);           // upload
                finalAvatar = await storageRef.getDownloadURL();
            } catch (e) {
                console.error('Upload avatar error:', e);
                Alert.alert('Thông báo', 'Không thể tải ảnh lên, vui lòng thử lại');
                return;
            }
        }

        /* Cập nhật DB */
        const updated = {
            studentName: name,
            birthday: dob ? dob.toISOString().split('T')[0] : '',
            gender: userData.gender,
            departmentId: selectedDepartmentId,
            departmentName,
            majorId: selectedMajorId,
            majorName,
            className,
            classId: classes.find(c => c.label === className)?.value ?? '',
            avatar: finalAvatar,
        };

        try {
            await database().ref(`Users/${currentUserId}`).update(updated);
            Alert.alert('Thông báo', 'Đã lưu thành công');
            setUserData((prev: any) => ({ ...prev, ...updated }));
            setShowEditModal(false);
        } catch (err) {
            console.error(err);
            Alert.alert('Thông báo', 'Có lỗi khi lưu');
        }
    };

    useEffect(() => {
        if (!showEditModal || !userData) return;

        // 1. Gán dữ liệu cơ bản
        setName(userData.studentName ?? '');
        setMssv(userData.studentNumber ?? '');
        setDob(userData.birthday ? new Date(userData.birthday) : null);
        setAvatar(userData.avatar ?? '');

        const { departmentId, majorId, classId } = userData;

        if (departmentId) {
            setSelectedDepartmentId(departmentId);

            database()
                .ref(`Departments/${departmentId}`)
                .once('value')
                .then(snap => {
                    const dep = snap.val();
                    setDepartmentName(dep?.departmentName ?? '');
                })
                .then(async () => {
                    // nạp majors
                    const listMaj = await loadMajors(departmentId);
                    setMajors(listMaj);

                    if (majorId) {
                        setSelectedMajorId(majorId);
                        const curMajor = listMaj.find(m => m.value === majorId);
                        setMajorName(curMajor?.label ?? '');

                        // nạp classes
                        const listCls = await loadClasses(departmentId, majorId);
                        setClasses(listCls);

                        if (classId) {
                            const curClass = listCls.find(c => c.value === classId);
                            setClassName(curClass?.label ?? '');
                        }
                    }
                });
        }

        // reset dropdown (dùng biến mới)
        setOpened(null);
    }, [showEditModal]);

    const iconPaths = {
        department: require('../icons/icon_department.png'),
        major: require('../icons/icon_major.png'),
        course: require('../icons/icon_course.png'),
        setting: require('../icons/icon_setting_black.png'),
    };

    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    const renderModal = (
        type: 'department' | 'major' | 'class',
        top: number,
        data: { label: string; value: string }[],
        onSelect: (item: any) => void,
    ) => (
        <Modal transparent visible={opened === type} animationType="fade">
            <TouchableWithoutFeedback onPress={() => setOpened(null)}>
                <View style={{ flex: 1, marginHorizontal: 20 }}>
                    <View style={[styles.dropdownWrapper, { top }]}>
                        <FlatList
                            data={data}
                            keyExtractor={item => item.value}
                            style={{ maxHeight: 240 }}
                            nestedScrollEnabled
                            keyboardShouldPersistTaps="handled"
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.option}
                                    onPress={() => {
                                        onSelect(item);
                                        setOpened(null);
                                    }}>
                                    <Text>{item.label}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );


    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={{ alignSelf: 'flex-end' }} onPress={() => setShowEditModal(true)}>
                    <Image source={iconPaths.setting} style={styles.iconSetting} />
                </TouchableOpacity>

                <Image source={{ uri: userData.avatar }} style={styles.profileImage} />
                <Text style={styles.name}>{userData.studentName}</Text>
                <Text style={styles.bio}>{userData.studentNumber}</Text>
            </View>

            <View style={styles.statsContainer}>
                <View style={styles.stat}>
                    <Text style={styles.statNumber}>{countFriends}</Text>
                    <Text style={styles.statLabel}>Friends</Text>
                </View>
                <View style={styles.stat}>
                    <Text style={styles.statNumber}>{countFollowers}</Text>
                    <Text style={styles.statLabel}>Followers</Text>
                </View>
                <View style={styles.stat}>
                    <Text style={styles.statNumber}>{countFollowings}</Text>
                    <Text style={styles.statLabel}>Following</Text>
                </View>
            </View>

            <View style={styles.postsContainer}>
                <Text style={styles.postsTitle}>Giới thiệu</Text>
            </View>

            <View style={styles.introContainer}>
                {!!departmentName && (
                    <View style={styles.introRow}>
                        <Image source={iconPaths.department} style={styles.icon} />
                        <Text style={styles.introText}>Khoa: {departmentName}</Text>
                    </View>
                )}
                {!!majorName && (
                    <View style={styles.introRow}>
                        <Image source={iconPaths.major} style={styles.icon} />
                        <Text style={styles.introText}>Ngành: {majorName}</Text>
                    </View>
                )}
                {!!courseText && (
                    <View style={styles.introRow}>
                        <Image source={iconPaths.course} style={styles.icon} />
                        <Text style={styles.introText}>{courseText}</Text>
                    </View>
                )}
            </View>

            <View style={styles.postsContainer}>
                <Text style={styles.postsTitle}>Đăng lại</Text>
            </View>

            <View style={{ paddingHorizontal: 15 }}>
                <ListPost posts={myPostMark} loading={loading} />
            </View>

            <Modal visible={showEditModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Cập nhật thông tin</Text>
                            <TouchableOpacity onPress={() => setShowEditModal(false)}>
                                <Text style={{ fontSize: 18 }}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                            {/* Họ và tên */}
                            <TextInput
                                style={styles.input}
                                placeholder="Họ và tên"
                                value={name}
                                onChangeText={setName}
                            />

                            {renderModal('department', depTop, departments, onSelectDepartment)}
                            {renderModal('major', majTop, majors, onSelectMajor)}
                            {renderModal('class', clsTop, classes, onSelectClass)}

                            {/* MSSV - không chỉnh sửa */}
                            <TextInput
                                style={[styles.input, { backgroundColor: '#eee', color: '#666' }]}
                                value={mssv}
                                editable={false}
                            />

                            {/* Ngày sinh */}
                            <TouchableOpacity
                                style={styles.input}
                                onPress={() => setShowDatePicker(true)}>
                                <Text>{dob ? dob.toLocaleDateString('vi-VN') : 'Chọn ngày sinh'}</Text>
                            </TouchableOpacity>
                            {showDatePicker && (
                                <DateTimePicker
                                    value={dob || new Date()}
                                    mode="date"
                                    display="spinner"
                                    maximumDate={new Date()}
                                    onChange={(_, d) => {
                                        setShowDatePicker(false);
                                        if (d) setDob(d);
                                    }}
                                />
                            )}

                            {/* Department */}
                            <View style={{ position: 'relative', zIndex: 500 }}>
                                <TouchableOpacity
                                    ref={departmentRef}
                                    style={styles.input}
                                    onPress={() => measureAndOpen(departmentRef, 'department')}>
                                    <Text>{departmentName || 'Chọn Khoa'}</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Major */}
                            <View style={{ position: 'relative', zIndex: 400 }}>
                                <TouchableOpacity
                                    ref={majorRef}
                                    style={styles.input}
                                    onPress={() => measureAndOpen(majorRef, 'major')}
                                    disabled={!selectedDepartmentId}
                                >
                                    <Text>{majorName || 'Chọn Ngành'}</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Class */}
                            <View style={{ position: 'relative', zIndex: 300 }}>
                                <TouchableOpacity
                                    ref={classRef}
                                    style={styles.input}
                                    onPress={() => measureAndOpen(classRef, 'class')}
                                    disabled={!selectedMajorId}
                                >
                                    <Text>{className || 'Chọn Lớp'}</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Avatar */}
                            <TouchableOpacity onPress={handleChooseAvatar} style={styles.avatarWrap}>
                                <Image
                                    source={
                                        avatar                     // ảnh mới (nếu có) …
                                            ? { uri: avatar }
                                            : userData.avatar        // …không có thì dùng avatar hiện tại
                                                ? { uri: userData.avatar }
                                                : require('../images/avatar_choose_default.jpg')
                                    }
                                    style={styles.avatar}
                                />
                                <Text style={styles.smallTxt}>Chọn ảnh đại diện</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit}>
                                <Text style={styles.saveTxt}>Lưu thông tin</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

        </ScrollView>
    );
};

const styles = StyleSheet.create({
    dropdownWrapper: {
        position: 'absolute',
        left: 20,
        right: 20,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        overflow: 'hidden',
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowOffset: { width: 0, height: 2 },
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 15,
        backgroundColor: '#fafafa',
        marginBottom: 14,
    },
    dropdownBox: {
        backgroundColor: '#fff',
        borderRadius: 12,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
        overflow: 'hidden',
    },
    option: {
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: '#EAEAEA',
    },

    dropdown: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderRadius: 12,
        marginTop: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 6,
    },
    scroll: {
        maxHeight: 220,
        flex: 1
    },
    modalBox: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
        maxHeight: '90%',
    },
    saveBtn: {
        backgroundColor: '#007BFF',
        paddingVertical: 14,
        borderRadius: 10,
        marginTop: 15,
    },
    saveTxt: {
        color: '#fff',
        fontSize: 16,
        textAlign: 'center',
        fontWeight: '600',
    },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderColor: '#eee' },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    avatarWrap: { alignItems: 'center', marginVertical: 10 },
    avatar: { width: 90, height: 90, borderRadius: 45 },
    smallTxt: { fontSize: 13, color: '#666', marginTop: 4 },
    avatarText: {
        textAlign: 'center',
        marginBottom: 10
    },
    button: {
        backgroundColor: '#0066FF',
        padding: 12,
        borderRadius: 6,
        marginTop: 10,
    },
    buttonText: {
        color: '#fff',
        textAlign: 'center',
        fontWeight: 'bold'
    },
    iconWrapper: {
        marginRight: 8,
    },
    introContainer: {
        paddingHorizontal: 15,
        gap: 8,
        marginBottom: 15
    },
    introRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        width: 30,
        height: 30,
        marginRight: 10,
    },
    iconSetting: {
        width: 30,
        height: 30,
        alignSelf: 'flex-end'
    },
    introText: {
        fontSize: 16,
        color: '#333',
    },
    loaderContainer: {
        flex: 1,
        height: 700,
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f8f8f8',
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 10,
    },
    bio: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginTop: 5,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e6e6e6',
    },
    stat: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    statLabel: {
        fontSize: 14,
        color: '#666',
    },
    buttonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
    },
    postsContainer: {
        padding: 10,
        paddingBottom: 5,
        borderColor: '#ccc',
        borderBottomWidth: 1,
        borderTopWidth: 1,
        marginBottom: 10
    },
    postsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    post: {
        marginBottom: 20,
    },
    postImage: {
        width: '100%',
        height: 200,
        borderRadius: 10,
    },
    postDescription: {
        fontSize: 16,
        marginTop: 10,
    },
});

export default Profile;
