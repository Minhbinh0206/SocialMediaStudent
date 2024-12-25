import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface EventItemProps {
  title: string;
  content: string;
  imageUrl: string;
}

const ItemEvent: React.FC<EventItemProps> = ({ title, content, imageUrl }) => {
  // Hàm cắt chuỗi content
  const truncateContent = (content: string, maxLength: number) => {
    if (content.length > maxLength) {
      return content.substring(0, maxLength) + '...'; // Cắt chuỗi và thêm '...'
    }
    return content;
  };

  return (
    <View style={styles.eventCard}>
      <Image source={{ uri: imageUrl }} style={styles.eventImage} />
      <Text style={styles.eventTitle}>{title}</Text>
      <Text style={styles.eventDescription}>{truncateContent(content, 50)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  eventCard: {
    width: '100%',
    padding: 15,
    marginBottom: 20,
    backgroundColor: '#fff', // Nền trắng để làm nổi bật
    borderRadius: 15, // Cạnh tròn
    borderWidth: 1,
    borderColor: '#ddd',
    elevation: 5, // Bóng đổ nhẹ
    shadowColor: '#000', // Màu bóng
    shadowOffset: { width: 0, height: 4 }, // Vị trí bóng đổ
    shadowOpacity: 0.1, // Độ mờ của bóng
    shadowRadius: 5, // Độ lan tỏa của bóng
    boxShadow: '0 4px 5px rgba(0, 0, 0, 0.1)', // Bóng đổ cho Android
  },
  eventImage: {
    height: 200,
    borderRadius: 15, // Cạnh tròn cho ảnh
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 15,
    color: '#333', // Màu sắc chữ tiêu đề
  },
  eventDescription: {
    fontSize: 16,
    marginTop: 10,
    color: '#555',
    lineHeight: 22, // Tăng khoảng cách dòng để dễ đọc
  },
  eventDate: {
    fontSize: 14,
    marginTop: 10,
    color: '#888',
    fontStyle: 'italic', // Làm cho ngày tháng có kiểu chữ nghiêng
  },
});

export default ItemEvent;
