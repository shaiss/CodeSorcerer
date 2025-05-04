# Project Commands

## Build & Run
- Run server: `cd packages/server && bun dev`
- Build site: `cd packages/site && bun build:dev`
- Serve site: `cd packages/site && bun serve`
- Run agent: `cd packages/agent && bun run src/index.ts`

## Testing
- Run all tests: `bun test`
- Run single test: `bun test packages/poker-state-machine/state_machine.test.ts`
- Run tests with pattern: `bun test --test-name-pattern "start round"`

# Code Style Guidelines

## TypeScript
- Use strict mode with explicit typing
- Prefer TypeScript interfaces and types for all data structures
- Use type annotations for function parameters and return types

## Formatting
- Use 2-space indentation
- Use camelCase for variables, functions, and properties
- Use PascalCase for classes, interfaces, and type aliases
- Use UPPER_CASE for constants

## React
- Use functional components with hooks
- Use named exports for components
- Prefer explicit prop types

## Imports/Exports
- Use named exports/imports
- Use ES modules syntax (import/export)
- Group imports by external/internal libraries