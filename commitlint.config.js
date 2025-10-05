module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation
        'style',    // Code style
        'refactor', // Code refactoring
        'perf',     // Performance
        'test',     // Tests
        'chore',    // Chores
        'ci',       // CI/CD
        'build',    // Build system
        'revert',   // Revert commit
      ],
    ],
  },
};
