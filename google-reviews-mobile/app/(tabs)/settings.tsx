import React from "react";
import { AppShell, PageHeader, GlassCard } from "../../components/UI";
import { useThemeStore } from "../../store/theme";
import {
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  ButtonText,
  Box,
} from "@gluestack-ui/themed";
import { Sun, Moon, Laptop, LogOut, MessageCircle } from "lucide-react-native";
import { useRouter } from "expo-router";

export default function SettingsScreen() {
  const router = useRouter();
  const { themeMode, setThemeMode } = useThemeStore();

  const handleSignOut = () => {
    // In production we would delete Hanko cookies/session
    router.replace("/");
  };

  return (
    <AppShell>
      <PageHeader
        title="Ajustes"
        subtitle="Configuración general y cuenta"
      />

      <VStack space="lg">
        
        <Heading size="md" style={{ fontWeight: "700" }}>Tema de la Aplicación</Heading>
        
        <GlassCard>
          <HStack space="md" justifyContent="space-between">
            {[
              { mode: "light", icon: <Sun size={18} />, label: "Claro" },
              { mode: "dark", icon: <Moon size={18} />, label: "Oscuro" },
              { mode: "system", icon: <Laptop size={18} />, label: "Sistema" },
            ].map((t) => (
              <Button
                key={t.mode}
                size="xs"
                variant={themeMode === t.mode ? "solid" : "outline"}
                action="secondary"
                style={{
                  flex: 1,
                  backgroundColor: themeMode === t.mode ? "#4F46E5" : "transparent",
                  borderColor: themeMode === t.mode ? "#4F46E5" : "#D1D5DB",
                  marginHorizontal: 4,
                }}
                onPress={() => setThemeMode(t.mode as any)}
              >
                <HStack space="xs" alignItems="center">
                  {React.cloneElement(t.icon, {
                    color: themeMode === t.mode ? "#FFFFFF" : "#4B5563"
                  })}
                  <ButtonText style={{ color: themeMode === t.mode ? "#FFFFFF" : "#4B5563", fontWeight: "600" }}>
                    {t.label}
                  </ButtonText>
                </HStack>
              </Button>
            ))}
          </HStack>
        </GlassCard>

        <Heading size="md" style={{ fontWeight: "700", marginTop: 12 }}>Canales de Alerta</Heading>

        <GlassCard>
          <VStack space="xs">
            <Text size="sm" style={{ fontWeight: "600" }}>Integraciones Slack & Discord</Text>
            <Text size="xs" style={{ color: "#6B7280" }}>
              Para recibir notificaciones en tiempo real cuando un cliente publica una reseña negativa (1-3★), puedes configurar webhooks de Slack y Discord desde el panel web.
            </Text>
          </VStack>
        </GlassCard>

        <Heading size="md" style={{ fontWeight: "700", marginTop: 12 }}>Cuenta</Heading>

        <Button
          size="md"
          variant="outline"
          action="negative"
          style={{ borderColor: "#EF4444" }}
          onPress={handleSignOut}
        >
          <HStack space="xs" alignItems="center">
            <LogOut size={18} color="#EF4444" />
            <ButtonText style={{ color: "#EF4444", fontWeight: "600" }}>Cerrar Sesión</ButtonText>
          </HStack>
        </Button>

      </VStack>
    </AppShell>
  );
}
