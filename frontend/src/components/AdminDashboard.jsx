import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { incidentStatuses, urgencyLevels, incidentTypes, locations } from '../mockData';
import { apiRequest, API_CONFIG } from '../config';
import websocketManager from '../utils/websocket';
import AdminLayout from './AdminLayout';

function AdminDashboard({ currentAdmin, onLogout }) {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterUrgency, setFilterUrgency] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Cargar incidentes y conectar WebSocket
  useEffect(() => {
    loadIncidents();

    // Solicitar permisos de notificación
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Conectar WebSocket
    const userStr = localStorage.getItem('user');
    console.log('📦 localStorage user (raw):', userStr);
    
    const user = userStr ? JSON.parse(userStr) : null;
    console.log('👤 Usuario desde localStorage:', user);
    
    if (user && user.id && user.role) {
      console.log('🔌 Iniciando conexión WebSocket para usuario:', user.id, 'role:', user.role);
      websocketManager.connect(user.id, user.role);

      // Escuchar nuevos incidentes
      const unsubscribeNewIncident = websocketManager.on('NEW_INCIDENT', (data) => {
        console.log('🆕 Nuevo incidente recibido:', data);
        // Agregar el nuevo incidente a la lista
        setIncidents(prevIncidents => [data.incident, ...prevIncidents]);
        // Mostrar toast
        toast.success(`Nuevo incidente: ${data.incident.trackingCode}`, {
          icon: '🚨',
        });
        // Notificación del navegador
        showNotification('Nuevo incidente', data.message);
      });

      // Escuchar asignaciones
      const unsubscribeAssigned = websocketManager.on('INCIDENT_ASSIGNED', (data) => {
        console.log('👤 Incidente asignado:', data);
        // Actualizar el incidente en la lista
        setIncidents(prevIncidents =>
          prevIncidents.map(inc =>
            inc.id === data.incident.id ? data.incident : inc
          )
        );
        // Mostrar toast
        toast.info(`${data.incident.trackingCode} asignado`, {
          icon: '👤',
        });
        // Notificación del navegador
        showNotification('Incidente asignado', data.message);
      });

      // Cleanup al desmontar
      return () => {
        unsubscribeNewIncident();
        unsubscribeAssigned();
        websocketManager.disconnect();
      };
    } else {
      console.error('❌ No se puede conectar WebSocket: usuario no válido en localStorage');
      console.error('❌ Por favor, cierra sesión y vuelve a iniciar sesión');
    }
  }, []);

  const showNotification = (title, message) => {
    // Notificación del navegador
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body: message });
    }
    // También puedes agregar un toast/alert en la UI
    console.log(`📢 ${title}: ${message}`);
  };

  const loadIncidents = async () => {
    try {
      setLoading(true);
      const response = await apiRequest(API_CONFIG.ENDPOINTS.INCIDENTS, {
        method: 'GET'
      }, true);
      setIncidents(response.incidents || []);
      setError('');
    } catch (err) {
      setError('Error al cargar incidentes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar incidentes
  const filteredIncidents = incidents.filter(incident => {
    const matchesStatus = filterStatus === 'all' || incident.status === filterStatus;
    const matchesUrgency = filterUrgency === 'all' || incident.urgency === filterUrgency;
    const matchesSearch = 
      incident.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesUrgency && matchesSearch;
  });

  // Estadísticas
  const stats = {
    total: incidents.length,
    pendientes: incidents.filter(i => i.status === 'pendiente').length,
    enProceso: incidents.filter(i => i.status === 'en-proceso').length,
    resueltos: incidents.filter(i => i.status === 'resuelto').length,
    misIncidentes: incidents.filter(i => i.assignedTo === currentAdmin.name).length
  };

  // Asignar incidente al admin actual
  const handleAssignToMe = async (incidentId) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiRequest(
        API_CONFIG.ENDPOINTS.ASSIGN_INCIDENT(incidentId),
        {
          method: 'PUT',
          body: JSON.stringify({ assignTo: 'me' })
        },
        true
      );
      
      console.log('Incidente asignado:', response);
      
      // Cerrar modal si está abierto
      if (showDetailModal) {
        closeDetailModal();
      }
      
      // Recargar incidentes
      await loadIncidents();
    } catch (err) {
      console.error('Error al asignar:', err);
      setError('Error al asignar incidente: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cambiar estado del incidente
  const handleChangeStatus = async (incidentId, newStatus) => {
    try {
      setLoading(true);
      await apiRequest(
        API_CONFIG.ENDPOINTS.UPDATE_STATUS(incidentId),
        {
          method: 'PUT',
          body: JSON.stringify({ status: newStatus })
        },
        true
      );
      await loadIncidents();
    } catch (err) {
      setError('Error al cambiar estado: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal de detalles
  const openDetailModal = (incident) => {
    setSelectedIncident(incident);
    setShowDetailModal(true);
  };

  // Cerrar modal
  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedIncident(null);
  };

  // Obtener clase de color para urgencia
  const getUrgencyColor = (urgency) => {
    return urgencyLevels.find(u => u.value === urgency)?.color || 'text-gray-600 bg-gray-100';
  };

  // Obtener datos de estado
  const getStatusData = (status) => {
    return incidentStatuses.find(s => s.value === status);
  };

  return (
    <AdminLayout currentAdmin={currentAdmin} onLogout={onLogout}>
      <div className="container mx-auto px-4 py-8">
        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <p className="text-sm text-gray-600 mb-1">Total Incidentes</p>
            <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
            <p className="text-sm text-gray-600 mb-1">Pendientes</p>
            <p className="text-3xl font-bold text-red-600">{stats.pendientes}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
            <p className="text-sm text-gray-600 mb-1">En Proceso</p>
            <p className="text-3xl font-bold text-yellow-600">{stats.enProceso}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <p className="text-sm text-gray-600 mb-1">Resueltos</p>
            <p className="text-3xl font-bold text-green-600">{stats.resueltos}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
            <p className="text-sm text-gray-600 mb-1">Mis Incidentes</p>
            <p className="text-3xl font-bold text-purple-600">{stats.misIncidentes}</p>
          </div>
        </div>

        {/* Filtros y búsqueda */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ID, tipo, ubicación, descripción..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-utec-blue focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-utec-blue focus:border-transparent"
              >
                <option value="all">Todos</option>
                {incidentStatuses.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Urgencia</label>
              <select
                value={filterUrgency}
                onChange={(e) => setFilterUrgency(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-utec-blue focus:border-transparent"
              >
                <option value="all">Todas</option>
                {urgencyLevels.map(level => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tabla de incidentes */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ubicación</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Urgencia</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responsable</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredIncidents.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      No se encontraron incidentes con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredIncidents.map((incident) => {
                    const statusData = getStatusData(incident.status);
                    return (
                      <tr key={incident.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {incident.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {incident.type}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {incident.location}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getUrgencyColor(incident.urgency)}`}>
                            {urgencyLevels.find(u => u.value === incident.urgency)?.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusData?.color}`}>
                            {statusData?.icon} {statusData?.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {incident.assignedToName || incident.assignedTo === 'unassigned' ? (
                            incident.assignedToName ? (
                              <span className="text-gray-900 font-medium">{incident.assignedToName}</span>
                            ) : (
                              <span className="text-gray-400 italic">Sin asignar</span>
                            )
                          ) : (
                            <span className="text-gray-400 italic">Sin asignar</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                          <button
                            onClick={() => openDetailModal(incident)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Ver
                          </button>
                          {(incident.assignedTo === 'unassigned' || !incident.assignedTo) && (
                            <button
                              onClick={() => handleAssignToMe(incident.id)}
                              className="px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded-md hover:bg-green-700 transition-colors"
                            >
                              Tomar responsabilidad
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Detalles */}
      {showDetailModal && selectedIncident && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className="bg-utec-blue text-white p-6 rounded-t-xl">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold mb-2">Detalle del Incidente</h3>
                  <p className="text-blue-200">ID: {selectedIncident.id}</p>
                </div>
                <button
                  onClick={closeDetailModal}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6 space-y-6">
              {/* Información General */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-600">Tipo</label>
                  <p className="text-gray-900">{selectedIncident.type}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Ubicación</label>
                  <p className="text-gray-900">{selectedIncident.location}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Urgencia</label>
                  <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getUrgencyColor(selectedIncident.urgency)}`}>
                    {urgencyLevels.find(u => u.value === selectedIncident.urgency)?.label}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Estado Actual</label>
                  <div>
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusData(selectedIncident.status)?.color}`}>
                      {getStatusData(selectedIncident.status)?.icon} {getStatusData(selectedIncident.status)?.label}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Responsable</label>
                  <p className="text-gray-900">
                    {selectedIncident.assignedToName || (selectedIncident.assignedTo === 'unassigned' || !selectedIncident.assignedTo) ? (
                      selectedIncident.assignedToName || <span className="text-gray-400 italic">Sin asignar</span>
                    ) : (
                      selectedIncident.assignedTo
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Fecha de Creación</label>
                  <p className="text-gray-900">{new Date(selectedIncident.createdAt).toLocaleString('es-PE')}</p>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="text-sm font-semibold text-gray-600">Descripción</label>
                <p className="text-gray-900 mt-2 p-4 bg-gray-50 rounded-lg">{selectedIncident.description}</p>
              </div>

              {/* Acciones */}
              <div className="border-t pt-4">
                <label className="text-sm font-semibold text-gray-600 mb-3 block">Cambiar Estado</label>
                <div className="flex flex-wrap gap-2">
                  {incidentStatuses.map(status => (
                    <button
                      key={status.value}
                      onClick={() => {
                        handleChangeStatus(selectedIncident.id, status.value);
                        closeDetailModal();
                      }}
                      disabled={selectedIncident.status === status.value}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        selectedIncident.status === status.value
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : status.color + ' hover:opacity-80'
                      }`}
                    >
                      {status.icon} {status.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Historial */}
              <div className="border-t pt-4">
                <label className="text-sm font-semibold text-gray-600 mb-3 block">Historial de Cambios</label>
                <div className="space-y-3">
                  {selectedIncident.history.map((entry, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 mt-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 font-medium">{entry.action}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(entry.timestamp).toLocaleString('es-PE')} - {entry.user}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer del Modal */}
            <div className="bg-gray-50 p-6 rounded-b-xl flex justify-end gap-3">
              {(selectedIncident.assignedTo === 'unassigned' || !selectedIncident.assignedTo) && (
                <button
                  onClick={() => handleAssignToMe(selectedIncident.id)}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Tomar Responsabilidad
                </button>
              )}
              <button
                onClick={closeDetailModal}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default AdminDashboard;
