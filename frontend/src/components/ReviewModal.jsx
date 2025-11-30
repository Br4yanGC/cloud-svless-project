import React, { useState } from 'react';
import { Star, X, AlertCircle } from 'lucide-react';

const ReviewModal = ({ order, onClose, onSubmit }) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [hasComplaint, setHasComplaint] = useState(false);
  const [complaintText, setComplaintText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      alert('Por favor selecciona una calificación');
      return;
    }

    setSubmitting(true);
    
    try {
      await onSubmit({
        rating,
        comment,
        hasComplaint,
        complaintText: hasComplaint ? complaintText : null
      });
      onClose();
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Error al enviar la calificación. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-red-600 text-white p-6 rounded-t-2xl relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:bg-red-700 rounded-full p-1 transition-colors"
          >
            <X size={24} />
          </button>
          <h2 className="text-2xl font-bold">Califica tu Pedido</h2>
          <p className="text-red-100 mt-1">Pedido #{order.id.substring(0, 8)}</p>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Rating Stars */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              ¿Cómo fue tu experiencia?
            </label>
            <div className="flex items-center justify-center space-x-2 py-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    size={40}
                    className={`${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    } transition-colors`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-center text-gray-600 mt-2">
                {rating === 5 && '¡Excelente! 🎉'}
                {rating === 4 && 'Muy bueno 👍'}
                {rating === 3 && 'Bueno 😊'}
                {rating === 2 && 'Regular 😐'}
                {rating === 1 && 'Malo 😞'}
              </p>
            )}
          </div>

          {/* Comment */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Comentarios (opcional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Cuéntanos sobre tu experiencia..."
              rows="4"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent resize-none"
            />
          </div>

          {/* Complaint Option */}
          <div className="mb-6">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hasComplaint}
                onChange={(e) => setHasComplaint(e.target.checked)}
                className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-600"
              />
              <span className="text-sm font-semibold text-gray-700 flex items-center">
                <AlertCircle size={18} className="mr-2 text-orange-600" />
                Tengo un reclamo
              </span>
            </label>
          </div>

          {/* Complaint Text */}
          {hasComplaint && (
            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Describe tu reclamo
              </label>
              <textarea
                value={complaintText}
                onChange={(e) => setComplaintText(e.target.value)}
                placeholder="Por favor, detalla tu reclamo para que podamos ayudarte..."
                rows="4"
                required={hasComplaint}
                className="w-full border border-orange-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-600 focus:border-transparent resize-none"
              />
              <p className="text-xs text-orange-700 mt-2">
                Nuestro equipo revisará tu reclamo y se pondrá en contacto contigo.
              </p>
            </div>
          )}

          {/* Order Summary */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-semibold text-gray-700 mb-2">Resumen del Pedido:</p>
            <div className="space-y-1 text-sm text-gray-600">
              {order.items?.map((item, idx) => (
                <div key={idx}>
                  {item.quantity}x {item.productName}
                </div>
              ))}
              <div className="pt-2 mt-2 border-t border-gray-300 font-semibold text-gray-900">
                Total: S/ {order.total?.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || rating === 0}
            className={`w-full py-4 rounded-lg font-bold text-lg transition-colors ${
              submitting || rating === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            {submitting ? 'Enviando...' : 'Enviar Calificación'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReviewModal;
