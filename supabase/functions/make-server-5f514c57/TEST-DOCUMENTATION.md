# Bantay SP Edge Function - Test Documentation

## Overview

This document provides comprehensive testing guidance for the Bantay SP Edge Function. The test suite covers:

- **Authentication & JWT Validation**: JWT extraction, claims validation, token expiration
- **Report Creation & Validation**: Report structure, field validation, status workflows
- **Cloudinary URL Validation**: File upload validation, URL format checking
- **Data Consistency**: Database transactions, cascading deletes, trigger-based updates
- **Role-Based Access Control**: Admin/patrol permissions, user isolation

## Test Architecture

### Test Utilities (`test-utils.ts`)

Provides helper functions for creating test data and mocking requests:

```typescript
// Create JWT tokens
const token = createTestJWT(userId);
const tokenWithExpiry = createTestJWT(userId, { exp: futureTimestamp });

// Create test data
const report = createTestReport({ title: "My Alert", category: "fire" });
const user = createTestUser({ role: "patrol" });
const context = createTestContext(); // Complete test context

// Helper functions
isValidJWTFormat(token)
extractJWTPayload(token)
isCloudinaryUrl(url)
validateReport(report)
```

### Validation Helpers (`validators.ts`)

Comprehensive validation functions with detailed error reporting:

```typescript
// Validate report with detailed errors
const result = validateReport(report);
// { valid: true, errors: {} } or
// { valid: false, errors: { title: ["too short"], category: ["invalid"] } }

// Role checking
hasRequiredRole("patrol", "patrol") // true
hasRequiredRole("user", "admin") // false

// JWT validation
validateJWT(token)

// Status transitions
isValidStatusTransition("pending", "in_progress") // true
isValidStatusTransition("resolved", "pending") // false
```

### Test Scenarios (`test-scenarios.ts`)

Integration tests organized by feature:

```typescript
// Run all test suites
const results = await runAllTests();
// { totalTests: 42, passedTests: 42, failedTests: 0 }
```

## Running Tests

### Deno Tests

```bash
# Run all tests
deno test --allow-all test-scenarios.ts

# Run specific test suite
deno test --allow-all test-scenarios.ts --filter "Authentication"

# With verbose output
deno test --allow-all --output test-results.json test-scenarios.ts
```

### Using Test Utilities

```typescript
import { createTestContext, validateReport } from "./test-utils.ts";

// Create test context with JWT and user data
const context = createTestContext();

// Use context to make authenticated requests
const headers = context.headers; // { "Authorization": "Bearer token..." }
const report = context.report;   // Pre-populated report object

// Validate the report
const validation = validateReport({
  ...report,
  id: "RPT-123",
  user_id: context.userId,
  status: "pending",
  verified: false,
});

if (!validation.valid) {
  console.error("Validation errors:", validation.errors);
}
```

## Test Coverage

### 1. Authentication & JWT Validation

**File**: `test-scenarios.ts` → `testAuthenticationSuite()`

| Test | Purpose | Expected Behavior |
|------|---------|-------------------|
| Valid JWT creation | Ensure JWT tokens are properly formatted | Token has 3 parts, extractable payload |
| Custom timestamps | Validate token timing claims | `iat` and `exp` claims present and correct |
| Required claims | Verify all JWT claims | Contains `sub`, `aud`, `role`, `iat`, `exp` |

**Logging Points**:
- Token created: `[JWT] Successfully extracted user_id: {first8chars}...`
- Token timestamps: `[JWT] Token issued at: {ISO}` and `[JWT] Token expires at: {ISO}`
- Failures: `[JWT] JWT extraction failed - {reason}`

### 2. Report Creation & Validation

**File**: `test-scenarios.ts` → `testReportCreationSuite()`

| Test | Purpose | Expected Behavior |
|------|---------|-------------------|
| Valid report object | Create report with required fields | All fields present and typed correctly |
| Field validation | Detect missing required fields | Errors list all missing fields |
| Status enum validation | Accept only valid statuses | `pending`, `in_progress`, `resolved`, `rejected` |
| Field length validation | Enforce min/max length constraints | Title 5-200 chars, description 10-2000 chars |

**Field Constraints**:
```
title:       5-200 characters
description: 10-2000 characters
location:    5-200 characters
category:    fire, crime, accident, hazard, other
status:      pending, in_progress, resolved, rejected
verified:    boolean (only settable by patrol/admin)
```

### 3. Cloudinary URL Validation

**File**: `test-scenarios.ts` → `testCloudinaryValidationSuite()`

| Test | Purpose | Expected Behavior |
|------|---------|-------------------|
| Valid Cloudinary URLs | Accept URLs from Cloudinary CDN | `res.cloudinary.com` + folder |
| Invalid URL rejection | Reject non-Cloudinary URLs | AWS S3, Imgur, direct URLs rejected |

