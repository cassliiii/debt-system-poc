const { BigQuery } = require('@google-cloud/bigquery');
const { GCP_PROJECT_ID } = require('./env');

// Inicializa el cliente de BigQuery usando el proyecto configurado en variables de entorno
const bigquery = new BigQuery({
  projectId: GCP_PROJECT_ID,
});

module.exports = bigquery;