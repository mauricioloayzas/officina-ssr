<script setup lang="ts">
import type { WorkOrderColumn, AttachmentUploaded } from '~/types'

const route = useRoute()
const config = useRuntimeConfig()
const slug = route.params.slug as string
const pedidos = usePublicPedidos()

const { data: profileRes } = await useAsyncData(`profile-${slug}`, () =>
  pedidos.getProfile(slug).catch(() => null)
)
const profile = computed(() => profileRes.value?.data ?? null)

if (!profile.value) {
  throw createError({ statusCode: 404, statusMessage: 'No encontramos este negocio' })
}

const canonicalUrl = `${config.public.siteUrl}/solicitar/${slug}`

useSeoMeta({
  title: `Solicitar pedido — ${profile.value.name}`,
  description: `Solicita tu pedido a ${profile.value.name}.`,
  ogTitle: `Solicitar pedido — ${profile.value.name}`,
  ogDescription: `Solicita tu pedido a ${profile.value.name}.`,
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary',
})
useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
})

const { data: templateRes } = await useAsyncData(`template-${profile.value.id}`, () =>
  pedidos.getTemplate(profile.value!.id).catch(() => null)
)
const columns = computed<WorkOrderColumn[]>(() => templateRes.value?.data?.columns ?? [])
const templateDisponible = computed(() => !!templateRes.value?.data)

type Step = 'formulario' | 'success'
const step = ref<Step>('formulario')
const submitting = ref(false)
const submitError = ref('')
const numeroCreado = ref('')

const form = reactive({
  cliente_nombre: '',
  cliente_telefono: '',
  cliente_email: '',
  fecha_entrega: '',
  descripcion: '',
})

function emptyItem(): Record<string, string> {
  const item: Record<string, string> = {}
  for (const col of columns.value) item[col.key] = ''
  return item
}

const items = ref<Record<string, string>[]>([])
watch(columns, () => {
  if (!items.value.length) items.value = [emptyItem()]
}, { immediate: true })

function addItem() {
  items.value.push(emptyItem())
}
function removeItem(i: number) {
  items.value.splice(i, 1)
}

// --- adjuntos ---
const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
}
const attachments = ref<AttachmentUploaded[]>([])
const uploadingAttachment = ref(false)
const attachmentError = ref('')

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '')
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function handleFileChange(event: Event) {
  const files = (event.target as HTMLInputElement).files
  if (!files?.length) return
  attachmentError.value = ''

  for (const file of Array.from(files)) {
    if (!MIME_EXT[file.type]) {
      attachmentError.value = `"${file.name}" no es un formato soportado (solo imágenes y PDF)`
      continue
    }
    uploadingAttachment.value = true
    try {
      const base64 = await fileToBase64(file)
      const res = await pedidos.subirAdjunto(profile.value!.id, base64, file.name, file.type)
      attachments.value.push(res.data)
    } catch {
      attachmentError.value = `No se pudo subir "${file.name}"`
    } finally {
      uploadingAttachment.value = false
    }
  }
  ;(event.target as HTMLInputElement).value = ''
}

function removeAttachment(i: number) {
  attachments.value.splice(i, 1)
}

// --- columnas de tipo imagen/archivo: cada ítem guarda su propio adjunto (JSON) ---
const uploadingItemCell = ref<string | null>(null)

function parseItemAttachment(value: string | undefined): AttachmentUploaded | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    return parsed?.key ? parsed as AttachmentUploaded : null
  } catch {
    return null
  }
}

// Errores de subida por celda — antes solo se guardaban en attachmentError, que se muestra
// en la sección de Adjuntos generales más abajo: si fallaba la subida de un ítem, no se veía
// ningún aviso cerca de esa fila y parecía que "no pasaba nada" al elegir el archivo.
const itemUploadErrors = reactive<Record<string, string>>({})

async function handleItemFileChange(rowIndex: number, col: WorkOrderColumn, event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  const cellId = `${rowIndex}:${col.key}`
  delete itemUploadErrors[cellId]
  if (!file || !profile.value) return

  if (!MIME_EXT[file.type]) {
    itemUploadErrors[cellId] = file.type
      ? `Formato no soportado (${file.type}). Usa ${col.type === 'image' ? 'JPG, PNG o WEBP' : 'PDF o TXT'}.`
      : 'No se pudo detectar el tipo de archivo. Probá con otro archivo.'
    ;(event.target as HTMLInputElement).value = ''
    return
  }

  uploadingItemCell.value = cellId
  try {
    const base64 = await fileToBase64(file)
    const res = await pedidos.subirAdjunto(profile.value.id, base64, file.name, file.type)
    items.value[rowIndex]![col.key] = JSON.stringify(res.data)
  } catch (e: unknown) {
    itemUploadErrors[cellId] = (e as { data?: { error?: string } })?.data?.error || `No se pudo subir "${file.name}". Intenta de nuevo.`
  } finally {
    uploadingItemCell.value = null
  }
  ;(event.target as HTMLInputElement).value = ''
}

function clearItemAttachment(rowIndex: number, col: WorkOrderColumn) {
  items.value[rowIndex]![col.key] = ''
  delete itemUploadErrors[`${rowIndex}:${col.key}`]
}

