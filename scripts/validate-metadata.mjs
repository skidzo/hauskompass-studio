#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { flattenValidationResult, validateMetadataDataset } from '../src/validation/metadataValidator.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const result = validateMetadataDataset(rootDir);
const errors = flattenValidationResult(result);

if (errors.length > 0) {
  console.error('Metadata validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Metadata validation passed.');
console.log(`Schema errors: ${result.schemaErrors.length}`);
console.log(`Reference errors: ${result.referenceErrors.length}`);
console.log(`Privacy errors: ${result.privacyErrors.length}`);
console.log(`Modeling errors: ${result.modelingErrors.length}`);
