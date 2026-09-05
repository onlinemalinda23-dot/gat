const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

const router = Router();

router.use(authenticate);

router.get('/', notificationController.list);

module.exports = router;