/**
 * UI Render Routes
 * 
 * Routes for rendering UI pages using EJS templates
 */

const express = require('express');
const router = express.Router();
const settlementController = require('../controllers/settlement.controller');
const { authenticate } = require('../../../../shared/middleware');

/**
 * Render the settlement calculation details page
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function renderCalculationDetails(req, res, next) {
  try {
    const { groupId } = req.params;
    const { algorithm } = req.query;
    
    // Default to minCashFlow if no algorithm is specified
    const selectedAlgorithm = algorithm || 'minCashFlow';
    
    // Get the settlement calculation details from the API
    const response = await settlementController.getSettlementCalculationDetails(
      { 
        params: { groupId },
        query: { algorithm: selectedAlgorithm },
        user: req.user
      },
      { 
        json: (data) => data 
      },
      next
    );
    
    if (!response || !response.success) {
      return res.status(404).send('Settlement data not found');
    }
    
    // Render the calculation.ejs template with the data
    res.render('calculation', {
      groupId,
      algorithm: selectedAlgorithm,
      breakdown: response.data.breakdown,
      explanation: response.data.explanation,
      settlements: response.data.settlements,
      debtGraph: response.data.debtGraph,
      stats: response.data.stats
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Route for the settlement calculation details page
 */
router.get('/calculation/:groupId', authenticate, renderCalculationDetails);

module.exports = router; 