import React from 'react';
import { View, StyleSheet } from 'react-native';
import FriendProfile from '../components/FriendProfile';
import HeaderBack from '../components/HeaderBack';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../type';


type Props = NativeStackScreenProps<RootStackParamList, 'FriendScreen'>;

const FriendScreen: React.FC<Props> = ({ route }) => {
    // Lấy userId từ tham số của route
    const { userId } = route.params;

    return (
        <View style={{ flexDirection: 'column', flex: 1 }}>
            <HeaderBack />
            <View style={styles.listItem}>
                {/* Truyền userId vào FriendProfile */}
                <FriendProfile userId={userId} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    listItem: {
        padding: 10,
        marginBottom: 10,
        backgroundColor: '#f0f0f0',
        borderRadius: 5,
        flexDirection: 'column',
        flex: 1
    },
});

export default FriendScreen;
