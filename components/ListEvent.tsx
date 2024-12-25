import React, { useState, useEffect } from 'react';
import { View, FlatList, ActivityIndicator, StyleSheet, Dimensions, Animated } from 'react-native';
import { database } from '../firebaseConfig';
import { ref, onValue, off } from 'firebase/database';
import { Text } from 'react-native';
import ItemEvent from './ItemEvent';
import LottieView from 'lottie-react-native';

const { width } = Dimensions.get('window'); // Lấy kích thước màn hình

const ListEvent: React.FC = () => {
    const [events, setEvents] = useState<any[]>([]); // Dữ liệu lấy về sẽ là kiểu `any`
    const [loading, setLoading] = useState<boolean>(true);
    const scrollX = new Animated.Value(0); // Để theo dõi vị trí cuộn
    const fadeAnim = new Animated.Value(0); // Để điều khiển hiệu ứng fade in

    // Fetch dữ liệu từ Firebase theo thời gian thực
    useEffect(() => {
        const eventsRef = ref(database, 'Events'); // Truy cập vào node 'Events'

        // Đăng ký sự kiện nhận dữ liệu theo thời gian thực
        const onEventsValueChange = (snapshot: any) => {
            const data = snapshot.val();

            if (data) {
                let loadedEvents: any[] = [];

                // Duyệt qua các adminEventId và eventId để lấy dữ liệu
                Object.keys(data).forEach((adminEventId) => {
                    Object.keys(data[adminEventId]).forEach((eventId) => {
                        const event = data[adminEventId][eventId];
                        loadedEvents.push({
                            id: eventId,
                            ...event,
                        });
                    });
                });

                setEvents(loadedEvents);
            } else {
                setEvents([]);
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

    // Hiệu ứng Fade in khi dữ liệu được load
    useEffect(() => {
        if (!loading) {
            Animated.timing(fadeAnim, {
                toValue: 1, // Tạo hiệu ứng fade in
                duration: 500, // Thời gian fade
                useNativeDriver: true,
            }).start();
        }
    }, [loading]); // Khi `loading` chuyển thành false, bắt đầu hiệu ứng fade

    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                {/* Sử dụng Lottie animation */}
                <LottieView
                    source={require('../animations/loading.json')}
                    autoPlay
                    loop
                    style={styles.lottie}
                />
            </View>
        );
    }

    return (
        <View>
            <Text style={styles.title}>Sự kiện</Text>
            <Animated.FlatList
                data={events}
                keyExtractor={(item) => item.id}  // Sử dụng 'id' làm keyExtractor
                horizontal={true}  // Hiển thị theo chiều ngang
                renderItem={({ item, index }) => {
                    const inputRange = [
                        (index - 1) * (width * 0.75), // Vị trí phần tử trái
                        index * (width * 0.75), // Vị trí phần tử chính
                        (index + 1) * (width * 0.75), // Vị trí phần tử phải
                    ];

                    const outputRangeScale = [0.9, 1, 0.9]; // Hiệu ứng thu nhỏ cho các phần tử bên ngoài
                    const outputRangeOpacity = [0.5, 1, 0.5]; // Hiệu ứng mờ cho các phần tử bên ngoài

                    const scale = scrollX.interpolate({
                        inputRange,
                        outputRange: outputRangeScale,
                    });

                    const opacity = scrollX.interpolate({
                        inputRange,
                        outputRange: outputRangeOpacity,
                    });

                    return (
                        <View style={styles.eventWrapper}>
                            <Animated.View style={{ transform: [{ scale }], opacity }}>
                                <ItemEvent
                                    title={item.titleEvent}
                                    content={item.contentEvent}
                                    imageUrl={item.imageEvent}
                                />
                            </Animated.View>
                        </View>
                    );
                }}
                contentContainerStyle={{ paddingHorizontal: 0 }}
                snapToInterval={width * 0.75}  // Điều chỉnh chiều rộng phần tử để khi lướt qua nó sẽ "dừng lại" tại phần tử
                decelerationRate="fast"
                showsHorizontalScrollIndicator={false}
                snapToAlignment="center"
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: true }
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    lottie: {
        width: 150,
        height: 150,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        margin: 15,
        textAlign: 'left',
    },
    eventWrapper: {
        width: width * 0.75,
        alignItems: 'center',
        justifyContent: 'center',
    },
    skeletonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    skeletonItem: {
        width: 100,
        height: 100,
        marginRight: 10,
        borderRadius: 10,
    },
});

export default ListEvent;
