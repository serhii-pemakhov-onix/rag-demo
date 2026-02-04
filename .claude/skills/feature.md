# Feature Development Skill

This skill enforces documentation-driven development. Every feature must have documentation describing its business logic before implementation begins.

## Trigger

Invoke with `/feature <feature-name>` or `/feature` to work on a feature.

## Workflow

1. **Check for documentation**: Look for `docs/features/<feature-name>.md`
2. **If docs exist**: Read and understand the business logic, then proceed with implementation
3. **If docs missing**: STOP and require documentation first

## When Documentation is Missing

If the feature documentation does not exist, you MUST:

1. **Do not write any code** until documentation is created
2. Ask the user to describe the feature's business logic
3. Create the documentation file at `docs/features/<feature-name>.md` with this structure:

```markdown
# <Feature Name>

## Overview
Brief description of what this feature does and why it exists.

## Business Logic
Detailed description of the business rules and logic.

## User Stories
- As a [user type], I want [action] so that [benefit]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Technical Notes
Any technical considerations or constraints.

## Dependencies
Features or systems this depends on.
```

4. Only after the documentation is created and approved, proceed with implementation

## When Documentation Exists

1. Read the feature documentation thoroughly
2. Summarize the requirements back to the user
3. Ask for confirmation before proceeding
4. Implement according to the documented business logic
5. Update documentation if implementation reveals new requirements

## Rules

- **NEVER** start coding a feature without documentation
- **ALWAYS** reference the documentation when making implementation decisions
- **UPDATE** documentation when requirements change during implementation
