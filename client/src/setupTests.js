// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock environment variables for tests
process.env.REACT_APP_GIPHY_KEY = 'test-giphy-key';

// Polyfill for TextEncoder/TextDecoder required by React Router tests
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;
