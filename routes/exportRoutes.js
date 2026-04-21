const express = require('express');
const router = express.Router();
const { exportData } = require('../controllers/exportController');

router.get('/export', exportData);

module.exports = router;
