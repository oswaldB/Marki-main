# Playwright CLI Skill

This skill provides an interface to interact with Playwright's command-line tools for testing web applications.

## Installation

To use this skill, you need to have Playwright installed in your project:

```bash
npm init playwright@latest
```

## Features

- **Run Tests**: Execute Playwright tests with various options and filters
- **Show Reports**: View HTML test reports from previous runs
- **Install Browsers**: Install and manage different browsers
- **Code Generation**: Generate test code using Playwright Codegen
- **Trace Viewer**: Analyze and view test traces for debugging
- **Merge Reports**: Combine multiple test reports
- **Clear Cache**: Clear all Playwright caches

## Usage Examples

### Running Tests

Run all tests:
```bash
npx playwright test
```

Run specific test file:
```bash
npx playwright test tests/example.spec.ts
```

Run tests with options:
```bash
npx playwright test --headed --project=chromium --grep="login test"
```

### Viewing Reports

Show latest report:
```bash
npx playwright show-report
```

Show specific report on custom port:
```bash
npx playwright show-report playwright-report/ --port 8080
```

### Browser Management

Install all browsers:
```bash
npx playwright install
```

Install specific browser:
```bash
npx playwright install chromium firefox
```

### Code Generation

Generate test code:
```bash
npx playwright codegen https://example.com
```

Generate Python code:
```bash
npx playwright codegen --target python https://example.com
```

### Debugging

View trace:
```bash
npx playwright show-trace trace.zip
```

Run in debug mode:
```bash
npx playwright test --debug
```

## Common Options

### Test Command Options
- `--headed`: Run tests in headed browsers
- `--project`: Run tests for specific project
- `--grep`: Run tests matching regex pattern
- `--debug`: Run in debug mode
- `--ui`: Interactive UI mode
- `--workers`: Number of concurrent workers
- `--reporter`: Specify reporter
- `--timeout`: Test timeout
- `--retries`: Retry count for flaky tests
- `--trace`: Tracing mode

### Report Options
- `--host`: Host to serve report on
- `--port`: Port to serve report on

### Install Options
- `--with-deps`: Install browser dependencies
- `--force`: Force reinstall
- `--dry-run`: Show what would be installed

## Skill Integration

This skill can be used by the agent to:
1. Automate test execution
2. Generate test code from user interactions
3. Analyze test results and reports
4. Debug failing tests using traces
5. Manage test environments

## Requirements

- Node.js 14+
- Playwright installed (`npm init playwright@latest`)
- Browsers installed (`npx playwright install`)

## Documentation

For more information about Playwright CLI commands, see:
- [Playwright Test CLI Documentation](https://playwright.dev/docs/test-cli)
- [Playwright Codegen](https://playwright.dev/docs/codegen-intro)
- [Playwright Trace Viewer](https://playwright.dev/docs/trace-viewer)