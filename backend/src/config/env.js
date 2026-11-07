const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const requiredEnv = (name) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`La variable de entorno ${name} es obligatoria.`);
  }

  return value;
};

module.exports = {
  GCP_PROJECT_ID: requiredEnv('GCP_PROJECT_ID'),
  BQ_DATASET: requiredEnv('BQ_DATASET'),
  PORT: process.env.PORT || 8080
};