async function handleSubmit() {
  if (!profile.value) return
  submitError.value = ''

  if (!form.cliente_nombre.trim()) {
    submitError.value = 'Escribe tu nombre'
    return
  }

  submitting.value = true
  try {
    const res = await pedidos.crearPedido(profile.value.id, {
      cliente_nombre: form.cliente_nombre.trim(),
      cliente_telefono: form.cliente_telefono.trim() || undefined,
      cliente_email: form.cliente_email.trim() || undefined,
      fecha_inicio: new Date().toISOString().split('T')[0],
      fecha_entrega: form.fecha_entrega || undefined,
      descripcion: form.descripcion.trim() || undefined,
      items: items.value.filter(item => Object.values(item).some(v => v && v.trim().length)),
      attachments: attachments.value,
    })
    numeroCreado.value = res.data.numero
    step.value = 'success'
  } catch (e: unknown) {
    submitError.value = (e as { data?: { error?: string } })?.data?.error || 'No pudimos enviar tu solicitud. Intenta de nuevo.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="navbar">
    <div class="container navbar-inner">
      <span class="brand">{{ profile!.name }}</span>
    </div>
  </div>

  <main class="container">
    <div v-if="step === 'success'" class="card confirmation">
      <div class="icon">✅</div>
      <h2>¡Solicitud enviada!</h2>
      <p>Tu número de pedido es <strong>{{ numeroCreado }}</strong>.</p>
      <p>{{ profile!.name }} revisará tu solicitud y te contactará pronto.</p>
    </div>

    <template v-else>
      <div class="step-label">Solicitar pedido</div>
      <h1>{{ profile!.name }}</h1>
      <p>Completa el formulario y te contactaremos para confirmar los detalles.</p>

      <div v-if="!templateDisponible" class="card">
        <p>Este negocio todavía no configuró su formulario de pedidos. Contáctalo directamente.</p>
      </div>

      <form v-else class="card" @submit.prevent="handleSubmit">
        <div v-if="submitError" class="alert-error">{{ submitError }}</div>

        <div class="field">
          <label>Tu nombre *</label>
          <input v-model="form.cliente_nombre" type="text" required>
        </div>
        <div class="field">
          <label>Teléfono</label>
          <input v-model="form.cliente_telefono" type="tel">
        </div>
        <div class="field">
          <label>Email</label>
          <input v-model="form.cliente_email" type="email">
        </div>
        <div class="field">
          <label>Fecha de entrega deseada</label>
          <input v-model="form.fecha_entrega" type="date">
        </div>
        <div class="field">
          <label>Describe tu pedido</label>
          <textarea v-model="form.descripcion" rows="3"></textarea>
        </div>

        <h2>Detalle del pedido</h2>
        <div v-for="(item, i) in items" :key="i" class="item-row">
          <div class="item-row-header">
            <span class="label">Ítem {{ i + 1 }}</span>
            <button v-if="items.length > 1" type="button" class="remove" @click="removeItem(i)">✕ Quitar</button>
          </div>
          <div v-for="col in columns" :key="col.key" class="field" style="margin-bottom:0;">
            <label>{{ col.label }}</label>
            <input v-if="col.type === 'text' || col.type === 'number'" v-model="item[col.key]" :type="col.type === 'number' ? 'number' : 'text'">
            <select v-else-if="col.type === 'dropdown'" v-model="item[col.key]">
              <option value="">Selecciona...</option>
              <option v-for="opt in col.options ?? []" :key="opt" :value="opt">{{ opt }}</option>
            </select>
            <template v-else>
              <div v-if="parseItemAttachment(item[col.key])" class="attachment-chip">
                <span>{{ parseItemAttachment(item[col.key])!.filename }}</span>
                <button type="button" @click="clearItemAttachment(i, col)">✕</button>
              </div>
              <label v-else class="upload-label">
                {{ uploadingItemCell === `${i}:${col.key}` ? 'Subiendo...' : (col.type === 'image' ? '+ Foto' : '+ Archivo') }}
                <input
                  type="file"
                  style="display:none;"
                  :disabled="uploadingItemCell === `${i}:${col.key}`"
                  :accept="col.type === 'image' ? 'image/jpeg,image/png,image/webp' : 'application/pdf,text/plain'"
                  @change="handleItemFileChange(i, col, $event)"
                >
              </label>
              <p v-if="itemUploadErrors[`${i}:${col.key}`]" class="hint" style="color:var(--red-600);">
                {{ itemUploadErrors[`${i}:${col.key}`] }}
              </p>
            </template>
          </div>
        </div>
        <button type="button" class="btn btn-outline" style="margin-bottom:16px;" @click="addItem">+ Agregar otro</button>

        <div class="field">
          <label>Imágenes o archivos de referencia (opcional)</label>
          <label class="upload-label">
            {{ uploadingAttachment ? 'Subiendo...' : '+ Adjuntar archivo' }}
            <input type="file" style="display:none;" multiple :disabled="uploadingAttachment" accept="image/jpeg,image/png,image/webp,application/pdf" @change="handleFileChange">
          </label>
          <p v-if="attachmentError" class="hint" style="color:var(--red-600);">{{ attachmentError }}</p>
          <div v-if="attachments.length" class="attachment-list">
            <div v-for="(a, i) in attachments" :key="a.key" class="attachment-chip">
              <span>{{ a.filename }}</span>
              <button type="button" @click="removeAttachment(i)">✕</button>
            </div>
          </div>
        </div>

        <button type="submit" class="btn btn-primary" style="margin-top:8px;" :disabled="submitting">
          {{ submitting ? 'Enviando...' : 'Enviar solicitud' }}
        </button>
      </form>
    </template>
  </main>
</template>
