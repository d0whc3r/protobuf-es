// Copyright 2021-2025 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * CEL Expression Parser for buf.validate.message constraints
 *
 * This module parses Common Expression Language (CEL) expressions from
 * buf.validate.message options to extract read-only field constraints
 * for TypeScript Omit<> type generation.
 *
 * Uses @bufbuild/cel for robust parsing of CEL expressions into an AST,
 * which is then analyzed to identify read-only field patterns.
 */

import { parse } from "@bufbuild/cel";
import type { Expr } from "@bufbuild/cel-spec/cel/expr/syntax_pb.js";
import { snakeToCamel } from "./util.js";

export interface CELParseResult {
  /** Successfully parsed read-only field names */
  readOnlyFields: string[];
  /** Fields that couldn't be parsed */
  unsupportedFields: string[];
  /** Parse errors encountered */
  errors: string[];
  /** Nested field constraints organized by parent field */
  nestedConstraints: Record<string, string[]>;
}

/**
 * Parse CEL expression to extract read-only field constraints
 *
 * Supports common validation patterns:
 * - this.field == '' (field must be empty)
 * - !has(this.field) (field must not be set)
 * - this.field == 0 (numeric field must be zero)
 *
 * Uses @bufbuild/cel to parse expressions into an AST for robust analysis.
 *
 * @param celExpression - The CEL expression string to parse
 * @returns ParseResult with extracted field information
 */
