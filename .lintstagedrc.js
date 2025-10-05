module.exports = {
  // TypeScript/JavaScript files
  '*.{js,jsx,ts,tsx}': [
    'eslint --fix',
    'prettier --write',
  ],
  
  // JSON, Markdown, YAML files
  '*.{json,md,yml,yaml}': [
    'prettier --write',
  ],
  
  // Package.json
  'package.json': [
    'prettier --write',
  ],
};
