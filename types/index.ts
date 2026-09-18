export interface ApiResponse<T> {
  data: T
}

export interface PublicProfile {
  id: string
  name: string
  url_name: string
  type: string
}

export type WorkOrderColumnType = 'text' | 'number' | 'dropdown' | 'image' | 'file'

export interface WorkOrderColumn {
  key: string
  label: string
  type: WorkOrderColumnType
  options?: string[]
}

export interface WorkOrderTemplate {
  profile_id: string
  application_id: string
  columns: WorkOrderColumn[]
}

export interface AttachmentUploaded {
  key: string
  filename: string
  mime_type: string
  type: 'image' | 'file'
}

export interface CrearPedidoPayload {
  application_id?: string
  cliente_nombre: string
  cliente_telefono?: string
  cliente_email?: string
  fecha_inicio: string
  fecha_entrega?: string
  descripcion?: string
  items: Record<string, string>[]
  attachments: AttachmentUploaded[]
}

export interface PedidoCreado {
  id: string
  numero: string
  estado: string
}
