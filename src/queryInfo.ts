import { SelectableValue } from "@grafana/data";
import { ListEventsQuery, ParameterInfo, ParameterSamplesQuery, ParameterValueQuery, QueryType, StatType, YamcsQuery } from "./types";

export interface QueryTypeInfo extends SelectableValue<QueryType> {
    value: QueryType;
    defaultQuery: Partial<YamcsQuery>;
}

export const yamcsQueryTypes: QueryTypeInfo[] = [
    {
        label: 'Get parameter samples',
        value: QueryType.ParameterSamples,
        description: 'Gets aggregated values for a parameter.',
        defaultQuery: {} as ParameterSamplesQuery,
    }, {
        label: 'Get parameter value',
        value: QueryType.ParameterValue,
        description: 'Get a parameter\'s current value',
        defaultQuery: {} as ParameterValueQuery,
    }, {
        label: 'List events',
        value: QueryType.ListEvents,
        description: 'Retrieves a paginated list of events.',
        defaultQuery: {} as ListEventsQuery,
    }
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

export function getDefaultStat(parameter?: ParameterInfo): StatType {
    // TODO use count for non-numerics?
    return StatType.AVG;
}
