import { Text, View, Platform, useEffect } from "react-native";
import { auth } from "@react-native-firebase/auth";

export default function Index() {
  const testConnection = async () => {
    try {
      await auth().signInAnonymously();
      console.log(`✅ Signed in on ${Platform.OS}`);
    } catch (error) {
      console.error(`❌ Failed to sign in on ${Platform.OS}`, error);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text className="text-red-500 font-4xl">
        Edit app/index.tsx to edit this screen.
      </Text>
    </View>
  );
}
