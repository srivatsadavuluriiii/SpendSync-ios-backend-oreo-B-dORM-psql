/**
 * Export Service
 *
 * Handles data export operations for settlements and balances
 */
const Settlement = require('../models/settlement.model');
const csv = require('csv-stringify');
const xl = require('excel4node');
const moment = require('moment');
const path = require('path');
const fs = require('fs');
const { BadRequestError } = require('../../../../shared/errors');
/**
 * Generate CSV data for settlements
 * @param {Array} settlements - Array of settlement documents
 * @param {string} format - Type of information to include (basic, detailed, full)
 * @returns {Promise<string>} - CSV formatted string
 */
async function generateSettlementsCsv(settlements, format = 'basic') {
    const getColumns = () => {
        const basicColumns = [
            { key: 'id', header: 'Settlement ID' },
            { key: 'createdAt', header: 'Date' },
            { key: 'amount', header: 'Amount' },
            { key: 'currency', header: 'Currency' },
            { key: 'payerId', header: 'Payer ID' },
            { key: 'receiverId', header: 'Receiver ID' },
            { key: 'status', header: 'Status' }
        ];
        const detailedColumns = [
            ...basicColumns,
            { key: 'groupId', header: 'Group ID' },
            { key: 'notes', header: 'Notes' },
            { key: 'completedAt', header: 'Completed Date' }
        ];
        const fullColumns = [
            ...detailedColumns,
            { key: 'createdBy', header: 'Created By' },
            { key: 'updatedAt', header: 'Last Updated' }
        ];
        switch (format) {
            case 'detailed': return detailedColumns;
            case 'full': return fullColumns;
            case 'basic':
            default: return basicColumns;
        }
    };
    const columns = getColumns();
    // Format date fields
    const formattedSettlements = settlements.map(settlement => {
        const formattedData = { ...settlement.toObject() };
        // Convert ObjectId to string
        formattedData.id = settlement._id.toString();
        // Format dates
        if (formattedData.createdAt) {
            formattedData.createdAt = moment(formattedData.createdAt).format('YYYY-MM-DD HH:mm:ss');
        }
        if (formattedData.updatedAt) {
            formattedData.updatedAt = moment(formattedData.updatedAt).format('YYYY-MM-DD HH:mm:ss');
        }
        if (formattedData.completedAt) {
            formattedData.completedAt = moment(formattedData.completedAt).format('YYYY-MM-DD HH:mm:ss');
        }
        return formattedData;
    });
    return new Promise((resolve, reject) => {
        csv.stringify(formattedSettlements, {
            header: true,
            columns: columns
        }, (err, output) => {
            if (err)
                reject(err);
            else
                resolve(output);
        });
    });
}
/**
 * Generate Excel file for settlements
 * @param {Array} settlements - Array of settlement documents
 * @param {string} format - Type of information to include (basic, detailed, full)
 * @returns {Promise<Buffer>} - Excel file as Buffer
 */
async function generateSettlementsExcel(settlements, format = 'basic') {
    const getColumns = () => {
        const basicColumns = [
            { key: 'id', header: 'Settlement ID' },
            { key: 'createdAt', header: 'Date' },
            { key: 'amount', header: 'Amount' },
            { key: 'currency', header: 'Currency' },
            { key: 'payerId', header: 'Payer ID' },
            { key: 'receiverId', header: 'Receiver ID' },
            { key: 'status', header: 'Status' }
        ];
        const detailedColumns = [
            ...basicColumns,
            { key: 'groupId', header: 'Group ID' },
            { key: 'notes', header: 'Notes' },
            { key: 'completedAt', header: 'Completed Date' }
        ];
        const fullColumns = [
            ...detailedColumns,
            { key: 'createdBy', header: 'Created By' },
            { key: 'updatedAt', header: 'Last Updated' }
        ];
        switch (format) {
            case 'detailed': return detailedColumns;
            case 'full': return fullColumns;
            case 'basic':
            default: return basicColumns;
        }
    };
    const columns = getColumns();
    // Create a new Excel workbook and worksheet
    const wb = new xl.Workbook();
    const ws = wb.addWorksheet('Settlements');
    // Add styling
    const headerStyle = wb.createStyle({
        font: {
            bold: true,
            color: '#FFFFFF'
        },
        fill: {
            type: 'pattern',
            patternType: 'solid',
            fgColor: '#4472C4'
        }
    });
    // Add headers
    columns.forEach((column, colIndex) => {
        ws.cell(1, colIndex + 1)
            .string(column.header)
            .style(headerStyle);
    });
    // Format date fields and add data rows
    settlements.forEach((settlement, rowIndex) => {
        const formattedData = { ...settlement.toObject() };
        // Convert ObjectId to string
        formattedData.id = settlement._id.toString();
        // Process dates
        formattedData.createdAt = settlement.createdAt ?
            moment(settlement.createdAt).format('YYYY-MM-DD HH:mm:ss') : '';
        formattedData.updatedAt = settlement.updatedAt ?
            moment(settlement.updatedAt).format('YYYY-MM-DD HH:mm:ss') : '';
        formattedData.completedAt = settlement.completedAt ?
            moment(settlement.completedAt).format('YYYY-MM-DD HH:mm:ss') : '';
        // Add data to worksheet
        columns.forEach((column, colIndex) => {
            const cellValue = formattedData[column.key] !== undefined ?
                formattedData[column.key].toString() : '';
            ws.cell(rowIndex + 2, colIndex + 1).string(cellValue);
        });
    });
    // Return as a buffer
    return new Promise((resolve, reject) => {
        wb.writeToBuffer().then(buffer => {
            resolve(buffer);
        }).catch(err => {
            reject(err);
        });
    });
}
/**
 * Generate JSON data for settlements
 * @param {Array} settlements - Array of settlement documents
 * @param {string} format - Type of information to include (basic, detailed, full)
 * @returns {Object} - Formatted JSON data
 */
