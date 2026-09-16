const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/integrations.json');

const getSubscriptions = () => {
  if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
};

const saveSubscriptions = (subscriptions) => {
  fs.writeFileSync(dataPath, JSON.stringify(subscriptions, null, 2));
};

const createSubscription = (payload) => {
  const subscriptions = getSubscriptions();
  const newSubscription = {
    id: Date.now().toString(),
    ...payload,
    createdAt: new Date().toISOString(),
  };
  subscriptions.push(newSubscription);
  saveSubscriptions(subscriptions);
  return newSubscription;
};

const dispatchEvent = (eventName, payload) => {
  const subscriptions = getSubscriptions();
  return subscriptions
    .filter((subscription) => subscription.event === eventName)
    .map((subscription) => ({
      ...subscription,
      deliveredAt: new Date().toISOString(),
      payload,
    }));
};

module.exports = {
  getSubscriptions,
  saveSubscriptions,
  createSubscription,
  dispatchEvent,
};
