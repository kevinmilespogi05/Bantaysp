/**
 * Validation helpers for Bantay SP Edge Function
 * Provides centralized validation for reports, users, comments, and requests
 */

/**
 * Validation result type
 */
export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string[]>;
}

/**
 * Report field constraints
 */
const REPORT_CONSTRAINTS = {
  title: { minLength: 5, maxLength: 200 },
  description: { minLength: 10, maxLength: 2000 },
  category: { values: ["fire", "crime", "accident", "hazard", "other"] },
  status: { values: ["pending", "accepted", "in_progress", "resolved", "rejected"] },
  priority: { values: ["low", "medium", "high", "urgent"] },
  location: { minLength: 5, maxLength: 200 },
};

/**
 * User field constraints
 */
const USER_CONSTRAINTS = {
  email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  full_name: { minLength: 2, maxLength: 100 },
};

/**
 * Comment field constraints
 */
const COMMENT_CONSTRAINTS = {
  text: { minLength: 1, maxLength: 1000 },
};

/**
 * Validate report object comprehensively
 * @param report - Report object to validate
 * @returns ValidationResult with detailed errors
 */
export function validateReport(report: unknown): ValidationResult {
  const errors: Record<string, string[]> = {};

  if (!report || typeof report !== "object") {
    return {
      valid: false,
      errors: { root: ["Report must be an object"] },
    };
  }

  const r = report as Record<string, unknown>;

  // Validate id
  if (!r.id || typeof r.id !== "string") {
    addError(errors, "id", "ID is required and must be a string");
  }

  // Validate user_id (UUID format)
  if (!r.user_id || typeof r.user_id !== "string") {
    addError(errors, "user_id", "User ID is required and must be a string");
  } else if (!isValidUUID(r.user_id as string)) {
    addError(errors, "user_id", "User ID must be a valid UUID");
  }

  // Validate title
  if (!r.title || typeof r.title !== "string") {
    addError(errors, "title", "Title is required and must be a string");
  } else {
    const titleStr = r.title as string;
    if (titleStr.length < REPORT_CONSTRAINTS.title.minLength) {
      addError(
        errors,
        "title",
        `Title must be at least ${REPORT_CONSTRAINTS.title.minLength} characters`
      );
    }
    if (titleStr.length > REPORT_CONSTRAINTS.title.maxLength) {
      addError(
        errors,
        "title",
        `Title must not exceed ${REPORT_CONSTRAINTS.title.maxLength} characters`
      );
    }
  }

  // Validate description
  if (!r.description || typeof r.description !== "string") {
    addError(
      errors,
      "description",
      "Description is required and must be a string"
    );
  } else {
    const descStr = r.description as string;
    if (descStr.length < REPORT_CONSTRAINTS.description.minLength) {
      addError(
        errors,
        "description",
        `Description must be at least ${REPORT_CONSTRAINTS.description.minLength} characters`
      );
    }
    if (descStr.length > REPORT_CONSTRAINTS.description.maxLength) {
      addError(
        errors,
        "description",
        `Description must not exceed ${REPORT_CONSTRAINTS.description.maxLength} characters`
      );
    }
  }

  // Validate category
  if (!r.category || typeof r.category !== "string") {
    addError(errors, "category", "Category is required and must be a string");
  } else if (!REPORT_CONSTRAINTS.category.values.includes(r.category as string)) {
    addError(
      errors,
      "category",
      `Category must be one of: ${REPORT_CONSTRAINTS.category.values.join(", ")}`
    );
  }

  // Validate location
  if (!r.location || typeof r.location !== "string") {
    addError(errors, "location", "Location is required and must be a string");
  } else {
    const locStr = r.location as string;
    if (locStr.length < REPORT_CONSTRAINTS.location.minLength) {
      addError(
        errors,
        "location",
        `Location must be at least ${REPORT_CONSTRAINTS.location.minLength} characters`
      );
    }
    if (locStr.length > REPORT_CONSTRAINTS.location.maxLength) {
      addError(
        errors,
        "location",
        `Location must not exceed ${REPORT_CONSTRAINTS.location.maxLength} characters`
      );
    }
  }

  // Validate status (optional, defaults to "pending")
  if (r.status && typeof r.status === "string") {
    if (!REPORT_CONSTRAINTS.status.values.includes(r.status)) {
      addError(
        errors,
        "status",
        `Status must be one of: ${REPORT_CONSTRAINTS.status.values.join(", ")}`
      );
    }
  }

  // Validate priority (optional)
  if (r.priority && typeof r.priority === "string") {
    if (!REPORT_CONSTRAINTS.priority.values.includes(r.priority)) {
      addError(
        errors,
        "priority",
        `Priority must be one of: ${REPORT_CONSTRAINTS.priority.values.join(", ")}`
      );
    }
  }

  // Validate verified (must be boolean)
  if (r.verified !== undefined && typeof r.verified !== "boolean") {
    addError(errors, "verified", "Verified must be a boolean");
  }

  // Validate image_url (if provided, must be valid URL)
  if (r.image_url && typeof r.image_url === "string") {
    if (!isValidURL(r.image_url as string)) {
      addError(errors, "image_url", "Image URL must be a valid URL");
    }
  }

  // Validate timestamp (if provided, must be ISO string)
  if (r.timestamp && typeof r.timestamp === "string") {
    if (!isValidISODate(r.timestamp as string)) {
      addError(
        errors,
        "timestamp",
        "Timestamp must be a valid ISO 8601 date string"
      );
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate user object
 * @param user - User object to validate
 * @returns ValidationResult with detailed errors
 */
export function validateUser(user: unknown): ValidationResult {
  const errors: Record<string, string[]> = {};

  if (!user || typeof user !== "object") {
    return {
      valid: false,
      errors: { root: ["User must be an object"] },
    };
  }

  const u = user as Record<string, unknown>;

  // Validate id (UUID)
  if (!u.id || typeof u.id !== "string") {
    addError(errors, "id", "ID is required and must be a string");
  } else if (!isValidUUID(u.id as string)) {
    addError(errors, "id", "ID must be a valid UUID");
  }

  // Validate email
  if (!u.email || typeof u.email !== "string") {
    addError(errors, "email", "Email is required and must be a string");
  } else if (!USER_CONSTRAINTS.email.pattern.test(u.email as string)) {
    addError(errors, "email", "Email must be a valid email address");
  }

  // Validate full_name (optional)
  if (u.full_name && typeof u.full_name === "string") {
    const nameStr = u.full_name as string;
    if (nameStr.length < USER_CONSTRAINTS.full_name.minLength) {
      addError(errors, "full_name", "Full name is too short");
    }
    if (nameStr.length > USER_CONSTRAINTS.full_name.maxLength) {
      addError(errors, "full_name", "Full name is too long");
    }
  }

  // Validate role
  if (u.role && typeof u.role !== "string") {
    addError(errors, "role", "Role must be a string");
  } else {
    const validRoles = ["user", "patrol", "admin"];
    if (!validRoles.includes(u.role as string)) {
      addError(
        errors,
        "role",
        `Role must be one of: ${validRoles.join(", ")}`
      );
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate comment object
 * @param comment - Comment object to validate
 * @returns ValidationResult with detailed errors
 */
export function validateComment(comment: unknown): ValidationResult {
  const errors: Record<string, string[]> = {};

  if (!comment || typeof comment !== "object") {
    return {
      valid: false,
      errors: { root: ["Comment must be an object"] },
    };
  }

  const c = comment as Record<string, unknown>;

  // Validate report_id
  if (!c.report_id || typeof c.report_id !== "string") {
    addError(
      errors,
      "report_id",
      "Report ID is required and must be a string"
    );
  }

  // Validate user_id
  if (!c.user_id || typeof c.user_id !== "string") {
    addError(errors, "user_id", "User ID is required and must be a string");
  } else if (!isValidUUID(c.user_id as string)) {
    addError(errors, "user_id", "User ID must be a valid UUID");
  }

  // Validate text
  if (!c.text || typeof c.text !== "string") {
    addError(errors, "text", "Comment text is required and must be a string");
  } else {
    const textStr = c.text as string;
    if (textStr.length < COMMENT_CONSTRAINTS.text.minLength) {
      addError(errors, "text", "Comment text cannot be empty");
    }
    if (textStr.length > COMMENT_CONSTRAINTS.text.maxLength) {
      addError(
        errors,
        "text",
        `Comment text must not exceed ${COMMENT_CONSTRAINTS.text.maxLength} characters`
      );
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate JWT token structure
 * @param token - JWT token to validate
 * @returns ValidationResult
 */
export function validateJWT(token: unknown): ValidationResult {
  const errors: Record<string, string[]> = {};

  if (!token || typeof token !== "string") {
    addError(errors, "token", "Token must be a string");
    return { valid: false, errors };
  }

  const parts = (token as string).split(".");
  if (parts.length !== 3) {
    addError(errors, "format", "Token must have three parts separated by dots");
    return { valid: false, errors };
  }

  const [headerPart, payloadPart] = parts;

  // Validate parts are base64-like
  if (!headerPart || !payloadPart) {
    addError(
      errors,
      "format",
      "Token header and payload must not be empty"
    );
    return { valid: false, errors };
  }

  try {
    const payload = JSON.parse(
      atob(
        payloadPart
          .replaceAll("-", "+")
          .replaceAll("_", "/")
          .padEnd(payloadPart.length + (4 - (payloadPart.length % 4)) % 4, "=")
      )
    );

    // Validate required claims
    if (!payload.sub) {
      addError(errors, "payload", "Token must contain 'sub' (subject) claim");
    }
    if (!payload.iat) {
      addError(errors, "payload", "Token must contain 'iat' (issued at) claim");
    }
    if (!payload.exp) {
      addError(errors, "payload", "Token must contain 'exp' (expiration) claim");
    }

    // Validate expiration
    if (payload.exp && typeof payload.exp === "number") {
      const expDate = new Date(payload.exp * 1000);
      if (expDate < new Date()) {
        addError(errors, "expiration", "Token has expired");
      }
    }
  } catch (err) {
    addError(errors, "format", "Token payload must be valid JSON");
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate status transition
 * @param currentStatus - Current report status
 * @param newStatus - New report status
 * @returns true if transition is valid
 */
export function isValidStatusTransition(
  currentStatus: string,
  newStatus: string
): boolean {
  const validTransitions: Record<string, string[]> = {
    pending: ["in_progress", "rejected"],
    in_progress: ["resolved", "rejected"],
    resolved: [], // Terminal state
    rejected: [], // Terminal state
  };

  return validTransitions[currentStatus]?.includes(newStatus) ?? false;
}

/**
 * Validate user role for action
 * @param userRole - User's role
 * @param requiredRole - Required role for action
 * @returns true if user has required role
 */
export function hasRequiredRole(
  userRole: string | undefined,
  requiredRole: "user" | "patrol" | "admin"
): boolean {
  const roleHierarchy: Record<string, number> = {
    admin: 3,
    patrol: 2,
    user: 1,
  };

  const userLevel = roleHierarchy[userRole || "user"] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;

  return userLevel >= requiredLevel;
}

/**
 * Validate request headers
 * @param headers - Request headers object
 * @returns true if Authorization header is present and valid
 */
export function hasValidAuthHeader(headers: Record<string, string>): boolean {
  const authHeader = headers["authorization"] || headers["Authorization"];
  return !!(authHeader && authHeader.startsWith("Bearer "));
}

/**
 * Extract token from Authorization header
 * @param authHeader - Authorization header value
 * @returns Token string or null
 */
export function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  return parts.length === 2 && parts[0] === "Bearer" ? parts[1] : null;
}

/**
 * Validate UUID format (v4)
 * @param uuid - UUID string to validate
 * @returns true if valid UUID
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate URL format
 * @param urlString - URL string to validate
 * @returns true if valid URL
 */
export function isValidURL(urlString: string): boolean {
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate ISO 8601 date string
 * @param dateString - Date string to validate
 * @returns true if valid ISO date
 */
export function isValidISODate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Validate phone number format
 * @param phone - Phone number string to validate
 * @returns true if valid phone (10-15 digits after removing non-numeric chars)
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone || typeof phone !== "string") {
    return false;
  }
  
  // Remove common separator characters
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, "");
  
  // Check if it's 10-15 digits (international phone format)
  return /^\+?[0-9]{10,15}$/.test(cleaned);
}

/**
 * Helper: Add error to errors object
 * @param errors - Errors object
 * @param field - Field name
 * @param message - Error message
 */
function addError(
  errors: Record<string, string[]>,
  field: string,
  message: string
): void {
  if (!errors[field]) {
    errors[field] = [];
  }
  errors[field].push(message);
}

/**
 * Format validation errors for response
 * @param validationResult - ValidationResult object
 * @returns Formatted error message
 */
export function formatValidationErrors(validationResult: ValidationResult): string {
  if (validationResult.valid) {
    return "";
  }

  const messages: string[] = [];
  for (const [field, fieldErrors] of Object.entries(validationResult.errors)) {
    messages.push(`${field}: ${fieldErrors.join("; ")}`);
  }

  return messages.join(" | ");
}

/**
 * Create validation error response
 * @param validationResult - ValidationResult object
 * @returns Error object for API response
 */
export function createValidationErrorResponse(validationResult: ValidationResult) {
  return {
    error: "Validation failed",
    details: validationResult.errors,
    message: formatValidationErrors(validationResult),
  };
}
