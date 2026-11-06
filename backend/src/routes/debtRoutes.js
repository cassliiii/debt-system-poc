const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const { uploadCsvData, getDebtByDni } = require('../controllers/debtController');

router.post('/upload', upload.single('file'), uploadCsvData);
router.get('/consulta/:dni', getDebtByDni);

module.exports = router;