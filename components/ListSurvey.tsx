import React, { useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Animated } from 'react-native';
import { getDatabase, ref, onValue, off } from 'firebase/database';
import ItemSurvey, { Survey } from './ItemSurvey';

const Shimmer: React.FC = () => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return <Animated.View style={[styles.shimmer, { opacity }]} />;
};

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
      <View style={styles.shimmerContainer}>
        {[...Array(3)].map((_, index) => (
          <Shimmer key={index} />
        ))}
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
  shimmerContainer: {
    padding: 16,
  },
  shimmer: {
    height: 150,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#e0e0e0',
  },
});

export default ListSurvey;
