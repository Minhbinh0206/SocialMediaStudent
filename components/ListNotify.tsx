import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import ItemNotify from './ItemNotify';
import { onValue, ref } from 'firebase/database';
import { database } from '../firebaseConfig';
import { ActivityIndicator } from 'react-native-paper';

const ListNotify = () => {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true); // State to track loading

    useEffect(() => {
        const notifiesRef = ref(database, 'Notifies');
        const unsubscribe = onValue(notifiesRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Duyệt qua từng `idAnnouncer` và sau đó qua từng `id` của notify
                const loadedNotifications = Object.keys(data).flatMap((idAnnouncer) =>
                    Object.keys(data[idAnnouncer]).map((id) => ({
                        id: id, // notify id
                        idAnnouncer: idAnnouncer,
                        ...data[idAnnouncer][id], // Các thuộc tính khác của notify
                    }))
                );
                setNotifications(loadedNotifications);
                setLoading(false)
            } else {
                setNotifications([]);
                setLoading(false)
            }
        });
    
        // Cleanup subscription
        return () => unsubscribe();
    }, []);    

    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            {notifications.map((notification) => (
                <ItemNotify
                    idAnnouncer={notification.idAnnouncer}
                    key={notification.id}
                    title={notification.title}
                    content={notification.content}
                    createAt={notification.createAt}
                    filter={notification.filter}
                    id={notification.id}
                    onReadPress={() => console.log("ALKIU")} />
            ))}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    loaderContainer: {
        flex: 1,
        height: 700,
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        flex: 1,
        padding: 10,
    },
});

export default ListNotify;