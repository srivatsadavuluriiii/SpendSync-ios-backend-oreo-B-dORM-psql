/**
 * User Controller
 * 
 * Handles HTTP requests related to users, including authentication,
 * profile management, and friend connections.
 */

const { BadRequestError, NotFoundError, ConflictError, UnauthorizedError } = require('../../../../shared/errors');
const userService = require('../services/user.service');
const authService = require('../services/auth.service');
const friendService = require('../services/friend.service');

/**
 * Register a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function register(req, res, next) {
  try {
    const { email, password, name, phoneNumber } = req.body;
    
    // Validate required fields
    if (!email || !password || !name) {
      throw new BadRequestError('Missing required fields');
    }
    
    // Check if email is already in use
    const existingUser = await userService.getUserByEmail(email);
    if (existingUser) {
      throw new ConflictError('Email is already in use');
    }
    
    // Create user data
    const userData = {
      email,
      name,
      phoneNumber,
      preferences: {
        currency: 'USD',
        language: 'en',
        notifications: {
          email: true,
          push: true,
          sms: phoneNumber ? true : false
        }
      }
    };
    
    // Create the user
    const user = await userService.createUser(userData, password);
    
    // Generate tokens
    const { accessToken, refreshToken } = authService.generateTokens(user);
    
    // Store refresh token
    await authService.saveRefreshToken(user.id, refreshToken);
    
    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          preferences: user.preferences
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Login a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      throw new BadRequestError('Missing email or password');
    }
    
    // Authenticate user
    const user = await authService.authenticateUser(email, password);
    
    // Generate tokens
    const { accessToken, refreshToken } = authService.generateTokens(user);
    
    // Store refresh token
    await authService.saveRefreshToken(user.id, refreshToken);
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          preferences: user.preferences
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Refresh access token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function refreshToken(req, res, next) {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      throw new BadRequestError('Missing refresh token');
    }
    
    // Verify refresh token
    const { userId, tokenId } = await authService.verifyRefreshToken(refreshToken);
    
    // Get user
    const user = await userService.getUserById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    // Generate new tokens
    const tokens = authService.generateTokens(user);
    
    // Update refresh token
    await authService.updateRefreshToken(tokenId, tokens.refreshToken);
    
    res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }
    });
  } catch (error) {
    // If error is related to token validation, force re-login
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return next(new UnauthorizedError('Invalid or expired refresh token'));
    }
    next(error);
  }
}

/**
 * Logout a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      // Invalidate refresh token
      await authService.invalidateRefreshToken(refreshToken);
    }
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get current user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function getProfile(req, res, next) {
  try {
    const userId = req.user.id;
    
    const user = await userService.getUserById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        profileImage: user.profileImage,
        phoneNumber: user.phoneNumber,
        preferences: user.preferences,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function updateProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const updateData = req.body;
    
    // Prevent updating sensitive fields
    delete updateData.password;
    delete updateData.email;
    delete updateData.id;
    
    // Update user
    const updatedUser = await userService.updateUser(userId, updateData);
    
    res.json({
      success: true,
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        profileImage: updatedUser.profileImage,
        phoneNumber: updatedUser.phoneNumber,
        preferences: updatedUser.preferences,
        updatedAt: updatedUser.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Change password
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function changePassword(req, res, next) {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      throw new BadRequestError('Missing current or new password');
    }
    
    // Verify current password
    const user = await userService.getUserById(userId);
    const isValid = await authService.verifyPassword(currentPassword, user.passwordHash);
    
    if (!isValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }
    
    // Update password
    await userService.updatePassword(userId, newPassword);
    
    // Invalidate all refresh tokens for this user
    await authService.invalidateAllUserTokens(userId);
    
    // Generate new tokens
    const tokens = authService.generateTokens(user);
    
    // Store new refresh token
    await authService.saveRefreshToken(userId, tokens.refreshToken);
    
    res.json({
      success: true,
      message: 'Password changed successfully',
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get user's friends
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function getFriends(req, res, next) {
  try {
    const userId = req.user.id;
    const { status } = req.query;
    
    const friends = await friendService.getUserFriends(userId, status);
    
    res.json({
      success: true,
      data: friends
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Send friend invitation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function inviteFriend(req, res, next) {
  try {
    const userId = req.user.id;
    const { email } = req.body;
    
    if (!email) {
      throw new BadRequestError('Missing email');
    }
    
    // Find user by email
    const friend = await userService.getUserByEmail(email);
    if (!friend) {
      throw new NotFoundError(`No user found with email ${email}`);
    }
    
    // Prevent self-invitation
    if (friend.id === userId) {
      throw new BadRequestError('Cannot invite yourself');
    }
    
    // Check if already friends or pending
    const existingFriendship = await friendService.getFriendship(userId, friend.id);
    if (existingFriendship) {
      if (existingFriendship.status === 'accepted') {
        throw new ConflictError('Already friends with this user');
      } else if (existingFriendship.status === 'pending' && existingFriendship.userId === userId) {
        throw new ConflictError('Friend invitation already sent');
      } else if (existingFriendship.status === 'pending' && existingFriendship.friendId === userId) {
        throw new ConflictError('This user has already sent you a friend invitation');
      } else if (existingFriendship.status === 'blocked') {
        throw new BadRequestError('Cannot invite this user');
      }
    }
    
    // Create friend invitation
    const invitation = await friendService.createFriendship(userId, friend.id);
    
    res.status(201).json({
      success: true,
      data: invitation
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Accept friend invitation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function acceptFriendInvitation(req, res, next) {
  try {
    const userId = req.user.id;
    const { friendId } = req.params;
    
    // Check if invitation exists
    const invitation = await friendService.getFriendship(friendId, userId);
    if (!invitation) {
      throw new NotFoundError('Friend invitation not found');
    }
    
    if (invitation.status !== 'pending') {
      throw new BadRequestError('Cannot accept this invitation');
    }
    
    // Accept invitation
    const friendship = await friendService.updateFriendshipStatus(invitation.id, 'accepted');
    
    res.json({
      success: true,
      data: friendship
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Reject friend invitation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function rejectFriendInvitation(req, res, next) {
  try {
    const userId = req.user.id;
    const { friendId } = req.params;
    
    // Check if invitation exists
    const invitation = await friendService.getFriendship(friendId, userId);
    if (!invitation) {
      throw new NotFoundError('Friend invitation not found');
    }
    
    if (invitation.status !== 'pending') {
      throw new BadRequestError('Cannot reject this invitation');
    }
    
    // Delete invitation
    await friendService.deleteFriendship(invitation.id);
    
    res.json({
      success: true,
      message: 'Friend invitation rejected'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Remove friend
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function removeFriend(req, res, next) {
  try {
    const userId = req.user.id;
    const { friendId } = req.params;
    
    // Check if friendship exists
    const friendship = await friendService.getFriendshipByUsers(userId, friendId);
    if (!friendship) {
      throw new NotFoundError('Friendship not found');
    }
    
    // Delete friendship
    await friendService.deleteFriendship(friendship.id);
    
    res.json({
      success: true,
      message: 'Friend removed successfully'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Block user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function blockUser(req, res, next) {
  try {
    const userId = req.user.id;
    const { targetUserId } = req.body;
    
    if (!targetUserId) {
      throw new BadRequestError('Missing target user ID');
    }
    
    // Prevent self-blocking
    if (targetUserId === userId) {
      throw new BadRequestError('Cannot block yourself');
    }
    
    // Check if target user exists
    const targetUser = await userService.getUserById(targetUserId);
    if (!targetUser) {
      throw new NotFoundError('User not found');
    }
    
    // Check if already blocked
    const existingBlock = await friendService.getFriendship(userId, targetUserId, 'blocked');
    if (existingBlock) {
      throw new ConflictError('User is already blocked');
    }
    
    // Delete existing friendship if any
    const existingFriendship = await friendService.getFriendshipByUsers(userId, targetUserId);
    if (existingFriendship) {
      await friendService.deleteFriendship(existingFriendship.id);
    }
    
    // Create block relationship
    const block = await friendService.createFriendship(userId, targetUserId, 'blocked');
    
    res.status(201).json({
      success: true,
      message: 'User blocked successfully'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Unblock user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function unblockUser(req, res, next) {
  try {
    const userId = req.user.id;
    const { targetUserId } = req.params;
    
    // Check if block exists
    const block = await friendService.getFriendship(userId, targetUserId, 'blocked');
    if (!block) {
      throw new NotFoundError('Block relationship not found');
    }
    
    // Delete block
    await friendService.deleteFriendship(block.id);
    
    res.json({
      success: true,
      message: 'User unblocked successfully'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  getFriends,
  inviteFriend,
  acceptFriendInvitation,
  rejectFriendInvitation,
  removeFriend,
  blockUser,
  unblockUser
}; 