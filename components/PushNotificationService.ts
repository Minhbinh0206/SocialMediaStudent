import messaging from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';
import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
import functions from '@react-native-firebase/functions';
import { getAuth } from 'firebase/auth';

/* Lưu FCM token */
export const saveFcmToken = async () => {
  try {
    await messaging().requestPermission();

    const token = await messaging().getToken();
    const auth = getAuth();
    const user  = auth.currentUser;

    await database()
      .ref(`Users/${user?.uid}/fcmToken`)
      .set(token);

    console.log('[FCM] ✅ Đã lưu token vào DB');
  } catch (err) {
    console.log('[FCM] ❌ Lỗi:', err);
  }
};

/* Tự động update token khi thay đổi */
messaging().onTokenRefresh(async newToken => {
  const userId = auth().currentUser?.uid;
  if (userId) {
    await database()
      .ref(`Users/${userId}/fcmToken`)
      .set(newToken);
    console.log('🔄 Token refreshed:', newToken);
  }
});

/* Lắng nghe foreground */
export const setupForegroundListener = async () => {
  await notifee.requestPermission();
  const channelId = await notifee.createChannel({ id: 'default', name: 'Thông báo' });

  messaging().onMessage(async msg => {
    await notifee.displayNotification({
      title: msg.notification?.title,
      body: msg.notification?.body,
      android: { channelId, smallIcon: 'ic_launcher' },
    });
  });
};

/* Gọi Cloud Function gửi push */
export const requestPush = async (
  toUserId: string,
  title: string,
  body: string,
  data: Record<string, string> = {},
) => {
  try {
    const res = await functions()
      .httpsCallable('sendPushCF')({ toUserId, title, body, data });
    console.log('[requestPush] ✅ CloudFn trả về:', res.data);
  } catch (e) {
    console.log('[requestPush] ❌ Lỗi gọi CloudFn:', e);
  }
};
