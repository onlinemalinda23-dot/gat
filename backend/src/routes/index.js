const { Router } = require('express');
const authRoutes = require('./auth.routes');
const customerRoutes = require('./customer.routes');
const vehicleRoutes = require('./vehicle.routes');
const jobCardRoutes = require('./jobCard.routes');
const partRoutes = require('./part.routes');
const supplierRoutes = require('./supplier.routes');
const invoiceRoutes = require('./invoice.routes');
const reportRoutes = require('./report.routes');
const userRoutes = require('./user.routes');
const notificationRoutes = require('./notification.routes');
const estimateRoutes = require('./estimate.routes');
const appRoutes = require('./app.routes');
const appointmentRoutes = require('./appointment.routes');
const settingRoutes = require('./setting.routes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/customers', customerRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/job-cards', jobCardRoutes);
router.use('/parts', partRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/reports', reportRoutes);
router.use('/users', userRoutes);
router.use('/notifications', notificationRoutes);
router.use('/estimates', estimateRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/app', appRoutes);
router.use('/settings', settingRoutes);

module.exports = router;