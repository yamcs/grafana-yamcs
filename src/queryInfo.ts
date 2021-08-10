import { SelectableValue } from '@grafana/data';
import {
  ListEventsQuery,
  ParameterRangesQuery,
  ParameterSamplesQuery,
  ParameterValueHistoryQuery,
  ParameterValueQuery,
  QueryType,
  YamcsQuery,
} from './types';

export interface QueryTypeInfo extends SelectableValue<QueryType> {
  value: QueryType;
  defaultQuery: Partial<YamcsQuery>;
}

export const yamcsQueryTypes: QueryTypeInfo[] = [
  {
    label: 'Get parameter samples',
    value: QueryType.ParameterSamples,
    description: 'Gets aggregated values over time for a numeric parameter. Good for plots.',
    defaultQuery: {} as ParameterSamplesQuery,
  },
  {
    label: 'Get parameter ranges',
    value: QueryType.ParameterRanges,
    description:
      'Gets most frequent values over time for a parameter. Best used for discrete parameters: enumerations, booleans, strings.',
    defaultQuery: {} as ParameterRangesQuery,
  },
  {
    label: 'Get parameter value',
    value: QueryType.ParameterValue,
    description: 'Gets a single parameter value',
    defaultQuery: {} as ParameterValueQuery,
  },
  {
    label: 'Get parameter value history',
    value: QueryType.ParameterValueHistory,
    description: "Gets the history of a parameter's value (limited)",
    defaultQuery: {} as ParameterValueHistoryQuery,
  },
  {
    label: 'List events',
    value: QueryType.ListEvents,
    description: 'Retrieves a paginated list of events.',
    defaultQuery: {} as ListEventsQuery,
  },
];

export function changeQueryType(q: YamcsQuery, info: QueryTypeInfo): YamcsQuery {
  if (q.queryType === info.value) {
    return q; // No change;
  }
  return {
    ...info.defaultQuery,
    ...q,
    queryType: info.value,
  };
}
