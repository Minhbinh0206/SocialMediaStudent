import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { database } from '../firebaseConfig';
import { ref, onValue, off } from 'firebase/database';
import ItemPost from '../components/ItemPost';

const ListPost = () => {
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    // Fetch dữ liệu từ Firebase theo thời gian thực
    useEffect(() => {
        const eventsRef = ref(database, 'Posts');

        // Đăng ký sự kiện nhận dữ liệu theo thời gian thực
        const onEventsValueChange = (snapshot: any) => {
            const data = snapshot.val();

            if (data) {
                let loadedPosts: any[] = [];

                Object.keys(data).forEach((userId) => {
                    Object.keys(data[userId]).forEach((postId) => {
                        const post = data[userId][postId];
                        loadedPosts.push({
                            id: postId,
                            ...post,
                        });
                    });
                });

                setPosts(loadedPosts);
            } else {
                setPosts([]);
            }

            setLoading(false);
        };

        // Đăng ký listener cho sự kiện "value" của Firebase
        onValue(eventsRef, onEventsValueChange);

        // Cleanup khi component unmount hoặc khi listener không cần thiết
        return () => {
            off(eventsRef, 'value', onEventsValueChange); // Dừng listener
        };
    }, []); // Chạy 1 lần khi component mount

    // Hàm render mỗi item trong FlatList
    const renderItem = ({ item }: { item: any }) => (
        <ItemPost postId={item.postId} userPostId={item.userId} content={item.content} createdAt={item.createdAt} postImage={item.postImage} postLike={item.postLike}/>
    );

    return (
        <View>
            <Text style={styles.title}>Bài viết mới</Text>
            <FlatList
                data={posts}
                keyExtractor={(item) => `4_${item.postId}`}  // Sử dụng postId làm keyExtractor
                renderItem={renderItem}  // Render các item với ItemPost
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    loading ? (
                        <Text>Loading...</Text>
                    ) : (
                        <Text>No Posts Available</Text>
                    )
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    postCard: {
        padding: 15,
        marginBottom: 10,
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        margin: 15,
        textAlign: 'left',
    },
    postTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    postDate: {
        fontSize: 12,
        color: '#888',
    },
});

export default ListPost;
