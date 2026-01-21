const Joi = require('joi');

const loginSchema = Joi.object({
  email: Joi.string().email().max(254).required(),
  password: Joi.string().min(8).max(128).required(),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().min(10).optional(),
});

const transactionCreateSchema = Joi.object({
  description: Joi.string().min(1).max(200).required(),
  amount: Joi.number().positive().required(),
  type: Joi.number().valid(0, 1, 2).required(),
  categoryId: Joi.string().guid({ version: ['uuidv4'] }).required(),
  accountId: Joi.string().guid({ version: ['uuidv4'] }).required(),
  transactionDate: Joi.date().iso().optional(),
  status: Joi.number().integer().valid(0, 1, 2, 3).optional(),
});

const transactionUpdateSchema = Joi.object({
  description: Joi.string().min(1).max(200).optional(),
  amount: Joi.number().positive().optional(),
  type: Joi.number().valid(0, 1, 2).optional(),
  categoryId: Joi.string().guid({ version: ['uuidv4'] }).optional(),
  accountId: Joi.string().guid({ version: ['uuidv4'] }).optional(),
  transactionDate: Joi.date().iso().optional(),
  status: Joi.number().integer().valid(0, 1, 2, 3).optional(),
}).min(1);

const accountCreateSchema = Joi.object({
  name: Joi.string().min(1).max(120).required(),
  type: Joi.number().integer().min(0).max(5).default(0),
  accountNumber: Joi.string().max(50).allow('').optional(),
  currency: Joi.string().length(3).uppercase().default('BRL'),
  description: Joi.string().max(200).allow('').optional(),
});

const accountUpdateSchema = Joi.object({
  name: Joi.string().min(1).max(120).optional(),
  type: Joi.number().integer().min(0).max(5).optional(),
  accountNumber: Joi.string().max(50).allow('').optional(),
  currency: Joi.string().length(3).uppercase().optional(),
  description: Joi.string().max(200).allow('').optional(),
  isActive: Joi.boolean().optional(),
}).min(1);

const categoryCreateSchema = Joi.object({
  name: Joi.string().min(1).max(120).required(),
  type: Joi.number().valid(0, 1).default(1),
  description: Joi.string().max(200).allow('').optional(),
  color: Joi.string().pattern(/^#([0-9a-fA-F]{6})$/).default('#000000'),
  icon: Joi.string().max(50).allow(null, '').optional(),
  parentCategoryId: Joi.string().guid({ version: ['uuidv4'] }).allow(null).optional(),
});

const categoryUpdateSchema = Joi.object({
  name: Joi.string().min(1).max(120).optional(),
  type: Joi.number().valid(0, 1).optional(),
  description: Joi.string().max(200).allow('').optional(),
  color: Joi.string().pattern(/^#([0-9a-fA-F]{6})$/).optional(),
  icon: Joi.string().max(50).allow(null, '').optional(),
  parentCategoryId: Joi.string().guid({ version: ['uuidv4'] }).allow(null).optional(),
  isActive: Joi.boolean().optional(),
}).min(1);

const budgetCreateSchema = Joi.object({
  name: Joi.string().min(1).max(120).required(),
  description: Joi.string().max(200).allow('').optional(),
  allocated: Joi.number().positive().required(),
  categoryId: Joi.string().guid({ version: ['uuidv4'] }).allow(null).optional(),
  period: Joi.string().valid('weekly', 'monthly', 'yearly').default('monthly'),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  isActive: Joi.boolean().default(true),
});

const budgetUpdateSchema = Joi.object({
  name: Joi.string().min(1).max(120).optional(),
  description: Joi.string().max(200).allow('').optional(),
  allocated: Joi.number().positive().optional(),
  categoryId: Joi.string().guid({ version: ['uuidv4'] }).allow(null).optional(),
  period: Joi.string().valid('weekly', 'monthly', 'yearly').optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  isActive: Joi.boolean().optional(),
}).min(1);

function validate(schema, payload) {
  const result = schema.validate(payload, { abortEarly: false, stripUnknown: true });
  if (result.error) {
    return { error: result.error.details.map((d) => d.message).join(', ') };
  }
  return { value: result.value };
}

module.exports = {
  loginSchema,
  refreshSchema,
  transactionCreateSchema,
  transactionUpdateSchema,
  accountCreateSchema,
  accountUpdateSchema,
  categoryCreateSchema,
  categoryUpdateSchema,
  budgetCreateSchema,
  budgetUpdateSchema,
  validate,
};
