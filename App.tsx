import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import { createStackNavigator } from '@react-navigation/stack';
import UploadProfile from './pages/UploadProfile';
import { NavigationContainer } from '@react-navigation/native';
import CommentScreen from './pages/CommentScreen';
import SearchFriend from './pages/SearchFriend';
import Message from './pages/Message';
import MessageDetail from './pages/MessageDetail';
import GroupDetail from './pages/GroupDetail';
import GroupDetailNotJoin from './components/GroupDetailNotJoin';
import GroupDetailJoined from './components/GroupDetailJoined';
import CreateGroup from './components/CreateGroup';
import NotifyDetailScreen from './pages/NotifyDetailScreen';
import FriendScreen from './pages/FriendScreen';

const Stack = createStackNavigator();

// App Component
function App(): React.JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
        <Stack.Screen name="Register" component={Register} options={{ headerShown: false }} />
        <Stack.Screen name="Home" component={Home} options={{ headerShown: false }} />
        <Stack.Screen name="UploadProfile" component={UploadProfile} options={{ headerShown: false }} />
        <Stack.Screen name="SearchFriend" component={SearchFriend} options={{ headerShown: false }} />
        <Stack.Screen name="FriendScreen" component={FriendScreen} options={{ headerShown: false}}/>
        <Stack.Screen name="CommentScreen" component={CommentScreen} options={{ headerShown: false }} />
        <Stack.Screen name="NotifyDetailScreen" component={NotifyDetailScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Message" component={Message} options={{ headerShown: false }} />
        <Stack.Screen name="MessageDetail" component={MessageDetail} options={{ headerShown: false }} />
        <Stack.Screen name="GroupDetail" component={GroupDetail} options={{ headerShown: false }} />
        <Stack.Screen name="GroupDetailNotJoin" component={GroupDetailNotJoin} options={{ headerShown: false }} />
        <Stack.Screen name="GroupDetailJoined" component={GroupDetailJoined}  options={{ headerShown: false }}/>
        <Stack.Screen name="CreateGroup" component={CreateGroup} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  componentContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  componentText: {
    fontSize: 18,
    fontWeight: '500',
  },
});

export default App;
