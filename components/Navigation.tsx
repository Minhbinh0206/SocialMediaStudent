import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Image } from 'react-native';

type Props = {
    onIconPress: (title: string, page: string) => void; // Truyền thêm thông tin trang
};

const Navigation: React.FC<Props> = ({ onIconPress }) => {
    const [activeIcon, setActiveIcon] = useState<string>('home');
    const notificationCount = 5;

    const iconPaths = {
        home: require('../icons/icon_home.png'),
        home_active: require('../icons/icon_home_active.png'),
        group: require('../icons/icon_group.png'),
        group_active: require('../icons/icon_group_active.png'),
        notification: require('../icons/icon_bell.png'),
        notification_active: require('../icons/icon_bell_active.png'),
        profile: require('../icons/icon_profile.png'),
        profile_active: require('../icons/icon_profile_active.png'),
        friend: require('../icons/icon_friends.png'),
        friend_active: require('../icons/icon_friends_active.png'),
    };

    const getTextColor = (iconName: string) => {
        return activeIcon === iconName ? '#3399FF' : '#000000';
    };

    const handlePress = (iconName: string, title: string, page: string) => {
        setActiveIcon(iconName);
        onIconPress(title, page); // Gửi thông tin về cha
    };

    return (
        <View style={styles.navbar}>
            <TouchableOpacity style={styles.item} onPress={() => handlePress('home', 'Trang chủ', 'home')}>
                <Image
                    source={activeIcon === 'home' ? iconPaths.home_active : iconPaths.home}
                    style={styles.iconImage}
                />
                <Text style={[styles.titleIcon, { color: getTextColor('home') }]}>Trang chủ</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.item} onPress={() => handlePress('friend', 'Bạn bè', 'friend')}>
                <Image
                    source={activeIcon === 'friend' ? iconPaths.friend_active : iconPaths.friend}
                    style={styles.iconImage}
                />
                <Text style={[styles.titleIcon, { color: getTextColor('friend') }]}>Bạn bè</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.item} onPress={() => handlePress('group', 'Nhóm', 'group')}>
                <Image
                    source={activeIcon === 'group' ? iconPaths.group_active : iconPaths.group}
                    style={styles.iconImage}
                />
                <Text style={[styles.titleIcon, { color: getTextColor('group') }]}>Nhóm</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.item} onPress={() => handlePress('notification', 'Thông báo', 'notification')}>
                <View>
                    <Image
                        source={activeIcon === 'notification' ? iconPaths.notification_active : iconPaths.notification}
                        style={{ width: 27, height: 30, marginHorizontal: 15 }}
                    />
                    <Text style={[styles.titleIcon, { color: getTextColor('notification') }]}>Thông báo</Text>
                    {notificationCount > 0 && (
                        <View style={styles.badgeContainer}>
                            <Text style={styles.badgeText}>{notificationCount}</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.item} onPress={() => handlePress('profile', 'Cá nhân', 'profile')}>
                <Image
                    source={activeIcon === 'profile' ? iconPaths.profile_active : iconPaths.profile}
                    style={styles.iconImage}
                />
                <Text style={[styles.titleIcon, { color: getTextColor('profile') }]}>Cá nhân</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    navbar: {
        position: 'absolute',
        borderTopColor: '#f0f0f0',
        borderTopWidth: 3,
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: 80,
        backgroundColor: '#fff',
    },
    item: {
        alignItems: 'center',
    },
    iconImage: {
        width: 35,
        height: 30,
    },
    titleIcon: {
        fontSize: 13,
        marginTop: 5,
    },
    badgeContainer: {
        position: 'absolute',
        right: 12,
        top: -5,
        backgroundColor: 'red',
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
});

export default Navigation;
