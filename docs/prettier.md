# Prettier Configuration Guidelines

## Purpose

This project uses **Prettier** as the single source of truth for code formatting. The goal is to
produce code that is predictable, easy to read, and visually similar to the conventions commonly
found in Java projects while remaining idiomatic for modern JavaScript and Node.js.

When modifying `.prettierrc.json`, preserve both the **option values** and the **logical
ordering** unless there is a compelling reason to change them.

## Configuration Order

Options are grouped by concern rather than alphabetically.

### 1. Line Length

Controls how wide the code is allowed to grow before wrapping.

```json
"printWidth"
```

### 2. Indentation

Defines how code is indented.

```json
"tabWidth"
"useTabs"
```

### 3. JavaScript Style

Defines the project's preferred JavaScript syntax.

```json
"semi"
"singleQuote"
"quoteProps"
"trailingComma"
"arrowParens"
```

### 4. Brackets and Objects

Controls spacing and formatting around brackets and object literals.

```json
"bracketSpacing"
"bracketSameLine"
"objectWrap"
```

### 5. File Endings

Defines cross-platform file ending behavior.

```json
"endOfLine"
```

## Design Principles

- Prefer readability over compactness.
- Follow consistent formatting instead of personal preferences.
- Keep formatting close to Java-style conventions where Prettier allows it.
- Avoid adding options that duplicate behavior already handled by Prettier defaults.
- Do not reorder configuration keys without a clear reason.

## Current Configuration

```json
{
  "printWidth": 100,

  "tabWidth": 2,
  "useTabs": false,

  "semi": true,
  "singleQuote": false,
  "quoteProps": "as-needed",
  "trailingComma": "none",
  "arrowParens": "always",

  "bracketSpacing": true,
  "bracketSameLine": false,
  "objectWrap": "preserve",

  "endOfLine": "lf"
}
```

## Instructions for AI Coding Agents

When editing `.prettierrc.json`:

- Preserve the grouping and ordering of options.
- Insert new options into the most appropriate section rather than appending them to the end.
- Do not sort keys alphabetically.
- Do not change formatting preferences unless explicitly requested.
- Prefer minimal, intentional changes that maintain consistency with the existing style.

Run `pnpm format` to apply the config, `pnpm format:check` to verify it in CI without writing.
