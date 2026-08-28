import { Platform } from "react-native";

export async function getHankoToken() {
  if (Platform.OS !== "web") {
    // For Native/Expo testing, return a mock token representing the developer user
    return "mock-token-developer@test.com";
  }
  
  const hankoApiUrl = process.env.EXPO_PUBLIC_HANKO_API_URL || 'https://mock.hanko.io';
  try {
    const { register } = await import("@teamhanko/hanko-elements");
    const { hanko } = await register(hankoApiUrl, { enablePasskeys: true });
    return hanko.getSessionToken() || "mock-token-developer@test.com";
  } catch (e) {
    return "mock-token-developer@test.com";
  }
}
