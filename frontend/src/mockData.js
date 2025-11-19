// Mock data de incidentes para simular respuestas de API
export const mockIncidents = [
  {
    id: "INC-2024-001",
    type: "Infraestructura",
    location: "Edificio A - Piso 3",
    description: "Fuga de agua en el baño del tercer piso, área de sistemas",
    urgency: "alta",
    status: "pendiente",
    assignedTo: null,
    createdAt: "2024-11-15T08:30:00",
    updatedAt: "2024-11-15T08:30:00",
    createdBy: "student-001",
    createdByName: "Juan López",
    history: [
      {
        action: "Creado",
        timestamp: "2024-11-15T08:30:00",
        user: "Sistema"
      }
    ]
  },
  {
    id: "INC-2024-002",
    type: "Servicio",
    location: "Cafetería Central",
    description: "El sistema de punto de venta no está funcionando",
    urgency: "media",
    status: "en-proceso",
    assignedTo: "Juan Pérez",
    createdAt: "2024-11-15T09:15:00",
    updatedAt: "2024-11-15T10:00:00",
    createdBy: "student-002",
    createdByName: "Ana Torres",
    history: [
      {
        action: "Creado",
        timestamp: "2024-11-15T09:15:00",
        user: "Sistema"
      },
      {
        action: "Asignado a Juan Pérez",
        timestamp: "2024-11-15T10:00:00",
        user: "Juan Pérez"
      },
      {
        action: "Estado cambiado a En Proceso",
        timestamp: "2024-11-15T10:00:00",
        user: "Juan Pérez"
      }
    ]
  },
  {
    id: "INC-2024-003",
    type: "Emergencia",
    location: "Laboratorio de Química - Lab 205",
    description: "Derrame de sustancia química, evacuación inmediata",
    urgency: "critica",
    status: "resuelto",
    assignedTo: "María González",
    createdAt: "2024-11-14T14:45:00",
    updatedAt: "2024-11-14T16:30:00",
    createdBy: "student-003",
    createdByName: "Pedro Ramírez",
    history: [
      {
        action: "Creado",
        timestamp: "2024-11-14T14:45:00",
        user: "Sistema"
      },
      {
        action: "Asignado a María González",
        timestamp: "2024-11-14T14:46:00",
        user: "María González"
      },
      {
        action: "Estado cambiado a En Proceso",
        timestamp: "2024-11-14T14:46:00",
        user: "María González"
      },
      {
        action: "Estado cambiado a Resuelto",
        timestamp: "2024-11-14T16:30:00",
        user: "María González"
      }
    ]
  },
  {
    id: "INC-2024-004",
    type: "Infraestructura",
    location: "Biblioteca - Sala de Lectura 2",
    description: "Aire acondicionado no funciona, temperatura muy alta",
    urgency: "media",
    status: "pendiente",
    assignedTo: null,
    createdAt: "2024-11-15T11:20:00",
    updatedAt: "2024-11-15T11:20:00",
    createdBy: "student-001",
    createdByName: "Juan López",
    history: [
      {
        action: "Creado",
        timestamp: "2024-11-15T11:20:00",
        user: "Sistema"
      }
    ]
  },
  {
    id: "INC-2024-005",
    type: "Tecnología",
    location: "Edificio B - Aula 301",
    description: "Proyector no enciende, necesario para clase de 2pm",
    urgency: "alta",
    status: "en-proceso",
    assignedTo: "Carlos Ruiz",
    createdAt: "2024-11-15T13:00:00",
    updatedAt: "2024-11-15T13:15:00",
    createdBy: "student-002",
    createdByName: "Ana Torres",
    history: [
      {
        action: "Creado",
        timestamp: "2024-11-15T13:00:00",
        user: "Sistema"
      },
      {
        action: "Asignado a Carlos Ruiz",
        timestamp: "2024-11-15T13:15:00",
        user: "Carlos Ruiz"
      },
      {
        action: "Estado cambiado a En Proceso",
        timestamp: "2024-11-15T13:15:00",
        user: "Carlos Ruiz"
      }
    ]
  },
  {
    id: "INC-2024-006",
    type: "Seguridad",
    location: "Estacionamiento Principal",
    description: "Iluminación deficiente en el sector norte del estacionamiento",
    urgency: "baja",
    status: "pendiente",
    assignedTo: null,
    createdAt: "2024-11-15T07:30:00",
    updatedAt: "2024-11-15T07:30:00",
    createdBy: "student-003",
    createdByName: "Pedro Ramírez",
    history: [
      {
        action: "Creado",
        timestamp: "2024-11-15T07:30:00",
        user: "Sistema"
      }
    ]
  },
  {
    id: "INC-2024-007",
    type: "Servicio",
    location: "Baño - Edificio C Piso 2",
    description: "Falta papel higiénico y jabón en dispensadores",
    urgency: "baja",
    status: "resuelto",
    assignedTo: "Ana Torres",
    createdAt: "2024-11-14T16:00:00",
    updatedAt: "2024-11-15T08:00:00",
    createdBy: "student-001",
    createdByName: "Juan López",
    history: [
      {
        action: "Creado",
        timestamp: "2024-11-14T16:00:00",
        user: "Sistema"
      },
      {
        action: "Asignado a Ana Torres",
        timestamp: "2024-11-15T07:30:00",
        user: "Ana Torres"
      },
      {
        action: "Estado cambiado a En Proceso",
        timestamp: "2024-11-15T07:30:00",
        user: "Ana Torres"
      },
      {
        action: "Estado cambiado a Resuelto",
        timestamp: "2024-11-15T08:00:00",
        user: "Ana Torres"
      }
    ]
  },
  {
    id: "INC-2024-008",
    type: "Infraestructura",
    location: "Patio Central",
    description: "Grieta considerable en el piso cerca de la fuente",
    urgency: "media",
    status: "pendiente",
    assignedTo: null,
    createdAt: "2024-11-15T12:00:00",
    updatedAt: "2024-11-15T12:00:00",
    createdBy: "student-002",
    createdByName: "Ana Torres",
    history: [
      {
        action: "Creado",
        timestamp: "2024-11-15T12:00:00",
        user: "Sistema"
      }
    ]
  }
];

