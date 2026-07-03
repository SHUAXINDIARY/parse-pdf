---
name: init-project-rules
description: Initialize generic Cursor and Codex project rules from a reusable base-rules template. Use when Codex needs to create or refresh `.cursor/rules/project-base-rules.mdc` and `AGENTS.md` for JavaScript/TypeScript frontend projects, especially when the user asks to initialize rules, create agent rules, generalize project rules, or choose React/Vue-specific implementation conventions.
---

# Init Project Rules

Create reusable rules for a target project. The full ruleset lives only in `.cursor/rules/project-base-rules.mdc` (the single source of truth); `AGENTS.md` is generated as a thin entry that points Codex to that Cursor rules file, so the rule body is never duplicated across two files. Preserve the policy intent from the source base rules, but remove or generalize project-only details such as exact directory names, data files, route names, product copy, and local skill names.

## Workflow

1. Inspect the target project before writing:
   - Check worktree status.
   - Read existing `.cursor/rules/*.mdc`, `AGENTS.md`, `README.md`, `package.json`, `tsconfig.json`, and framework config files when present.
   - Identify whether the project is React or Vue from the user's request first, then from dependencies and source files.
   - Treat the target repository's current directory structure and `package.json` dependencies as project facts that should be reflected in the generated rules.
2. Choose one entry:
   - React: use `--stack react`.
   - Vue: use `--stack vue`.
3. Generate the rules with the bundled script:

```bash
node {{skill_dir}}/scripts/init_project_rules.mjs --project-root /absolute/project/path --stack react
node {{skill_dir}}/scripts/init_project_rules.mjs --project-root /absolute/project/path --stack vue
```

4. By default, the script writes both Cursor and Codex files. Use `--target cursor` or `--target codex` only when the user asks for a single agent target. Because `AGENTS.md` only references `.cursor/rules/project-base-rules.mdc`, prefer `--target all` (or generate the Cursor file separately) so the referenced rules file actually exists.
5. If any target rules file already exists, read it and decide whether to merge manually. The script will not overwrite without `--force`.
6. Keep target-specific additions small and factual. Add project-specific paths only when the target repository already proves them, and avoid copying unrelated source-project constraints.
7. Confirm the generated rules include a bounded snapshot of the target project's directory structure and a `package.json`-derived list of common SDKs/libraries. If the project structure or dependencies are unusual, adjust that section manually instead of inventing unstated conventions.
8. Validate with the target project's cheapest relevant command. For rules-only changes, checking the generated file and git diff is usually enough.

## Script Options

- `--project-root <path>`: target project root. Defaults to the current working directory.
- `--stack react|vue`: required framework entry.
- `--package-manager pnpm|npm|yarn|bun`: optional override. If omitted, the script infers from lockfiles.
- `--target cursor|codex|all`: optional output target. Defaults to `all`.
- `--force`: overwrite existing generated rule files.
- `--dry-run`: print the generated rules instead of writing.

## Generalization Rules

- Do not hard-code source-project paths, data files, route names, product names, or local-only skill names.
- Do not assume Rsbuild, Vite, Next, Nuxt, or a specific router unless the target project already uses it.
- Do not require `PRODUCT.md`, `DESIGN.md`, or `taskRecord.md` to exist. Say to read or update them when present or when the target project uses those conventions.
- Keep package-manager guidance aligned to the detected target lockfile.
- Keep framework guidance separate: React rules must mention Hooks and derived render data; Vue rules must mention Composition API, `computed`, `watch`, props/emits, and composables.

## Expected Output

The Cursor rules file (`.cursor/rules/project-base-rules.mdc`) is the single source of truth and should include:

- YAML frontmatter with `alwaysApply: true`.
- Agent execution flow and workspace protection.
- Dependency and command-management rules.
- Security and privacy rules.
- Current project directory structure snapshot.
- Common SDK/library list inferred from `package.json`.
- TypeScript, async, function/state, and comments guidance.
- React or Vue implementation conventions.
- Data/runtime tolerance guidance.
- Frontend acceptance checklist.
- Git/worktree protection.
- Validation and delivery notes.

The Codex file (`AGENTS.md`) is intentionally a thin pointer: standard Markdown without frontmatter that instructs the agent to read and follow `.cursor/rules/project-base-rules.mdc`, plus a note of which framework conventions that file covers. It must not duplicate the rule body.
