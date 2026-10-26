module.exports = {
  preset: "react-native",
  testMatch: ["**/tests/native.test.tsx"],
  transform: {
    "^.+\\.[jt]sx?$": [
      "babel-jest",
      {
        babelrc: false,
        configFile: false,
        presets: ["module:@react-native/babel-preset"],
      },
    ],
  },
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)/)",
  ],
};
