const { Router } = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const settingController = require('../controllers/settingController');

const router = Router();

router.use(authenticate);
router.use(requireRole('admin'));

router.get('/', settingController.getSettings);
router.put('/', settingController.updateSettings);

module.exports = router;
