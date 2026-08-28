import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, TextInput } from "react-native";
import { AppShell, PageHeader, GlassCard, StarsDisplay, StatusBadge, SuccessBanner } from "../../components/UI";
import { getReviews, approveReview, regenerateDraft, Review } from "../../lib/api";
import {
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  ButtonText,
  Box,
  Center,
  Textarea,
  TextareaInput,
} from "@gluestack-ui/themed";
import { RefreshCw, MessageSquare, Send, Sparkles } from "lucide-react-native";
import { useLocalSearchParams } from "expo-router";

export default function ReviewsScreen() {
  const params = useLocalSearchParams();
  const [reviewsList, setReviewsList] = useState<Review[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const res = await getReviews();
      const list = res.reviews || [];
      setReviewsList(list);

      // If redirected from dashboard with a specific ID, select it
      if (params.selectId) {
        const found = list.find((r) => r.id === params.selectId);
        if (found) {
          setSelectedReview(found);
          setReplyText(found.finalResponse || found.aiDraftResponse || "");
        }
      }
      setError(null);
    } catch (err: any) {
      setError("No se pudieron obtener las reseñas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReviews();
  }, [params.selectId]);

  const selectReview = (review: Review) => {
    setSelectedReview(review);
    setReplyText(review.finalResponse || review.aiDraftResponse || "");
    setSuccessMsg(null);
  };

  const handleApprove = async () => {
    if (!selectedReview) return;
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await approveReview(selectedReview.id, replyText);
      setSuccessMsg("¡Respuesta publicada correctamente en Google!");
      
      // Update local state
      setReviewsList(prev => prev.map(r => r.id === selectedReview.id ? res.review : r));
      setSelectedReview(res.review);
    } catch (err: any) {
      setError(err.message || "Error al publicar la respuesta.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!selectedReview) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await regenerateDraft(selectedReview.id);
      setReplyText(res.review.aiDraftResponse || "");
      setReviewsList(prev => prev.map(r => r.id === selectedReview.id ? res.review : r));
      setSelectedReview(res.review);
    } catch (err: any) {
      setError(err.message || "Error al regenerar borrador.");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredReviews = reviewsList.filter((r) => {
    if (filterStatus === "all") return true;
    return r.status === filterStatus;
  });

  return (
    <AppShell scrollable={selectedReview !== null}>
      <PageHeader
        title="Reseñas"
        subtitle="Gestiona y responde a tus clientes"
        error={error}
      />

      {successMsg ? <SuccessBanner message={successMsg} /> : null}

      {selectedReview ? (
        // Detalle de reseña seleccionada
        <VStack space="md">
          <Button
            size="xs"
            variant="outline"
            action="secondary"
            onPress={() => setSelectedReview(null)}
          >
            <ButtonText>← Volver al Listado</ButtonText>
          </Button>

          <GlassCard>
            <VStack space="sm">
              <HStack justifyContent="space-between" alignItems="center">
                <Text size="sm" style={{ fontWeight: "700" }}>{selectedReview.reviewerName}</Text>
                <StatusBadge status={selectedReview.status} />
              </HStack>
              <StarsDisplay rating={selectedReview.rating} />
              <Text size="md" style={{ color: "#1F2937", marginVertical: 6, fontStyle: "italic" }}>
                "{selectedReview.comment || "Sin comentario."}"
              </Text>
            </VStack>
          </GlassCard>

          <Heading size="md" style={{ marginTop: 8, fontWeight: "700" }}>Respuesta de IA</Heading>

          <GlassCard>
            <VStack space="md">
              <Text size="xs" style={{ color: "#6B7280" }}>
                Puedes editar el borrador sugerido antes de enviar:
              </Text>

              <Textarea size="md" style={{ minHeight: 120 }}>
                <TextareaInput
                  placeholder="Redacta tu respuesta aquí..."
                  value={replyText}
                  onChangeText={setReplyText}
                  multiline
                />
              </Textarea>

              <HStack space="md" justifyContent="flex-end">
                <Button
                  size="sm"
                  variant="outline"
                  action="secondary"
                  onPress={handleRegenerate}
                  isDisabled={actionLoading || selectedReview.status === 'posted'}
                >
                  <HStack space="xs" alignItems="center">
                    <Sparkles size={16} color="#4B5563" />
                    <ButtonText>Regenerar IA</ButtonText>
                  </HStack>
                </Button>

                <Button
                  size="sm"
                  variant="solid"
                  action="primary"
                  style={{ backgroundColor: "#4F46E5" }}
                  onPress={handleApprove}
                  isDisabled={actionLoading || selectedReview.status === 'posted' || !replyText.trim()}
                >
                  <HStack space="xs" alignItems="center">
                    <Send size={16} color="#FFFFFF" />
                    <ButtonText>Aprobar y Enviar</ButtonText>
                  </HStack>
                </Button>
              </HStack>
            </VStack>
          </GlassCard>
        </VStack>
      ) : (
        // Listado de reseñas
        <VStack space="md">
          <HStack space="sm" mb="$2">
            {["all", "pending", "posted"].map((s) => (
              <Button
                key={s}
                size="xs"
                variant={filterStatus === s ? "solid" : "outline"}
                action="primary"
                style={{
                  backgroundColor: filterStatus === s ? "#4F46E5" : "transparent",
                  borderColor: "#4F46E5",
                }}
                onPress={() => setFilterStatus(s)}
              >
                <ButtonText style={{ color: filterStatus === s ? "#FFFFFF" : "#4F46E5" }}>
                  {s === "all" ? "Todas" : s === "pending" ? "Pendientes" : "Publicadas"}
                </ButtonText>
              </Button>
            ))}
          </HStack>

          {loading ? (
            <Center p="$10">
              <ActivityIndicator color="#4F46E5" size="large" />
            </Center>
          ) : filteredReviews.length === 0 ? (
            <GlassCard>
              <Center p="$4">
                <Text size="sm" style={{ color: "#6B7280" }}>
                  No se encontraron reseñas con este filtro.
                </Text>
              </Center>
            </GlassCard>
          ) : (
            <VStack space="sm">
              {filteredReviews.map((review) => (
                <GlassCard key={review.id} onPress={() => selectReview(review)}>
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
        </VStack>
      )}
    </AppShell>
  );
}
