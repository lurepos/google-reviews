import React from "react";
import { Tabs } from "expo-router";
import { LayoutDashboard, MessageSquare, MapPin, Settings } from "lucide-react-native";
import { useAppColorMode } from "../../components/UI";

export default function TabLayout() {
  const colorMode = useAppColorMode();
  const isDark = colorMode === "dark";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? "#090D1A" : "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: isDark ? "rgba(55, 65, 81, 0.6)" : "#E5E7EB",
          height: 65,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: "#4F46E5",
        tabBarInactiveTintColor: isDark ? "#9CA3AF" : "#6B7280",
        tabBarLabelStyle: { fontSize: 12, fontWeight: "500" },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color }) => <LayoutDashboard color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="reviews"
        options={{
          title: "Reseñas",
          tabBarIcon: ({ color }) => <MessageSquare color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="locations"
        options={{
          title: "Sucursales",
          tabBarIcon: ({ color }) => <MapPin color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Ajustes",
          tabBarIcon: ({ color }) => <Settings color={color} size={24} />,
        }}
      />
    </Tabs>
  );
}
