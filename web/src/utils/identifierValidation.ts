/**
 * Validation utilities for identifiers (property names, output names, etc.)
 */
import { i18n } from "../i18n";

/** Result of identifier validation */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates that a name is a valid identifier (cannot start with number or be empty).
 */
export function validateIdentifierName(name: string): ValidationResult {
  const trimmedName = name.trim();

  if (trimmedName.length === 0) {
    return {
      isValid: false,
      error: i18n.t("editor:ui.nameCannotBeEmpty", { defaultValue: "Name cannot be empty" })
    };
  }

  if (/^[0-9]/.test(trimmedName)) {
    return {
      isValid: false,
      error: i18n.t("editor:ui.nameCannotStartWithANumberUseALetterOrUnderscoreInstead", { defaultValue: "Name cannot start with a number. Use a letter or underscore instead." })
    };
  }

  return {
    isValid: true
  };
}
