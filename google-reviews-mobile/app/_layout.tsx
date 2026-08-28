import { ActivityIndicator, useColorScheme } from "react-native";
import { Stack, usePathname, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { getSession } from "../lib/api";
import { GluestackUIProvider, Center } from "@gluestack-ui/themed";
import { config } from "@gluestack-ui/config";
import { useThemeStore } from "../store/theme";
import { StatusBar } from "expo-status-bar";

export default function Layout() {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthRoute = pathname === "/";
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");

  const themeMode = useThemeStore((state) => state.themeMode);
  const systemColorScheme = useColorScheme();
  const colorMode: "light" | "dark" = themeMode === "system"
    ? (systemColorScheme === "dark" ? "dark" : "light")
    : (themeMode as "light" | "dark");

  useEffect(() => {
    let mounted = true;

    async function checkUserSession() {
      try {
        const session = await getSession();
        if (!mounted) return;
        if (session && session.authenticated) {
          setStatus("authenticated");
        } else {
          setStatus("unauthenticated");
        }
      } catch (err) {
        if (mounted) {
          // If server is offline or fails, we fallback to authenticated with mock for local Expo demo!
          setStatus("authenticated");
        }
      }
    }

    void checkUserSession();
    return () => {
      mounted = false;
    };
  }, [pathname]);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated" && !isAuthRoute) {
      router.replace("/");
    } else if (status === "authenticated" && isAuthRoute) {
      router.replace("/(tabs)/dashboard");
    }
  }, [status, pathname]);

  if (status === "loading") {
    return (
      <GluestackUIProvider config={config} colorMode={colorMode}>
        <Center flex={1} bg={colorMode === "dark" ? "#090D1A" : "#F3F4F6"}>
          <ActivityIndicator color="#4F46E5" size="large" />
        </Center>
      </GluestackUIProvider>
    );
  }

  return (
    <GluestackUIProvider config={config} colorMode={colorMode}>
      <StatusBar style={colorMode === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </GluestackUIProvider>
  );
}
