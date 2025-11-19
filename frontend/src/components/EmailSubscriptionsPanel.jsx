import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const NOTIFICATIONS_API = 'https://9m8tqise7g.execute-api.us-east-1.amazonaws.com/dev';
const AUTH_API = 'https://kzq2450gbk.execute-api.us-east-1.amazonaws.com/dev';

export default function EmailSubscriptionsPanel() {
  const [admins, setAdmins] = useState([]);
  const [summary, setSummary] = useState({ total: 0, confirmed: 0, pending: 0, notSubscribed: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    email_notification: ''
  });

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${NOTIFICATIONS_API}/notifications/subscriptions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Error al cargar suscripciones');

      const data = await response.json();
      setAdmins(data.admins || []);
      setSummary(data.summary || { total: 0, confirmed: 0, pending: 0, notSubscribed: 0 });
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      toast.error('Error al cargar suscripciones');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (admin) => {
    try {
      setActionLoading(admin.email);
      const token = localStorage.getItem('token');

      const response = await fetch(`${NOTIFICATIONS_API}/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          email: admin.email,
          email_notification: admin.email_notification 
        })
      });

      if (!response.ok) throw new Error('Error al enviar invitación');

      const data = await response.json();
      
      if (data.alreadySubscribed) {
        toast.success('El administrador ya está suscrito');
      } else {
        toast.success(`Invitación enviada a ${data.subscribedEmail || admin.email_notification}. El admin debe confirmar desde su email.`);
      }

      await loadSubscriptions();
    } catch (error) {
      console.error('Error subscribing:', error);
      toast.error('Error al enviar invitación');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnsubscribe = async (subscriptionArn, name) => {
    if (!confirm(`¿Desuscribir a ${name} de las notificaciones por email?`)) return;

    try {
      setActionLoading(subscriptionArn);
      const token = localStorage.getItem('token');

      const response = await fetch(`${NOTIFICATIONS_API}/notifications/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ subscriptionArn })
      });

      if (!response.ok) throw new Error('Error al cancelar suscripción');

      toast.success(`${name} desuscrito exitosamente`);
      await loadSubscriptions();
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast.error('Error al cancelar suscripción');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditAdmin = (admin) => {
    setEditingAdmin(admin);
    setEditForm({
      name: admin.name,
      email: admin.email,
      email_notification: admin.email_notification || admin.email
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      setActionLoading('edit');
      const token = localStorage.getItem('token');

      const response = await fetch(`${AUTH_API}/auth/users/${editingAdmin.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });

      if (!response.ok) throw new Error('Error al actualizar usuario');

      toast.success('Usuario actualizado exitosamente');
      setShowEditModal(false);
      setEditingAdmin(null);
      await loadSubscriptions();
    } catch (error) {
      console.error('Error updating admin:', error);
      toast.error('Error al actualizar usuario');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      confirmed: { bg: 'bg-green-100', text: 'text-green-800', label: '✓ Confirmado' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '⏳ Pendiente' },
      not_subscribed: { bg: 'bg-gray-100', text: 'text-gray-800', label: '✗ No suscrito' }
    };

    const badge = badges[status] || badges.not_subscribed;

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-2xl font-bold text-blue-900">{summary.total}</div>
          <div className="text-sm text-blue-700">Total Administradores</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="text-2xl font-bold text-green-900">{summary.confirmed}</div>
          <div className="text-sm text-green-700">Confirmados</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="text-2xl font-bold text-yellow-900">{summary.pending}</div>
          <div className="text-sm text-yellow-700">Pendientes</div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{summary.notSubscribed}</div>
          <div className="text-sm text-gray-700">Sin Suscribir</div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-blue-800">
              Notificaciones por Email (SNS Topic)
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              Los administradores suscritos recibirán emails <strong>solo cuando se registre un incidente CRÍTICO</strong>. 
              La invitación debe ser confirmada desde el email del administrador.
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de admins */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Administrador
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email (Login)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email (Notificaciones)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {admins.map((admin) => (
              <tr key={admin.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{admin.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-600">{admin.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-blue-600 font-medium">
                    {admin.email_notification || admin.email}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(admin.subscriptionStatus)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleEditAdmin(admin)}
                      className="text-indigo-600 hover:text-indigo-900"
                      title="Editar usuario"
                    >
                      ✏️ Editar
                    </button>
                    {admin.subscriptionStatus === 'not_subscribed' || admin.subscriptionStatus === 'pending' ? (
                      <button
                        onClick={() => handleSubscribe(admin)}
                        disabled={actionLoading === admin.email}
                        className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                      >
                        {actionLoading === admin.email ? 'Enviando...' : 
                         admin.subscriptionStatus === 'pending' ? 'Reenviar' : 'Suscribir'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUnsubscribe(admin.subscriptionArn, admin.name)}
                        disabled={actionLoading === admin.subscriptionArn}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        {actionLoading === admin.subscriptionArn ? 'Cancelando...' : 'Desuscribir'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {admins.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No hay administradores registrados
          </div>
        )}
      </div>

      {/* Botón refrescar */}
      <div className="flex justify-end">
        <button
          onClick={loadSubscriptions}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          🔄 Actualizar
        </button>
      </div>

      {/* Modal de edición */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Editar Administrador</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email (Login)
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email (Notificaciones)
                </label>
                <input
                  type="email"
                  value={editForm.email_notification}
                  onChange={(e) => setEditForm({ ...editForm, email_notification: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Email para recibir alertas"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingAdmin(null);
                }}
                disabled={actionLoading === 'edit'}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={actionLoading === 'edit'}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading === 'edit' ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
