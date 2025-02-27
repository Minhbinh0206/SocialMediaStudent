import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useRoute } from '@react-navigation/native';
import database from '@react-native-firebase/database';
import GroupDetailNotJoin from '../components/GroupDetailNotJoin';
import GroupDetailDefault from '../components/GroupDetailDefault';

const GroupDetail = () => {
    const route = useRoute();
    const { groupId } = route.params as { groupId?: string } || {};
    const [group, setGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [defaultGroup, setDefaultGroup] = useState(false);

    useEffect(() => {
        if (!groupId) return;

        const groupRef = database().ref(`/Groups/${groupId}`);
        groupRef.on('value', snapshot => {
            if (snapshot.exists()) {
                setGroup(snapshot.val());
                setDefaultGroup(snapshot.val().groupDefault);
            }
            setLoading(false);
        });

        return () => groupRef.off();
    }, [groupId]);

    if (!groupId) {
        return (
            <View style={styles.loading}>
                <Text>Không tìm thấy nhóm!</Text>
            </View>
        );
    }

    if (loading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color="#007bff" />
            </View>
        );
    }

    console.log('defaultGroup', defaultGroup);

    // Kiểm tra groupDefault và render component phù hợp
    return defaultGroup ? (
        <GroupDetailDefault />
    ) : (
        <GroupDetailNotJoin groupId={groupId} />
    );
};

const styles = StyleSheet.create({
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default GroupDetail;
