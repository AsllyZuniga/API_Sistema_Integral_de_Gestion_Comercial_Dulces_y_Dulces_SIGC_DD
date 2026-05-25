const { exportAllDataToJson } = require('../services/exportService');

const exportData = async (req, res) => {
    try {
        const data = await exportAllDataToJson();

        res.setHeader(
            'Content-Type',
            'application/json'
        );
        res.setHeader(
            'Content-Disposition',
            'attachment; filename=' + 'export_data.json'
        );

        res.json(data);
    } catch (error) {
        console.error('Error exporting data:', error);
        res.status(500).send('Error exporting data');
    }
};

module.exports = {
    exportData
};
