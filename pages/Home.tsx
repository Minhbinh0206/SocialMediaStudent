import React, { useEffect, useState, useMemo } from 'react';
import { View, FlatList, StyleSheet, LayoutAnimation, ActivityIndicator } from 'react-native';
import Header from '../components/Header';
import Navigation from '../components/Navigation';
import { get, ref, onValue, off } from 'firebase/database';
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

const Home: React.FC = () => {
    const [title, setTitle] = useState('Trang chủ');
    const [pageName, setPageName] = useState('home');

    const [posts, setPosts] = useState<any[]>([]);
    const [surveys, setSurveys] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    const handleIconPress = (newTitle: string, newPage: string) => {
        setTitle(newTitle);
        setPageName(newPage);
        if (newPage === 'home') setLoading(true);
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
        const surveyRef = ref(database, 'Surveys');

        const fetchAndListen = async () => {
            try {
                const userSnap = await get(ref(database, `Users/${currentUserId}`));
                const userData = userSnap.val();
                const currentDepartmentId = userData?.departmentId;
                if (!currentDepartmentId) {
                    if (!unsubscribed) setLoading(false);
                    return;
                }

                // Posts
                onValue(postDefaultsRef, (snapshot) => {
                    if (unsubscribed) return;
                    const data = snapshot.val();
                    if (!data) {
                        setPosts([]);
                        return;
                    }

                    const loadedPosts = Object.entries(data)
                        .map(([postId, post]: any) => {
                            const filterData = post?.filterData;
                            let shouldInclude = !filterData || filterData.includes(currentDepartmentId);

                            if (!shouldInclude) return null;

                            return {
                                ...post,
                                id: `post-${postId}`,
                                type: 'post',
                                createdAt: Number(post.createAt),
                            };
                        })
                        .filter(Boolean);

                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setPosts(loadedPosts);
                });

                // Surveys
                onValue(surveyRef, (snapshot) => {
                    if (unsubscribed) return;
                    const data = snapshot.val();
                    if (!data) {
                        setSurveys([]);
                        return;
                    }

                    const loadedSurveys = Object.entries(data).map(([id, survey]: any) => ({
                        ...survey,
                        id: `survey-${id}`,
                        type: 'survey',
                        createdAt: Number(survey.createdAt),
                    }));

                    setSurveys(loadedSurveys);
                });

                setLoading(false);
            } catch (err) {
                console.error('Lỗi khi lấy dữ liệu:', err);
                setPosts([]);
                setSurveys([]);
                setLoading(false);
            }
        };

        fetchAndListen();

        return () => {
            unsubscribed = true;
            off(postDefaultsRef);
            off(surveyRef);
        };
    }, [pageName]);

    // Gộp posts + surveys
    const feed = useMemo(() => {
        return [...posts, ...surveys].sort((a, b) => b.createdAt - a.createdAt);
    }, [posts, surveys]);

    const renderFeedItem = ({ item }: { item: any }) => {
        switch (item.type) {
            case 'post':
                return <ItemPost postId={item.postId} content={item.content} createAt={item.createAt} groupId={item.groupId} postImage={item.postImage} postLike={item.postLike} postMark={item.postMark} userPostId={item.userId} />;
            case 'survey':
                return <ItemSurvey survey={item} />;
            default:
                return null;
        }
    };

    return (
        <View style={{ position: 'relative', height: '100%', paddingBottom: 50 }}>
            <Header title={title} pageName={pageName} />

            {pageName === 'home' ? (
                loading ? (
                    <ActivityIndicator size="large" color="#000" style={{ marginTop: 30 }} />
                ) : (
                    <FlatList
                        ListHeaderComponent={
                            <>
                                <ListEvent />
                                <Text style={styles.feedTitle}>Bảng tin</Text>
                            </>
                        }
                        data={feed}
                        keyExtractor={(item) => item.id}
                        renderItem={renderFeedItem}
                        contentContainerStyle={{ padding: 10 }}
                    />
                )
            ) : (
                <View style={styles.listItem}>
                    {pageName === 'friend' ? (
                        <ListFriend />
                    ) : pageName === 'notification' ? (
                        <ListNotify />
                    ) : pageName === 'profile' ? (
                        <Profile />
                    ) : (
                        <ListGroup />
                    )}
                </View>
            )}

            <Navigation onIconPress={handleIconPress} />
        </View>
    );
};

const styles = StyleSheet.create({
    feedTitle: {
        fontSize: 25,
        fontWeight: '700',
        marginBottom: 12,
        color: '#333',
        paddingHorizontal: 20
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
