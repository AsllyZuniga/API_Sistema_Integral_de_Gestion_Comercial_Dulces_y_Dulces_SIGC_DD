const express = require('express');
const router = express.Router();
const { exportData } = require('../controllers/exportController');
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');

router.get('/export', requireAuthJWT, exportData);

module.exports = router;
