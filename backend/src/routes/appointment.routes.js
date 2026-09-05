const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const appointmentController = require('../controllers/appointmentController');

const router = Router();

router.use(authenticate);

router.get('/', appointmentController.list);
router.get('/:id', appointmentController.getById);
router.post('/', appointmentController.create);
router.put('/:id/status', appointmentController.updateStatus);
router.put('/:id', appointmentController.update);
router.delete('/:id', authorize('admin'), appointmentController.remove);

module.exports = router;
