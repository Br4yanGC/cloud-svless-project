import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { incidentTypes, locations, urgencyLevels } from '../mockData';
import { apiRequest, API_CONFIG } from '../config';

function CreateIncident({ currentUser }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    type: '',
    location: '',
    description: '',
    urgency: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [trackingCode, setTrackingCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Llamada real a la API
      const response = await apiRequest(API_CONFIG.ENDPOINTS.INCIDENTS, {
        method: 'POST',
        body: JSON.stringify(formData)
      }, true); // true = usar incidents API

      setTrackingCode(response.incident.trackingCode);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Error al crear el incidente');
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      type: '',
      location: '',
      description: '',
      urgency: ''
    });
    setSubmitted(false);
    setTrackingCode('');
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Incidente Reportado!</h2>
            <p className="text-gray-600 mb-6">
              Tu reporte ha sido registrado exitosamente. El personal administrativo lo revisará pronto.
            </p>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-2">Código de Seguimiento:</p>
            <p className="text-2xl font-bold text-utec-blue">{trackingCode}</p>
            <p className="text-xs text-gray-500 mt-2">Puedes revisar el estado en "Mis Incidentes"</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/student/dashboard')}
              className="flex-1 bg-utec-blue text-white py-3 rounded-lg hover:bg-blue-800 transition-colors font-medium"
            >
              Ver Mis Incidentes
            </button>
            <button
              onClick={handleReset}
              className="flex-1 bg-utec-orange text-white py-3 rounded-lg hover:bg-orange-600 transition-colors font-medium"
            >
              Reportar Otro
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header */}
      <header className="bg-utec-blue text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Reportar Incidente</h1>
              <p className="text-blue-200 text-sm">{currentUser.name}</p>
            </div>
            <button
              onClick={() => navigate('/student/dashboard')}
              className="flex items-center gap-2 bg-white text-utec-blue px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors font-medium text-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver al Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Info Card */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-2">¿Identificaste un problema?</h2>
            <p className="text-gray-600">
              Completa el formulario con la información detallada del incidente. Esto ayudará al personal administrativo a resolverlo más rápido.
            </p>
          </div>

          {/* Form */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            {/* Error Message */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Tipo de Incidente */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tipo de Incidente *
                </label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-utec-blue focus:border-transparent transition-all"
                >
                  <option value="">Selecciona un tipo</option>
                  {incidentTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Ubicación */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Ubicación *
                </label>
                <select
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-utec-blue focus:border-transparent transition-all"
                >
                  <option value="">Selecciona una ubicación</option>
                  {locations.map((location) => (
                    <option key={location} value={location}>{location}</option>
                  ))}
                </select>
              </div>

              {/* Nivel de Urgencia */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nivel de Urgencia *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {urgencyLevels.map((level) => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, urgency: level.value })}
                      className={`py-3 px-4 rounded-lg font-medium transition-all ${
                        formData.urgency === level.value
                          ? level.color + ' ring-2 ring-offset-2 ring-blue-500'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Descripción del Problema *
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="5"
                  placeholder="Describe detalladamente el incidente. Incluye información relevante como: ¿Qué sucedió? ¿Cuándo? ¿Afecta a muchas personas?"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-utec-blue focus:border-transparent transition-all resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.description.length}/500 caracteres (mínimo 20)
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={formData.description.length < 20 || loading}
                className="w-full bg-utec-orange text-white py-4 rounded-lg hover:bg-orange-600 transition-colors font-bold text-lg disabled:bg-gray-300 disabled:cursor-not-allowed shadow-lg"
              >
                {loading ? 'Enviando...' : 'Enviar Reporte'}
              </button>
            </form>
          </div>

          {/* Footer Note */}
          <p className="text-center text-gray-600 text-sm mt-6">
            Los reportes serán revisados por el personal administrativo. Recibirás actualizaciones sobre el estado de tu incidente.
          </p>
        </div>
      </div>
    </div>
  );
}

export default CreateIncident;