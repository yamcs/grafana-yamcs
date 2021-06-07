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
import { ConversionType, ListEventsQuery, ParameterInfo, ParameterRangesQuery, ParameterSamplesQuery, ParameterValueHistoryQuery, ParameterValueQuery, QueryType, StatType, YamcsOptions, YamcsQuery } from './types';
import * as utils from './utils';
import { Type, Value, YamcsClient } from './YamcsClient';

export class DataSource extends DataSourceApi<YamcsQuery, YamcsOptions> {

  private dictionary?: Dictionary;
  readonly yamcs: YamcsClient;

  constructor(private settings: DataSourceInstanceSettings<YamcsOptions>) {
    super(settings);
    this.yamcs = new YamcsClient(settings);
  }

  async loadDictionary() {
    if (!this.dictionary) {
      this.dictionary = new Dictionary(this);
      await this.dictionary.loadDictionary();
    }
    return this.dictionary;
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
    await this.dictionary?.loadDictionary();

    const promises = request.targets.map(async target => {
      const q = migrateQuery(target);
      switch (q.queryType) {
        case QueryType.ListEvents:
          return this.queryEvents(request, q as ListEventsQuery);
        case QueryType.ParameterRanges:
          return this.queryParameterRanges(request, q as ParameterRangesQuery);
        case QueryType.ParameterSamples:
          const c = this.queryParameterSamples(request, q as ParameterSamplesQuery);
          return c;
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

  private getParameterInfo(parameter?: string): ParameterInfo | undefined {
    if (parameter) {
      return this.dictionary?.getParameterInfo(parameter);
    }
    return undefined;
  }

  private getFieldTypeForParameter(parameter?: string) {
    const info = this.getParameterInfo(parameter);
    if (!info) {
      return FieldType.other;
    }
    switch (info.engType) {
      case 'FLOAT':
      case 'INTEGER':
        return FieldType.number;
      case 'BOOLEAN':
        return FieldType.boolean;
      case 'STRING':
      case 'ENUMERATION':
      case 'BINARY':
      case 'AGGREGATE':
      case 'ARRAY':
      case 'NO TYPE':
        return FieldType.string;
      case 'TIME':
        return FieldType.time;
      default:
        return FieldType.other;
    }
  }

  private getRawFieldTypeForParameter(parameter?: string) {
    const info = this.getParameterInfo(parameter);
    if (!info) {
      return FieldType.other;
    }
    switch (info.dataEncoding?.type) {
      case 'FLOAT':
      case 'INTEGER':
        return FieldType.number;
      case 'BOOLEAN':
        return FieldType.boolean;
      case 'STRING':
      case 'BINARY':
        return FieldType.string;
      default:
        return FieldType.other;
    }
  }

  private getFieldValueForParameterValue(value: Value, target: FieldType): any {
    if (target === FieldType.boolean) {
      return value.booleanValue!;
    } else if (target === FieldType.time) {
      return this.parseTime(value.stringValue!);
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
    let valueType = this.getFieldTypeForParameter(query.parameter);
    let unit = this.getParameterInfo(query.parameter)?.units;
    let parameterName = query.parameter || 'value';

    if (query.conversion === ConversionType.RAW) {
      valueType = this.getRawFieldTypeForParameter(query.parameter);
      unit = undefined;
      parameterName = query.parameter ? `raw://${query.parameter}` : 'rawValue';
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
        time: this.parseTime(pval.generationTime),
        monitoringResult: pval.monitoringResult,
        rangeCondition: pval.rangeCondition,
        status: pval.acquisitionStatus,
      };

      if (query.conversion === 'RAW' && pval.rawValue !== undefined) {
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
    const rawValueType = this.getRawFieldTypeForParameter(query.parameter);
    const valueType = this.getFieldTypeForParameter(query.parameter);
    const unit = this.getParameterInfo(query.parameter)?.units;
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
          time: this.parseTime(pval.generationTime),
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
    const unit = this.getParameterInfo(query.parameter)?.units;
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
    if (query.conversion !== 'RAW') {
      unit = this.getParameterInfo(query.parameter)?.units
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
              displayName: `avg(${query.parameter})`,
              unit,
            }
          });
          break;
        case StatType.MIN:
          frame.addField({
            name: 'min',
            type: FieldType.number,
            config: {
              displayName: `min(${query.parameter})`,
              unit,
            }
          });
          break;
        case StatType.MAX:
          frame.addField({
            name: 'max',
            type: FieldType.number,
            config: {
              displayName: `max(${query.parameter})`,
              unit,
            }
          });
          break;
        case StatType.COUNT:
          frame.addField({
            name: 'count',
            type: FieldType.number,
            config: {
              displayName: `count(${query.parameter})`,
            }
          });
          break;
      }
    }

    const samples = await this.yamcs.sampleParameter(query.parameter, {
      start: request.range!.from.toISOString(),
      stop: request.range!.to.toISOString(),
      // useRawValue: query.conversion === ConversionType.RAW,
      count: request.maxDataPoints,
    });
    for (const sample of samples) {
      const value: { [key: string]: number } = {
        time: this.parseTime(sample.time),
      };
      for (const stat of query.stats) {
        switch (stat) {
          case StatType.AVG:
            value['avg'] = sample.avg;
            break;
          case StatType.MIN:
            value['min'] = sample.min;
            break;
          case StatType.MAX:
            value['max'] = sample.max;
            break;
          case StatType.COUNT:
            value['count'] = sample.n;
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
        time: this.parseTime(event.generationTime),
        message: event.message,
        source: event.source,
        type: event.type,
        severity: event.severity,
        seqNumber: event.seqNumber,
      });
    }

    return frame;
  }

  private parseTime(isostring: string): number {
    const date = new Date(Date.parse(isostring));
    return date.getTime();
  }
}
