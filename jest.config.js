module.exports = {
  collectCoverageFrom: [
    'routes/**/*.js',
    'middleware/**/*.js',
    'client/src/components/**/*.{js,jsx}',
    '!**/node_modules/**',
    '!client/src/components/**/*.test.{js,jsx}',
    '!client/src/components/**/*.stories.{js,jsx}',
    '!client/src/index.js',
    '!client/src/serviceWorker.js'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  projects: [
    {
      displayName: 'backend',
      testMatch: ['<rootDir>/tests/**/*.test.js'],
      testEnvironment: 'node',
      collectCoverageFrom: [
        'routes/**/*.js',
        'middleware/**/*.js',
        '!**/node_modules/**'
      ]
    },
    {
      displayName: 'frontend',
      testMatch: ['<rootDir>/client/src/**/*.test.{js,jsx}'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/client/src/setupTests.js'],
      collectCoverageFrom: [
        'client/src/components/**/*.{js,jsx}',
        '!client/src/components/**/*.test.{js,jsx}',
        '!client/src/components/**/*.stories.{js,jsx}',
        '!client/src/index.js',
        '!client/src/serviceWorker.js'
      ],
      moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
      },
      transform: {
        '^.+\\.(js|jsx)$': ['babel-jest', {
          presets: [
            ['@babel/preset-env', { targets: { node: 'current' } }],
            ['@babel/preset-react', { runtime: 'automatic' }]
          ]
        }]
      }
    }
  ],
  coverageDirectory: 'coverage',
  collectCoverage: true
}; 