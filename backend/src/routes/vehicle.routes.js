const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, vehicleRules } = require('../validators');
const vehicleController = require('../controllers/vehicleController');

const router = Router();

router.use(authenticate);

router.get('/', vehicleController.list);
router.get('/number/:number', vehicleController.getByNumber);
router.get('/model/:brand/:model/history', vehicleController.modelPartHistory);
router.get('/:id', vehicleController.getById);
router.post('/', vehicleRules.create, validate, vehicleController.create);
router.put('/:id', vehicleController.update);
router.delete('/:id', authorize('admin'), vehicleController.remove);

module.exports = router;