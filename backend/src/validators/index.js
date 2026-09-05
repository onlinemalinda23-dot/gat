const { body, param, query, validationResult } = require('express-validator');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

const registerRules = [
  body('full_name').notEmpty().withMessage('Full name is required').isLength({ max: 100 }),
  body('email').notEmpty().isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('phone').optional().isLength({ max: 20 }),
  body('role').optional().isIn(['admin', 'mechanic', 'store_keeper']).withMessage('Invalid role'),
];

const loginRules = [
  body('email').notEmpty().isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const refreshRules = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
];

const changePasswordRules = [
  body('oldPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').notEmpty().isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
];

const customerRules = {
  create: [
    body('name').notEmpty().withMessage('Name is required').isLength({ max: 150 }),
    body('phone').notEmpty().withMessage('Phone is required').isLength({ max: 20 }),
    body('address').optional({ checkFalsy: true }),
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('Valid email is required'),
  ],
  update: [
    body('name').optional({ checkFalsy: true }).isLength({ max: 150 }),
    body('phone').optional({ checkFalsy: true }).isLength({ max: 20 }),
    body('address').optional({ checkFalsy: true }),
    body('email').optional({ checkFalsy: true }).isEmail(),
  ],
};

const vehicleRules = {
  create: [
    body('customer_id').notEmpty().isUUID().withMessage('Customer is required'),
    body('vehicle_number').notEmpty().withMessage('Vehicle number is required').isLength({ max: 50 }),
    body('brand').notEmpty().withMessage('Brand is required').isLength({ max: 100 }),
    body('model').notEmpty().withMessage('Model is required').isLength({ max: 100 }),
    body('year').optional({ checkFalsy: true }).isInt({ min: 1900, max: 2100 }),
    body('mileage').optional({ checkFalsy: true }).isInt({ min: 0 }),
    body('fuel_type').optional({ checkFalsy: true }).isIn(['petrol', 'diesel', 'electric', 'hybrid', 'lpg', 'cng']),
  ],
};

const jobCardRules = {
  create: [
    body('customer_id').notEmpty().isUUID(),
    body('vehicle_id').notEmpty().isUUID(),
    body('mechanic_id').optional({ checkFalsy: true }).isUUID(),
    body('complaint').notEmpty().withMessage('Complaint is required'),
    body('status').optional({ checkFalsy: true }).isIn(['received', 'checking', 'waiting_parts', 'repairing', 'completed', 'delivered']),
    body('mileage_in').optional({ checkFalsy: true }).isInt({ min: 0 }),
    body('fuel_level').optional({ checkFalsy: true }).isString().isLength({ max: 20 }),
    body('customer_belongings').optional({ checkFalsy: true }).isString(),
    body('received_at').optional({ checkFalsy: true }).isISO8601(),
  ],
  status: [
    body('status').notEmpty().isIn(['received', 'checking', 'waiting_parts', 'repairing', 'completed', 'delivered'])
      .withMessage('Invalid status'),
  ],
  addPart: [
    body('part_id').notEmpty().isUUID(),
    body('quantity').notEmpty().isInt({ min: 1 }).withMessage('Quantity must be positive'),
  ],
  addLabour: [
    body('description').notEmpty().isLength({ max: 200 }),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be non-negative'),
  ],
  addNote: [body('note').notEmpty().withMessage('Note is required')],
};

const partRules = {
  create: [
    body('name').notEmpty().withMessage('Part name is required').isLength({ max: 200 }),
    body('part_number').notEmpty().withMessage('Part number is required').isLength({ max: 100 }),
    body('purchase_price').optional({ checkFalsy: true }).isFloat({ min: 0 }),
    body('selling_price').optional({ checkFalsy: true }).isFloat({ min: 0 }),
    body('quantity').optional({ checkFalsy: true }).isInt({ min: 0 }),
    body('warranty_months').optional({ checkFalsy: true }).isInt({ min: 0 }),
  ],
  addStock: [body('quantity').isInt({ min: 1 }).withMessage('Quantity must be positive')],
  removeStock: [body('quantity').isInt({ min: 1 }).withMessage('Quantity must be positive')],
};

const supplierRules = {
  create: [
    body('name').notEmpty().withMessage('Supplier name is required').isLength({ max: 150 }),
  ],
  purchase: [
    body('supplier_id').notEmpty().isUUID(),
    body('items').isArray({ min: 1 }).withMessage('At least one item required'),
  ],
};

const invoiceRules = {
  create: [
    body('job_card_id').notEmpty().isUUID(),
    body('discount').optional({ checkFalsy: true }).isFloat({ min: 0 }),
    body('tax').optional({ checkFalsy: true }).isFloat({ min: 0 }),
    body('payment_method').optional({ checkFalsy: true }).isIn(['cash', 'card', 'bank_transfer', 'credit']),
  ],
  payment: [
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
    body('method').notEmpty().isIn(['cash', 'card', 'bank_transfer', 'credit']).withMessage('Invalid payment method'),
  ],
};

const estimateRules = {
  create: [
    body('job_card_id').notEmpty().isUUID().withMessage('Job card is required'),
    body('discount').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('Discount must be non-negative'),
    body('valid_until').optional({ checkFalsy: true }).isISO8601().withMessage('Invalid valid-until date'),
  ],
  update: [
    body('status').optional({ checkFalsy: true }).isIn(['draft', 'pending', 'approved', 'rejected', 'converted'])
      .withMessage('Invalid estimate status'),
    body('discount').optional({ checkFalsy: true }).isFloat({ min: 0 }),
  ],
};

module.exports = {
  validate,
  registerRules,
  loginRules,
  refreshRules,
  changePasswordRules,
  customerRules,
  vehicleRules,
  jobCardRules,
  partRules,
  supplierRules,
  invoiceRules,
  estimateRules,
};