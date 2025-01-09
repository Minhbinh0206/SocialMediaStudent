// navigation/types.ts
export type RootStackParamList = {
    Default: undefined;
    Login: undefined; 
    Register: undefined; 
    UploadProfile: { userId: string };
    Home: { userId: string };
    CommentScreen: { postId: string, userPostId: string };
    SearchFriend: undefined; 
    Friend: { userId: string };
    NotifyDetail: { idAnnouncer: string; id: string };
  };
  