import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, LayoutAnimation } from 'react-native';
import Header from '../components/Header';
import Navigation from '../components/Navigation';
import ListEvent from '../components/ListEvent';
import ListPost from '../components/ListPost';
import ListFriend from '../components/ListFriend';
import Profile from '../components/Profile';
import ListNotify from '../components/ListNotify';
import ListGroup from '../components/ListGroup';
import { get, ref, onValue, off } from 'firebase/database';
import { database } from '../firebaseConfig';
import { getAuth } from 'firebase/auth';

const Home: React.FC = () => {
    const [title, setTitle] = useState('Trang chủ');
    const [pageName, setPageName] = useState('home');
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    const handleIconPress = (newTitle: string, newPage: string) => {
        setTitle(newTitle);
        setPageName(newPage);

        if (newPage === 'home') {
            setLoading(true);
        }
    };

    useEffect(() => {
        if (pageName !== 'home') return;

        const auth = getAuth();
        const currentUserId = auth.currentUser?.uid;
        if (!currentUserId) {
            setLoading(false);
            return;
        }

        const postsRef = ref(database, 'Posts');

        let unsubscribed = false;

        const fetchAndListen = async () => {
            try {
                const userSnap = await get(ref(database, `Users/${currentUserId}`));
                const userData = userSnap.val();
                const currentDepartmentId = userData?.departmentId;

                if (!currentDepartmentId) {
                    if (!unsubscribed) {
                        setPosts([]);
                        setLoading(false);
                    }
                    return;
                }

                onValue(postsRef, (snapshot) => {
                    if (unsubscribed) return;

                    const data = snapshot.val();
                    if (!data) {
                        setPosts([]);
                        setLoading(false);
                        return;
                    }

                    const loadedPosts: any[] = [];

                    for (const groupId in data) {
                        for (const userId in data[groupId]) {
                            for (const postId in data[groupId][userId]) {
                                const post = data[groupId][userId][postId];
                                const filterData = post?.filterData;

                                let shouldInclude = false;
                                if (!filterData) {
                                    shouldInclude = true;
                                } else if (Array.isArray(filterData)) {
                                    shouldInclude = filterData.includes(currentDepartmentId);
                                }

                                if (shouldInclude) {
                                    loadedPosts.push({
                                        id: postId,
                                        postId,
                                        userId,
                                        groupId,
                                        ...post,
                                    });
                                }
                            }
                        }
                    }

                    loadedPosts.sort((a, b) => Number(b.createAt) - Number(a.createAt));
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setPosts(loadedPosts);
                    setLoading(false);
                });
            } catch (err) {
                console.error('Lỗi khi lấy dữ liệu:', err);
                setPosts([]);
                setLoading(false);
            }
        };

        fetchAndListen();

        return () => {
            unsubscribed = true;
            off(postsRef);
        };
    }, [pageName]); // ← chạy lại khi chuyển về home

    const renderItem = ({ item }: { item: any }) => {
        return (
            <View style={styles.listItem}>
                {pageName === 'friend' ? (
                    <ListFriend />
                ) : pageName === 'notification' ? (
                    <ListNotify />
                ) : pageName === 'profile' ? (
                    <Profile />
                ) : pageName === 'group' ? (
                    <ListGroup />
                ) : (
                    <>
                        <ListEvent />
                        <ListPost posts={posts} loading={loading} />
                    </>
                )}
            </View>
        );
    };

    return (
        <View style={{ position: 'relative', height: '100%', paddingBottom: 50 }}>
            <Header title={title} pageName={pageName} />

            <FlatList
                data={['item1']} // chỉ dùng FlatList để giữ tính cuộn
                keyExtractor={(item, index) => index.toString()}
                renderItem={renderItem}
            />

            <Navigation onIconPress={handleIconPress} />
        </View>
    );
};

const styles = StyleSheet.create({
    listItem: {
        padding: 10,
        marginBottom: 10,
        backgroundColor: '#f0f0f0',
        borderRadius: 5,
    },
});

export default Home;
