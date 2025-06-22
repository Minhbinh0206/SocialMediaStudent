import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { LayoutAnimation, Platform, UIManager, Animated } from 'react-native';
import { database } from '../firebaseConfig';
import { ref, onValue, off, get } from 'firebase/database';
import ItemPost from '../components/ItemPost';
import { getAuth } from 'firebase/auth';

const ListPost = () => {
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const firstLoad = useRef(true);

    useEffect(() => {
        const eventsRef = ref(database, 'Posts');
        const auth = getAuth();
        const currentUserId = auth.currentUser?.uid;

        if (!currentUserId) return;

        const onEventsValueChange = async (snapshot: any) => {
            const data = snapshot.val();

            if (!data) {
                setPosts([]);
                return;
            }

            let loadedPosts: any[] = [];

            // 1. Lấy thông tin departmentId của currentUser
            const departmentsSnap = await get(ref(database, 'Departments'));
            const departmentsData = departmentsSnap.val();

            let currentDepartmentId: string | null = null;

            outerLoop:
            for (const departmentId in departmentsData) {
                const majors = departmentsData[departmentId].majors;
                for (const majorId in majors) {
                    const classes = majors[majorId].classes;
                    for (const classId in classes) {
                        const students = classes[classId].students;
                        if (students && students[currentUserId]) {
                            currentDepartmentId = departmentId;
                            break outerLoop;
                        }
                    }
                }
            }

            if (!currentDepartmentId) {
                setPosts([]); // user không thuộc department nào => không có quyền xem
                return;
            }

            // 2. Lọc bài viết
            for (const groupId in data) {
                for (const userId in data[groupId]) {
                    for (const postId in data[groupId][userId]) {
                        const post = data[groupId][userId][postId];
                        const filterData = post?.filterData;

                        let shouldInclude = false;

                        // Không có filterData => công khai
                        if (!filterData) {
                            shouldInclude = true;
                        } else if (Array.isArray(filterData)) {
                            // Có filterData => kiểm tra departmentId
                            shouldInclude = filterData.includes(currentDepartmentId);
                        }

                        if (shouldInclude) {
                            loadedPosts.push({
                                id: postId,
                                postId: postId,
                                userId: userId,
                                groupId: groupId,
                                ...post,
                            });
                        }
                    }
                }
            }

            // Sắp xếp bài mới nhất lên đầu
            loadedPosts.sort((a, b) => Number(b.createAt) - Number(a.createAt));

            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setPosts(loadedPosts);

            if (firstLoad.current) {
                setLoading(false); // chỉ gọi một lần duy nhất
                firstLoad.current = false;
            }

        };

        onValue(eventsRef, onEventsValueChange);
        return () => {
            off(eventsRef, 'value', onEventsValueChange);
        };
    }, []);

    if (Platform.OS === 'android') {
        UIManager.setLayoutAnimationEnabledExperimental &&
            UIManager.setLayoutAnimationEnabledExperimental(true);
    }

    // Hàm render mỗi item trong FlatList
    const renderItem = ({ item }: { item: any }) => (
        <ItemPost postId={item.postId} groupId={item.groupId} userPostId={item.userId} content={item.content} createAt={item.createAt} postImage={item.postImage} postLike={item.postLike} />
    );

    return (
        <View>
            <Text style={styles.title}>Bài viết mới</Text>
            <Animated.FlatList
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