// Configuración de tipos de incidentes
export const incidentTypes = [
  "Infraestructura",
  "Servicio",
  "Tecnología",
  "Seguridad",
  "Emergencia",
  "Mantenimiento",
  "Otro"
];

// Configuración de ubicaciones del campus
export const locations = [
  "Edificio A - Piso 1",
  "Edificio A - Piso 2",
  "Edificio A - Piso 3",
  "Edificio A - Piso 4",
  "Edificio B - Piso 1",
  "Edificio B - Piso 2",
  "Edificio B - Piso 3",
  "Edificio C - Piso 1",
  "Edificio C - Piso 2",
  "Biblioteca - Sala de Lectura 1",
  "Biblioteca - Sala de Lectura 2",
  "Biblioteca - Área de Cómputo",
  "Cafetería Central",
  "Cafetería Edificio B",
  "Laboratorio de Química - Lab 205",
  "Laboratorio de Física - Lab 301",
  "Laboratorio de Computación - Lab 401",
  "Auditorio Principal",
  "Sala de Conferencias 1",
  "Sala de Conferencias 2",
  "Gimnasio",
  "Cancha de Fútbol",
  "Estacionamiento Principal",
  "Estacionamiento Visitantes",
  "Patio Central",
  "Área Verde Norte",
  "Área Verde Sur"
];

// Niveles de urgencia
export const urgencyLevels = [
  { value: "baja", label: "Baja", color: "text-green-600 bg-green-100" },
  { value: "media", label: "Media", color: "text-yellow-600 bg-yellow-100" },
  { value: "alta", label: "Alta", color: "text-orange-600 bg-orange-100" },
  { value: "critica", label: "Crítica", color: "text-red-600 bg-red-100" }
];

// Estados de incidentes
export const incidentStatuses = [
  { value: "pendiente", label: "Pendiente", color: "text-gray-700 bg-gray-200", icon: "🔴" },
  { value: "en-proceso", label: "En Proceso", color: "text-blue-700 bg-blue-100", icon: "🟡" },
  { value: "resuelto", label: "Resuelto", color: "text-green-700 bg-green-100", icon: "🟢" },
  { value: "cerrado", label: "Cerrado", color: "text-gray-700 bg-gray-300", icon: "⚫" }
];

// Usuarios mock (para simular login)
export const mockUsers = [
  // Administradores
  {
    id: "admin-001",
    email: "admin@utec.edu.pe",
    password: "admin123",
    name: "Admin UTEC",
    role: "administrador",
    phone: "+51999888777"
  },
  {
    id: "admin-002",
    email: "maria.gonzalez@utec.edu.pe",
    password: "admin123",
    name: "María González",
    role: "administrador",
    phone: "+51999888778"
  },
  {
    id: "admin-003",
    email: "carlos.ruiz@utec.edu.pe",
    password: "admin123",
    name: "Carlos Ruiz",
    role: "administrador",
    phone: "+51999888779"
  },
  // Estudiantes
  {
    id: "student-001",
    email: "estudiante@utec.edu.pe",
    password: "estudiante123",
    name: "Estudiante UTEC",
    role: "estudiante",
    code: "202100001"
  },
  {
    id: "student-002",
    email: "ana.torres@utec.edu.pe",
    password: "estudiante123",
    name: "Ana Torres",
    role: "estudiante",
    code: "202010002"
  },
  {
    id: "student-003",
    email: "pedro.ramirez@utec.edu.pe",
    password: "estudiante123",
    name: "Pedro Ramírez",
    role: "estudiante",
    code: "202010003"
  }
];

// Mantener compatibilidad con código existente
export const mockAdminUser = mockUsers[0];