function generateSettlementsJson(settlements, format = 'basic') {
    // Process and format settlements based on the requested format
    const formattedSettlements = settlements.map(settlement => {
        const formattedData = { ...settlement.toObject() };
        // Convert ObjectId to string
        formattedData.id = settlement._id.toString();
        delete formattedData._id;
        // Format dates to ISO strings
        if (formattedData.createdAt) {
            formattedData.createdAt = formattedData.createdAt.toISOString();
        }
        if (formattedData.updatedAt) {
            formattedData.updatedAt = formattedData.updatedAt.toISOString();
        }
        if (formattedData.completedAt) {
            formattedData.completedAt = formattedData.completedAt.toISOString();
        }
        // Filter fields based on format
        if (format === 'basic') {
            const { id, createdAt, amount, currency, payerId, receiverId, status } = formattedData;
            return { id, createdAt, amount, currency, payerId, receiverId, status };
        }
        else if (format === 'detailed') {
            const { id, createdAt, amount, currency, payerId, receiverId, status, groupId, notes, completedAt } = formattedData;
            return { id, createdAt, amount, currency, payerId, receiverId, status,
                groupId, notes, completedAt };
        }
        // Return all fields for 'full' format
        return formattedData;
    });
    return {
        exportDate: new Date().toISOString(),
        count: formattedSettlements.length,
        settlements: formattedSettlements
    };
}
/**
 * Get and format user balances
 * @param {string} userId - User ID
 * @param {string} format - Export format (csv, excel, json)
 * @returns {Promise<Object>} - User balance data
 */
