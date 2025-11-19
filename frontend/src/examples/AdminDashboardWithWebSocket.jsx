import React, { useEffect, useState } from 'react';
import { useWebSocket } from '../websocket';

function AdminDashboardWithWebSocket({ currentUser }) {
  const [incidents, setIncidents] = useState([]);
  const [notification, setNotification] = useState(null);
  
  // Conectar WebSocket
  const { isConnected, lastMessage } = useWebSocket(currentUser.id, currentUser.role);

  // Escuchar notificaciones de nuevos incidentes
  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'NEW_INCIDENT') {
        // Añadir nuevo incidente a la lista
        setIncidents(prev => [lastMessage.incident, ...prev]);
        
        // Mostrar notificación
        setNotification({
          type: 'success',
          message: `🆕 Nuevo incidente: ${lastMessage.incident.id}`
        });
        
        // Ocultar notificación después de 5 segundos
        setTimeout(() => setNotification(null), 5000);
      }
      
      if (lastMessage.type === 'INCIDENT_ASSIGNED') {
        // Actualizar incidente asignado
        setIncidents(prev => 
          prev.map(inc => 
            inc.id === lastMessage.incidentId 
              ? { ...inc, assignedTo: lastMessage.assignedTo }
              : inc
          )
        );
        
        setNotification({
          type: 'info',
          message: `📌 Incidente ${lastMessage.incidentId} asignado a ${lastMessage.assignedTo}`
        });
        
        setTimeout(() => setNotification(null), 5000);
      }
    }
  }, [lastMessage]);

  return (
    <div>
      {/* Indicador de conexión */}
      <div className="fixed top-4 right-4 z-50">
        {isConnected ? (
          <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            Conectado
          </div>
        ) : (
          <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm">
            Desconectado
          </div>
        )}
      </div>

      {/* Notificación flotante */}
      {notification && (
        <div className={`fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
        } text-white`}>
          {notification.message}
        </div>
      )}

      {/* Dashboard content */}
      <div>
        {/* Tu código actual del dashboard aquí */}
      </div>
    </div>
  );
}

export default AdminDashboardWithWebSocket;