**Validation Logic**:
```typescript
// Valid: https://res.cloudinary.com/dzqtdl5aa/image/upload/v123/bantay-reports/file.jpg
// Invalid: https://s3.amazonaws.com/bucket/file.jpg

// Backend check:
hostname.includes("cloudinary.com") || hostname.includes("res.cloudinary.com")
```

### 4. Request/Response Logging

**File**: `supabase/functions/make-server-5f514c57/index.ts`

All endpoints now log with `[REQUEST_ID]` prefix for tracing:

```
[REQ-1234567890] POST /reports - Report creation started
[REQ-1234567890] JWT extraction - Header present: true
[REQ-1234567890] JWT verified - User ID: 12345678...
[REQ-1234567890] Request body received - Title: "Fire at Main St", Category: "fire"
[REQ-1234567890] Validation passed - All required fields present
[REQ-1234567890] Image URL provided - Validating...
[REQ-1234567890] Image URL validated - URL: https://res.cloudinary.com/dzq...
[REQ-1234567890] Report object created - ID: RPT-1234567890, User: 12345678..., Status: pending, Verified: false
[REQ-1234567890] Inserting report into Supabase...
[REQ-1234567890] Report successfully inserted into Supabase - ID: RPT-1234567890
[REQ-1234567890] POST /reports completed successfully (245ms) - Report ID: RPT-1234567890
```

**Log Levels**:
- `console.log()` - Informational (request flow)
- `console.warn()` - Validation failures, unexpected conditions
- `console.error()` - System errors, database failures

### 5. Data Validation Examples

#### Valid Report

```json
{
  "id": "RPT-1234567890",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Fire at Downtown Building",
  "category": "fire",
  "location": "123 Main Street, Downtown",
  "description": "Large fire visible on top floor of 5-story commercial building.",
  "image_url": "https://res.cloudinary.com/dzqtdl5aa/image/upload/v1234567890/bantay-reports/fire.jpg",
  "status": "pending",
  "verified": false,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Invalid Report (Validation Errors)

```typescript
const invalid = {
  title: "Fire",  // Too short (< 5 chars)
  category: "arson",  // Invalid category
  location: "St.",  // Too short (< 5 chars)
  description: "Big fire",  // Too short (< 10 chars)
  image_url: "https://imgur.com/image.jpg",  // Not Cloudinary
};

await validateReport(invalid);
// {
//   valid: false,
//   errors: {
//     title: ["Title must be at least 5 characters"],
//     category: ["Category must be one of: fire, crime, accident, hazard, other"],
//     location: ["Location must be at least 5 characters"],
//     description: ["Description must be at least 10 characters"],
//     image_url: ["Image URL must be from Cloudinary"],
//     user_id: ["User ID is required and must be a string"],
//   }
// }
```

## Testing Scenarios

### Scenario 1: Authenticated User Creates Report

**Objective**: Verify user_id is correctly extracted from JWT and stored

**Steps**:
1. Create test context: `const ctx = createTestContext();`
2. Generate JWT token: `const token = ctx.token;`
3. Prepare report: `const data = ctx.report;`
4. Make request with Auth header: `POST /reports` with `Authorization: Bearer {token}`
5. Verify response includes `user_id` matching JWT `sub` claim

**Expected Logs**:
```
[REQ-xxx] JWT verified - User ID: 550e8400...
[REQ-xxx] Report successfully inserted into Supabase - ID: RPT-xxx
```

**Validation**:
```typescript
// Assert that report.user_id === extractJWTPayload(token).sub
assertEquals(response.user_id, extractJWTPayload(token).sub);
```

### Scenario 2: Unauthenticated Request

**Objective**: Verify 401 response without Authorization header

**Steps**:
1. Make request WITHOUT Authorization header
2. Verify 401 response with error message

**Expected Logs**:
```
[REQ-xxx] JWT extraction - Header present: false
[REQ-xxx] JWT extraction failed - No Authorization header
[REQ-xxx] Returning 401 Unauthorized
```

**Validation**:
```typescript
assertEquals(response.status, 401);
assertEquals(response.error, "Unauthorized: Valid authentication token required...");
```

### Scenario 3: Invalid Cloudinary URL

**Objective**: Reject image URLs not from Cloudinary

**Steps**:
1. Submit report with `image_url: "https://s3.amazonaws.com/..."`
2. Verify validation error

**Expected Logs**:
```
[REQ-xxx] Image URL provided - Validating...
[REQ-xxx] Image URL validation failed - Not from Cloudinary (s3.amazonaws.com)
```

**Validation**:
```typescript
assertEquals(response.status, 400);
assertEquals(response.error, "Image URL must be from Cloudinary");
```

### Scenario 4: Leaderboard Points Only on Verification

**Objective**: Verify points awarded only on `verified=true`, not on creation

**Steps**:
1. Create report as user (verified=false, user not eligible yet)
2. Check leaderboard points - should be 0
3. Verify report by patrol (handle_report_verification trigger fires)
4. Check leaderboard points - should be +50

**Expected Database State**:
```sql
-- Before verification
SELECT points FROM leaderboard WHERE user_id = '550e8400...';  -- 0

