import React, { useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { AppShell, PageHeader, MetricCard, GlassCard, StarsDisplay, StatusBadge } from "../../components/UI";
import { getReviews, getLocations, syncReviews, Review } from "../../lib/api";
import {
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  ButtonText,
  Box,
  Center,
} from "@gluestack-ui/themed";
import { RefreshCw, MessageSquare, Star, ShieldAlert, ArrowRight } from "lucide-react-native";
import { useRouter } from "expo-router";

export default function DashboardScreen() {
  const router = useRouter();
  const [reviewsList, setReviewsList] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await getReviews();
      setReviewsList(res.reviews || []);
      setError(null);
    } catch (err: any) {
      setError("No se pudo cargar la información de reseñas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await syncReviews();
      await loadData();
    } catch (err: any) {
      setError(err.message || "Error al sincronizar con Google.");
    } finally {
      setSyncing(false);
    }
  };

  const pendingCount = reviewsList.filter((r) => r.status === "pending").length;
  const postedCount = reviewsList.filter((r) => r.status === "posted").length;
  
  const avgRating = reviewsList.length > 0
    ? (reviewsList.reduce((acc, r) => acc + r.rating, 0) / reviewsList.length).toFixed(1)
    : "5.0";

  return (
    <AppShell>
      <PageHeader
        title="Inicio"
        subtitle="Monitoreo de tus fichas de Google Business"
        error={error}
      />

      <HStack space="md" style={{ flexWrap: "wrap", justifyContent: "space-between" }} mb="$4">
        <MetricCard
          title="Reseñas Totales"
          value={reviewsList.length}
          icon={<MessageSquare color="#FFFFFF" size={20} />}
          iconBg="#4F46E5"
        />
        <MetricCard
          title="Nota Media"
          value={`${avgRating} ★`}
          icon={<Star color="#FFFFFF" size={20} />}
          iconBg="#F59E0B"
        />
        <MetricCard
          title="Pendientes"
          value={pendingCount}
          icon={<ShieldAlert color="#FFFFFF" size={20} />}
          iconBg="#EF4444"
        />
      </HStack>

      <VStack space="md" mb="$6">
        <Button
          size="md"
          variant="solid"
          action="primary"
          style={{ backgroundColor: "#4F46E5" }}
          onPress={handleSync}
          isDisabled={syncing}
        >
          <HStack space="xs" alignItems="center">
            {syncing ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <RefreshCw color="#FFFFFF" size={18} />
            )}
            <ButtonText style={{ fontWeight: "600" }}>
              {syncing ? "Sincronizando..." : "Sincronizar Google Reviews"}
            </ButtonText>
          </HStack>
        </Button>
      </VStack>

      <Heading size="md" mb="$3" style={{ fontWeight: "700" }}>Reseñas Recientes</Heading>

      {loading ? (
        <Center p="$10">
          <ActivityIndicator color="#4F46E5" size="large" />
        </Center>
      ) : reviewsList.length === 0 ? (
        <GlassCard>
          <Center p="$4">
            <Text size="sm" style={{ color: "#6B7280" }}>
              No hay reseñas importadas. Conecta tu sucursal en la pestaña de "Sucursales" y haz clic en Sincronizar.
            </Text>
          </Center>
        </GlassCard>
      ) : (
        <VStack space="sm">
          {reviewsList.slice(0, 3).map((review) => (
            <GlassCard
              key={review.id}
              onPress={() => router.push({ pathname: "/(tabs)/reviews", params: { selectId: review.id } })}
            >
              <VStack space="xs">
                <HStack justifyContent="space-between" alignItems="center">
                  <Text size="sm" style={{ fontWeight: "700" }}>{review.reviewerName}</Text>
                  <StatusBadge status={review.status} />
                </HStack>
                <StarsDisplay rating={review.rating} />
                <Text size="sm" numberOfLines={2} style={{ color: "#4B5563", marginTop: 4 }}>
                  {review.comment || "(Sin comentario)"}
                </Text>
              </VStack>
            </GlassCard>
          ))}
        </VStack>
      )}
    </AppShell>
  );
}
