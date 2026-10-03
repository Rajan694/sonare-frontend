// Run by the repo's pre-commit hook (../.husky/pre-commit) for staged files in desktop/,
// from this folder, so Prettier and ESLint use this app's own config. No tests here.
export default {
  '*.{ts,tsx,js,jsx,mjs}': ['prettier --write --ignore-unknown', 'eslint --fix --no-warn-ignored'],
  '*.{json,md,css,html,yml,yaml}': 'prettier --write --ignore-unknown',
};
