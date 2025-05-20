const Joi = require('joi');
const {
  objectIdSchema,
  groupCommonFields,
  paginationSchema
} = require('../../../../shared/validations/common.validation');

/**
 * Validation schema for creating a group
 */
const createGroupSchema = Joi.object({
  ...groupCommonFields,
  members: Joi.array().items(Joi.object({
    userId: objectIdSchema.required(),
    role: Joi.string().valid('admin', 'member').default('member')
  })).unique('userId').min(1).required()
});

/**
 * Validation schema for updating a group
 */
const updateGroupSchema = Joi.object({
  ...groupCommonFields,
  members: Joi.array().items(Joi.object({
    userId: objectIdSchema.required(),
    role: Joi.string().valid('admin', 'member').default('member')
  })).unique('userId').min(1)
}).min(1); // At least one field must be provided for update

/**
 * Validation schema for adding members to a group
 */
const addMembersSchema = Joi.object({
  groupId: objectIdSchema.required(),
  members: Joi.array().items(Joi.object({
    userId: objectIdSchema.required(),
    role: Joi.string().valid('admin', 'member').default('member')
  })).unique('userId').min(1).required()
});

/**
 * Validation schema for removing members from a group
 */
const removeMembersSchema = Joi.object({
  groupId: objectIdSchema.required(),
  memberIds: Joi.array().items(objectIdSchema).unique().min(1).required()
});

/**
 * Validation schema for updating member roles
 */
const updateMemberRolesSchema = Joi.object({
  groupId: objectIdSchema.required(),
  updates: Joi.array().items(Joi.object({
    userId: objectIdSchema.required(),
    role: Joi.string().valid('admin', 'member').required()
  })).unique('userId').min(1).required()
});

/**
 * Validation schema for getting group by ID
 */
const getGroupSchema = Joi.object({
  groupId: objectIdSchema.required()
});

/**
 * Validation schema for listing groups
 */
const listGroupsSchema = Joi.object({
  ...paginationSchema,
  userId: objectIdSchema,
  search: Joi.string().max(100),
  status: Joi.string().valid('active', 'archived', 'all').default('active'),
  memberCount: Joi.object({
    min: Joi.number().integer().min(1),
    max: Joi.number().integer().min(Joi.ref('min'))
  }),
  createdBetween: Joi.object({
    start: Joi.date().iso(),
    end: Joi.date().iso().min(Joi.ref('start'))
  })
});

/**
 * Validation schema for group statistics
 */
const groupStatsSchema = Joi.object({
  groupId: objectIdSchema.required(),
  period: Joi.string().valid('day', 'week', 'month', 'year').default('month'),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso().min(Joi.ref('startDate'))
});

/**
 * Validation schema for archiving/unarchiving a group
 */
const toggleArchiveSchema = Joi.object({
  groupId: objectIdSchema.required(),
  archive: Joi.boolean().required()
});

module.exports = {
  createGroupSchema,
  updateGroupSchema,
  addMembersSchema,
  removeMembersSchema,
  updateMemberRolesSchema,
  getGroupSchema,
  listGroupsSchema,
  groupStatsSchema,
  toggleArchiveSchema
}; 