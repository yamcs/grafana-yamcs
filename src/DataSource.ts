import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  FieldType,
  MutableDataFrame,
  PluginMeta
} from '@grafana/data';
import { Dictionary } from './Dictionary';
import { frameParameterRanges } from './framing';
import { migrateQuery } from './migrations';
import { ListEventsQuery, ParameterRangesQuery, ParameterSamplesQuery, ParameterValueHistoryQuery, ParameterValueQuery, QueryType, StatType, ValueKind, YamcsOptions, YamcsQuery } from './types';
import * as utils from './utils';
import { Type, Value, YamcsClient } from './YamcsClient';

function parseTime(isostring: string): number {
  const date = new Date(Date.parse(isostring));
  return date.getTime();
}

export class DataSource extends DataSourceApi<YamcsQuery, YamcsOptions> {

  readonly dictionary: Dictionary;
  readonly yamcs: YamcsClient;

  constructor(private settings: DataSourceInstanceSettings<YamcsOptions>) {
    super(settings);
    this.yamcs = new YamcsClient(settings);
    this.dictionary = new Dictionary(this);
  }

  /**
   * Implements a health check. For example, Grafana calls this method whenever the
   * user clicks the Save & Test button, after changing the connection settings.
   */
  async testDatasource() {
    if (!this.settings.jsonData.instance) {
      return { status: 'error', message: 'Instance option is required' };
    }

    const defaultErrorMessage = 'Cannot connect to Yamcs';

    try {
      await this.yamcs.fetchInstance();
      return { status: 'success', message: 'Yamcs Connection OK' };
    } catch (err) {
      if (typeof err === 'string') {
        return { status: 'error', message: err };
      } else {
        return { status: 'error', message: err?.statusText || defaultErrorMessage };
      }
    }
  }

  async importQueries?(queries: YamcsQuery[], originMeta: PluginMeta): Promise<YamcsQuery[]> {
    if (originMeta.id === 'flilzkov-yamcs-datasource') {
      return Promise.all(
        queries.map(async (query: any) => {
          const q = {
            refId: query.refId,
            queryType: QueryType.ParameterSamples,
            parameter: '/' + query.param,
          };
          return q;
        })
      );
    }

    return queries;
  }

  /**
   * Accepts a query from the user, retrieves the data from Yamcs,
   * and returns the data in a format that Grafana recognizes.
   */
  async query(request: DataQueryRequest<YamcsQuery>): Promise<DataQueryResponse> {

    // The "hide" property is enabled, when a user has disabled a specific query.
    const promises = request.targets.filter(t => !t.hide).map(async target => {
      const q = migrateQuery(target);
      switch (q.queryType) {
        case QueryType.ListEvents:
          return this.queryEvents(request, q as ListEventsQuery);
        case QueryType.ParameterRanges:
          return this.queryParameterRanges(request, q as ParameterRangesQuery);
        case QueryType.ParameterSamples:
          return this.queryParameterSamples(request, q as ParameterSamplesQuery);
        case QueryType.ParameterValue:
          return this.queryParameterValue(request, q as ParameterValueQuery);
        case QueryType.ParameterValueHistory:
          return this.queryParameterValueHistory(request, q as ParameterValueHistoryQuery);
        default:
          throw new Error(`Unexpected query type ${q.queryType}`);
      }
    });

    // Wait for all requests to finish before returning the data
    return Promise.all(promises).then(data => {
      return { data: data.filter(response => response !== undefined) };
    });
  }

  private getFieldValueForParameterValue(value: Value, target: FieldType): any {
    if (target === FieldType.boolean) {
      return value.booleanValue!;
    } else if (target === FieldType.time) {
      return parseTime(value.stringValue!);
    } else if (target === FieldType.number) {
      switch (value.type) {
        case Type.DOUBLE:
          return value.doubleValue!;
        case Type.FLOAT:
          return value.floatValue!;
        case Type.SINT32:
          return value.sint32Value!;
        case Type.SINT64:
          return value.sint64Value!;
        case Type.UINT32:
          return value.uint32Value!;
        case Type.UINT64:
          return value.uint64Value!;
      }
    } else {
      return utils.printValue(value);
    }
  }

