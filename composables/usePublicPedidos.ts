import type { PublicProfile, WorkOrderTemplate, CrearPedidoPayload, PedidoCreado, AttachmentUploaded } from '~/types'

export function usePublicPedidos() {
  const auth = usePublicApi('auth')
  const officina = usePublicApi('officina')

  return {
    getProfile: (slug: string) =>
      auth.get<PublicProfile>(`/public/profiles/${slug}`),

    getTemplate: (profileId: string) =>
      officina.get<WorkOrderTemplate>(`/public/profiles/${profileId}/work-order-template`),

    crearPedido: (profileId: string, payload: CrearPedidoPayload) =>
      officina.post<PedidoCreado>(`/public/profiles/${profileId}/work-orders`, payload),

    subirAdjunto: (profileId: string, base64: string, filename: string, mimeType: string) =>
      officina.post<AttachmentUploaded>(`/public/profiles/${profileId}/work-order-attachments`, {
        base64,
        filename,
        mime_type: mimeType,
      }),
  }
}
