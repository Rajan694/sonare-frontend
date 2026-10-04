module.exports = {
  root: true,
  // eslint-config-prettier last: formatting is Prettier's job (`npm run format:check`),
  // so the prettier rules in @react-native/eslint-config are switched off.
  extends: ['@react-native', 'prettier'],
  rules: {
    'prettier/prettier': 'off',
  },
};