  private async queryParameterValue(
    request: DataQueryRequest<YamcsQuery>,
    query: ParameterValueQuery,
  ) {
    let parameterName = (query.valueKind === ValueKind.RAW) ? 'rawValue' : 'value';
    let valueType = FieldType.other;
    let unit;
    if (query.parameter) {
      const entry = await this.dictionary.getEntry(query.parameter);
      if (query.valueKind === ValueKind.RAW) {
        valueType = entry.grafanaRawFieldType;
        unit = undefined;
        parameterName = `raw://${entry.name}`;
      } else {
        valueType = entry.grafanaFieldType;
        unit = entry.units;
        parameterName = entry.name;
      }
    }

    const frame = new MutableDataFrame({
      refId: query.refId,
      fields: [{
        name: 'time',
        type: FieldType.time,
      }, {
        name: parameterName,
        type: valueType,
        config: { unit },
      }, {
        name: 'monitoringResult',
        type: FieldType.string,
      }, {
        name: 'rangeCondition',
        type: FieldType.string,
      }, {
        name: 'status',
        type: FieldType.string,
      }],
    });

    if (!query.parameter) {
      return frame;
    }

    const pval = await this.yamcs.getParameterValue(query.parameter);
    if (pval.engValue) {
      const value: { [key: string]: any } = {
        time: parseTime(pval.generationTime),
        monitoringResult: pval.monitoringResult,
        rangeCondition: pval.rangeCondition,
        status: pval.acquisitionStatus,
      };

      if (query.valueKind === 'RAW' && pval.rawValue !== undefined) {
        value[parameterName] = this.getFieldValueForParameterValue(pval.rawValue, valueType);
      } else if (pval.engValue !== undefined) {
        value[parameterName] = this.getFieldValueForParameterValue(pval.engValue, valueType);
      } else {
        value[parameterName] = undefined;
      }
      frame.add(value);
    }

    return frame;
  }

  private async queryParameterValueHistory(
    request: DataQueryRequest<YamcsQuery>,
    query: ParameterValueHistoryQuery,
  ) {
    let rawValueType = FieldType.other;
    let valueType = FieldType.other;
    let unit;
    if (query.parameter) {
      const entry = await this.dictionary.getEntry(query.parameter);
      rawValueType = entry.grafanaRawFieldType;
      valueType = entry.grafanaFieldType;
      unit = entry.units;
    }

    const frame = new MutableDataFrame({
      refId: query.refId,
      fields: [{
        name: 'time',
        type: FieldType.time,
      }, {
        name: query.parameter ? `raw://${query.parameter}` : 'rawValue',
        type: rawValueType,
      }, {
        name: query.parameter || 'value',
        type: valueType,
        config: { unit }
      }, {
        name: 'monitoringResult',
        type: FieldType.string,
      }, {
        name: 'rangeCondition',
        type: FieldType.string,
      }, {
        name: 'status',
        type: FieldType.string,
      }],
    });

    if (!query.parameter) {
      return;
    }

    const page = await this.yamcs.listParameterValueHistory(query.parameter, {
      start: request.range!.from.toISOString(),
      stop: request.range!.to.toISOString(),
      limit: 500,
    });
    for (const pval of (page.parameter || [])) {
      if (pval.engValue) {
        const value: { [key: string]: any } = {
          time: parseTime(pval.generationTime),
          monitoringResult: pval.monitoringResult,
          rangeCondition: pval.rangeCondition,
          status: pval.acquisitionStatus,
        };
        value[query.parameter || 'value'] = this.getFieldValueForParameterValue(pval.engValue, valueType);
        if (pval.rawValue) {
          value[query.parameter ? `raw://${query.parameter}` : 'rawValue'] = this.getFieldValueForParameterValue(pval.rawValue, rawValueType);
        }
        frame.add(value);
      }
    }
    return frame;
  }

