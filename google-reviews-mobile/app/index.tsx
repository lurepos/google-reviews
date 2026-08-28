import React, { useState } from "react";
import { useRouter } from "expo-router";
import { AppShell, PageHeader, GlassCard } from "../components/UI";
import {
  VStack,
  Button,
  ButtonText,
  Input,
  InputField,
  Text,
  Heading,
  Center,
} from "@gluestack-ui/themed";

export default function AuthScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email) {
      setError("Por favor introduce tu email");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // In development or demo, we redirect immediately and use mock authentication.
      // A standard app would hit Hanko/Backend.
      router.replace("/(tabs)/dashboard");
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell scrollable={false}>
      <Center flex={1}>
        <VStack space="xl" style={{ width: "100%", maxWidth: 360 }}>
          <Center mb="$4">
            <Heading size="3xl" style={{ fontWeight: "800", color: "#4F46E5" }}>
              ReseñasIA
            </Heading>
            <Text size="sm" style={{ color: "#6B7280", marginTop: 4 }}>
              Responde reseñas de Google con Inteligencia Artificial
            </Text>
          </Center>

          <GlassCard>
            <VStack space="md">
              <Heading size="lg" style={{ fontWeight: "700" }}>Iniciar Sesión</Heading>
              
              {error ? (
                <Text size="xs" style={{ color: "#EF4444", fontWeight: "600" }}>{error}</Text>
              ) : null}

              <VStack space="xs">
                <Text size="xs" style={{ color: "#374151", fontWeight: "600" }}>Email de Trabajo</Text>
                <Input variant="outline" size="md">
                  <InputField
                    placeholder="tucorreo@empresa.com"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </Input>
              </VStack>

              <Button
                size="md"
                variant="solid"
                action="primary"
                style={{ backgroundColor: "#4F46E5", marginTop: 8 }}
                onPress={handleLogin}
                isDisabled={loading}
              >
                <ButtonText style={{ fontWeight: "600" }}>
                  {loading ? "Iniciando..." : "Ingresar"}
                </ButtonText>
              </Button>
            </VStack>
          </GlassCard>
        </VStack>
      </Center>
    </AppShell>
  );
}
