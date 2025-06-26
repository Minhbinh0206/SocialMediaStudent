import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Platform,
    UIManager,
    Animated,
    LayoutAnimation,
} from 'react-native';
import ItemPost from '../components/ItemPost';

interface Post {
    postId: string;
    groupId: string;
    userId: string;
    content: string;
    createAt: number;
    postImage: string[];
    postLike: { count: number; userIds: string[] };
}

interface ListPostProps {
    posts: Post[];
    loading?: boolean;
}

const Shimmer: React.FC = () => {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 500,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    return <Animated.View style={[styles.shimmer, { opacity }]} />;
};

const ListPost: React.FC<ListPostProps> = ({ posts, loading }) => {
    const [visibleCount, setVisibleCount] = React.useState(5); // chỉ hiển thị 5 bài đầu
    const [isLoadingMore, setIsLoadingMore] = React.useState(false);

    if (Platform.OS === 'android') {
        UIManager.setLayoutAnimationEnabledExperimental &&
            UIManager.setLayoutAnimationEnabledExperimental(true);
    }

    const handleLoadMore = () => {
        setIsLoadingMore(true);

        setTimeout(() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setVisibleCount((prev) => prev + 5);
            setIsLoadingMore(false);
        }, 0); 
    };

    const visiblePosts = posts.slice(0, visibleCount);

    const renderItem = ({ item }: { item: Post }) => (
        <ItemPost
            postId={item.postId}
            groupId={item.groupId}
            userPostId={item.userId}
            content={item.content}
            createAt={item.createAt}
            postImage={item.postImage}
            postLike={item.postLike}
        />
    );

    return (
        <View>
            <Text style={styles.title}>Bài viết mới</Text>

            {loading ? (
                <View style={{ paddingHorizontal: 16 }}>
                    {[...Array(3)].map((_, index) => (
                        <Shimmer key={index} />
                    ))}
                </View>
            ) : (
                <>
                    <FlatList
                        data={visiblePosts}
                        keyExtractor={(item) => `post_${item.postId}`}
                        renderItem={renderItem}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <Text style={styles.emptyText}>Không có bài viết</Text>
                        }
                    />
                    {/* Nếu còn bài chưa hiển thị, thì hiện nút Xem thêm */}

                    {isLoadingMore ? (
                        <View style={{ paddingHorizontal: 16 }}>
                            {[...Array(2)].map((_, index) => (
                                <Shimmer key={`loadmore-${index}`} />
                            ))}
                        </View>
                    ) : visibleCount < posts.length ? (
                        <Text style={styles.loadMoreText} onPress={handleLoadMore}>
                            Xem thêm...
                        </Text>
                    ) : null}
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    loadMoreText: {
        textAlign: 'center',
        color: '#007bff',
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 20
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        margin: 15,
        textAlign: 'left',
    },
    shimmer: {
        height: 150,
        marginVertical: 10,
        borderRadius: 10,
        backgroundColor: '#e0e0e0',
    },
    emptyText: {
        textAlign: 'center',
        paddingVertical: 20,
        color: '#999',
        fontStyle: 'italic',
    },
});

export default ListPost;