  private async queryParameterRanges(
    request: DataQueryRequest<YamcsQuery>,
    query: ParameterRangesQuery,
  ) {
    if (!query.parameter) {
      return;
    }
    const start = request.range!.from.toDate().getTime();
    const stop = request.range!.to.toDate().getTime();

    const maxRanges = 500;
    const n = Math.min(request.maxDataPoints || maxRanges, maxRanges);
    const ranges = await this.yamcs.getParameterRanges(query.parameter, {
      start: request.range!.from.toISOString(),
      stop: request.range!.to.toISOString(),
      minRange: Math.floor((stop - start) / n),
      maxValues: 5,
    });
    const entry = await this.dictionary.getEntry(query.parameter);
    const unit = entry.units;
    return frameParameterRanges(query.refId, start, stop, ranges, unit);
  }

  private async queryParameterSamples(
    request: DataQueryRequest<YamcsQuery>,
    query: ParameterSamplesQuery,
  ) {
    if (!query.parameter) {
      return;
    }

    let unit;
    let parameterName;
    if (query.valueKind === 'RAW') {
      parameterName = `raw://${query.parameter}`;
    } else {
      const entry = await this.dictionary.getEntry(query.parameter);
      parameterName = query.parameter;
      unit = entry.units;
    }

    const frame = new MutableDataFrame({
      refId: query.refId,
      fields: [{
        name: 'time',
        type: FieldType.time,
      }],
    });
    for (const stat of (query?.stats || [])) {
      switch (stat) {
        case StatType.AVG:
          frame.addField({
            name: 'avg',
            type: FieldType.number,
            config: {
              displayName: `avg(${parameterName})`,
              unit,
            }
          });
          break;
        case StatType.MIN:
          frame.addField({
            name: 'min',
            type: FieldType.number,
            config: {
              displayName: `min(${parameterName})`,
              unit,
            }
          });
          break;
        case StatType.MAX:
          frame.addField({
            name: 'max',
            type: FieldType.number,
            config: {
              displayName: `max(${parameterName})`,
              unit,
            }
          });
          break;
        case StatType.COUNT:
          frame.addField({
            name: 'count',
            type: FieldType.number,
            config: {
              displayName: `count(${parameterName})`,
            }
          });
          break;
      }
    }

    const samples = await this.yamcs.sampleParameter(query.parameter, {
      start: request.range!.from.toISOString(),
      stop: request.range!.to.toISOString(),
      useRawValue: query.valueKind === ValueKind.RAW,
      count: request.maxDataPoints,
    });
    for (const sample of samples) {
      const value: { [key: string]: number | null } = {
        time: parseTime(sample.time),
      };
      for (const stat of query.stats) {
        switch (stat) {
          case StatType.AVG:
            if (sample.n === 0) {
              value['avg'] = null;
            } else {
              value['avg'] = sample.avg;
            }
            break;
          case StatType.MIN:
            if (sample.n === 0) {
              value['min'] = null;
            } else {
              value['min'] = sample.min;
            }
            break;
          case StatType.MAX:
            if (sample.n === 0) {
              value['max'] = null;
            } else {
              value['max'] = sample.max;
            }
            break;
          case StatType.COUNT:
            if (sample.n === 0) {
              value['count'] = null;
            } else {
              value['count'] = sample.n;
            }
            break;
        }
      }
      frame.add(value);
    }

    return frame;
  }

  private async queryEvents(
    request: DataQueryRequest<YamcsQuery>,
    query: ListEventsQuery,
  ) {
    const frame = new MutableDataFrame({
      refId: query.refId,
      fields: [{
        name: 'time',
        type: FieldType.time,
      }, {
        name: 'message',
        type: FieldType.string,
      }, {
        name: 'source',
        type: FieldType.string,
      }, {
        name: 'type',
        type: FieldType.string,
      }, {
        name: 'severity',
        type: FieldType.string,
      }, {
        name: 'seqNumber',
        type: FieldType.number,
      }],
    });

    const page = await this.yamcs.listEvents({
      start: request.range!.from.toISOString(),
      stop: request.range!.to.toISOString(),
    });
    for (const event of (page.event || [])) {
      frame.add({
        time: parseTime(event.generationTime),
        message: event.message,
        source: event.source,
        type: event.type,
        severity: event.severity,
        seqNumber: event.seqNumber,
      });
    }

    return frame;
  }
}
