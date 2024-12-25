// navigation/types.ts
export type RootStackParamList = {
    Login: undefined;  // This is the Login screen
    Register: undefined;  // This is the Register screen
    UploadProfile: { userId: string };
    Home: { userId: string };
    CommentScreen: { postId: string, userPostId: string };
  };
  