# Contributing to eWei SDK

Thanks for your interest in contributing to eWei! This document covers the basics.

## Getting Started

1. Fork the repo and clone your fork
2. Install dependencies: `npm install`
3. Create a feature branch: `git checkout -b feat/your-feature`

## Development

```bash
# Run tests
npm test

# Lint
npm run lint

# Type-check
npm run typecheck
```

## Pull Requests

- Keep PRs focused on a single change
- Add tests for new functionality
- Update type declarations (`src/index.d.ts`) if you change the public API
- Follow existing code style (JSDoc comments, named exports)
- Ensure all checks pass before requesting review

## Commit Messages

Use conventional commits:

```
feat: add batch sponsorship support
fix: handle relayer timeout on slow networks
docs: update Python example with async variant
```

## Reporting Bugs

Open an issue with:
- SDK version (`@ewei/sdk` version from package.json)
- Node.js version
- Steps to reproduce
- Expected vs actual behavior

## Code of Conduct

Be respectful. We're all here to build good software.