export function parseCELExpression(celExpression: string): CELParseResult {
  const result: CELParseResult = {
    readOnlyFields: [],
    unsupportedFields: [],
    errors: [],
    nestedConstraints: {},
  };

  if (!celExpression.trim()) {
    return result;
  }

  try {
    // Parse the CEL expression using @bufbuild/cel
    const parsedExpr = parse(celExpression);

    if (!parsedExpr.expr) {
      result.errors.push(`No expression found in CEL: ${celExpression}`);
      return result;
    }

    // Visit the AST to extract read-only field constraints
    visitExpr(parsedExpr.expr, result);

    // Remove duplicates
    result.readOnlyFields = [...new Set(result.readOnlyFields)];
    result.unsupportedFields = [...new Set(result.unsupportedFields)];
  } catch (error) {
    result.errors.push(
      `Failed to parse CEL expression "${celExpression}": ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  return result;
}

/**
 * Visit a CEL expression AST node to extract read-only field patterns
 *
 * @param expr - The CEL expression AST node
 * @param result - The result object to populate
 */
function visitExpr(expr: Expr, result: CELParseResult): void {
  if (!expr.exprKind) {
    return;
  }

  switch (expr.exprKind.case) {
    case "callExpr": {
      // Handle function calls like has(), operators like ==, !, &&, ||
      const call = expr.exprKind.value;

      if (call.function === "!_") {
        // Negation operator: !has(this.field)
        // Note: CEL parser optimizes !has(this.field) to just !this.field (selectExpr)
        if (call.args.length === 1) {
          const arg = call.args[0];

          // Case 1: !has(field) - the has() call is preserved
          if (arg?.exprKind?.case === "callExpr") {
            const innerCall = arg.exprKind.value;
            if (innerCall.function === "has" && innerCall.args.length === 1) {
              // Extract field from has() argument
              const field = extractFieldFromExpr(innerCall.args[0]);
              if (field) {
                addFieldToResult(field, result);
              }
            }
          }
          // Case 2: !this.field - optimized form of !has(this.field)
          else if (
            arg?.exprKind?.case === "selectExpr" ||
            arg?.exprKind?.case === "identExpr"
          ) {
            const field = extractFieldFromExpr(arg);
            if (field) {
              addFieldToResult(field, result);
            }
          }
        }
      } else if (call.function === "_==_") {
        // Equality operator: this.field == '' or this.field == 0
        if (call.args.length === 2) {
          const left = call.args[0];
          const right = call.args[1];

          // Check if right side is empty string or zero
          if (isEmptyValue(right)) {
            const field = extractFieldFromExpr(left);
            if (field) {
              addFieldToResult(field, result);
            }
          }
        }
      } else if (call.function === "_&&_") {
        // Logical AND operator: recursively visit both sides
        // Both conditions must be true, so all fields are read-only
        for (const arg of call.args) {
          if (arg) {
            visitExpr(arg, result);
          }
        }
      }
      // Note: Logical OR (_||_) is NOT processed because it means
      // "at least one condition must be true", which doesn't make
      // fields read-only (they can still be set to satisfy the condition)
      break;
    }

    default:
      // For other expression types, we don't extract fields
      break;
  }
}

/**
 * Extract field path from a CEL expression (handles this.field and field.nested)
 *
 * @param expr - The CEL expression
 * @returns Field path as string, or null if not a field access
 */
function extractFieldFromExpr(expr: Expr | undefined): string | null {
  if (!expr?.exprKind) {
    return null;
  }

  switch (expr.exprKind.case) {
    case "identExpr": {
      // Simple identifier: field
      const ident = expr.exprKind.value;
      return ident.name === "this" ? null : ident.name;
    }

    case "selectExpr": {
      // Field selection: this.field or field.nested
      const select = expr.exprKind.value;
      if (!select.operand) {
        return null;
      }

      const operandField = extractFieldFromExpr(select.operand);

      // If operand is "this", just return the field name
      if (
        operandField === null &&
        select.operand.exprKind?.case === "identExpr"
      ) {
        const ident = select.operand.exprKind.value;
        if (ident.name === "this") {
          return select.field;
        }
      }

      // Build nested field path
      if (operandField) {
        return `${operandField}.${select.field}`;
      }

      return select.field;
    }

    default:
      return null;
  }
}

/**
 * Check if an expression represents an empty value (empty string, zero, or false)
 *
 * @param expr - The CEL expression
 * @returns true if the expression is an empty value
 */
function isEmptyValue(expr: Expr | undefined): boolean {
  if (!expr?.exprKind) {
    return false;
  }

  if (expr.exprKind.case === "constExpr") {
    const constant = expr.exprKind.value;
    if (!constant.constantKind) {
      return false;
    }

    switch (constant.constantKind.case) {
      case "stringValue":
        return constant.constantKind.value === "";
      case "int64Value":
        return constant.constantKind.value === BigInt(0);
      case "uint64Value":
        return constant.constantKind.value === BigInt(0);
      case "doubleValue":
        return constant.constantKind.value === 0;
      case "boolValue":
        // Only treat false as an "empty" value for constraints
        // A constraint like "this.active == false" could mean the field should be inactive/unset
        // but "this.active == true" is a validation constraint, not an omission indicator
        return constant.constantKind.value === false;
      default:
        return false;
    }
  }

  return false;
}

/**
 * Add a field to the result, handling nested fields
 *
 * @param fieldPath - Field path (e.g., "field" or "parent.child" or "parent.child.grandchild")
 * @param result - The result object to populate
 */
function addFieldToResult(fieldPath: string, result: CELParseResult): void {
  if (!isValidFieldName(fieldPath)) {
    result.errors.push(`Invalid field name extracted: ${fieldPath}`);
    return;
  }

  // Check if this is a nested field (contains dots)
  if (fieldPath.includes(".")) {
    const parts = fieldPath.split(".").map(snakeToCamel);

    if (parts.length >= 2) {
      // Nested field: parent.child or parent.child.grandchild
      // For 2+ levels, we omit the immediate child of the parent
      // For 3+ levels (e.g., parent.child.grandchild), we omit 'child' from parent
      // This is a pragmatic simplification due to TypeScript type system limitations
      const [parentField, childField] = parts;
      if (!result.nestedConstraints[parentField]) {
        result.nestedConstraints[parentField] = [];
      }
      result.nestedConstraints[parentField].push(childField);
    }
  } else {
    // Top-level field
    result.readOnlyFields.push(snakeToCamel(fieldPath));
  }
}

// Maximum allowed length for a field name, chosen to prevent excessively long or potentially malicious field names.
// 100 characters is a pragmatic upper bound for protobuf field names in most real-world schemas.
const MAX_FIELD_NAME_LENGTH = 100;

/**
 * Validate that a field name is reasonable
 */
function isValidFieldName(fieldName: string): boolean {
  // Allow alphanumeric characters, dots (for nested fields), and underscores
  // Must start with a letter or underscore
  const fieldNamePattern = /^[a-zA-Z_][a-zA-Z0-9_.]*$/;
  return (
    fieldNamePattern.test(fieldName) &&
    fieldName.length <= MAX_FIELD_NAME_LENGTH
  );
}
