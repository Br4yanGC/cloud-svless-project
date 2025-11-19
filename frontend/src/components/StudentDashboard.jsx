import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { incidentStatuses, urgencyLevels } from '../mockData';
import { apiRequest, API_CONFIG } from '../config';
import websocketManager from '../utils/websocket';

function StudentDashboard({ currentUser, onLogout }) {
  const navigate = useNavigate();
  
  const [myIncidents, setMyIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Cargar incidentes del estudiante y conectar WebSocket
  useEffect(() => {
    loadMyIncidents();

    // Conectar WebSocket
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    
    if (user && user.id && user.role) {
      console.log('🔌 [StudentDashboard] Conectando WebSocket para usuario:', user.id);
      websocketManager.connect(user.id, user.role);

      // Escuchar cuando un incidente es asignado
      const unsubscribeAssigned = websocketManager.on('INCIDENT_ASSIGNED', (data) => {
        console.log('👤 [StudentDashboard] Incidente asignado:', data);
        // Actualizar el incidente en la lista
        setMyIncidents(prevIncidents =>
          prevIncidents.map(inc =>
            inc.id === data.incident.id ? data.incident : inc
          )
        );
        // Mostrar toast
        toast.success(
          `Tu incidente ${data.incident.trackingCode} fue asignado a ${data.incident.assignedToName}`,
          {
            icon: '👤',
            duration: 5000,
          }
        );
      });

      // Escuchar cambios de estado
      const unsubscribeStatusUpdate = websocketManager.on('INCIDENT_STATUS_UPDATED', (data) => {
        console.log('🔄 [StudentDashboard] Estado actualizado:', data);
        // Actualizar el incidente en la lista
        setMyIncidents(prevIncidents =>
          prevIncidents.map(inc =>
            inc.id === data.incident.id ? data.incident : inc
          )
        );
        // Mostrar toast con diferentes estilos según el estado
        const statusMessages = {
          'pendiente': { text: 'marcado como pendiente', icon: '⏳' },
          'en-proceso': { text: 'está en proceso', icon: '🔄' },
          'resuelto': { text: 'ha sido resuelto', icon: '✅' },
          'cerrado': { text: 'ha sido cerrado', icon: '🔒' }
        };
        const statusInfo = statusMessages[data.incident.status] || { text: 'actualizado', icon: '📝' };
        
        toast(
          `Tu incidente ${data.incident.trackingCode} ${statusInfo.text}`,
          {
            icon: statusInfo.icon,
            duration: 5000,
            style: data.incident.status === 'resuelto' ? {
              background: '#10b981',
              color: '#fff',
            } : undefined,
          }
        );
      });

      // Cleanup al desmontar
      return () => {
        unsubscribeAssigned();
        unsubscribeStatusUpdate();
        websocketManager.disconnect();
      };
    } else {
      console.error('❌ [StudentDashboard] No se puede conectar WebSocket: usuario no válido');
    }
  }, []);

  const loadMyIncidents = async () => {
    try {
      setLoading(true);
      const response = await apiRequest(`${API_CONFIG.ENDPOINTS.INCIDENTS}?my=true`, {
        method: 'GET'
      }, true);
      setMyIncidents(response.incidents || []);
      setError('');
    } catch (err) {
      setError('Error al cargar incidentes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Estadísticas
  const stats = {
    total: myIncidents.length,
    pendientes: myIncidents.filter(i => i.status === 'pendiente').length,
    enProceso: myIncidents.filter(i => i.status === 'en-proceso').length,
    resueltos: myIncidents.filter(i => i.status === 'resuelto').length
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-md border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-utec-blue">Mis Incidentes - AlertaUTEC</h1>
              <p className="text-sm text-gray-600">
                Bienvenido, {currentUser.name} {currentUser.code && `(${currentUser.code})`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/student/create-incident')}
                className="flex items-center gap-2 px-4 py-2 bg-utec-orange text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Reportar Incidente
              </button>
              <button
                onClick={() => {
                  onLogout();
                  navigate('/');
                }}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <p className="text-sm text-gray-600 mb-1">Total Reportados</p>
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
        </div>

        {/* Información */}
        {myIncidents.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No has reportado ningún incidente</h3>
            <p className="text-gray-600 mb-6">
              Cuando identifiques algún problema en el campus, repórtalo aquí para que pueda ser atendido.
            </p>
            <button
              onClick={() => navigate('/student/create-incident')}
              className="px-6 py-3 bg-utec-orange text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
            >
              Reportar mi Primer Incidente
            </button>
          </div>
        ) : (
          <>
            {/* Lista de Incidentes */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-800">Mis Reportes</h2>
                <p className="text-sm text-gray-600">Historial de incidentes que has reportado</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ubicación</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Urgencia</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {myIncidents.map((incident) => {
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
                            {new Date(incident.createdAt).toLocaleDateString('es-PE')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => openDetailModal(incident)}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Ver Detalles
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal de Detalles */}
      {showDetailModal && selectedIncident && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
                    {selectedIncident.assignedTo || <span className="text-gray-400 italic">Sin asignar</span>}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Fecha de Reporte</label>
                  <p className="text-gray-900">{new Date(selectedIncident.createdAt).toLocaleString('es-PE')}</p>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="text-sm font-semibold text-gray-600">Descripción</label>
                <p className="text-gray-900 mt-2 p-4 bg-gray-50 rounded-lg">{selectedIncident.description}</p>
              </div>

              {/* Historial */}
              <div>
                <label className="text-sm font-semibold text-gray-600 mb-3 block">Historial de Seguimiento</label>
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
            <div className="bg-gray-50 p-6 rounded-b-xl flex justify-end">
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
    </div>
  );
}

export default StudentDashboard;