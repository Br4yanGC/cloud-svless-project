import React from 'react';
import { Calendar } from 'lucide-react';

const OrderTimeline = ({ order }) => {
  // Si no hay statusTimestamps, mostrar mensaje informativo
  if (!order.statusTimestamps) {
    return (
      <div className="border border-gray-200 rounded-xl p-6 bg-white">
        <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
          <div className="bg-indigo-100 p-2 rounded-lg">
            <Calendar size={20} className="text-indigo-600" />
          </div>
          <span>Línea de Tiempo del Pedido</span>
        </h4>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-600">
            Este es un pedido anterior al sistema de seguimiento detallado.
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Fecha de creación: {new Date(order.createdAt).toLocaleString('es-PE', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
          {order.deliveredAt && (
            <p className="text-xs text-green-700 mt-1">
              Entregado: {new Date(order.deliveredAt).toLocaleString('es-PE', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          )}
        </div>
      </div>
    );
  }

  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return null;
    const minutes = Math.round((new Date(endTime) - new Date(startTime)) / 60000);
    // Solo mostrar si es mayor a 0 (evitar tiempos negativos por problemas de sincronización)
    return minutes > 0 ? minutes : null;
  };

  return (
    <div className="border border-gray-200 rounded-xl p-6 bg-white">
      <h4 className="text-lg font-bold text-gray-900 mb-6 flex items-center space-x-2">
        <div className="bg-indigo-100 p-2 rounded-lg">
          <Calendar size={20} className="text-indigo-600" />
        </div>
        <span>Línea de Tiempo del Pedido</span>
      </h4>
      
      <div className="relative">
        {/* Línea vertical conectora */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-yellow-300 via-blue-300 to-green-300"></div>
        
        <div className="space-y-6">
          {/* Recibido */}
          {order.statusTimestamps.recibido && (
            <div className="relative flex items-start space-x-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-yellow-100 border-4 border-white shadow-md flex items-center justify-center z-10">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              </div>
              <div className="flex-1 bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-900 text-sm">Pedido Recibido</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {new Date(order.statusTimestamps.recibido).toLocaleString('es-PE', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  {order.statusTimestamps.cocinando && (
                    <span className="text-xs text-gray-500">
                      ⏱ {calculateDuration(order.statusTimestamps.recibido, order.statusTimestamps.cocinando)} min
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* En Preparación */}
          {order.statusTimestamps.cocinando && (
            <div className="relative flex items-start space-x-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 border-4 border-white shadow-md flex items-center justify-center z-10">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              </div>
              <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-900 text-sm">En Preparación</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {new Date(order.statusTimestamps.cocinando).toLocaleString('es-PE', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    {order.cook && (
                      <p className="text-xs text-blue-700 mt-1 font-medium">Chef: {order.cook.name}</p>
                    )}
                  </div>
                  {order.statusTimestamps.empacado && (
                    <span className="text-xs text-gray-500">
                      ⏱ {calculateDuration(order.statusTimestamps.cocinando, order.statusTimestamps.empacado)} min
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Listo para Envío */}
          {order.statusTimestamps.empacado && (
            <div className="relative flex items-start space-x-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 border-4 border-white shadow-md flex items-center justify-center z-10">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-900 text-sm">Listo para Envío</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {new Date(order.statusTimestamps.empacado).toLocaleString('es-PE', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  {order.statusTimestamps.en_camino && (
                    <span className="text-xs text-gray-500">
                      ⏱ {calculateDuration(order.statusTimestamps.empacado, order.statusTimestamps.en_camino)} min
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* En Camino */}
          {order.statusTimestamps.en_camino && (
            <div className="relative flex items-start space-x-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-100 border-4 border-white shadow-md flex items-center justify-center z-10">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              </div>
              <div className="flex-1 bg-purple-50 border border-purple-200 rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-900 text-sm">En Camino</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {new Date(order.statusTimestamps.en_camino).toLocaleString('es-PE', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    {order.deliveryPerson && (
                      <p className="text-xs text-purple-700 mt-1 font-medium">Repartidor: {order.deliveryPerson.name}</p>
                    )}
                    {order.dispatcher && (
                      <p className="text-xs text-purple-600 mt-1 font-medium">Despachador: {order.dispatcher.name}</p>
                    )}
                  </div>
                  {order.statusTimestamps.entregado && (
                    <span className="text-xs text-gray-500">
                      ⏱ {calculateDuration(order.statusTimestamps.en_camino, order.statusTimestamps.entregado)} min
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Entregado */}
          {order.statusTimestamps.entregado && (
            <div className="relative flex items-start space-x-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-emerald-100 border-4 border-white shadow-md flex items-center justify-center z-10">
                <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
              </div>
              <div className="flex-1 bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-300 rounded-lg p-4 shadow-md">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-emerald-800 text-sm">Pedido Entregado</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {new Date(order.statusTimestamps.entregado).toLocaleString('es-PE', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cancelado */}
          {order.statusTimestamps.cancelado && (
            <div className="relative flex items-start space-x-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 border-4 border-white shadow-md flex items-center justify-center z-10">
                <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">✕</span>
                </div>
              </div>
              <div className="flex-1 bg-red-50 border-2 border-red-300 rounded-lg p-4 shadow-md">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-red-800 text-sm">Pedido Cancelado</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {new Date(order.statusTimestamps.cancelado).toLocaleString('es-PE', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resumen de Tiempo Total */}
      {order.deliveredAt && (
        <div className="mt-6 pt-6 border-t-2 border-gray-200">
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs uppercase tracking-wide text-emerald-700 font-semibold mb-1">Tiempo Total de Entrega</p>
                <p className="text-2xl font-bold text-emerald-700">
                  {Math.round((new Date(order.deliveredAt) - new Date(order.createdAt)) / 60000)} minutos
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-600">Desde creación hasta entrega</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(order.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })} 
                  {' → '}
                  {new Date(order.deliveredAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderTimeline;
