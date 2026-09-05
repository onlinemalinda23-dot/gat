const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, partRules } = require('../validators');
const partController = require('../controllers/partController');

const router = Router();

router.use(authenticate);

router.get('/', partController.list);
router.get('/low-stock', partController.lowStock);
router.get('/:id', partController.getById);
router.post('/', authorize('admin', 'store_keeper'), partRules.create, validate, partController.create);
router.put('/:id', authorize('admin', 'store_keeper'), partController.update);
router.post('/:id/add-stock', authorize('admin', 'store_keeper'), partRules.addStock, validate, partController.addStock);
router.post('/:id/remove-stock', authorize('admin', 'store_keeper'), partRules.removeStock, validate, partController.removeStock);
router.delete('/:id', authorize('admin'), partController.remove);

module.exports = router;