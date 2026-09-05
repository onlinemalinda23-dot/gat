const { Router } = require('express');
const appController = require('../controllers/appController');

const router = Router();

// Public endpoint - the mobile app queries this before login
router.get('/version', appController.getVersion);

module.exports = router;