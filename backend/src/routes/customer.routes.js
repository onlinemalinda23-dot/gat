const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, customerRules } = require('../validators');
const customerController = require('../controllers/customerController');

const router = Router();

router.use(authenticate);

router.get('/', customerController.list);
router.get('/:id', customerController.getById);
router.post('/', customerRules.create, validate, customerController.create);
router.put('/:id', customerRules.update, validate, customerController.update);
router.delete('/:id', authorize('admin'), customerController.remove);

module.exports = router;