export const USERS = [
  {
    usuario: 'atencion',
    password: 'demo1234',
    nombre: 'Carlos Ramos',
    rol: 'atencion',
  },
  {
    usuario: 'operador',
    password: 'demo1234',
    nombre: 'María Pérez',
    rol: 'operador',
  },
]

export const DEBTS = {
  '10000001': {
    dni: '10000001',
    nombre: 'Lucía Mendoza',
    detalle: [
      {
        area: 'BD_Area1',
        num_papeleta: 'P-0001',
        tipo_monto: 'BASE',
        concepto: 'Papeleta de tránsito',
        monto: 200,
      },
      {
        area: 'BD_Area1',
        num_papeleta: 'P-0001',
        tipo_monto: 'INTERES',
        concepto: 'Interés por pago tardío',
        monto: 25.5,
      },
      {
        area: 'BD_Area1',
        num_papeleta: 'P-0002',
        tipo_monto: 'BASE',
        concepto: 'Papeleta de tránsito',
        monto: 350,
      },
      {
        area: 'BD_Area1',
        num_papeleta: 'P-0002',
        tipo_monto: 'INTERES',
        concepto: 'Interés por pago tardío',
        monto: 48.75,
      },
      {
        area: 'BD_Area2',
        num_papeleta: 'P-0003',
        tipo_monto: 'BASE',
        concepto: 'Papeleta administrativa',
        monto: 500,
      },
      {
        area: 'BD_Area2',
        num_papeleta: 'P-0003',
        tipo_monto: 'INTERES',
        concepto: 'Interés por pago tardío',
        monto: 60,
      },
    ],
  },
  '10000002': {
    dni: '10000002',
    nombre: 'Jorge Salazar',
    detalle: [
      {
        area: 'BD_Area2',
        num_papeleta: 'P-0004',
        tipo_monto: 'BASE',
        concepto: 'Papeleta administrativa',
        monto: 780,
      },
      {
        area: 'BD_Area2',
        num_papeleta: 'P-0004',
        tipo_monto: 'INTERES',
        concepto: 'Interés por pago tardío',
        monto: 93.6,
      },
    ],
  },
}
