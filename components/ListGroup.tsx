import React, { useState, useEffect } from 'react';
import { View, FlatList, ActivityIndicator, StyleSheet, Dimensions, Text, TouchableOpacity, ScrollView, Image, TextInput } from 'react-native';
import { database } from '../firebaseConfig';
import { ref, onValue, get } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../type';
import { useNavigation } from '@react-navigation/native';
import ItemGroup from './ItemGroup';
import { LayoutAnimation } from 'react-native';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Group'>;

const ListGroup: React.FC = () => {
    const [groups, setGroups] = useState<any[]>([]);
    const [elseGroups, setElseGroups] = useState<any[]>([]);
    const [filterElseGroups, setFilterElseGroups] = useState<any[]>([]);
    const [myGroups, setMyGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTab, setSelectedTab] = useState('default');
    const [showPopup, setShowPopup] = useState(false);  // Trạng thái popup
    const [filteredGroups, setFilteredGroups] = useState<any[]>([]);
    const [adminData, setAdminData] = useState<{ [key: string]: any[] }>({});
    const [showSearchBar, setShowSearchBar] = useState(false);
    const [searchText, setSearchText] = useState('');

    const currentUserId = getAuth().currentUser?.uid;
    const navigation = useNavigation<NavigationProp>();

    useEffect(() => {
        if (currentUserId) {
            fetchAllGroups();
            setLoading(false);
        }
    }, [currentUserId]);

    const fetchAllGroups = async () => {
        try {
            const groupsRef = ref(database, 'Groups');
            const snapshot = await get(groupsRef);

            if (snapshot.exists()) {
                const allGroups: any[] = [];
                const elseGroups: any[] = [];
                const filteredGroups: any[] = [];
                const myGroups: any[] = [];

                snapshot.forEach((childSnapshot) => {
                    const groupId = childSnapshot.key;
                    const groupData = childSnapshot.val();
                    allGroups.push({ groupId, ...groupData });

                    // Phân loại nhóm dựa vào groupDefault
                    if (groupData.groupDefault === false) {
                        elseGroups.push({ groupId, ...groupData });
                    } else {
                        filteredGroups.push({ groupId, ...groupData });
                    }

                    // Phân loại nhóm do currentUserId làm admin
                    if (groupData.adminId === currentUserId) {
                        myGroups.push({ groupId, ...groupData });
                    }
                });

                // Cập nhật state sau khi đã xử lý xong
                setElseGroups(elseGroups);
                setFilterElseGroups(elseGroups);
                setFilteredGroups(filteredGroups);
                setMyGroups(myGroups);

                return allGroups;
            } else {
                console.log("Không có nhóm nào trong cơ sở dữ liệu.");
                return [];
            }
        } catch (error) {
            console.error("Lỗi khi lấy danh sách nhóm:", error);
            return [];
        }
    };

    const handleSearch = (text: string) => {
        setSearchText(text);
        console.log("elseGroups:", elseGroups); // Kiểm tra xem danh sách gốc có tồn tại không

        if (text.trim() === '') {
            setFilterElseGroups([...elseGroups]); // Trả về danh sách gốc khi xóa nội dung
        } else {
            const filtered = elseGroups.filter(group =>
                group.groupName.toLowerCase().includes(text.toLowerCase())
            );
            setFilterElseGroups(filtered);
        }
    };

    const handleFilter = (filterType: 'AdminDefaults' | 'AdminDepartments' | 'AdminBusinesses') => {
        setShowPopup(false);

        const adminObject = adminData[filterType];

        // Kiểm tra nếu không phải object hoặc là null
        if (!adminObject || typeof adminObject !== 'object') {
            return;
        }

        // Chuyển object thành mảng các adminId
        const adminIds = Object.keys(adminObject);

        // Lọc danh sách groups dựa trên adminId
        const filtered = groups.filter(group => adminIds.includes(group.adminId));

        setFilteredGroups(filtered);
    };

    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    const handleTabChange = (tab: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSelectedTab(tab);
    };


    return (
        <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.button, selectedTab === 'default' && styles.activeButton]}
                        onPress={() => handleTabChange('default')}>
                        <Text style={[styles.buttonText, selectedTab === 'default' && styles.activeText]}>Nhóm mặc định</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, selectedTab === 'joined' && styles.activeButton]}
                        onPress={() => handleTabChange('joined')}>
                        <Text style={[styles.buttonText, selectedTab === 'joined' && styles.activeText]}>Nhóm khác</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, selectedTab === 'myself' && styles.activeButton]}
                        onPress={() => handleTabChange('myself')}>
                        <Text style={[styles.buttonText, selectedTab === 'myself' && styles.activeText]}>Nhóm của bạn</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', width: '100%', alignItems: 'center', justifyContent: 'space-between', padding: 10 }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold' }}>
                    {selectedTab === 'default' && 'Mặc định'}
                    {selectedTab === 'joined' && 'Nhóm khác'}
                    {selectedTab === 'myself' && 'Nhóm của bạn'}
                </Text>

                {selectedTab === 'default' && (
                    <TouchableOpacity onPress={() => setShowPopup(!showPopup)}>
                        <Image source={require('../icons/icon_filter.png')} style={styles.icon} />
                    </TouchableOpacity>
                )}

                {selectedTab === 'joined' && (
                    <TouchableOpacity onPress={() => setShowSearchBar(!showSearchBar)}>
                        <Image source={require('../icons/icon_search_black.png')} style={styles.icon} />
                    </TouchableOpacity>
                )}

                {selectedTab === 'myself' && (
                    <TouchableOpacity onPress={() => navigation.navigate('CreateGroup')}>
                        <Image source={require('../icons/icon_add_black.png')} style={styles.icon} />
                    </TouchableOpacity>
                )}
            </View>

            {selectedTab === 'joined' && showSearchBar && (
                <TextInput
                    style={styles.searchInput}
                    placeholder="Nhập từ khóa tìm kiếm..."
                    value={searchText}
                    onChangeText={handleSearch} // Gọi hàm lọc dữ liệu
                />
            )}

            {/* Popup lọc */}
            {showPopup && (
                <View style={styles.popup}>
                    <TouchableOpacity onPress={() => handleFilter('AdminDefaults')}>
                        <Text style={styles.popupText}>Nhóm Trường</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleFilter('AdminDepartments')}>
                        <Text style={styles.popupText}>Nhóm Khoa</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleFilter('AdminBusinesses')}>
                        <Text style={styles.popupText}>Nhóm Doanh nghiệp</Text>
                    </TouchableOpacity>
                </View>
            )}

            {selectedTab === 'default' && (
                loading ? (
                    <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 20 }} />
                ) : (
                    <FlatList
                        data={filteredGroups}
                        keyExtractor={(item) => item.groupId}
                        renderItem={({ item }) => (
                            <ItemGroup
                                id={item.groupId}
                                onCheckFriend={() => navigation.navigate('GroupDetail', { groupId: item.groupId })}
                            />
                        )}
                    />
                )
            )}

            {selectedTab === 'joined' && (
                loading ? (
                    <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 20 }} />
                ) : (
                    <FlatList
                        data={filterElseGroups}
                        keyExtractor={(item) => item.groupId}
                        renderItem={({ item }) => (
                            <ItemGroup
                                id={item.groupId}
                                onCheckFriend={() => navigation.navigate('GroupDetail', { groupId: item.groupId })}
                            />
                        )}
                    />
                )
            )}

            {selectedTab === 'myself' && (
                loading ? (
                    <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 20 }} />
                ) : (
                    <FlatList
                        data={myGroups}
                        keyExtractor={(item) => item.groupId}
                        renderItem={({ item }) => (
                            <ItemGroup
                                id={item.groupId}
                                onCheckFriend={() => navigation.navigate('GroupDetail', { groupId: item.groupId })}
                            />
                        )}
                    />
                )
            )}

        </View>
    );
};

const styles = StyleSheet.create({
    loaderContainer: {
        flex: 1,
        height: 700,
        justifyContent: 'center',
        alignItems: 'center',
    },
    icon: {
        width: 24,
        height: 24,
    },
    tabContainer: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    searchInput: {
        height: 50,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 10,
        marginBottom: 10,
        paddingHorizontal: 15,
        backgroundColor: '#fff'
    },
    button: {
        backgroundColor: '#e2e5e9',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 25,
        marginRight: 10,
        alignItems: 'center',
    },
    activeButton: {
        backgroundColor: '#007BFF',
    },
    buttonText: {
        color: 'black',
        fontSize: 15,
        fontWeight: 'bold',
    },
    activeText: {
        color: 'white',
    },
    popup: {
        position: 'absolute',
        top: 85,
        right: 10,
        backgroundColor: 'white',
        borderRadius: 8,
        shadowColor: 'black',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        padding: 10,
        width: 200,
        zIndex: 10,
    },
    popupText: {
        fontSize: 16,
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e5e9',
    },
    emptyListContainer: {
        height: 500,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    emptyListText: {
        fontSize: 18,
        color: '#999',
        textAlign: 'center',
        fontStyle: 'italic',
        fontWeight: 'bold'
    },
});

export default ListGroup;