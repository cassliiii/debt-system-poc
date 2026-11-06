const { BigQuery } = require('@google-cloud/bigquery');
require('dotenv').config();

// Inicializa el cliente de BigQuery usando el proyecto configurado en variables de entorno
const bigquery = new BigQuery({
  projectId: process.env.GCP_PROJECT_ID || 'tu-proyecto-gcp',
});

module.exports = bigquery;