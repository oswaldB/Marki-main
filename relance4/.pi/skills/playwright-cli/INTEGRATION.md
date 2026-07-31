# Playwright CLI Skill Integration

This document explains how to integrate the Playwright CLI skill into various workflows and systems.

## Integration with CI/CD Pipelines

### GitHub Actions

```yaml
name: Playwright Tests

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: 18
    
    - name: Install dependencies
      run: npm ci
    
    - name: Install Playwright browsers
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

### GitLab CI

```yaml
stages:
  - test

playwright-tests:
  stage: test
  image: node:18
  script:
    - npm ci
    - npx playwright install
    - npx playwright test
  artifacts:
    when: always
    paths:
      - playwright-report/
    expire_in: 1 week
```

### Jenkins

```groovy
pipeline {
    agent any
    
    stages {
        stage('Install') {
            steps {
                sh 'npm ci'
                sh 'npx playwright install'
            }
        }
        
        stage('Test') {
            steps {
                sh 'npx playwright test'
            }
        }
        
        stage('Archive Results') {
            steps {
                archiveArtifacts artifacts: 'playwright-report/**', fingerprint: true
            }
        }
    }
}
```

## Integration with Development Workflows

### Pre-commit Hooks

Add this to your `package.json`:

```json
"scripts": {
  "precommit": "npx playwright test --only-changed",
  "prepare": "npx playwright install"
}
```

### VS Code Integration

Add these tasks to your `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Run Playwright Tests",
      "type": "shell",
      "command": "npx playwright test",
      "group": {
        "kind": "test",
        "isDefault": true
      }
    },
    {
      "label": "Show Playwright Report",
      "type": "shell",
      "command": "npx playwright show-report",
      "dependsOn": ["Run Playwright Tests"]
    }
  ]
}
```

## Integration with Monitoring Systems

### Prometheus Metrics

You can expose test results as metrics:

```javascript
// metrics.js
const { execSync } = require('child_process');
const express = require('express');
const app = express();

app.get('/metrics', (req, res) => {
  try {
    const result = execSync('npx playwright test --list', { encoding: 'utf-8' });
    const testCount = result.split('\n').filter(line => line.includes('✓')).length;
    
    res.send(`
# HELP playwright_tests_total Total number of Playwright tests
# TYPE playwright_tests_total gauge
playwright_tests_total ${testCount}
    `);
  } catch (error) {
    res.status(500).send('Error collecting metrics');
  }
});

app.listen(9090, () => console.log('Metrics server running on port 9090'));
```

## Integration with Test Management Tools

### JIRA Integration

```bash
#!/bin/bash
# Run tests and create JIRA issues for failures

# Run tests and capture output
OUTPUT=$(npx playwright test 2>&1)
EXIT_CODE=$?

# Check for failures
if [ $EXIT_CODE -ne 0 ]; then
  FAILURES=$(echo "$OUTPUT" | grep -c "FAIL")
  
  # Create JIRA issue (pseudo-code)
  # jira create --type Bug --summary "Playwright Tests Failed: $FAILURES failures" \
  #   --description "$OUTPUT" --project TEST
  
  echo "Created JIRA issue for $FAILURES test failures"
fi
```

## Integration with Notification Systems

### Slack Notifications

```javascript
// slack-notify.js
const { execSync } = require('child_process');
const axios = require('axios');

try {
  const result = execSync('npx playwright test', { encoding: 'utf-8' });
  const passed = result.includes('passed');
  
  await axios.post(process.env.SLACK_WEBHOOK, {
    text: passed ? '✅ Playwright tests passed' : '❌ Playwright tests failed',
    attachments: [{
      text: result.substring(0, 1000),
      mrkdwn_in: ['text']
    }]
  });
} catch (error) {
  await axios.post(process.env.SLACK_WEBHOOK, {
    text: '❌ Playwright tests failed with error',
    attachments: [{
      text: error.message.substring(0, 1000),
      mrkdwn_in: ['text']
    }]
  });
}
```

## Integration with Docker

### Dockerfile

```dockerfile
FROM mcr.microsoft.com/playwright:v1.32.0-focal

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx playwright install --with-deps

CMD ["npx", "playwright", "test"]
```

### Docker Compose

```yaml
version: '3'

services:
  playwright:
    build: .
    volumes:
      - .:/app
      - /app/node_modules
    ports:
      - "9323:9323"
    environment:
      - CI=true
```

## Integration with Cloud Services

### AWS CodeBuild

```yaml
version: 0.2

