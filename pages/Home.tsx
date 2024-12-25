import React, { useState } from 'react';
import { View, FlatList, StyleSheet, Text } from 'react-native';
import Header from '../components/Header';
import Navigation from '../components/Navigation';
import ListEvent from '../components/ListEvent';
import ListPost from '../components/ListPost';

const Home: React.FC = () => {
    const [title, setTitle] = useState('Trang chủ');
    const [pageName, setPageName] = useState('home');

    const handleIconPress = (newTitle: string, newPage: string) => {
        setTitle(newTitle);
        setPageName(newPage);
    };

    // Dữ liệu cho các thành phần cần cuộn (ListEvent, ListPost...)
    const renderItem = ({ item }: { item: any }) => {
        return (
            <View style={styles.listItem}>
                <ListEvent />
                <ListPost />
            </View>
        );
    };

    return (
        <View style={{ position: 'relative', height: '100%', paddingBottom: 50 }}>
            <Header title={title} pageName={pageName} />

            {/* Sử dụng FlatList thay vì ScrollView */}
            <FlatList
                data={['item1']}
                keyExtractor={(item, index) => index.toString()}
                renderItem={renderItem}  
            />

            <Navigation onIconPress={handleIconPress} />
        </View>
    );
};

const styles = StyleSheet.create({
    listItem: {
        padding: 10,
        marginBottom: 10,
        backgroundColor: '#f0f0f0',
        borderRadius: 5,
    },
});

export default Home;
