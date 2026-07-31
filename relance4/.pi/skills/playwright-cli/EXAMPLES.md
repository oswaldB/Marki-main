# Playwright CLI Skill Examples

This document provides real-world examples of how to use the Playwright CLI skill.

## Example 1: Running a Complete Test Suite

**User Request:**
"Agent, please run all Playwright tests and show me the results"

**Agent Response:**
```bash
# First, run all tests
npx playwright test

# Then show the report
npx playwright show-report
```

## Example 2: Debugging a Failing Test

**User Request:**
"Agent, the login test is failing. Can you help me debug it?"

**Agent Response:**
```bash
# Run the specific failing test in debug mode
npx playwright test tests/login.spec.ts --debug

# Show the trace for detailed analysis
npx playwright show-trace test-results/login-test/trace.zip
```

## Example 3: Generating Test Code

**User Request:**
"Agent, I need to create tests for our new checkout page at https://example.com/checkout"

**Agent Response:**
```bash
# Generate test code for the checkout page
npx playwright codegen https://example.com/checkout --output tests/checkout.spec.ts
```

## Example 4: Running Tests for Specific Browser

**User Request:**
"Agent, run the smoke tests only on Chromium"

**Agent Response:**
```bash
npx playwright test --project=chromium -g "smoke test"
```

## Example 5: Viewing Test Report on Custom Port

**User Request:**
"Agent, show me the test report on port 9000"

**Agent Response:**
```bash
npx playwright show-report --port 9000
```

## Example 6: Installing Browsers with Dependencies

**User Request:**
"Agent, set up Playwright with all browsers and dependencies"

**Agent Response:**
```bash
# Install browsers with dependencies
npx playwright install --with-deps
```

## Example 7: Running Tests in Headed Mode

**User Request:**
"Agent, run the registration tests so I can see what's happening"

**Agent Response:**
```bash
npx playwright test tests/registration.spec.ts --headed
```

## Example 8: Merging Test Reports

**User Request:**
"Agent, merge the test reports from our parallel CI runs"

**Agent Response:**
```bash
npx playwright merge-reports ./test-reports/
```

## Example 9: Running Tests with Custom Configuration

**User Request:**
"Agent, run the API tests with the staging configuration"

**Agent Response:**
```bash
npx playwright test --config playwright.staging.config.ts -g "api test"
```

## Example 10: Generating Python Test Code

**User Request:**
"Agent, generate Python test code for our admin dashboard"

**Agent Response:**
```bash
npx playwright codegen --target python https://example.com/admin
```

## Example 11: Running Tests with Tracing

**User Request:**
"Agent, run the payment tests with tracing enabled for debugging"

**Agent Response:**
```bash
npx playwright test tests/payment.spec.ts --trace on
```

## Example 12: Clearing Cache

**User Request:**
"Agent, clear the Playwright cache to resolve some issues"

**Agent Response:**
```bash
npx playwright clear-cache
```

## Example 13: Running Tests with Specific Reporter

**User Request:**
"Agent, run the tests and output results in JSON format"

**Agent Response:**
```bash
npx playwright test --reporter=json
```

## Example 14: Running Tests with Custom Timeout

**User Request:**
"Agent, run the long-running tests with a 2-minute timeout"

**Agent Response:**
```bash
npx playwright test tests/long-running.spec.ts --timeout=120000
```

## Example 15: Running Tests with Retries

**User Request:**
"Agent, run the flaky tests with 3 retries"

**Agent Response:**
```bash
npx playwright test tests/flaky.spec.ts --retries=3
```

## Example 16: Running Tests in UI Mode

**User Request:**
"Agent, I want to explore and run tests interactively"

**Agent Response:**
```bash
npx playwright test --ui
```

## Example 17: Running Only Changed Tests

**User Request:**
"Agent, run only the tests that have changed since the last commit"

**Agent Response:**
```bash
npx playwright test --only-changed
```

## Example 18: Running Tests with Custom Workers

**User Request:**
"Agent, run the tests with only 2 workers to reduce resource usage"

**Agent Response:**
```bash
npx playwright test --workers=2
```

## Example 19: Running Tests with Environment Variables

**User Request:**
"Agent, run the tests with the staging environment variables"

**Agent Response:**
```bash
export ENV=staging
npx playwright test
```

## Example 20: Running Tests and Saving Report

**User Request:**
"Agent, run all tests and save the report for later analysis"

**Agent Response:**
```bash
# Run tests
npx playwright test

# The report is automatically saved to playwright-report/
# You can view it later with:
npx playwright show-report playwright-report/
```