async function getUserBalances(userId) {
    // Get all settlements where user is either payer or receiver
    const settlements = await Settlement.find({
        $or: [
            { payerId: userId },
            { receiverId: userId }
        ]
    });
    // Calculate balances by group and by user
    const balancesByGroup = {};
    const balancesByUser = {};
    settlements.forEach(settlement => {
        const { groupId, payerId, receiverId, amount, currency, status } = settlement;
        // Skip non-completed settlements for balance calculation
        if (status !== 'completed')
            return;
        // Initialize group balances if needed
        if (!balancesByGroup[groupId]) {
            balancesByGroup[groupId] = {};
        }
        if (!balancesByGroup[groupId][currency]) {
            balancesByGroup[groupId][currency] = 0;
        }
        // Calculate group balance
        if (payerId === userId) {
            // User paid, so reduce balance
            balancesByGroup[groupId][currency] -= amount;
        }
        else if (receiverId === userId) {
            // User received, so increase balance
            balancesByGroup[groupId][currency] += amount;
        }
        // Calculate user-to-user balances
        const otherUserId = payerId === userId ? receiverId : payerId;
        if (!balancesByUser[otherUserId]) {
            balancesByUser[otherUserId] = {};
        }
        if (!balancesByUser[otherUserId][currency]) {
            balancesByUser[otherUserId][currency] = 0;
        }
        if (payerId === userId) {
            // User paid to other user
            balancesByUser[otherUserId][currency] -= amount;
        }
        else {
            // User received from other user
            balancesByUser[otherUserId][currency] += amount;
        }
    });
    return {
        userId,
        balancesByGroup,
        balancesByUser,
        settlements
    };
}
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
async function exportUserData(userId, options) {
    const { format = 'csv', dataType = 'settlements', detailLevel = 'basic', dateFrom, dateTo, status, type = 'all' } = options;
    // Build the filter
    const filter = {};
    // Add user filter based on type
    if (type === 'paid') {
        filter.payerId = userId;
    }
    else if (type === 'received') {
        filter.receiverId = userId;
    }
    else {
        // 'all' - include both paid and received
        filter.$or = [{ payerId: userId }, { receiverId: userId }];
    }
    // Add date filters if provided
    if (dateFrom || dateTo) {
        filter.createdAt = {};
        if (dateFrom) {
            filter.createdAt.$gte = new Date(dateFrom);
        }
        if (dateTo) {
            filter.createdAt.$lte = new Date(dateTo);
        }
    }
    // Add status filter if provided
    if (status) {
        filter.status = status;
    }
    // Get settlements based on the filter
    const settlements = await Settlement.find(filter).sort({ createdAt: -1 });
    // Generate response based on requested data type
    let response = {
        exportDate: new Date().toISOString(),
        format,
        userId
    };
    if (dataType === 'settlements' || dataType === 'all') {
        // Format settlements based on requested format
        if (format === 'csv') {
            response.settlementsData = await generateSettlementsCsv(settlements, detailLevel);
            response.mimeType = 'text/csv';
            response.filename = `settlements_${userId}_${moment().format('YYYYMMDD')}.csv`;
        }
        else if (format === 'excel') {
            response.settlementsData = await generateSettlementsExcel(settlements, detailLevel);
            response.mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            response.filename = `settlements_${userId}_${moment().format('YYYYMMDD')}.xlsx`;
        }
        else if (format === 'json') {
            response.settlementsData = generateSettlementsJson(settlements, detailLevel);
            response.mimeType = 'application/json';
            response.filename = `settlements_${userId}_${moment().format('YYYYMMDD')}.json`;
        }
        else {
            throw new BadRequestError(`Unsupported export format: ${format}`);
        }
    }
    if (dataType === 'balances' || dataType === 'all') {
        // Get and format user balances
        const balances = await getUserBalances(userId);
        if (format === 'json') {
            response.balancesData = balances;
        }
        else if (format === 'csv') {
            // Format balances as CSV
            const balancesByGroup = Object.entries(balances.balancesByGroup).map(([groupId, currencies]) => Object.entries(currencies).map(([currency, amount]) => ({
                groupId,
                currency,
                amount
            }))).flat();
            const balancesByUser = Object.entries(balances.balancesByUser).map(([otherUserId, currencies]) => Object.entries(currencies).map(([currency, amount]) => ({
                otherUserId,
                currency,
                amount
            }))).flat();
            response.balancesByGroupCsv = await new Promise((resolve, reject) => {
                csv.stringify(balancesByGroup, {
                    header: true,
                    columns: [
                        { key: 'groupId', header: 'Group ID' },
                        { key: 'currency', header: 'Currency' },
                        { key: 'amount', header: 'Balance' }
                    ]
                }, (err, output) => {
                    if (err)
                        reject(err);
                    else
                        resolve(output);
                });
            });
            response.balancesByUserCsv = await new Promise((resolve, reject) => {
                csv.stringify(balancesByUser, {
                    header: true,
                    columns: [
                        { key: 'otherUserId', header: 'User ID' },
                        { key: 'currency', header: 'Currency' },
                        { key: 'amount', header: 'Balance' }
                    ]
                }, (err, output) => {
                    if (err)
                        reject(err);
                    else
                        resolve(output);
                });
            });
        }
        else if (format === 'excel') {
            // The Excel data will be generated in the controller instead of here
            // because we need to add multiple sheets to the workbook
            response.balancesData = balances;
        }
    }
    return response;
}
/**
 * Get settlements by filter
 * @param {Object} filter - MongoDB filter
 * @returns {Promise<Array>} - List of settlements
 */
async function getSettlementsByFilter(filter) {
    return await Settlement.find(filter).sort({ createdAt: -1 });
}
module.exports = {
    exportUserData,
    getUserBalances,
    generateSettlementsCsv,
    generateSettlementsExcel,
    generateSettlementsJson,
    getSettlementsByFilter
};
export {};
//# sourceMappingURL=export.service.js.map