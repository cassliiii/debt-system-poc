export const ROLES = {
  atencion: 'Atención al ciudadano',
  operador: 'Operador de área',
}

export const ROLE_HOME = {
  atencion: '/consulta',
  operador: '/carga',
}

export const NAV_ITEMS = [
  { label: 'Consulta de deuda', to: '/consulta', roles: ['atencion'] },
  { label: 'Carga de datos', to: '/carga', roles: ['operador'] },
]
