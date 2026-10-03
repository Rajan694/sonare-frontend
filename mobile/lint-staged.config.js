// Run by the repo's pre-commit hook (../.husky/pre-commit) for staged files in mobile/,
// from this folder, so Prettier and ESLint use this app's own config. No tests here.
module.exports = {
  '*.{ts,tsx,js,jsx}': ['prettier --write --ignore-unknown', 'eslint --fix'],
  '*.{json,md,yml,yaml}': 'prettier --write --ignore-unknown',
};
