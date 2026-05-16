const sanitizeIdSegment = (value: string): string => value.replace(/[^a-zA-Z0-9_-]+/g, '-');

export const builderFieldId = (field: string): string => `case-form-builder-${field}`;

export const sectionFieldId = (sectionId: string, field: string): string =>
  `case-form-section-${sanitizeIdSegment(sectionId)}-${field}`;

export const questionFieldId = (questionId: string, field: string): string =>
  `case-form-question-${sanitizeIdSegment(questionId)}-${field}`;

export const ruleFieldId = (questionId: string, ruleIndex: number, field: string): string =>
  `case-form-question-${sanitizeIdSegment(questionId)}-rule-${ruleIndex}-${field}`;
