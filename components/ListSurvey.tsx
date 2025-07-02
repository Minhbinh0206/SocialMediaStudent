import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { getDatabase, ref, onValue, off } from 'firebase/database';
import ItemSurvey from './ItemSurvey'; // Component bạn đã tạo trước đó
import { Survey } from './ItemSurvey';

const ListSurvey: React.FC = () => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getDatabase();
    const surveyRef = ref(db, 'Surveys');

    const handler = onValue(surveyRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setSurveys([]);
        setLoading(false);
        return;
      }
      const surveysArray = Object.values(data) as Survey[];
      surveysArray.sort((a, b) => a.finishedAt - b.finishedAt);
      setSurveys(surveysArray);
      setLoading(false);
    });

    return () => off(surveyRef, 'value', handler);
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  if (surveys.length === 0) {
    return (
      <View style={styles.centered}>
        <Text>Không có khảo sát nào.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={surveys}
      keyExtractor={(item) => item.surveyId}
      contentContainerStyle={styles.listContainer}
      renderItem={({ item }) => <ItemSurvey survey={item} />}
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ListSurvey;