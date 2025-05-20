/**
 * Export user settlement data
 * @param {string} userId - User ID
 * @param {Object} options - Export options
 * @param {string} options.format - Export format (csv, excel, json)
 * @param {string} options.dataType - Type of data to export (settlements, balances, all)
 * @param {string} options.detailLevel - Level of details to include (basic, detailed, full)
 * @param {string} options.dateFrom - Start date for filtering
 * @param {string} options.dateTo - End date for filtering
 * @param {string} options.status - Settlement status filter
 * @param {string} options.type - Type of settlements (paid, received, all)
 * @returns {Promise<Object>} - Export result with data and metadata
 */
export function exportUserData(userId: string, options: {
    format: string;
    dataType: string;
    detailLevel: string;
    dateFrom: string;
    dateTo: string;
    status: string;
    type: string;
}): Promise<Object>;
/**
 * Get and format user balances
 * @param {string} userId - User ID
 * @param {string} format - Export format (csv, excel, json)
 * @returns {Promise<Object>} - User balance data
 */
export function getUserBalances(userId: string): Promise<Object>;
/**
 * Generate CSV data for settlements
 * @param {Array} settlements - Array of settlement documents
 * @param {string} format - Type of information to include (basic, detailed, full)
 * @returns {Promise<string>} - CSV formatted string
 */
export function generateSettlementsCsv(settlements: any[], format?: string): Promise<string>;
/**
 * Generate Excel file for settlements
 * @param {Array} settlements - Array of settlement documents
 * @param {string} format - Type of information to include (basic, detailed, full)
 * @returns {Promise<Buffer>} - Excel file as Buffer
 */
export function generateSettlementsExcel(settlements: any[], format?: string): Promise<Buffer>;
/**
 * Generate JSON data for settlements
 * @param {Array} settlements - Array of settlement documents
 * @param {string} format - Type of information to include (basic, detailed, full)
 * @returns {Object} - Formatted JSON data
 */
export function generateSettlementsJson(settlements: any[], format?: string): Object;
/**
 * Get settlements by filter
 * @param {Object} filter - MongoDB filter
 * @returns {Promise<Array>} - List of settlements
 */
export function getSettlementsByFilter(filter: Object): Promise<any[]>;
