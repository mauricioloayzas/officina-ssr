# Clichín — Solicitar pedido (pedidos-ssr)

Frontend público (sin login) para que el cliente final de un taller/fábrica artesanal
(imprenta, estampado, floristería, peluches...) solicite un pedido de trabajo — segundo
add-on de Clichín, calcado del mismo patrón que `booking-ssr` y `tienda-ssr`: Nuxt SSR sin
backend propio, reusando endpoints `/public/...` ya existentes en `auth` (orchestrator) y en
el backend nuevo `officina`.

- `GET /public/profiles/{slug}` (auth) — resuelve el negocio por su URL.
- `GET /public/profiles/{profileId}/work-order-template` (officina) — columnas configuradas
  por el negocio para el listado de ítems.
- `POST /public/profiles/{profileId}/work-order-attachments` (officina) — sube imágenes/PDF
  de referencia.
- `POST /public/profiles/{profileId}/work-orders` (officina) — crea el pedido (queda
  `pendiente`, `origen=publico`; el negocio lo revisa y gestiona desde su panel).

Sin pago, sin identidad OTP — mucho más simple que `tienda-ssr`.

## Deploy

```
npm run deploy:dev
npm run deploy:prod
```

Dominio: `pedidos.clichin.app` (prod), certificado ACM propio (no reusa el de `tienda.clichin.app`).
