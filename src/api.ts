// src/api.ts
// Backward compatibility redirect - all API logic is now in src/api/ modules
// This file re-exports everything so existing imports continue to work:
//   import { api, fetchWithAuth } from './api';
//   import { api } from '../api';

export * from './api/index';
