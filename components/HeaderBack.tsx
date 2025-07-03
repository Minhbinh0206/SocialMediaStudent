import React, { useState } from 'react';
import { View, Image, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native'; // Import useNavigation

type HeaderBackProps = {
    namePage: string;
};

const HeaderBack: React.FC<HeaderBackProps> = ({ namePage }) => {
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

            <Text style={styles.titleText}>{namePage}</Text>
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
    titleText: {
        fontSize: 20,
        color: '#fff',
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'center',
    },

});

export default HeaderBack;
