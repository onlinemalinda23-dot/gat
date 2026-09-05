const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, supplierRules } = require('../validators');
const supplierController = require('../controllers/supplierController');

const router = Router();

router.use(authenticate);

router.get('/', supplierController.listSuppliers);
router.get('/purchases', supplierController.listPurchases);
router.get('/purchases/:id', supplierController.getPurchaseById);
router.get('/:id', supplierController.getSupplierById);
router.post('/', authorize('admin', 'store_keeper'), supplierRules.create, validate, supplierController.createSupplier);
router.put('/:id', authorize('admin', 'store_keeper'), supplierController.updateSupplier);
router.delete('/:id', authorize('admin'), supplierController.removeSupplier);
router.post('/purchases', authorize('admin', 'store_keeper'), supplierRules.purchase, validate, supplierController.createPurchase);

module.exports = router;