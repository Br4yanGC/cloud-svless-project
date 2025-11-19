const NOTIFICATIONS_API_URL = 'https://9m8tqise7g.execute-api.us-east-1.amazonaws.com/dev';

export const notificationsAPI = {
  /**
   * Obtener notificaciones del usuario autenticado
   */
  async getNotifications(token) {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user || !user.id) {
        throw new Error('Usuario no autenticado');
      }

      const response = await fetch(`${NOTIFICATIONS_API_URL}/notifications/user/${user.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener notificaciones');
      }

      return await response.json();
    } catch (error) {
      console.error('Error en getNotifications:', error);
      throw error;
    }
  },

  /**
   * Marcar notificación como leída
   */
  async markAsRead(notificationId, token) {
    try {
      const response = await fetch(`${NOTIFICATIONS_API_URL}/notifications/read/${notificationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al marcar notificación como leída');
      }

      return await response.json();
    } catch (error) {
      console.error('Error en markAsRead:', error);
      throw error;
    }
  },

  /**
   * Crear notificación (para testing)
   */
  async createNotification(userId, title, message, type = 'info', metadata = {}, token) {
    try {
      const response = await fetch(`${NOTIFICATIONS_API_URL}/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          title,
          message,
          type,
          metadata
        })
      });

      if (!response.ok) {
        throw new Error('Error al crear notificación');
      }

      return await response.json();
    } catch (error) {
      console.error('Error en createNotification:', error);
      throw error;
    }
  }
};
