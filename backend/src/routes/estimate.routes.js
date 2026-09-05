const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { validate, estimateRules } = require('../validators');
const estimateController = require('../controllers/estimateController');

const router = Router();

router.use(authenticate);

router.get('/', estimateController.list);
router.get('/:id', estimateController.getById);
router.post('/', estimateRules.create, validate, estimateController.create);
router.put('/:id', estimateRules.update, validate, estimateController.update);
router.delete('/:id', estimateController.remove);

module.exports = router;