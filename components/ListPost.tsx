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
    TouchableOpacity,
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
    postMark: { count: number; userIds: string[] };
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

    return (
        <View>
            {loading ? (
                <>
                    {[...Array(3)].map((_, index) => (
                        <Shimmer key={index} />
                    ))}
                </>
            ) : posts.length === 0 ? (
                <Text style={styles.emptyText}>Không có bài viết</Text>
            ) : (
                visiblePosts.map((item) => (
                    <ItemPost
                        key={`post_${item.postId}`}
                        postId={item.postId}
                        groupId={item.groupId}
                        userPostId={item.userId}
                        content={item.content}
                        createAt={item.createAt}
                        postImage={item.postImage}
                        postLike={item.postLike}
                        postMark={item.postMark}
                    />
                ))
            )}

            {isLoadingMore ? (
                [...Array(2)].map((_, index) => (
                    <Shimmer key={`loadmore-${index}`} />
                ))
            ) : visibleCount < posts.length ? (
                <TouchableOpacity onPress={handleLoadMore}>
                    <Text style={styles.loadMoreText}>Xem thêm...</Text>
                </TouchableOpacity>
            ) : null}
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
