# Using the Playwright CLI Skill

This guide explains how to use the Playwright CLI skill with the agent.

## Basic Usage

### Running Tests

To run all tests:
```
Agent, please run Playwright tests
```

To run specific tests:
```
Agent, run Playwright tests for the login functionality
```

### Viewing Reports

To view test reports:
```
Agent, show me the latest Playwright test report
```

### Generating Code

To generate test code:
```
Agent, generate Playwright test code for https://example.com
```

### Debugging

To debug failing tests:
```
Agent, show me the trace for the failing test
```

## Advanced Usage

### Running Tests with Options

Run tests in headed mode:
```
Agent, run Playwright tests in headed mode
```

Run tests for specific project:
```
Agent, run Playwright tests for Chromium only
```

Run tests matching specific pattern:
```
Agent, run Playwright tests that include "smoke test" in the name
```

### Browser Management

Install browsers:
```
Agent, install Playwright browsers
```

Install specific browser:
```
Agent, install Chromium browser
```

### Report Analysis

Show report on specific port:
```
Agent, show Playwright report on port 8080
```

### Code Generation

Generate Python test code:
```
Agent, generate Python test code for https://example.com
```

## Skill Commands Reference

### Test Execution
- `playwright test` - Run all tests
- `playwright test <file>` - Run specific test file
- `playwright test --headed` - Run in headed mode
- `playwright test --project=<name>` - Run for specific project
- `playwright test -g <pattern>` - Run tests matching pattern
- `playwright test --debug` - Run in debug mode
- `playwright test --ui` - Run in interactive UI mode

### Report Viewing
- `playwright show-report` - Show latest report
- `playwright show-report <path>` - Show specific report
- `playwright show-report --port <port>` - Show on custom port

### Browser Management
- `playwright install` - Install all browsers
- `playwright install <browser>` - Install specific browser
- `playwright install --with-deps` - Install with dependencies

### Code Generation
- `playwright codegen <url>` - Generate test code
- `playwright codegen --target <language>` - Generate in specific language
- `playwright codegen --output <file>` - Save to specific file

### Debugging
- `playwright show-trace <trace>` - View test trace
- `playwright test --trace on` - Run with tracing enabled

### Utilities
- `playwright merge-reports <dir>` - Merge reports
- `playwright clear-cache` - Clear caches

## Best Practices

1. **Test Organization**: Keep tests organized in a `tests/` directory
2. **Configuration**: Use `playwright.config.ts` for project configuration
3. **Parallel Execution**: Enable parallel execution for faster test runs
4. **Tracing**: Use tracing for debugging failing tests
5. **Retries**: Configure retries for flaky tests on CI

## Troubleshooting

If you encounter issues:

1. Make sure Playwright is installed: `npm init playwright@latest`
2. Install browsers: `npx playwright install`
3. Check configuration: `playwright.config.ts`
4. Run with debug mode: `npx playwright test --debug`

## Integration with CI/CD

The skill can be used to automate Playwright tests in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Install dependencies
  run: npm ci

- name: Install browsers
  run: npx playwright install

- name: Run Playwright tests
  run: npx playwright test

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```