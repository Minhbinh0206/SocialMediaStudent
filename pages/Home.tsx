import React, { useEffect, useState, useMemo } from 'react';
import { View, FlatList, StyleSheet, LayoutAnimation, ActivityIndicator, TouchableOpacity, Image, ScrollView } from 'react-native';
import Header from '../components/Header';
import Navigation from '../components/Navigation';
import { get, ref, onValue, off, onChildAdded } from 'firebase/database';
import { database } from '../firebaseConfig';
import { getAuth } from 'firebase/auth';

import ListFriend from '../components/ListFriend';
import Profile from '../components/Profile';
import ListNotify from '../components/ListNotify';
import ListGroup from '../components/ListGroup';
import ListEvent from '../components/ListEvent';
import ItemPost from '../components/ItemPost';
import ItemSurvey from '../components/ItemSurvey';
import { Text } from 'react-native';
import ListPost from '../components/ListPost';
import ListSurvey from '../components/ListSurvey';

const Home: React.FC = () => {
    const [title, setTitle] = useState('Trang chủ');
    const [pageName, setPageName] = useState('home');

    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [isSurveyMode, setIsSurveyMode] = useState<boolean>(false);

    const handleIconPress = (newTitle: string, newPage: string) => {
        setTitle(newTitle);
        setPageName(newPage);
    };

    useEffect(() => {
        if (pageName !== 'home') return;

        const auth = getAuth();
        const currentUserId = auth.currentUser?.uid;
        if (!currentUserId) {
            setLoading(false);
            return;
        }

        let unsubscribed = false;
        const postDefaultsRef = ref(database, 'PostDefaults');

        const fetchAndListen = async () => {
            try {
                const userSnap = await get(ref(database, `Users/${currentUserId}`));
                const userData = userSnap.val();
                const currentDepartmentId = userData?.departmentId;
                if (!currentDepartmentId) {
                    if (!unsubscribed) setLoading(false);
                    return;
                }

                // Clear posts on first load
                setPosts([]);
                const seenPosts = new Set(); // Ngăn post trùng

                onChildAdded(postDefaultsRef, (snapshot) => {
                    if (unsubscribed) return;
                    const post = snapshot.val();
                    const postId = snapshot.key;

                    if (seenPosts.has(postId)) return;
                    seenPosts.add(postId);

                    const filterData = post?.filterData;
                    const shouldInclude =
                        !filterData || filterData[currentDepartmentId]; // object dạng { deptA: true }

                    if (!shouldInclude) return;

                    const newPost = {
                        ...post,
                        id: `post-${postId}`,
                        type: 'post',
                        createdAt: Number(post.createAt),
                    };

                    // 👉 Thêm vào đầu danh sách
                    setPosts((prev) => [newPost, ...prev]);
                });


                setLoading(false);
            } catch (err) {
                console.error('Lỗi khi lấy dữ liệu:', err);
                setPosts([]);
                setLoading(false);
            }
        };

        fetchAndListen();

        return () => {
            unsubscribed = true;
            off(postDefaultsRef); // stop all listeners
        };
    }, [pageName]);

    return (
        <View style={{ position: 'relative', height: '100%', paddingBottom: 50 }}>
            <Header title={title} pageName={pageName} />

            <View style={styles.listItem}>
                {pageName === 'home' ? (
                    <ScrollView>
                        <ListEvent />
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10 }}>
                            <Text style={styles.feedTitle}>Bảng tin</Text>
                            <TouchableOpacity
                                onPress={() => setIsSurveyMode(!isSurveyMode)}
                                style={{
                                    backgroundColor: '#fff',
                                    paddingHorizontal: 10,
                                    paddingVertical: 5,
                                    borderRadius: 100,
                                }}
                            >
                                <Image
                                    source={require('../icons/icon_swap.png')}
                                    style={{ width: 20, height: 20 }}
                                />
                            </TouchableOpacity>
                        </View>
                        {isSurveyMode ? (
                            <ListSurvey />
                        ) : (
                            <ListPost posts={posts} />
                        )}

                    </ScrollView>
                ) : pageName === 'friend' ? (
                    <ListFriend />
                ) : pageName === 'notification' ? (
                    <ListNotify />
                ) : pageName === 'profile' ? (
                    <Profile />
                ) : (
                    <ListGroup />
                )}
            </View>

            <Navigation onIconPress={handleIconPress} />
        </View >
    );
};

const styles = StyleSheet.create({
    feedTitle: {
        fontSize: 25,
        fontWeight: '700',
        marginBottom: 12,
        color: '#333',
    },
    listItem: {
        flex: 1,
        padding: 15,
        marginBottom: 20,
        backgroundColor: '#f0f0f0',
        borderRadius: 5,
    },
});

export default Home;
