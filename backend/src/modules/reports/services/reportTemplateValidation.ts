import { AVAILABLE_FIELDS, REPORT_ENTITIES, type ReportDefinition } from '@app-types/report';

export function validateReportTemplateDefinition(definition: ReportDefinition): void {
  if (!REPORT_ENTITIES.includes(definition.entity)) {
    throw new Error(`Invalid template entity: ${definition.entity}`);
  }

  const validFields = new Set(AVAILABLE_FIELDS[definition.entity].map((field) => field.field));
  const aggregationAliases = new Set<string>();

  for (const field of definition.fields || []) {
    if (!validFields.has(field)) {
      throw new Error(`Invalid template field: ${field}`);
    }
  }

  for (const field of definition.groupBy || []) {
    if (!validFields.has(field)) {
      throw new Error(`Invalid template groupBy field: ${field}`);
    }
  }

  for (const filter of definition.filters || []) {
    if (!validFields.has(filter.field)) {
      throw new Error(`Invalid template filter field: ${filter.field}`);
    }
  }

  for (const aggregation of definition.aggregations || []) {
    if (!validFields.has(aggregation.field)) {
      throw new Error(`Invalid template aggregation field: ${aggregation.field}`);
    }
    aggregationAliases.add(aggregation.alias || `${aggregation.function}_${aggregation.field}`);
  }

  for (const sort of definition.sort || []) {
    if (!validFields.has(sort.field) && !aggregationAliases.has(sort.field)) {
      throw new Error(`Invalid template sort field: ${sort.field}`);
    }
  }

  const hasFields = (definition.fields || []).length > 0;
  const hasAggregations = (definition.aggregations || []).length > 0;
  if (!hasFields && !hasAggregations) {
    throw new Error('Template must include at least one field or aggregation');
  }
}
