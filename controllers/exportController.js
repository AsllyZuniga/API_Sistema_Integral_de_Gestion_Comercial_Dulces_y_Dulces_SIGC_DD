const { exportAllDataToExcel } = require('../services/exportService');

const exportData = async (req, res) => {
    try {
        const workbook = await exportAllDataToExcel();

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            'attachment; filename=' + 'export_data.xlsx'
        );

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error exporting data:', error);
        res.status(500).send('Error exporting data');
    }
};

module.exports = {
    exportData
};
