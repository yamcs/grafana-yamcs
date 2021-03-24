import { QueryType, YamcsQuery } from "./types";

export function migrateQuery(query: any): YamcsQuery {
    if (query.param && query.param !== 'No Parameter' && !query.parameter) {
        const modifiedQuery = {
            ...query,
            queryType: QueryType.ParameterSamples,
            parameter: '/' + query.param,
        };
        delete modifiedQuery['param'];
        delete modifiedQuery['selectedPath'];
        return modifiedQuery;
    } else {
        return query;
    }
}
