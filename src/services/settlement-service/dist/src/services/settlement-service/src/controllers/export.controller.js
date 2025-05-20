"use strict";
/**
 * Export Controller
 *
 * Handles HTTP requests related to data export
 */
const exportService = require('../services/export.service');
const { BadRequestError } = require('../../../../shared/errors');
const xl = require('excel4node');
const moment = require('moment');
/**
 * Export user settlements data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function exportUserSettlements(req, res, next) {
    try {
        const userId = req.user.id;
        // Extract query parameters
        const { format = 'csv', dataType = 'settlements', detailLevel = 'basic', dateFrom, dateTo, status, type = 'all' } = req.query;
        // Validate parameters
        if (!['csv', 'excel', 'json'].includes(format)) {
            throw new BadRequestError('Invalid format. Supported formats: csv, excel, json');
        }
        if (!['settlements', 'balances', 'all'].includes(dataType)) {
            throw new BadRequestError('Invalid dataType. Supported types: settlements, balances, all');
        }
        if (!['basic', 'detailed', 'full'].includes(detailLevel)) {
            throw new BadRequestError('Invalid detailLevel. Supported levels: basic, detailed, full');
        }
        if (type && !['paid', 'received', 'all'].includes(type)) {
            throw new BadRequestError('Invalid type. Supported types: paid, received, all');
        }
        // Get export data
        const exportData = await exportService.exportUserData(userId, {
            format,
            dataType,
            detailLevel,
            dateFrom,
            dateTo,
            status,
            type
        });
        // Handle response based on format
        if (format === 'json') {
            // Send JSON response
            const responseData = {
                exportDate: exportData.exportDate,
                userId
            };
            if (dataType === 'settlements' || dataType === 'all') {
                responseData.settlements = exportData.settlementsData;
            }
            if (dataType === 'balances' || dataType === 'all') {
                responseData.balances = exportData.balancesData;
            }
            res.json({
                success: true,
                data: responseData
            });
        }
        else {
            // Set response headers for file download
            res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
            res.setHeader('Content-Type', exportData.mimeType);
            if (format === 'csv') {
                // For CSV, handle settlements and balances differently
                if (dataType === 'settlements') {
                    res.send(exportData.settlementsData);
                }
                else if (dataType === 'balances') {
                    // For balances, we combine two CSVs with a header
                    let combinedCsv = '--- Group Balances ---\n';
                    combinedCsv += exportData.balancesByGroupCsv;
                    combinedCsv += '\n\n--- User Balances ---\n';
                    combinedCsv += exportData.balancesByUserCsv;
                    res.send(combinedCsv);
                }
                else if (dataType === 'all') {
                    // For 'all', combine all CSVs with headers
                    let combinedCsv = '--- Settlements ---\n';
                    combinedCsv += exportData.settlementsData;
                    combinedCsv += '\n\n--- Group Balances ---\n';
                    combinedCsv += exportData.balancesByGroupCsv;
                    combinedCsv += '\n\n--- User Balances ---\n';
                    combinedCsv += exportData.balancesByUserCsv;
                    res.send(combinedCsv);
                }
            }
            else if (format === 'excel') {
                if (dataType === 'settlements') {
                    // Direct buffer from settlements Excel
                    res.send(exportData.settlementsData);
                }
                else {
                    // For balances or all, we need to create a multi-sheet workbook
                    const wb = new xl.Workbook();
                    // Common styling
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
                    // Add settlements sheet if needed
                    if (dataType === 'all') {
                        // We need to convert the buffer back to a workbook
                        // For simplicity, we'll recreate the settlements sheet
                        const settlements = exportData.balancesData.settlements;
                        const wsSettlements = wb.addWorksheet('Settlements');
                        // Define columns based on detailLevel
                        let columns;
                        if (detailLevel === 'basic') {
                            columns = [
                                { key: 'id', header: 'Settlement ID' },
                                { key: 'createdAt', header: 'Date' },
                                { key: 'amount', header: 'Amount' },
                                { key: 'currency', header: 'Currency' },
                                { key: 'payerId', header: 'Payer ID' },
                                { key: 'receiverId', header: 'Receiver ID' },
                                { key: 'status', header: 'Status' }
                            ];
                        }
                        else if (detailLevel === 'detailed') {
                            columns = [
                                { key: 'id', header: 'Settlement ID' },
                                { key: 'createdAt', header: 'Date' },
                                { key: 'amount', header: 'Amount' },
                                { key: 'currency', header: 'Currency' },
                                { key: 'payerId', header: 'Payer ID' },
                                { key: 'receiverId', header: 'Receiver ID' },
                                { key: 'status', header: 'Status' },
                                { key: 'groupId', header: 'Group ID' },
                                { key: 'notes', header: 'Notes' },
                                { key: 'completedAt', header: 'Completed Date' }
                            ];
                        }
                        else {
                            columns = [
                                { key: 'id', header: 'Settlement ID' },
                                { key: 'createdAt', header: 'Date' },
                                { key: 'amount', header: 'Amount' },
                                { key: 'currency', header: 'Currency' },
                                { key: 'payerId', header: 'Payer ID' },
                                { key: 'receiverId', header: 'Receiver ID' },
                                { key: 'status', header: 'Status' },
                                { key: 'groupId', header: 'Group ID' },
                                { key: 'notes', header: 'Notes' },
                                { key: 'completedAt', header: 'Completed Date' },
                                { key: 'createdBy', header: 'Created By' },
                                { key: 'updatedAt', header: 'Last Updated' }
                            ];
                        }
                        // Add headers
                        columns.forEach((column, colIndex) => {
                            wsSettlements.cell(1, colIndex + 1)
                                .string(column.header)
                                .style(headerStyle);
                        });
                        // Add data
                        settlements.forEach((settlement, rowIndex) => {
                            columns.forEach((column, colIndex) => {
                                let value = settlement[column.key];
                                // Format dates
                                if (column.key === 'createdAt' || column.key === 'updatedAt' || column.key === 'completedAt') {
                                    value = value ? moment(value).format('YYYY-MM-DD HH:mm:ss') : '';
                                }
                                // Convert to string
                                value = value !== undefined && value !== null ? value.toString() : '';
                                wsSettlements.cell(rowIndex + 2, colIndex + 1).string(value);
                            });
                        });
                    }
                    // Add group balances sheet
                    const wsGroups = wb.addWorksheet('Group Balances');
                    // Add headers for group balances
                    wsGroups.cell(1, 1).string('Group ID').style(headerStyle);
                    wsGroups.cell(1, 2).string('Currency').style(headerStyle);
                    wsGroups.cell(1, 3).string('Balance').style(headerStyle);
                    // Add group balance data
                    let rowIndex = 2;
                    Object.entries(exportData.balancesData.balancesByGroup).forEach(([groupId, currencies]) => {
                        Object.entries(currencies).forEach(([currency, amount]) => {
                            wsGroups.cell(rowIndex, 1).string(groupId);
                            wsGroups.cell(rowIndex, 2).string(currency);
                            wsGroups.cell(rowIndex, 3).string(amount.toString());
                            rowIndex++;
                        });
                    });
                    // Add user balances sheet
                    const wsUsers = wb.addWorksheet('User Balances');
                    // Add headers for user balances
                    wsUsers.cell(1, 1).string('User ID').style(headerStyle);
                    wsUsers.cell(1, 2).string('Currency').style(headerStyle);
                    wsUsers.cell(1, 3).string('Balance').style(headerStyle);
                    // Add user balance data
                    rowIndex = 2;
                    Object.entries(exportData.balancesData.balancesByUser).forEach(([userId, currencies]) => {
                        Object.entries(currencies).forEach(([currency, amount]) => {
                            wsUsers.cell(rowIndex, 1).string(userId);
                            wsUsers.cell(rowIndex, 2).string(currency);
                            wsUsers.cell(rowIndex, 3).string(amount.toString());
                            rowIndex++;
                        });
                    });
                    // Generate and send the file
                    wb.writeToBuffer().then(buffer => {
                        res.send(buffer);
                    }).catch(err => {
                        next(err);
                    });
                }
            }
        }
    }
    catch (error) {
        next(error);
    }
}
/**
 * Export group settlements data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function exportGroupSettlements(req, res, next) {
    try {
        const { groupId } = req.params;
        const userId = req.user.id;
        // Extract query parameters
        const { format = 'csv', detailLevel = 'basic', dateFrom, dateTo, status } = req.query;
        // Validate parameters
        if (!['csv', 'excel', 'json'].includes(format)) {
            throw new BadRequestError('Invalid format. Supported formats: csv, excel, json');
        }
        if (!['basic', 'detailed', 'full'].includes(detailLevel)) {
            throw new BadRequestError('Invalid detailLevel. Supported levels: basic, detailed, full');
        }
        // Build the filter for group settlements
        const filter = { groupId };
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
        const settlements = await exportService.getSettlementsByFilter(filter);
        // Format response based on requested format
        if (format === 'csv') {
            const csvData = await exportService.generateSettlementsCsv(settlements, detailLevel);
            res.setHeader('Content-Disposition', `attachment; filename="group_${groupId}_${moment().format('YYYYMMDD')}.csv"`);
            res.setHeader('Content-Type', 'text/csv');
            res.send(csvData);
        }
        else if (format === 'excel') {
            const excelData = await exportService.generateSettlementsExcel(settlements, detailLevel);
            res.setHeader('Content-Disposition', `attachment; filename="group_${groupId}_${moment().format('YYYYMMDD')}.xlsx"`);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.send(excelData);
        }
        else if (format === 'json') {
            const jsonData = exportService.generateSettlementsJson(settlements, detailLevel);
            res.json({
                success: true,
                data: {
                    exportDate: new Date().toISOString(),
                    groupId,
                    settlements: jsonData.settlements
                }
            });
        }
    }
    catch (error) {
        next(error);
    }
}
module.exports = {
    exportUserSettlements,
    exportGroupSettlements
};
