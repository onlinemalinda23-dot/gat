const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, invoiceRules } = require('../validators');
const invoiceController = require('../controllers/invoiceController');

const router = Router();

router.use(authenticate);

router.get('/', invoiceController.list);
router.get('/:id', invoiceController.getById);
router.post('/', invoiceRules.create, validate, invoiceController.create);
router.post('/:id/payments', invoiceRules.payment, validate, invoiceController.addPayment);
router.delete('/:id', authorize('admin'), invoiceController.remove);

module.exports = router;