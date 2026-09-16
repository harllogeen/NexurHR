const express = require('express');
const router = express.Router();
const integrationController = require('../controllers/integrationController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, integrationController.getWebhooks);
router.get('/webhooks', verifyToken, integrationController.getWebhooks);
router.post('/', verifyToken, integrationController.createWebhook);
router.post('/webhooks', verifyToken, integrationController.createWebhook);
router.post('/dispatch', verifyToken, integrationController.dispatchIntegrationEvent);
router.post('/events', verifyToken, integrationController.dispatchIntegrationEvent);

module.exports = router;

module.exports = router;
