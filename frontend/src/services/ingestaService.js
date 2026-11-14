import { USE_MOCK_INGESTA } from '../config/app.js'
import * as ingestaApi from './ingestaApi.js'
import * as ingestaMock from './mock/ingestaMock.js'

const implementation = USE_MOCK_INGESTA ? ingestaMock : ingestaApi

export const { startIngesta, getIngestaStatus, fetchCuarentena } =
  implementation
