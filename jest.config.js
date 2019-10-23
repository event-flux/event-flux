module.exports = {
  "roots": [
    "<rootDir>"
  ],
  "transform": {
    "^.+\\.tsx?$": "ts-jest"
  },
  "testRegex": "(/src/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$",
  "moduleFileExtensions": [
    "ts",
    "tsx",
    "js",
    "jsx",
    "json",
    "node"
  ],
  "setupFilesAfterEnv": ["./setupTests.ts"],
  "coverageDirectory": "./coverage/",
  "collectCoverage": true,
  moduleNameMapper: {
    "^event-flux$": "<rootDir>/packages/event-flux/src/index.ts",
  },
  modulePathIgnorePatterns: ["packages/.*/lib"]
}