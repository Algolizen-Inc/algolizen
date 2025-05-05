# Contributing Guidelines

Welcome to the team! This document outlines the process and rules for contributing to this repository. Even without enforced branch protections, we follow a disciplined Git flow to maintain code quality and collaboration standards.

---

## Table of Contents
- [Branching Strategy](#branching-strategy)
- [Workflow](#workflow)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Commit Message Convention](#commit-message-convention)
- [Code Reviews](#code-reviews)
- [Code Owners](#code-owners)
- [CI/CD and Testing](#cicd-and-testing)

---

## Branching Strategy

- `main`: Stable, deployable code. Protected by policy (not enforcement).
- `dev`: Staging branch for upcoming features.
- `feature/xyz`: Feature branches (e.g., `feature/login-ui`)
- `fix/xyz`: Bugfix branches (e.g., `fix/api-timeout`)

**Do not push directly to `main`.** All changes must go through a Pull Request.

---

## Workflow

1. **Fork or clone** the repo.
2. **Create a new branch** from `dev`:
   ```bash
   git checkout dev
   git pull
   git checkout -b feature/your-feature-name
