import React, { useState } from 'react';
import { View, Image, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native'; // Import useNavigation

const HeaderBack = () => {
    const navigation = useNavigation(); // Khai báo useNavigation
    const [isPressing, setIsPressing] = useState(false); // Trạng thái nhấn nút

    const handleBackPress = () => {
        if (!isPressing) {
            setIsPressing(true);
            navigation.goBack();

            // Đặt lại trạng thái sau một khoảng thời gian để ngừng nhấn liên tục
            setTimeout(() => {
                setIsPressing(false);
            }, 500); // 500ms là khoảng thời gian cho phép nhấn lại
        }
    };

    return (
        <View style={styles.headerContainer}>
            <TouchableOpacity onPress={handleBackPress}>
                <Image
                    source={require('../icons/icon_back.png')}
                    style={styles.iconImage}
                />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    headerContainer: {
        width: '100%',
        height: 60,
        backgroundColor: '#3399FF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
    },
    iconImage: {
        width: 30,
        height: 30,
    },
});

export default HeaderBack;
