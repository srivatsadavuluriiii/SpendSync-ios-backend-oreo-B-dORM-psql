const express = require('express');
const validate = require('../../../../shared/middleware/validate.middleware');
const {
  createGroupSchema,
  updateGroupSchema,
  addMembersSchema,
  removeMembersSchema,
  updateMemberRolesSchema,
  getGroupSchema,
  listGroupsSchema,
  groupStatsSchema,
  toggleArchiveSchema
} = require('../validations/group.validation');
const groupController = require('../controllers/group.controller');
const auth = require('../../../../shared/middleware/auth.middleware');

const router = express.Router();

/**
 * @route   POST /api/groups
 * @desc    Create a new group
 * @access  Private
 */
router.post(
  '/',
  auth(),
  validate(createGroupSchema),
  groupController.createGroup
);

/**
 * @route   PUT /api/groups/:groupId
 * @desc    Update group
 * @access  Private
 */
router.put(
  '/:groupId',
  auth(),
  validate(updateGroupSchema),
  groupController.updateGroup
);

/**
 * @route   POST /api/groups/:groupId/members
 * @desc    Add members to group
 * @access  Private
 */
router.post(
  '/:groupId/members',
  auth(),
  validate(addMembersSchema),
  groupController.addMembers
);

/**
 * @route   DELETE /api/groups/:groupId/members
 * @desc    Remove members from group
 * @access  Private
 */
router.delete(
  '/:groupId/members',
  auth(),
  validate(removeMembersSchema),
  groupController.removeMembers
);

/**
 * @route   PUT /api/groups/:groupId/members/roles
 * @desc    Update member roles
 * @access  Private
 */
router.put(
  '/:groupId/members/roles',
  auth(),
  validate(updateMemberRolesSchema),
  groupController.updateMemberRoles
);

/**
 * @route   GET /api/groups/:groupId
 * @desc    Get group by ID
 * @access  Private
 */
router.get(
  '/:groupId',
  auth(),
  validate(getGroupSchema),
  groupController.getGroupById
);

/**
 * @route   GET /api/groups
 * @desc    List groups with filters
 * @access  Private
 */
router.get(
  '/',
  auth(),
  validate(listGroupsSchema),
  groupController.listGroups
);

/**
 * @route   GET /api/groups/:groupId/stats
 * @desc    Get group statistics
 * @access  Private
 */
router.get(
  '/:groupId/stats',
  auth(),
  validate(groupStatsSchema),
  groupController.getGroupStats
);

/**
 * @route   PUT /api/groups/:groupId/archive
 * @desc    Archive/unarchive group
 * @access  Private
 */
router.put(
  '/:groupId/archive',
  auth(),
  validate(toggleArchiveSchema),
  groupController.toggleArchive
);

module.exports = router; 