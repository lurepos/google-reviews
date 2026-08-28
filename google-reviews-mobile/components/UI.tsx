import React, { ReactNode } from "react";
import { ActivityIndicator, ScrollView, useColorScheme, ViewStyle } from "react-native";
import { useThemeStore } from "../store/theme";
import {
  Box,
  Button,
  ButtonText,
  Center,
  Heading,
  HStack,
  Input,
  InputField,
  Pressable,
  Text,
  Textarea,
  TextareaInput,
  VStack,
} from "@gluestack-ui/themed";
import { AlertCircle, CheckCircle2, Star } from "lucide-react-native";

export function useAppColorMode() {
  const themeMode = useThemeStore((state) => state.themeMode);
  const systemColorScheme = useColorScheme();
  return themeMode === "system" ? (systemColorScheme || "light") : themeMode;
}

export function AppShell({ children, scrollable = true }: { children: ReactNode; scrollable?: boolean }) {
  const mode = useAppColorMode();
  const bg = mode === "dark" ? "#090D1A" : "#F3F4F6";

  if (!scrollable) {
    return (
      <Box flex={1} bg={bg} px="$5" pt="$12" pb="$20">
        {children}
      </Box>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 100,
        backgroundColor: bg,
        flexGrow: 1,
      }}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

export function PageHeader({ title, subtitle, error }: { title: string; subtitle?: string; error?: string | null }) {
  const mode = useAppColorMode();
  const titleColor = mode === "dark" ? "#F9FAFB" : "#1F2937";
  const subtitleColor = mode === "dark" ? "#9CA3AF" : "#4B5563";

  return (
    <VStack space="xs" mb="$5">
      <Heading size="2xl" style={{ color: titleColor, fontWeight: "700" }}>{title}</Heading>
      {subtitle ? <Text size="sm" style={{ color: subtitleColor }}>{subtitle}</Text> : null}
      {error ? <ErrorBanner message={error} /> : null}
    </VStack>
  );
}

export function GlassCard({ children, style, onPress }: { children: ReactNode; style?: ViewStyle; onPress?: () => void }) {
  const mode = useAppColorMode();
  const bg = mode === "dark" ? "rgba(17, 24, 39, 0.8)" : "rgba(255, 255, 255, 0.9)";
  const borderColor = mode === "dark" ? "rgba(55, 65, 81, 0.6)" : "rgba(209, 213, 219, 0.5)";

  const content = (
    <Box
      p="$5"
      borderRadius={16}
      borderWidth={1}
      style={[{ backgroundColor: bg, borderColor: borderColor }, style]}
    >
      {children}
    </Box>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }

  return content;
}

export function MetricCard({
  title,
  value,
  icon,
  iconBg,
}: {
  title: string;
  value: string | number;
  icon: ReactNode;
  iconBg: string;
}) {
  const mode = useAppColorMode();
  const titleColor = mode === "dark" ? "#9CA3AF" : "#4B5563";
  const valueColor = mode === "dark" ? "#F9FAFB" : "#1F2937";

  return (
    <GlassCard style={{ flex: 1, minWidth: 140, marginBottom: 12 }}>
      <HStack alignItems="center" mb="$2" space="sm">
        <Box p="$2" borderRadius="$full" style={{ backgroundColor: iconBg }}>
          {icon}
        </Box>
        <Text size="sm" style={{ color: titleColor, fontWeight: "500" }}>{title}</Text>
      </HStack>
      <Heading size="xl" style={{ color: valueColor, fontWeight: "700" }}>{value}</Heading>
    </GlassCard>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <Box p="$3" bg="$red100" borderRadius="$md" borderColor="$red200" borderWidth={1} mt="$2">
      <HStack space="xs" alignItems="center">
        <AlertCircle size={18} color="#DC2626" />
        <Text size="sm" style={{ color: "#B91C1C", fontWeight: "600", flex: 1 }}>{message}</Text>
      </HStack>
    </Box>
  );
}

export function SuccessBanner({ message }: { message: string }) {
  return (
    <Box p="$3" bg="$emerald100" borderRadius="$md" borderColor="$emerald200" borderWidth={1} mt="$2">
      <HStack space="xs" alignItems="center">
        <CheckCircle2 size={18} color="#059669" />
        <Text size="sm" style={{ color: "#047857", fontWeight: "600", flex: 1 }}>{message}</Text>
      </HStack>
    </Box>
  );
}

export function StarsDisplay({ rating }: { rating: number }) {
  return (
    <HStack space="xs">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={16} fill={s <= rating ? "#FBBF24" : "transparent"} color="#FBBF24" />
      ))}
    </HStack>
  );
}

export function StatusBadge({ status }: { status: string }) {
  let bg = "$gray200";
  let text = "Pendiente";
  let color = "$gray800";

  if (status === 'posted') {
    bg = "$emerald100";
    text = "Publicada";
    color = "#047857";
  } else if (status === 'approved') {
    bg = "$blue100";
    text = "Aprobada";
    color = "#1D4ED8";
  } else if (status === 'pending') {
    bg = "$amber100";
    text = "Revisión";
    color = "#B45309";
  } else if (status === 'ignored') {
    bg = "$gray300";
    text = "Ignorada";
    color = "#374151";
  }

  return (
    <Box px="$2.5" py="$0.5" borderRadius="$full" style={{ backgroundColor: bg }}>
      <Text size="xs" style={{ color, fontWeight: "600" }}>{text}</Text>
    </Box>
  );
}
