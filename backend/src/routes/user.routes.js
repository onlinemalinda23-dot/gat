const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const userController = require('../controllers/userController');

const router = Router();

// Configure this route carefully — employees are registered via admin,
// or through a public invite flow. Protected for now.
router.use(authenticate, authorize('admin'));

router.get('/', userController.list);
router.get('/:id', userController.getById);
router.put('/:id', userController.update);
router.delete('/:id', userController.remove);

module.exports = router;