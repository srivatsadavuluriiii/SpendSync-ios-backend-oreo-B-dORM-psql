const Joi = require('joi');
const {
  objectIdSchema,
  userCommonFields,
  paginationSchema
} = require('../../../../shared/validations/common.validation');

/**
 * Password validation schema
 */
const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .message({
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
  });

/**
 * Validation schema for user registration
 */
const registerSchema = Joi.object({
  ...userCommonFields,
  password: passwordSchema.required(),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required()
    .messages({
      'any.only': 'Passwords do not match'
    })
});

/**
 * Validation schema for user login
 */
const loginSchema = Joi.object({
  email: userCommonFields.email,
  password: Joi.string().required()
});

/**
 * Validation schema for updating user profile
 */
const updateProfileSchema = Joi.object({
  name: userCommonFields.name,
  username: userCommonFields.username,
  avatar: userCommonFields.avatar,
  timezone: userCommonFields.timezone,
  language: userCommonFields.language,
  currentPassword: Joi.string().when('newPassword', {
    is: Joi.exist(),
    then: Joi.required(),
    otherwise: Joi.forbidden()
  }),
  newPassword: passwordSchema,
  confirmNewPassword: Joi.string().valid(Joi.ref('newPassword'))
    .when('newPassword', {
      is: Joi.exist(),
      then: Joi.required(),
      otherwise: Joi.forbidden()
    })
    .messages({
      'any.only': 'New passwords do not match'
    })
}).min(1); // At least one field must be provided for update

/**
 * Validation schema for updating user preferences
 */
const updatePreferencesSchema = Joi.object({
  defaultCurrency: Joi.string().length(3).uppercase(),
  settlementAlgorithm: Joi.string().valid('minCashFlow', 'greedy', 'friendPreference'),
  notifications: Joi.object({
    email: Joi.boolean(),
    push: Joi.boolean(),
    reminderFrequency: Joi.string().valid('never', 'low', 'medium', 'high'),
    settlementCreated: Joi.boolean(),
    settlementCompleted: Joi.boolean(),
    paymentReceived: Joi.boolean(),
    remindersBefore: Joi.number().integer().min(0).max(14)
  }),
  displaySettings: Joi.object({
    theme: Joi.string().valid('light', 'dark', 'system'),
    dateFormat: Joi.string().valid('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'),
    numberFormat: Joi.string().valid('thousand_comma', 'thousand_dot', 'thousand_space')
  }),
  privacySettings: Joi.object({
    shareSettlementHistory: Joi.boolean(),
    showRealName: Joi.boolean()
  })
}).min(1);

/**
 * Validation schema for password reset request
 */
const forgotPasswordSchema = Joi.object({
  email: userCommonFields.email
});

/**
 * Validation schema for password reset
 */
const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: passwordSchema.required(),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required()
    .messages({
      'any.only': 'Passwords do not match'
    })
});

/**
 * Validation schema for getting user by ID
 */
const getUserSchema = Joi.object({
  userId: objectIdSchema.required()
});

/**
 * Validation schema for listing users
 */
const listUsersSchema = Joi.object({
  ...paginationSchema,
  search: Joi.string().max(100),
  status: Joi.string().valid('active', 'inactive', 'all').default('all')
});

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  updatePreferencesSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  getUserSchema,
  listUsersSchema
}; 