# Contributing to Shorly

Thank you for considering contributing to Shorly! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Follow the project's coding standards

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Git
- PostgreSQL 16+ (for local development)
- Redis 7+ (for local development)

### Setup Development Environment

1. Fork the repository
2. Clone your fork:
```bash
git clone https://github.com/yourusername/shorly.git
cd shorly
```

3. Install dependencies:
```bash
pnpm install
```

4. Set up environment variables:
```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

5. Run database migrations:
```bash
cd apps/api
pnpm prisma migrate dev
cd ../..
```

6. Start development servers:
```bash
pnpm dev
```

## Development Workflow

### Branch Naming

- `feature/` - New features (e.g., `feature/add-oauth`)
- `fix/` - Bug fixes (e.g., `fix/login-error`)
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions/updates

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Tests
- `chore`: Maintenance tasks

Examples:
```
feat(api): add OAuth authentication
fix(web): resolve dashboard loading issue
docs(readme): update installation instructions
```

## Code Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Avoid `any` type - use `unknown` if needed
- Document complex types

### Formatting

Code is automatically formatted with Prettier:
```bash
pnpm format
```

### Linting

Run linter before committing:
```bash
pnpm lint
```

Fix auto-fixable issues:
```bash
pnpm lint --fix
```

### Type Checking

Ensure types are correct:
```bash
pnpm type-check
```

## Testing

### Writing Tests

- Write tests for new features
- Update tests when modifying existing code
- Aim for high coverage on critical paths

### Running Tests

```bash
# All tests
pnpm test

# Specific package
pnpm --filter @shorly/api test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:cov
```

## Database Changes

### Creating Migrations

```bash
cd apps/api

# Create migration
pnpm prisma migrate dev --name your_migration_name

# Generate Prisma client
pnpm prisma generate
```

### Migration Guidelines

- Keep migrations small and focused
- Test migrations both up and down
- Document complex migrations
- Never edit existing migrations in main branch

## API Changes

### Adding Endpoints

1. Create/update DTOs in module
2. Add service methods
3. Add controller endpoints
4. Update Swagger documentation
5. Write tests

Example:
```typescript
@ApiTags('Links')
@Controller('links')
export class LinksController {
  @Post()
  @ApiOperation({ summary: 'Create link' })
  create(@Body() dto: CreateLinkDto) {
    return this.linksService.create(dto);
  }
}
```

## UI Changes

### Adding Components

Use shadcn CLI when possible:
```bash
cd apps/web
npx shadcn@latest add component-name
```

### Styling Guidelines

- Use Tailwind utility classes
- Follow shadcn/ui patterns
- Support dark mode
- Ensure RTL compatibility
- Test on mobile and desktop

## Documentation

### Code Documentation

- Add JSDoc comments for public APIs
- Document complex algorithms
- Explain non-obvious code

### README Updates

Update README when:
- Adding new features
- Changing configuration
- Modifying setup process

## Pull Request Process

### Before Submitting

1. **Test locally**:
```bash
pnpm build
pnpm lint
pnpm type-check
pnpm test
```

2. **Update documentation**:
   - README if needed
   - API docs
   - Code comments

3. **Add changeset** (for releases):
```bash
pnpm changeset
```

### PR Guidelines

- One feature/fix per PR
- Include tests
- Update documentation
- Link related issues
- Request review from maintainers

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How was this tested?

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Tests added/updated
- [ ] All tests pass
```

## Review Process

1. Maintainer reviews code
2. Automated CI/CD checks run
3. Address feedback
4. Approval required before merge
5. Squash and merge to main

## Release Process

Releases follow semantic versioning:
- **Major**: Breaking changes
- **Minor**: New features
- **Patch**: Bug fixes

Maintainers handle releases using changesets.

## Getting Help

- **Questions**: Open a discussion
- **Bugs**: Open an issue with reproduction steps
- **Features**: Open an issue to discuss first
- **Security**: Email security@shorly.example

## Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes
- Project documentation

Thank you for contributing! 🎉
