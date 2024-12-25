import React from 'react';
import { View, Image, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native'; // Import useNavigation

type HomeHeaderProps = {
    title: string;
    pageName: string; // Nhận thêm prop để xác định trang
};

const HeaderBack: React.FC<HomeHeaderProps> = () => {

    const navigation = useNavigation(); // Khai báo useNavigation

    const handleBackPress = () => {
        navigation.goBack(); // Quay lại trang trước đó
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
