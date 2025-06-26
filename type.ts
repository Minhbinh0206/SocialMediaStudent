export type RootStackParamList = {
  Default: undefined;
  Login: undefined;
  Register: undefined;
  UploadProfile: { userId: string };
  Home: { userId: string };
  CommentScreen: { postId: string, userPostId: string, groupId: string };
  SearchFriend: undefined;
  FriendScreen: { userId: string };
  NotifyDetailScreen: { userId: string; notifyId: string };
  Message: undefined;
  MessageDetail: { userId: string };
  MessageActivity: undefined;
  Group: undefined;
  GroupDetail: { groupId: string };
  GroupDetailNotJoin: { groupId: string };
  GroupDetailJoined: { groupId: string };
  CreateGroup: undefined;
};