phases:
  install:
    runtime-versions:
      nodejs: 18
    commands:
      - npm ci
      - npx playwright install
  
  build:
    commands:
      - npx playwright test
  
  post_build:
    commands:
      - aws s3 cp playwright-report s3://my-bucket/reports/ --recursive
```

### Azure Pipelines

```yaml
trigger:
- main

pool:
  vmImage: 'ubuntu-latest'

steps:
- task: NodeTool@0
  inputs:
    versionSpec: '18.x'
  displayName: 'Install Node.js'

- script: npm ci
  displayName: 'Install dependencies'

- script: npx playwright install
  displayName: 'Install browsers'

- script: npx playwright test
  displayName: 'Run tests'

- task: PublishPipelineArtifact@1
  inputs:
    targetPath: 'playwright-report'
    artifact: 'playwright-report'
  condition: always()
```

## Integration with Monitoring and Alerting

### Health Checks

```bash
#!/bin/bash
# Health check script that runs Playwright tests

TEST_RESULT=$(npx playwright test --reporter=line 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo "CRITICAL: Playwright tests failed"
  echo "$TEST_RESULT"
  exit 2
fi

echo "OK: All Playwright tests passed"
exit 0
```

### Log Aggregation

```javascript
// log-forwarder.js
const { execSync } = require('child_process');
const { createWriteStream } = require('fs');

const logStream = createWriteStream('/var/log/playwright-tests.log', { flags: 'a' });

try {
  const result = execSync('npx playwright test', {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  logStream.write(`[${new Date().toISOString()}] TEST RUN\n`);
  logStream.write(result);
  logStream.write('\n\n');
} catch (error) {
  logStream.write(`[${new Date().toISOString()}] TEST FAILURE\n`);
  logStream.write(error.stdout || error.message);
  logStream.write('\n\n');
}
```

## Best Practices for Integration

1. **Environment Consistency**: Use the same Node.js and Playwright versions across environments
2. **Browser Management**: Always run `npx playwright install` before tests
3. **Artifact Preservation**: Save test reports and traces for debugging
4. **Parallel Execution**: Configure workers appropriately for your CI environment
5. **Resource Management**: Be mindful of browser resource usage in containers
6. **Test Sharding**: Use `--shard` for parallel execution across multiple machines
7. **Configuration**: Use environment-specific configuration files
8. **Caching**: Cache node_modules and browser binaries for faster builds

## Troubleshooting Integration Issues

### Common Issues and Solutions

1. **Browser Installation Failures**:
   - Solution: Run with `--with-deps` or install dependencies manually
   - Command: `npx playwright install --with-deps`

2. **Permission Issues in Containers**:
   - Solution: Run as non-root user or adjust permissions
   - Command: `chown -R node:node /app`

3. **Resource Limits in CI**:
   - Solution: Limit workers and use headless mode
   - Command: `npx playwright test --workers=2`

4. **Network Issues**:
   - Solution: Configure proxy settings or retry logic
   - Command: `npx playwright test --retries=2`

5. **Test Isolation**:
   - Solution: Use separate projects for different test types
   - Configuration: Define multiple projects in `playwright.config.ts`

## Advanced Integration Patterns

### Test Impact Analysis

```bash
#!/bin/bash
# Run only tests affected by recent changes

# Get changed files
CHANGED_FILES=$(git diff --name-only HEAD~5)

# Run tests for changed files
for file in $CHANGED_FILES; do
  if [[ $file == *.spec.ts ]]; then
    npx playwright test $file
  fi
done
```

### Performance Monitoring

```javascript
// performance-monitor.js
const { execSync } = require('child_process');
const fs = require('fs');

const startTime = Date.now();
const result = execSync('npx playwright test --reporter=json', { encoding: 'utf-8' });
const endTime = Date.now();

const duration = endTime - startTime;
const report = JSON.parse(result);

fs.appendFileSync('performance.log', `
${new Date().toISOString()},${duration},${report.passed},${report.failed}
`);

console.log(`Test run completed in ${duration}ms`);
console.log(`Passed: ${report.passed}, Failed: ${report.failed}`);
```

### Multi-environment Testing

```bash
#!/bin/bash
# Run tests against multiple environments

ENVIRONMENTS=("dev" "staging" "prod")

for env in "${ENVIRONMENTS[@]}"; do
  echo "Running tests for $env environment"
  ENV=$env npx playwright test --config playwright.$env.config.ts
  
  if [ $? -ne 0 ]; then
    echo "Tests failed for $env environment"
    exit 1
  fi
done

echo "All environment tests passed"
```