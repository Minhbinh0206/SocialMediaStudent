import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Animated,
    FlatList,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    Image,
} from 'react-native';
import { database } from '../firebaseConfig';
import { ref, onValue, off } from 'firebase/database';
import ItemEvent from './ItemEvent';
import LottieView from 'lottie-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../type';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.75;
const SPACING = 16;
const SIDE_PADDING = (width - CARD_WIDTH) / 2;

const ListEvent: React.FC = () => {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    const scrollX = useRef(new Animated.Value(0)).current;
    const flatListRef = useRef<FlatList>(null);


    /* ───── Lấy sự kiện realtime ───── */
    useEffect(() => {
        const eventsRef = ref(database, 'Events');
        const listener = (snap: any) => {
            const data = snap.val();
            const loaded: any[] = [];

            if (data) {
                Object.entries(data).forEach(([adminId, adminEvents]) => {
                    Object.entries(adminEvents as any).forEach(([eventId, evt]: any) => {
                        if (evt.status == 2) {
                            return;
                        }
                        else {
                            if (evt && evt.titleEvent && evt.beginAt) {
                                loaded.push({
                                    id: eventId,
                                    adminId,
                                    eventId,
                                    ...evt,
                                });
                            }
                        }
                    });
                });

            }
            setEvents(loaded);
            setLoading(false);
        };

        onValue(eventsRef, listener);
        return () => off(eventsRef, 'value', listener);
    }, []);

    useEffect(() => {
        if (events.length === 0) return;
        let index = 0;
        const interval = setInterval(() => {
            index = (index + 1) % events.length;
            flatListRef.current?.scrollToOffset({
                offset: index * (CARD_WIDTH + SPACING),
                animated: true,
            });
        }, 5000);
        return () => clearInterval(interval);
    }, [events]);

    if (loading) {
        return (
            <View style={styles.loader}>
                <LottieView
                    source={require('../animations/loading.json')}
                    autoPlay
                    loop
                    style={{ width: 150, height: 150 }}
                />
            </View>
        );
    }

    if (events.length === 0) {
        return <View style={[styles.emptyContainer, { width }]}>
            <Text style={styles.empty}>Chưa có sự kiện</Text>
        </View>
    }

    return (
        <View>
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 10
            }}>
                <Text style={styles.title}>Sự kiện</Text>

                <TouchableOpacity
                    onPress={() => navigation.navigate('ListEventStatus')}
                    style={{
                        backgroundColor: '#fff',
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 100
                    }}
                >
                    <Image
                        source={require('../icons/icon_more.png')}
                        style={{ width: 20, height: 20 }}
                    />
                </TouchableOpacity>
            </View>

            <Animated.FlatList
                ref={flatListRef}
                data={events}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={CARD_WIDTH + SPACING}
                snapToAlignment="start"
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: true }
                )}
                renderItem={({ item, index }) => {
                    const inputRange = [
                        (index - 1) * (CARD_WIDTH + SPACING),
                        index * (CARD_WIDTH + SPACING),
                        (index + 1) * (CARD_WIDTH + SPACING),
                    ];

                    const scale = scrollX.interpolate({
                        inputRange,
                        outputRange: [0.9, 1, 0.9],
                    });

                    return (
                        <View style={{ width: CARD_WIDTH, marginHorizontal: SPACING / 2 }}>
                            <Animated.View style={{ transform: [{ scale }] }}>
                                <ItemEvent
                                    title={item.titleEvent}
                                    content={item.contentEvent}
                                    imageUrl={item.imageEvents || []}
                                    createAt={item.createAt}
                                    beginAt={item.beginAt}
                                    finishAt={item.finishAt}
                                    status={item.status}
                                    adminId={item.userId}
                                    eventId={item.eventId}
                                    onClick={() => navigation.navigate('EventDetail', { userId: item.userId, eventId: item.eventId })}
                                />
                            </Animated.View>
                        </View>
                    );
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: {
        fontSize: 25,
        fontWeight: '700',
        marginBottom: 12,
        color: '#333',
    },
    emptyContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 20,
        minHeight: 200,
        textAlign: 'center'
    },
    empty: {
        fontStyle: 'italic',
        color: '#888',
        fontSize: 16,
        textAlign: 'center',
    },

});

export default ListEvent;
