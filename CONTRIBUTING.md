# Staffmate CRM — Development Guidelines

## 1. Project Overview

Staffmate Workforce CRM is a private company project developed using Laravel 13 and React.

All contributors must follow the project's architecture, security standards, and review process.

## 2. Git Branching Rules

- `main` is the stable integration branch.
- Never push code directly to `main`.
- Create a separate branch for each assigned task.
- Use branch names such as `feature/ST-001-worker-profile` or `fix/ST-002-validation`.
- Keep branches short-lived and focused on one task.
- Do not force-push or delete shared branches without approval.

## 3. Pull Request Rules

- Every change must be submitted through a Pull Request (PR).
- Link the PR to its assigned task.
- Explain what changed and why.
- Include relevant tests and screenshots when applicable.
- The Technical Lead must review and approve changes before merging.
- Only the Technical Lead or another explicitly authorised maintainer may merge into `main`.
- Address review comments before requesting another review.

**Important:** GitHub Free does not enforce branch protection for this private organisation repository. These rules are mandatory team procedures, not GitHub-enforced restrictions.

## 4. Coding Standards

- Follow the approved project architecture and module boundaries.
- Follow Laravel, PHP, React, and TypeScript coding conventions.
- Keep controllers and components focused and maintainable.
- Use server-side validation and authorisation.
- Do not duplicate business rules across modules.
- Do not add dependencies without review.
- Do not change shared API contracts or database schemas without approval.

## 5. Security Rules

- Never commit `.env` files, passwords, tokens, private keys, or credentials.
- Never commit real worker information or sensitive documents.
- Development and testing must use fictitious data.
- Enforce permissions in Laravel, not only in React.
- Report suspected security vulnerabilities privately to the Technical Lead.
- Never disable security checks merely to make tests pass.

## 6. Testing Requirements

- Add appropriate unit and feature tests for backend changes.
- Add permission tests for new or modified protected endpoints.
- Test important frontend workflows.
- Fix failing tests before requesting approval.
- CI checks must pass once the project's CI pipeline is configured.

## 7. Architecture Changes

Architecture decisions must be discussed with the Technical Lead.

Approved significant decisions are documented in `docs/adr/`.

Developers must not independently redesign authentication, authorisation, document security, Social Insurance rules, assignment rules, or other critical workflows.

## 8. Definition of Done

A task is complete only when:

- Requirements and acceptance criteria are satisfied.
- Code follows the approved architecture.
- Relevant tests pass.
- The Technical Lead has approved the PR.
- Documentation is updated where necessary.
- The change is merged through the approved process.

## 9. Communication

Report progress, questions, and blockers to the Technical Lead. Do not assume unclear business requirements or introduce unapproved changes.

**All project source code and internal documentation are confidential.**
