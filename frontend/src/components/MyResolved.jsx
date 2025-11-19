import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { incidentStatuses, urgencyLevels } from '../mockData';
import { apiRequest, API_CONFIG } from '../config';
import websocketManager from '../utils/websocket';
import AdminLayout from './AdminLayout';

function MyResolved({ currentAdmin, onLogout }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  // Cargar incidentes resueltos y conectar WebSocket
  useEffect(() => {
    loadMyResolved();

    // Conectar WebSocket
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    
    if (user && user.id && user.role) {
      websocketManager.connect(user.id, user.role);

      // Escuchar cambios de estado
      const unsubscribeStatus = websocketManager.on('INCIDENT_STATUS_UPDATED', (data) => {
        console.log('🔄 [MyResolved] Estado actualizado:', data);
        // Si pasó a resuelto o cerrado y es mío, agregarlo
        if ((data.incident.status === 'resuelto' || data.incident.status === 'cerrado') &&
            data.incident.assignedTo === user.id) {
          setIncidents(prevIncidents => {
            // Evitar duplicados
            const exists = prevIncidents.some(inc => inc.id === data.incident.id);
            if (exists) {
              return prevIncidents.map(inc => 
                inc.id === data.incident.id ? data.incident : inc
              );
            }
            return [data.incident, ...prevIncidents];
          });
          toast.success('Incidente marcado como resuelto', { icon: '✅' });
        }
      });

      return () => {
        unsubscribeStatus();
        websocketManager.disconnect();
      };
    }
  }, []);

  const loadMyResolved = async () => {
    try {
      setLoading(true);
      const response = await apiRequest(API_CONFIG.ENDPOINTS.INCIDENTS, {
        method: 'GET'
      }, true);
      
      // Filtrar solo mis incidentes resueltos
      const user = JSON.parse(localStorage.getItem('user'));
      const myResolved = (response.incidents || []).filter(
        incident => incident.assignedTo === user.id && 
        (incident.status === 'resuelto' || incident.status === 'cerrado')
      );
      
      setIncidents(myResolved);
      setError('');
    } catch (err) {
      setError('Error al cargar incidentes resueltos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const myResolvedIncidents = incidents;

  // Filtrar por estado
  const filteredIncidents = filterStatus === 'all' 
    ? myResolvedIncidents 
    : myResolvedIncidents.filter(i => i.status === filterStatus);

  // Estadísticas
  const stats = {
    total: myResolvedIncidents.length,
    resueltos: myResolvedIncidents.filter(i => i.status === 'resuelto').length,
    cerrados: myResolvedIncidents.filter(i => i.status === 'cerrado').length,
    // Calcular tiempo promedio de resolución (simulado)
    avgResolutionTime: myResolvedIncidents.length > 0 
      ? Math.round(
          myResolvedIncidents.reduce((acc, inc) => {
            const created = new Date(inc.createdAt);
            const updated = new Date(inc.updatedAt);
            const hours = (updated - created) / (1000 * 60 * 60);
            return acc + hours;
          }, 0) / myResolvedIncidents.length
        )
      : 0
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <p className="text-sm text-gray-600 mb-1">Total Resueltos</p>
            <p className="text-3xl font-bold text-green-600">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-emerald-500">
            <p className="text-sm text-gray-600 mb-1">Resueltos</p>
            <p className="text-3xl font-bold text-emerald-600">{stats.resueltos}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-gray-500">
            <p className="text-sm text-gray-600 mb-1">Cerrados</p>
            <p className="text-3xl font-bold text-gray-600">{stats.cerrados}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <p className="text-sm text-gray-600 mb-1">Tiempo Prom. Resolución</p>
            <p className="text-3xl font-bold text-blue-600">{stats.avgResolutionTime}h</p>
          </div>
        </div>

        {/* Información */}
        {myResolvedIncidents.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Aún no has resuelto incidentes</h3>
            <p className="text-gray-600 mb-6">
              Una vez que marques los incidentes asignados como "Resuelto" o "Cerrado", aparecerán aquí para tu referencia.
            </p>
          </div>
        ) : (
          <>
            {/* Filtros */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex items-center gap-4">
                <label className="text-sm font-semibold text-gray-700">Filtrar por estado:</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilterStatus('all')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      filterStatus === 'all'
                        ? 'bg-utec-blue text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Todos ({myResolvedIncidents.length})
                  </button>
                  <button
                    onClick={() => setFilterStatus('resuelto')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      filterStatus === 'resuelto'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Resueltos ({stats.resueltos})
                  </button>
                  <button
                    onClick={() => setFilterStatus('cerrado')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      filterStatus === 'cerrado'
                        ? 'bg-gray-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Cerrados ({stats.cerrados})
                  </button>
                </div>
              </div>
            </div>

            {/* Información de cabecera */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">Historial de Incidentes Completados</h3>
                  <p className="text-sm text-gray-600">
                    Registro de todos los incidentes que has resuelto exitosamente. Este historial demuestra tu contribución al mantenimiento del campus.
                  </p>
                </div>
              </div>
            </div>

            {/* Lista de Incidentes */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-800">Mis Incidentes Completados</h2>
                <p className="text-sm text-gray-600">
                  {filterStatus === 'all' ? 'Todos los incidentes resueltos y cerrados' : 
                   filterStatus === 'resuelto' ? 'Incidentes marcados como resueltos' :
                   'Incidentes cerrados definitivamente'}
                </p>
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Resolución</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredIncidents.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                          No hay incidentes con el filtro seleccionado.
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
                              {new Date(incident.updatedAt).toLocaleDateString('es-PE')}
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
                      })
                    )}
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
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className="bg-green-600 text-white p-6 rounded-t-xl">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold mb-2">Incidente Completado</h3>
                  <p className="text-green-100">ID: {selectedIncident.id}</p>
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
                  <label className="text-sm font-semibold text-gray-600">Urgencia Original</label>
                  <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getUrgencyColor(selectedIncident.urgency)}`}>
                    {urgencyLevels.find(u => u.value === selectedIncident.urgency)?.label}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Estado Final</label>
                  <div>
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusData(selectedIncident.status)?.color}`}>
                      {getStatusData(selectedIncident.status)?.icon} {getStatusData(selectedIncident.status)?.label}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Reportado por</label>
                  <p className="text-gray-900">{selectedIncident.createdByName || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Fecha de Reporte</label>
                  <p className="text-gray-900">{new Date(selectedIncident.createdAt).toLocaleString('es-PE')}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Fecha de Resolución</label>
                  <p className="text-gray-900">{new Date(selectedIncident.updatedAt).toLocaleString('es-PE')}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Tiempo de Resolución</label>
                  <p className="text-gray-900">
                    {Math.round((new Date(selectedIncident.updatedAt) - new Date(selectedIncident.createdAt)) / (1000 * 60 * 60))} horas
                  </p>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="text-sm font-semibold text-gray-600">Descripción del Problema</label>
                <p className="text-gray-900 mt-2 p-4 bg-gray-50 rounded-lg">{selectedIncident.description}</p>
              </div>

              {/* Historial */}
              <div className="border-t pt-4">
                <label className="text-sm font-semibold text-gray-600 mb-3 block">Historial Completo</label>
                <div className="space-y-3">
                  {selectedIncident.history.map((entry, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 mt-2 bg-green-500 rounded-full flex-shrink-0"></div>
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
    </AdminLayout>
  );
}

export default MyResolved;