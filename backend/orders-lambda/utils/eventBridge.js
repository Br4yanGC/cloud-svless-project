const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');

const eventBridge = new EventBridgeClient({ region: process.env.AWS_REGION || 'us-east-1' });
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME || 'restaurant-events-dev';

/**
 * Emit event to EventBridge
 */
async function emitEvent(detailType, detail) {
  try {
    const command = new PutEventsCommand({
      Entries: [{
        Source: 'restaurant.orders',
        DetailType: detailType,
        Detail: JSON.stringify(detail),
        EventBusName: EVENT_BUS_NAME
      }]
    });

    const result = await eventBridge.send(command);
    console.log(`Event emitted: ${detailType}`, result);
    return result;
  } catch (error) {
    console.error(`Error emitting event ${detailType}:`, error);
    // No lanzar error para que no falle la operación principal
    return null;
  }
}

/**
 * Emit order.created event
 */
async function emitOrderCreated(order) {
  return emitEvent('order.created', {
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerId: order.customerId,
    customerName: order.customerName,
    total: order.total,
    status: order.status,
    timestamp: order.createdAt
  });
}

/**
 * Emit order.statusChanged event
 */
async function emitOrderStatusChanged(order, oldStatus, newStatus) {
  return emitEvent('order.statusChanged', {
    orderId: order.id,
    orderNumber: order.orderNumber,
    oldStatus,
    newStatus,
    timestamp: new Date().toISOString()
  });
}

/**
 * Emit order.ready event (empacado)
 */
async function emitOrderReady(order) {
  return emitEvent('order.ready', {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    timestamp: new Date().toISOString()
  });
}

/**
 * Emit driver.assigned event
 */
async function emitDriverAssigned(order, driver) {
  return emitEvent('driver.assigned', {
    orderId: order.id,
    orderNumber: order.orderNumber,
    driverId: driver.userId,
    driverName: driver.name,
    timestamp: new Date().toISOString()
  });
}

/**
 * Emit order.delivered event
 */
async function emitOrderDelivered(order) {
  return emitEvent('order.delivered', {
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerId: order.customerId,
    customerName: order.customerName,
    timestamp: order.deliveredAt || new Date().toISOString()
  });
}

module.exports = {
  emitEvent,
  emitOrderCreated,
  emitOrderStatusChanged,
  emitOrderReady,
  emitDriverAssigned,
  emitOrderDelivered
};
