const { createSubscription, dispatchEvent, getSubscriptions } = require('../models/integrationModel');

const getWebhooks = (req, res) => {
  res.json(getSubscriptions());
};

const createWebhook = (req, res) => {
  const { url, event } = req.body;
  if (!url || !event) {
    return res.status(400).json({ message: 'Webhook URL and event are required' });
  }

  const subscription = createSubscription({ url, event, provider: req.body.provider || 'custom' });
  res.status(201).json(subscription);
};

const dispatchIntegrationEvent = (req, res) => {
  const { event, payload } = req.body;
  if (!event) {
    return res.status(400).json({ message: 'Event name is required' });
  }

  const deliveries = dispatchEvent(event, payload || {});
  res.json({ event, deliveries });
};

module.exports = {
  getWebhooks,
  createWebhook,
  dispatchIntegrationEvent,
};
