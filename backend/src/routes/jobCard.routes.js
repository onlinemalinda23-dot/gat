const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, jobCardRules } = require('../validators');
const jobCardController = require('../controllers/jobCardController');

const router = Router();

router.use(authenticate);

router.get('/', jobCardController.list);
router.get('/:id', jobCardController.getById);
router.post('/', jobCardRules.create, validate, jobCardController.create);
router.put('/:id/status', jobCardRules.status, validate, jobCardController.updateStatus);
router.put('/:id', jobCardController.updateDetails);
router.post('/:id/notes', jobCardRules.addNote, validate, jobCardController.addNote);
router.post('/:id/parts', jobCardRules.addPart, validate, jobCardController.addPart);
router.post('/:id/labour', jobCardRules.addLabour, validate, jobCardController.addLabour);
router.delete('/:id', authorize('admin'), jobCardController.remove);

module.exports = router;