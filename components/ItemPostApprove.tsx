import { get, getDatabase, ref } from 'firebase/database';
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    Animated,
    Dimensions,
    StyleSheet,
} from 'react-native';
import RenderHTML from 'react-native-render-html';

const { width } = Dimensions.get('window');

export interface ItemPostApproveProps {
    id: string;
    userId: string;
    createAt: number;
    content: string;
    images: string[];
    onApprove: (postId: string) => void;
    onReject: (postId: string) => void;
}

const ItemPostApprove: React.FC<ItemPostApproveProps> = ({
    id,
    userId,
    createAt,
    content,
    images,
    onApprove,
    onReject,
}) => {
    /* ----- state cho ảnh & nội dung ----- */
    const [showFullContent, setShowFullContent] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [userName, setUserName] = useState<string>('');
    const [avatar, setAvatar] = useState<string>('');

    /* ----- animation chỉ để minh hoạ giữ nguyên code gốc ----- */
    const translateY = new Animated.Value(0);
    const opacity = new Animated.Value(1);

    /* ----- helpers ----- */
    const formatDate = (timestamp: number) => {
        console.log('timestamp', timestamp);
        if (!timestamp || isNaN(timestamp)) return 'Thời gian không hợp lệ';

        const now = Date.now();
        const diffInSeconds = Math.floor((now - timestamp) / 1000);
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        const diffInHours = Math.floor(diffInMinutes / 60);
        const diffInDays = Math.floor(diffInHours / 24);

        if (diffInMinutes < 1) return 'Vừa xong';
        if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
        if (diffInHours < 24) return `${diffInHours} giờ trước`;
        return `${diffInDays} ngày trước`;
    };

    const findStudentByUserId = async (userId: string) => {
        const db = getDatabase();
        // Không tìm thấy trong Admins → kiểm tra Users
        const userRef = ref(db, `Users/${userId}`);
        const userSnap = await get(userRef);
        if (userSnap.exists()) {
            const data = userSnap.val();
            setUserName(data.studentName);
            setAvatar(data.avatar);
        } else {
            setUserName('');
            setAvatar('');
        }
    };

    useEffect(() => {
        findStudentByUserId(userId)
    }, [userId])

    const truncate = (text: string, len: number) =>
        text.length > len ? `${text.slice(0, len)} …` : text;

    /* ----- render ----- */
    return (
        <Animated.View style={[styles.postCard, { transform: [{ translateY }], opacity }]}>
            {/* ------ HEADER ------ */}
            <View style={styles.header}>
                <Image
                    source={{
                        uri:
                            avatar ||
                            'https://tse3.mm.bing.net/th?id=OIP.gYaUpJvv-3E-stUjZ-Pd2AHaHa&pid=Api&P=0&h=180',
                    }}
                    style={styles.avatar}
                />
                <View style={styles.userInfo}>
                    <Text style={styles.userName}>{userName}</Text>
                    <Text style={styles.postDate}>{formatDate(createAt)}</Text>
                </View>
                <TouchableOpacity style={{ position: 'absolute', right: 10 }}>
                    <Image source={require('../icons/icon_more.png')} style={{ width: 20, height: 20 }} />
                </TouchableOpacity>
            </View>

            {/* ------ NỘI DUNG ------ */}
            <RenderHTML
                baseStyle={styles.postContent}
                contentWidth={width}
                source={{ html: showFullContent ? content : truncate(content, 100) }}
            />
            {content.length > 100 && (
                <TouchableOpacity onPress={() => setShowFullContent(!showFullContent)}>
                    <Text style={styles.seeMore}>{showFullContent ? 'Ẩn bớt' : 'Xem thêm'}</Text>
                </TouchableOpacity>
            )}

            {/* ------ ẢNH ------ */}
            {images.length > 0 && (
                <View>
                    {currentImageIndex > 0 && (
                        <TouchableOpacity
                            style={styles.leftArrow}
                            onPress={() => setCurrentImageIndex(prev => Math.max(prev - 1, 0))}
                        >
                            <Text style={styles.arrowText}>{'<'}</Text>
                        </TouchableOpacity>
                    )}

                    <Image source={{ uri: images[currentImageIndex] }} style={styles.postImage} resizeMode="cover" />

                    {currentImageIndex < images.length - 1 && (
                        <TouchableOpacity
                            style={styles.rightArrow}
                            onPress={() => setCurrentImageIndex(prev => Math.min(prev + 1, images.length - 1))}
                        >
                            <Text style={styles.arrowText}>{'>'}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* ------ ACTION: 2 NÚT ------ */}
            <View style={styles.approveRow}>
                <TouchableOpacity
                    style={[styles.approveBtn, { backgroundColor: '#FF3B30' }]}
                    onPress={() => onReject(id)}
                >
                    <Text style={styles.approveTxt}>Từ chối</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.approveBtn, { backgroundColor: '#34C759' }]}
                    onPress={() => onApprove(id)}
                >
                    <Text style={styles.approveTxt}>Phê duyệt</Text>
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
};

/* ---------- STYLE ---------- */
const styles = StyleSheet.create({
    postCard: {
        backgroundColor: '#fff',
        marginHorizontal: 12,
        marginVertical: 8,
        borderRadius: 8,
        padding: 12,
        elevation: 2,
    },
    /* header */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 8 },
    userInfo: { flex: 1 },
    userName: { fontWeight: '600', fontSize: 16 },
    postDate: { fontSize: 12, color: '#6e6e6e' },

    /* nội dung */
    postContent: { fontSize: 15, lineHeight: 20, padding: 10 },
    seeMore: { color: '#007AFF', marginBottom: 10 },

    /* ảnh */
    postImage: { width: '100%', aspectRatio: 16 / 9, borderRadius: 8, backgroundColor: '#e9e9e9' },
    leftArrow: { position: 'absolute', left: 10, top: '45%', zIndex: 2 },
    rightArrow: { position: 'absolute', right: 10, top: '45%', zIndex: 2 },
    arrowText: { fontSize: 22, fontWeight: '800', color: '#fff' },

    /* row 2 nút duyệt */
    approveRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
    },
    approveBtn: {
        flex: 1,
        marginHorizontal: 4,
        paddingVertical: 10,
        borderRadius: 6,
        alignItems: 'center',
    },
    approveTxt: { color: '#fff', fontWeight: '600' },
});

export default ItemPostApprove;
