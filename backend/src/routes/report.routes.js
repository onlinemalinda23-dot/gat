const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const reportController = require('../controllers/reportController');

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/daily', reportController.daily);
router.get('/monthly', reportController.monthly);

module.exports = router;