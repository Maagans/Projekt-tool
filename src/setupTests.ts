import { beforeAll } from 'vitest';
import '@testing-library/jest-dom';

beforeAll(() => {
  if (typeof window !== 'undefined' && !window.alert) {
    window.alert = () => {};
  }
});
