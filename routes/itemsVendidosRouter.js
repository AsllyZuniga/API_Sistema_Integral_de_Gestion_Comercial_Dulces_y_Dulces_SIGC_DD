'use strict';

const express = require('express');
const router = express.Router();
const itemsVendidosController = require('../controllers/itemsVendidosController');
const { requireAuthJWT } = require('../middlewares/authJwtMiddleware');

router.get('/', requireAuthJWT, itemsVendidosController.list);

module.exports = router;
