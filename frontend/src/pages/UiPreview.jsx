import { useState } from 'react'
import { Alert } from '../components/ui/Alert.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Chip } from '../components/ui/Chip.jsx'
import { DataTable } from '../components/ui/DataTable.jsx'
import { ErrorSummary } from '../components/ui/ErrorSummary.jsx'
import { FileDropzone } from '../components/ui/FileDropzone.jsx'
import { Modal } from '../components/ui/Modal.jsx'
import { Panel } from '../components/ui/Panel.jsx'
import { ProgressBar } from '../components/ui/ProgressBar.jsx'
import { SelectField } from '../components/ui/SelectField.jsx'
import { TextField } from '../components/ui/TextField.jsx'
import './UiPreview.css'

const currencyFormatter = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
})

const areaOptions = [
  { value: 'BD_Area1', label: 'Fiscalización presencial (Sede Central)' },
  { value: 'BD_Area2', label: 'Fiscalización electrónica (Sede Norte)' },
]

const errorSummaryItems = [
  { fieldId: 'preview-dni-error', label: 'El DNI debe tener 8 dígitos' },
  { fieldId: 'preview-password', label: 'Ingrese la contraseña' },
]

const debtRows = [
  {
    dni: '12345678',
    nombre: 'María Pérez',
    area: 'Sede Central',
    monto: 1250.5,
  },
  {
    dni: '87654321',
    nombre: 'José Ramírez',
    area: 'Sede Norte',
    monto: 480,
  },
  {
    dni: '45678912',
    nombre: 'Ana Torres',
    area: 'Sede Central',
    monto: 2310.75,
  },
]

const debtColumns = [
  { key: 'dni', header: 'DNI' },
  { key: 'nombre', header: 'Nombre' },
  { key: 'area', header: 'Área' },
  {
    key: 'monto',
    header: 'Monto',
    align: 'right',
    render: (row) => currencyFormatter.format(row.monto),
  },
]

export function UiPreview() {
  const [dni, setDni] = useState('')
  const [dniError, setDniError] = useState('123')
  const [password, setPassword] = useState('')
  const [area, setArea] = useState('BD_Area1')
  const [file, setFile] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <main className="ui-preview">
      <h1>Sistema Integrado de Reporte de Deudas</h1>

      <Panel title="Botones">
        <div className="ui-preview__row">
          <Button variant="primary">Consultar deuda</Button>
          <Button variant="secondary">Cancelar</Button>
          <Button variant="danger">Eliminar carga</Button>
          <Button variant="link">Descargar observaciones</Button>
          <Button variant="primary" disabled>
            Confirmar carga
          </Button>
        </div>
        <p className="ui-preview__note">
          El botón deshabilitado se explica con texto de ayuda cercano.
        </p>
        <div className="ui-preview__full-width">
          <Button variant="primary" fullWidth>
            Ingresar
          </Button>
        </div>
      </Panel>

      <Panel title="Campos de formulario">
        <div className="ui-preview__stack">
          <TextField
            id="preview-dni"
            label="DNI"
            value={dni}
            onChange={(event) => setDni(event.target.value)}
            helper="Ingrese los 8 dígitos sin espacios."
            inputMode="numeric"
            maxLength={8}
            autoComplete="off"
            required
            width="12ch"
          />
          <TextField
            id="preview-dni-error"
            label="DNI con error"
            value={dniError}
            onChange={(event) => setDniError(event.target.value)}
            error="El DNI debe tener 8 dígitos."
            inputMode="numeric"
            maxLength={8}
            width="12ch"
          />
          <TextField
            id="preview-password"
            label="Contraseña"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            helper="Use el botón Mostrar u Ocultar para revisar lo escrito."
            autoComplete="current-password"
            required
            width="24ch"
          />
          <SelectField
            id="preview-area"
            label="Área"
            value={area}
            onChange={(event) => setArea(event.target.value)}
            options={areaOptions}
            helper="El área determina la sede de fiscalización."
            required
            width="100%"
          />
        </div>
      </Panel>

      <Panel title="Resumen de errores">
        <div className="ui-preview__stack">
          <ErrorSummary errors={errorSummaryItems} />
        </div>
      </Panel>

      <Panel title="Alerta y estados">
        <div className="ui-preview__stack">
          <Alert variant="info" title="Datos actualizados">
            La información consolidada se actualiza una vez al día.
          </Alert>
          <Alert variant="success" title="Carga completada">
            Se registraron 12 460 filas correctamente.
          </Alert>
          <Alert
            variant="warning"
            title="Papeletas pendientes de verificación"
            action={<Button variant="link">Descargar observaciones</Button>}
          >
            Algunas papeletas están pendientes de validación en el área de
            origen.
          </Alert>
          <Alert variant="error" title="No se pudo completar la consulta">
            Revise el DNI e intente nuevamente.
          </Alert>
        </div>
      </Panel>

      <Panel title="Progreso">
        <div className="ui-preview__stack">
          <ProgressBar
            value={42}
            label="Procesando 420 000 de 1 000 000 registros"
            ariaLabel="Progreso de la carga"
          />
          <ProgressBar
            value={null}
            label="La carga está en cola."
            ariaLabel="Progreso de la carga"
          />
        </div>
      </Panel>

      <Panel title="Carga de archivo">
        <div className="ui-preview__stack">
          <FileDropzone
            file={file}
            onFileSelect={setFile}
            onClear={() => setFile(null)}
            helper="Formatos admitidos: CSV de hasta 5 MB."
          />
          <FileDropzone
            onFileSelect={() => {}}
            error="El archivo supera el tamaño máximo de 5 MB."
            disabled
          />
        </div>
      </Panel>

      <Panel title="Chips de estado">
        <div className="ui-preview__chips">
          <Chip variant="base">Base</Chip>
          <Chip variant="interes">Interés</Chip>
          <Chip variant="vigente">Vigente</Chip>
          <Chip variant="porVencer">Por vencer</Chip>
          <Chip variant="vencida">Vencida</Chip>
          <Chip variant="coactiva">En cobranza coactiva</Chip>
        </div>
      </Panel>

      <Panel title="Diálogo modal">
        <div className="ui-preview__row">
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            Abrir modal de prueba
          </Button>
        </div>
        <Modal
          open={modalOpen}
          title="Confirmar carga de datos"
          onClose={() => setModalOpen(false)}
          secondaryAction={
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
          }
          primaryAction={
            <Button variant="primary" onClick={() => setModalOpen(false)}>
              Confirmar carga
            </Button>
          }
        >
          <p>
            La carga reemplazará los registros del área seleccionada. Esta
            acción no se puede deshacer.
          </p>
        </Modal>
      </Panel>

      <Panel title="Tabla de datos">
        <DataTable
          caption="Deudas registradas"
          columns={debtColumns}
          rows={debtRows}
          getRowKey={(row) => row.dni}
          emptyMessage="No hay deudas registradas para este DNI."
        />
      </Panel>
    </main>
  )
}
