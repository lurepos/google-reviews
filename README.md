# google-reviews

Monitorización de reseñas de Google Business (Google Maps) para un negocio, genera respuestas automáticas utilizando Inteligencia Artificial (OpenAI, Gemini u Ollama) adaptando el tono de la respuesta, y envía notificaciones en tiempo real a través de un webhook de Discord y/o Slack.

## Análisis de sentimiento

- **Reseñas Positivas y Neutrales**: Se responde de forma automatizada mediante el proveedor de Inteligencia Artificial configurado.
- **Reseñas Negativas**: Si el análisis de sentimiento del texto detecta que la reseña es negativa (quejas, insatisfacción o mala experiencia), el sistema bloquea cualquier respuesta automática y envía inmediatamente una alerta urgente notificando que se requiere respuesta manual.

## Características

- Monitoreo automático.
- Idioma de respuesta personalizable al idioma original u otro específico.
- Reintentos con exponencial backoff para todas las APIs externas.
- Almacenamiento local interno de las reseñas/respuestas. Si Google Sheets no está disponible, las reseñas se guardan localmente para asegurar cero pérdida.
- Soporte para múltiples proveedores de IA (OpenAI, Gemini, Ollama).
- Envía notificaciones de reseña negativa.

## Requisitos

1. Una cuenta de Google Cloud con acceso a la API de Google Business Profile.
2. Un archivo de credenciales de Google (`google_credentials.json`).
3. Clave de API para el proveedor de IA elegido (OpenAI/Gemini) o una instancia de Ollama.
4. Un Webhook de Discord y/o Slack.