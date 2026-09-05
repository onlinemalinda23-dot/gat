const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const {
  validate, registerRules, loginRules, refreshRules, changePasswordRules,
} = require('../validators');
const authController = require('../controllers/authController');

const router = Router();

router.post('/register', registerRules, validate, authController.register);
router.post('/login', loginRules, validate, authController.login);
router.post('/refresh', refreshRules, validate, authController.refreshToken);

router.use(authenticate);

router.get('/profile', authController.getProfile);
router.put('/profile', authController.updateProfile);
router.put('/change-password', changePasswordRules, validate, authController.changePassword);

module.exports = router;