-- After verification (trigger fires)
SELECT points FROM leaderboard WHERE user_id = '550e8400...';  -- 50
```

**Verification**:
```typescript
// After report creation
const leaderboard1 = await getLeaderboard(userId);
assertEquals(leaderboard1.points, 0);

// After verification
await updateReportStatus(reportId, { verified: true });
const leaderboard2 = await getLeaderboard(userId);
assertEquals(leaderboard2.points, 50);
```

### Scenario 5: Role-Based Access Control

**Objective**: Only patrol/admin can update report status

**Steps**:
1. Create report as regular user
2. Attempt status update as regular user - should fail (403)
3. Attempt status update as patrol - should succeed
4. Attempt status update as admin - should succeed

**Expected Responses**:
```typescript
// Regular user attempt
assertEquals(response.status, 403);
assertEquals(response.error, "Insufficient permissions");

// Patrol/admin attempt
assertEquals(response.status, 200);
assertEquals(response.verified, true);
```

## Debugging with Logs

### Enable Debug Logging

```typescript
// In test-scenarios.ts
const testContext = createTestContext();
console.log("[DEBUG] User ID:", testContext.userId);
console.log("[DEBUG] Token:", testContext.token.substring(0, 20) + "...");
console.log("[DEBUG] Payload:", testContext.payload);
```

### Monitor Log Output

Watch for these key log patterns:

| Pattern | Meaning |
|---------|---------|
| `[JWT] Successfully extracted user_id: ...` | Authentication passed |
| `[JWT] JWT extraction failed` | Authentication failed (check header format) |
| `Validation passed - All required fields present` | Report structure valid |
| `Image URL validated` | Image URL from Cloudinary |
| `Report successfully inserted` | Database write successful |
| `undefined` in logs | Missing field or null value |

### Trace Token Flow

```typescript
const token = createTestJWT(userId);
const payload = extractJWTPayload(token);

console.log("1. Token format valid:", isValidJWTFormat(token));
console.log("2. JWT validation:", validateJWT(token));
console.log("3. Payload sub:", payload.sub);
console.log("4. Expiration valid:", new Date(payload.exp * 1000) > new Date());
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test Edge Function

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: denoland/setup-deno@v1
      - run: deno test --allow-all supabase/functions/make-server-5f514c57/test-scenarios.ts
```

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| JWT extraction fails | No Authorization header | Add `Authorization: Bearer {token}` header |
| Validation errors | Missing required fields | Check field names and types match constraints |
| Cloudinary URL rejected | Not from res.cloudinary.com | Ensure image_url includes `cloudinary.com` domain |
| Leaderboard points not awarded | Report not verified | Use `PUT /reports/{id}` with `verified: true` |
| User ID mismatch | Name-based matching attempt | Use UUID from JWT, not user name |

## Extending Tests

### Add New Test Suite

```typescript
export function testCustomSuite() {
  return {
    name: "My Feature",
    tests: [
      {
        name: "Feature works correctly",
        async run() {
          const result = await myFeature();
          assertEquals(result, expectedValue);
          console.log("✓ Feature works");
        },
      },
    ],
  };
}

// Add to runAllTests():
const suites = [
  // ... existing suites
  testCustomSuite(),
];
```

### Add New Validator

```typescript
export function validateCustomObject(obj: unknown): ValidationResult {
  const errors: Record<string, string[]> = {};
  // ... validation logic
  return { valid: Object.keys(errors).length === 0, errors };
}
```

## Performance Benchmarks

**Expected Timing** (under normal conditions):

| Operation | Duration |
|-----------|----------|
| JWT extraction | < 5ms |
| Report validation | < 10ms |
| Database insertion | < 50ms |
| Total report creation | < 100ms |

## Continuous Monitoring

### Key Metrics to Track

- JWT extraction success rate
- Report creation latency (p95, p99)
- Validation failure rate by field
- Leaderboard update delays
- Database query performance

### Logging for Monitoring

```typescript
// Each operation now includes timing and result indicators:
const duration = Date.now() - startTime;
console.log(`[${requestId}] POST /reports completed successfully (${duration}ms)`);
```

---

**Last Updated**: Phase 5 - Testing & Validation
**Maintainer**: Bantay SP Development Team
