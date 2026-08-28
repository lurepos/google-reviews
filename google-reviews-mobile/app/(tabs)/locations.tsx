import React, { useEffect, useState } from "react";
import { ActivityIndicator, Switch, Linking } from "react-native";
import { AppShell, PageHeader, GlassCard, SuccessBanner } from "../../components/UI";
import { getLocations, connectLocation, updateLocation, getGoogleAuthUrl, LocationSettings, GoogleLocationOption } from "../../lib/api";
import {
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  ButtonText,
  Box,
  Center,
  Input,
  InputField,
} from "@gluestack-ui/themed";
import { Plus, Check, Settings, ShieldAlert, FileSpreadsheet, Lock } from "lucide-react-native";

export default function LocationsScreen() {
  const [localLocs, setLocalLocs] = useState<LocationSettings[]>([]);
  const [googleLocs, setGoogleLocs] = useState<GoogleLocationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Settings edit modal state
  const [editingLoc, setEditingLoc] = useState<LocationSettings | null>(null);
  const [sheetId, setSheetId] = useState("");
  const [tone, setTone] = useState("professional");
  const [language, setLanguage] = useState("original");

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await getLocations();
      setLocalLocs(res.local || []);
      setGoogleLocs(res.google || []);
      setError(null);
    } catch (err: any) {
      setError("No se pudieron cargar las sucursales. Verifica la conexión.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleConnectGoogle = async () => {
    try {
      const res = await getGoogleAuthUrl();
      if (res.url) {
        await Linking.openURL(res.url);
      }
    } catch (err: any) {
      setError("Error al obtener la url de autenticación de Google.");
    }
  };

  const handleConnectLocation = async (googleLoc: GoogleLocationOption) => {
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await connectLocation(googleLoc.googleLocationId, googleLoc.name);
      setSuccessMsg(`¡Sucursal "${googleLoc.name}" conectada con éxito!`);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Error al conectar la sucursal.");
    } finally {
      setActionLoading(false);
    }
  };

  const startEditSettings = (loc: LocationSettings) => {
    setEditingLoc(loc);
    setSheetId(loc.sheetId || "");
    setTone(loc.tone);
    setLanguage(loc.language);
    setSuccessMsg(null);
  };

  const handleSaveSettings = async () => {
    if (!editingLoc) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await updateLocation(editingLoc.id, {
        sheetId: sheetId.trim() || null,
        tone: tone,
        language: language,
      });
      setSuccessMsg("Configuración de sucursal guardada.");
      setEditingLoc(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Error al actualizar la configuración.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleAutoReply = async (loc: LocationSettings, type: 'positive' | 'negative', val: boolean) => {
    try {
      await updateLocation(loc.id, {
        [type === 'positive' ? 'autoReplyPositive' : 'autoReplyNegative']: val
      });
      setLocalLocs(prev => prev.map(l => l.id === loc.id ? { ...l, [type === 'positive' ? 'autoReplyPositive' : 'autoReplyNegative']: val } : l));
    } catch (err: any) {
      setError("Error al cambiar opción de auto-respuesta.");
    }
  };

  return (
    <AppShell scrollable={editingLoc !== null}>
      <PageHeader
        title="Sucursales"
        subtitle="Conecta y configura tus ubicaciones físicas"
        error={error}
      />

      {successMsg ? <SuccessBanner message={successMsg} /> : null}

      {editingLoc ? (
        // Pantalla de edición de configuración
        <VStack space="md">
          <Button
            size="xs"
            variant="outline"
            action="secondary"
            onPress={() => setEditingLoc(null)}
          >
            <ButtonText>← Volver</ButtonText>
          </Button>

          <Heading size="md" style={{ fontWeight: "700" }}>Editar: {editingLoc.name}</Heading>

          <GlassCard>
            <VStack space="md">
              <VStack space="xs">
                <Text size="sm" style={{ fontWeight: "600", color: "#374151" }}>Tono de Respuestas IA</Text>
                <Input variant="outline" size="md">
                  <InputField
                    placeholder="ej. professional, casual, friendly"
                    value={tone}
                    onChangeText={setTone}
                  />
                </Input>
              </VStack>

              <VStack space="xs">
                <Text size="sm" style={{ fontWeight: "600", color: "#374151" }}>Idioma de Respuestas</Text>
                <Input variant="outline" size="md">
                  <InputField
                    placeholder="ej. original, español, english"
                    value={language}
                    onChangeText={setLanguage}
                  />
                </Input>
              </VStack>

              <VStack space="xs">
                <Text size="sm" style={{ fontWeight: "600", color: "#374151" }}>ID de Google Sheet (Opcional)</Text>
                <Input variant="outline" size="md">
                  <InputField
                    placeholder="ej. 1s8_k8a3J..."
                    value={sheetId}
                    onChangeText={setSheetId}
                  />
                </Input>
                <Text size="xs" style={{ color: "#6B7280" }}>
                  Escribe el ID de tu hoja de cálculo para sincronizar nuevas reseñas automáticamente.
                </Text>
              </VStack>

              <Button
                size="md"
                variant="solid"
                action="primary"
                style={{ backgroundColor: "#4F46E5", marginTop: 8 }}
                onPress={handleSaveSettings}
                isDisabled={actionLoading}
              >
                <ButtonText style={{ fontWeight: "600" }}>Guardar Ajustes</ButtonText>
              </Button>
            </VStack>
          </GlassCard>
        </VStack>
      ) : (
        // Listado de sucursales locales y disponibles
        <VStack space="lg">
          
          <Heading size="md" style={{ fontWeight: "700" }}>Sucursales Conectadas</Heading>
          {loading ? (
            <Center p="$6">
              <ActivityIndicator color="#4F46E5" size="large" />
            </Center>
          ) : localLocs.length === 0 ? (
            <GlassCard>
              <Text size="sm" style={{ color: "#6B7280", textAlign: "center" }}>
                No tienes sucursales conectadas todavía.
              </Text>
            </GlassCard>
          ) : (
            <VStack space="sm">
              {localLocs.map((loc) => (
                <GlassCard key={loc.id}>
                  <VStack space="md">
                    <HStack justifyContent="space-between" alignItems="center">
                      <Heading size="sm" style={{ fontWeight: "700" }}>{loc.name}</Heading>
                      <Button
                        size="xs"
                        variant="outline"
                        action="secondary"
                        onPress={() => startEditSettings(loc)}
                      >
                        <Settings size={14} color="#4B5563" style={{ marginRight: 4 }} />
                        <ButtonText size="xs">Ajustes</ButtonText>
                      </Button>
                    </HStack>

                    <VStack space="xs">
                      <HStack justifyContent="space-between" alignItems="center">
                        <Text size="sm" style={{ color: "#374151" }}>Auto-responder Positivas (4-5★)</Text>
                        <Switch
                          value={loc.autoReplyPositive}
                          onValueChange={(val) => handleToggleAutoReply(loc, 'positive', val)}
                          thumbColor="#4F46E5"
                          trackColor={{ false: "#D1D5DB", true: "#C7D2FE" }}
                        />
                      </HStack>

                      <HStack justifyContent="space-between" alignItems="center">
                        <Text size="sm" style={{ color: "#374151" }}>Auto-responder Negativas (1-3★)</Text>
                        <Switch
                          value={loc.autoReplyNegative}
                          onValueChange={(val) => handleToggleAutoReply(loc, 'negative', val)}
                          thumbColor="#4F46E5"
                          trackColor={{ false: "#D1D5DB", true: "#C7D2FE" }}
                        />
                      </HStack>
                    </VStack>

                    <HStack space="xs" style={{ borderTopWidth: 1, borderColor: "#E5E7EB", paddingTop: 8 }}>
                      <Text size="xs" style={{ color: "#6B7280" }}>Tono: {loc.tone}</Text>
                      <Text size="xs" style={{ color: "#6B7280" }}>•</Text>
                      <Text size="xs" style={{ color: "#6B7280" }}>Idioma: {loc.language}</Text>
                      {loc.sheetId ? (
                        <>
                          <Text size="xs" style={{ color: "#6B7280" }}>•</Text>
                          <HStack space="xs" alignItems="center">
                            <FileSpreadsheet size={12} color="#10B981" />
                            <Text size="xs" style={{ color: "#10B981" }}>Sheet activo</Text>
                          </HStack>
                        </>
                      ) : null}
                    </HStack>
                  </VStack>
                </GlassCard>
              ))}
            </VStack>
          )}

          <Heading size="md" style={{ fontWeight: "700", marginTop: 12 }}>Vincular Nuevas Ubicaciones</Heading>
          
          <Button
            size="sm"
            variant="outline"
            action="primary"
            style={{ borderColor: "#4F46E5" }}
            onPress={handleConnectGoogle}
          >
            <HStack space="xs" alignItems="center">
              <Lock size={16} color="#4F46E5" />
              <ButtonText style={{ color: "#4F46E5" }}>Vincular con Cuenta Google</ButtonText>
            </HStack>
          </Button>

          {googleLocs.length > 0 ? (
            <VStack space="sm" mt="$2">
              <Text size="xs" style={{ color: "#6B7280" }}>Ubicaciones detectadas en tu perfil de Google:</Text>
              {googleLocs
                .filter((g) => !localLocs.some((l) => l.googleLocationId === g.googleLocationId))
                .map((g) => (
                  <GlassCard key={g.googleLocationId}>
                    <HStack justifyContent="space-between" alignItems="center">
                      <VStack style={{ flex: 1, marginRight: 8 }}>
                        <Text size="sm" style={{ fontWeight: "600" }}>{g.name}</Text>
                        <Text size="xs" style={{ color: "#6B7280" }}>{g.googleLocationId}</Text>
                      </VStack>
                      <Button
                        size="xs"
                        variant="solid"
                        action="primary"
                        style={{ backgroundColor: "#4F46E5" }}
                        onPress={() => handleConnectLocation(g)}
                        isDisabled={actionLoading}
                      >
                        <Plus size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <ButtonText size="xs">Conectar</ButtonText>
                      </Button>
                    </HStack>
                  </GlassCard>
                ))}
            </VStack>
          ) : null}
        </VStack>
      )}
    </AppShell>
  );
}
