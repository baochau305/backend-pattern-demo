import type { Config } from 'jest';

/**
 * Unit tests run via ts-jest. We compile the TypeScript sources to CommonJS for
 * the test run (simplest, fastest, no ESM/Jest friction) and use moduleNameMapper
 * to strip the `.js` suffix that NodeNext source imports require — so
 * `import x from './foo.js'` resolves to `foo.ts` under Jest.
 */
const config: Config = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'CommonJS',
          moduleResolution: 'node',
          isolatedModules: true,
          verbatimModuleSyntax: false,
        },
      },
    ],
  },
  clearMocks: true,
  modulePathIgnorePatterns: ['<rootDir>/dist'],
};

export default config;
