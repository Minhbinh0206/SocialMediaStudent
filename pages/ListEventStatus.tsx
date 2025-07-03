// src/components/ListEventStatus.tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    ActivityIndicator,
    StyleSheet,
    TextInput,
    TouchableOpacity,
} from 'react-native';
import { ref, onValue, off } from 'firebase/database';
import { database } from '../firebaseConfig';
import ItemEvent from '../components/ItemEvent';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../type';
import HeaderBack from '../components/HeaderBack';
import { ScrollView } from 'react-native-gesture-handler';
import { Image } from 'react-native';

type EventType = {
    id: string;
    adminId: string;
    eventId: string;
    titleEvent: string;
    contentEvent: string;
    imageEvents: string[];
    beginAt: string;
    finishAt: string;
    createAt: string;
    status: 0 | 1 | 2;
};

const ListEventStatus: React.FC = () => {
    const navigation =
        useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    const [searchText, setSearchText] = useState('');
    const [loading, setLoading] = useState(true);
    const [soon, setSoon] = useState<EventType[]>([]);
    const [running, setRunning] = useState<EventType[]>([]);
    const [ended, setEnded] = useState<EventType[]>([]);

    const filterEvents = (data: EventType[]) => {
        if (!searchText.trim()) return data;

        const lower = searchText.toLowerCase();
        return data.filter(
            e =>
                e.titleEvent.toLowerCase().includes(lower)
        );
    };

    /* ----------- lấy realtime ----------- */
    useEffect(() => {
        const eventsRef = ref(database, 'Events');

        const listener = (snap: any) => {
            const raw = snap.val();
            const soonArr: EventType[] = [];
            const runArr: EventType[] = [];
            const endArr: EventType[] = [];

            if (raw) {
                Object.entries(raw).forEach(([adminId, adminEvents]: any) => {
                    Object.entries(adminEvents).forEach(([eventId, ev]: any) => {
                        const e: EventType = { id: eventId, adminId, eventId, ...ev };
                        if (e.status === 0) soonArr.push(e);
                        else if (e.status === 1) runArr.push(e);
                        else endArr.push(e);
                    });
                });
            }
            setSoon(soonArr);
            setRunning(runArr);
            setEnded(endArr);
            setLoading(false);
        };

        onValue(eventsRef, listener);
        return () => off(eventsRef, 'value', listener);
    }, []);

    /* ----------- render section ----------- */
    const renderSection = (title: string, data: EventType[]) => (
        <View style={styles.block}>
            <Text style={styles.blockTitle}>{title}</Text>

            {data.length === 0 ? (
                <View style={styles.emptyWrapper}>
                    <Text style={styles.empty}>Chưa có sự kiện</Text>
                </View>
            ) : (
                <FlatList
                    data={data}
                    keyExtractor={(item) => item.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    ItemSeparatorComponent={() => <View style={{ width: 12, padding: 10 }} />}
                    renderItem={({ item }) => (
                        <ItemEvent
                            title={item.titleEvent}
                            content={item.contentEvent}
                            imageUrl={item.imageEvents ?? []}
                            createAt={item.createAt}
                            beginAt={item.beginAt}
                            finishAt={item.finishAt}
                            status={item.status}
                            adminId={item.adminId}
                            eventId={item.eventId}
                            onClick={() =>
                                navigation.navigate('EventDetail', {
                                    userId: item.adminId,
                                    eventId: item.eventId,
                                })
                            }
                        />
                    )}
                />
            )}
        </View>
    );

    if (loading) {
        return (
            <ActivityIndicator
                style={{ marginTop: 20 }}
                size="large"
                color="#0077cc"
            />
        );
    }

    return (
        <>
            <HeaderBack namePage='Danh sách các sự kiện'/>

            <ScrollView style={{ padding: 15 }}>
                <View style={styles.searchContainer}>
                    <TextInput
                        placeholder="Tìm kiếm sự kiện..."
                        value={searchText}
                        onChangeText={setSearchText}
                        style={styles.searchInput}
                    />
                    <TouchableOpacity onPress={() => { }}>
                        <Image source={require('../icons/icon_search_black.png')} style={styles.searchIcon} />
                    </TouchableOpacity>
                </View>



                {renderSection('🟡 Sắp bắt đầu', filterEvents(soon))}
                {renderSection('🟢 Đang diễn ra', filterEvents(running))}
                {renderSection('🔴 Đã kết thúc', filterEvents(ended))}
            </ScrollView>

        </>
    );
};

export default ListEventStatus;

const styles = StyleSheet.create({
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        backgroundColor: '#fff',
        paddingHorizontal: 10,
    },

    searchInput: {
        flex: 1,
        fontSize: 16,
        paddingHorizontal: 8,
        color: '#000',
    },

    searchIcon: {
        width: 20,
        height: 20,
        tintColor: '#333',
    },
    block: { marginBottom: 18, minHeight: 200 },
    blockTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 6,
        color: '#222',
    },
    emptyWrapper: {
        height: 160, // hoặc '100%' nếu container đủ cao
        justifyContent: 'center',
        alignItems: 'center',
    },

    empty: {
        fontStyle: 'italic',
        color: '#888',
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
    },
});
