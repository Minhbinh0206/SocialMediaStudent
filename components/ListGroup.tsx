// ListGroup.tsx
import React, { useState, useEffect } from 'react';
import {
  View, FlatList, StyleSheet, Text, TouchableOpacity, ScrollView,
  Image, TextInput, LayoutAnimation, ActivityIndicator
} from 'react-native';
import { database } from '../firebaseConfig';
import { ref, get, onValue, off } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../type';
import { useNavigation } from '@react-navigation/native';
import ItemGroup from './ItemGroup';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Group'>;

interface Group {
  groupId: string;
  groupName: string;
  groupDefault: boolean;
  groupType: 'default' | 'department' | 'bussiness';
  adminId: string;
}

const ListGroup: React.FC = () => {
  /* ---------- STATE ---------- */
  const [groupsDefault, setGroupsDefault] = useState<Group[]>([]);
  const [groupsElse, setGroupsElse] = useState<Group[]>([]);
  const [filterElseGroups, setFilterElseGroups] = useState<Group[]>([]);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [filteredDefault, setFilteredDefault] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'default' | 'joined' | 'myself'>('default');
  const [showPopup, setShowPopup] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchText, setSearchText] = useState('');

  /* ---------- MISC ---------- */
  const currentUserId = getAuth().currentUser?.uid;
  const navigation = useNavigation<NavigationProp>();

  /* ---------- LOAD GROUPS ---------- */
  useEffect(() => {
    if (!currentUserId) return;

    const groupsRef = ref(database, 'Groups');

    const listener = onValue(groupsRef, snapshot => {
      if (!snapshot.exists()) return;

      const data = snapshot.val();
      const all: Group[] = Object.keys(data).map(key => ({ ...data[key], groupId: key }));

      const def = all.filter(g => g.groupDefault === true);
      const elseG = all.filter(g => g.groupDefault !== true);
      const mine = all.filter(g => g.adminId === currentUserId);

      setGroupsDefault(def);
      setFilteredDefault(def);
      setGroupsElse(elseG);
      setFilterElseGroups(elseG);
      setMyGroups(mine);
      setLoading(false);
    }, err => {
      console.error('Lỗi tải Groups:', err);
      setLoading(false);
    });

    // 🔑 cleanup để tránh memory‑leak
    return () => off(groupsRef, 'value', listener);
  }, [currentUserId]);


  /* ---------- HANDLERS ---------- */
  const handleTabChange = (tab: typeof selectedTab) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedTab(tab);

    if (tab === 'joined' && !searchText.trim()) {
      setFilterElseGroups(groupsElse);   // reset list khi chưa search
    }
  };

  const handleSearch = (txt: string) => {
    setSearchText(txt);
    if (!txt.trim()) {
      setFilterElseGroups(groupsElse);
    } else {
      setFilterElseGroups(
        groupsElse.filter(g => g.groupName.toLowerCase().includes(txt.toLowerCase()))
      );
    }
  };

  /** lọc trong tab 'default' theo groupType */
  const handleFilter = (type: 'all' | 'default' | 'department' | 'bussiness') => {
    setShowPopup(false);
    if (type === 'all') {
      setFilteredDefault(groupsDefault);
    } else {
      setFilteredDefault(groupsDefault.filter(g => g.groupType === type));
    }
  };

  /* ---------- RENDER ---------- */
  const ListEmpty = () => (
    <View style={styles.emptyListContainer}>
      <Text style={styles.emptyListText}>Không có nhóm nào để hiển thị</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View>
      {/* ----- header tab ----- */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.tabContainer}>
          {(['default', 'joined', 'myself'] as const).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.button, selectedTab === t && styles.activeButton]}
              onPress={() => handleTabChange(t)}
            >
              <Text style={[styles.buttonText, selectedTab === t && styles.activeText]}>
                {t === 'default' ? 'Nhóm mặc định' : t === 'joined' ? 'Nhóm khác' : 'Nhóm của bạn'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* ----- sub‑header (title + icon) ----- */}
      <View style={styles.subHeader}>
        <Text style={styles.title}>
          {selectedTab === 'default' ? 'Mặc định'
            : selectedTab === 'joined' ? 'Nhóm khác'
              : 'Nhóm của bạn'}
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

      {/* ----- search bar ----- */}
      {selectedTab === 'joined' && showSearchBar && (
        <TextInput
          style={styles.searchInput}
          placeholder="Nhập từ khóa tìm kiếm..."
          value={searchText}
          onChangeText={handleSearch}
        />
      )}

      {/* ----- popup filter (tab default) ----- */}
      {showPopup && (
        <View style={styles.popup}>
          <TouchableOpacity onPress={() => handleFilter('all')}>
            <Text style={styles.popupText}>Tất cả</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleFilter('default')}>
            <Text style={styles.popupText}>Nhóm Trường</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleFilter('department')}>
            <Text style={styles.popupText}>Nhóm Khoa</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleFilter('bussiness')}>
            <Text style={styles.popupText}>Nhóm Doanh nghiệp</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ----- danh sách ----- */}
      {selectedTab === 'default' && (
        <FlatList
          data={filteredDefault}
          keyExtractor={item => item.groupId}
          renderItem={({ item }) => (
            <ItemGroup
              id={item.groupId}
              onCheckFriend={() => navigation.navigate('GroupDetail', { groupId: item.groupId })}
            />
          )}
          ListEmptyComponent={ListEmpty}
        />
      )}

      {selectedTab === 'joined' && (
        <FlatList
          data={filterElseGroups}
          keyExtractor={item => item.groupId}
          renderItem={({ item }) => (
            <ItemGroup
              id={item.groupId}
              onCheckFriend={() => navigation.navigate('GroupDetail', { groupId: item.groupId })}
            />
          )}
          ListEmptyComponent={ListEmpty}
        />
      )}

      {selectedTab === 'myself' && (
        <FlatList
          data={myGroups}
          keyExtractor={item => item.groupId}
          renderItem={({ item }) => (
            <ItemGroup
              id={item.groupId}
              onCheckFriend={() => navigation.navigate('GroupDetail', { groupId: item.groupId })}
            />
          )}
          ListEmptyComponent={ListEmpty}
        />
      )}
    </View>
  );
};

/* ---------- STYLES ---------- */
const styles = StyleSheet.create({
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', height: 400 },
  tabContainer: { flexDirection: 'row', marginBottom: 10, flex: 1, minHeight: 40 },
  subHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 10 },
  title: { fontSize: 24, fontWeight: 'bold' },
  icon: { width: 24, height: 24 },
  searchInput: {
    height: 48, borderColor: '#ccc', borderWidth: 1, borderRadius: 10,
    marginBottom: 10, paddingHorizontal: 15, backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#e2e5e9', paddingVertical: 10, paddingHorizontal: 15,
    borderRadius: 25, marginRight: 10,
    flex: 1
  },
  activeButton: { backgroundColor: '#007BFF' },
  buttonText: { color: '#000', fontWeight: 'bold' },
  activeText: { color: '#fff' },
  popup: {
    position: 'absolute', top: 85, right: 10, backgroundColor: '#fff',
    borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 4, padding: 10, width: 200, zIndex: 10,
  },
  popupText: {
    fontSize: 16, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#e2e5e9',
  },
  emptyListContainer: { height: 300, justifyContent: 'center', alignItems: 'center' },
  emptyListText: { fontSize: 16, color: '#888', fontStyle: 'italic' },
});

export default ListGroup;
