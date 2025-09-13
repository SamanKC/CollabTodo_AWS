import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'node',
  transform: { '^.+\\.tsx?$': ['ts-jest', {}] },
  roots: ['<rootDir>/src'],
};

export default config;
