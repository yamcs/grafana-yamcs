import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  FieldType,
  MutableDataFrame
} from '@grafana/data';
import { Dictionary } from './Dictionary';
import { frameParameterRanges } from './framing';
import { ListEventsQuery, ParameterRangesQuery, ParameterSamplesQuery, QueryType, StatType, YamcsOptions, YamcsQuery } from './types';
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

  /**
   * Accepts a query from the user, retrieves the data from Yamcs,
   * and returns the data in a format that Grafana recognizes.
   */
  async query(request: DataQueryRequest<YamcsQuery>): Promise<DataQueryResponse> {
    const promises = request.targets.map(async target => {
      switch (target.queryType) {
        case QueryType.ListEvents:
          return this.queryEvents(request, target as ListEventsQuery);
        case QueryType.ParameterRanges:
          return this.queryParameterRanges(request, target as ParameterRangesQuery);
        case QueryType.ParameterSamples:
          return this.queryParameterSamples(request, target as ParameterSamplesQuery);
        case QueryType.ParameterValue:
          return this.queryParameterValue(request, target);
        default:
          throw new Error(`Unexpected query type ${target.queryType}`);
      }
    });

    // Wait for all requests to finish before returning the data
    return Promise.all(promises).then(data => ({ data }));
  }

  private getFieldTypeForParameter(parameter?: string) {
    if (!parameter) {
      return FieldType.other;
    }
    const info = this.dictionary?.getParameterInfo(parameter);
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
    query: YamcsQuery,
  ) {
    await this.dictionary?.loadDictionary();

    const valueType = this.getFieldTypeForParameter(query.parameter);
    const frame = new MutableDataFrame({
      refId: query.refId,
      fields: [{
        name: 'time',
        type: FieldType.time,
      }, {
        name: query.parameter || 'value',
        type: valueType,
      }, {
        name: 'monitoringResult',
        type: FieldType.string,
      }, {
        name: 'rangeCondition',
        type: FieldType.string,
      }, {
        name: 'status',
        type: FieldType.string,
      }, {
        name: 'receptionTime',
        type: FieldType.time,
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
        status: pval.acquisitionStatus,
        receptionTime: this.parseTime(pval.acquisitionTime),
      };
      value[query.parameter] = this.getFieldValueForParameterValue(pval.engValue, valueType);
      frame.add(value);
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
    return frameParameterRanges(query.refId, ranges);
  }

  private async queryParameterSamples(
    request: DataQueryRequest<YamcsQuery>,
    query: ParameterSamplesQuery,
  ) {
    const frame = new MutableDataFrame({
      refId: query.refId,
      fields: [{
        name: 'time',
        type: FieldType.time,
      }],
    });
    for (const stat of query.stats) {
      switch (stat) {
        case StatType.AVG:
          frame.addField({
            name: 'avg',
            type: FieldType.number,
          });
          break;
        case StatType.MIN:
          frame.addField({
            name: 'min',
            type: FieldType.number,
          });
          break;
        case StatType.MAX:
          frame.addField({
            name: 'max',
            type: FieldType.number,
          });
          break;
        case StatType.COUNT:
          frame.addField({
            name: 'count',
            type: FieldType.number,
          });
          break;
      }
    }

    if (!query.parameter) {
      return frame;
    }

    const samples = await this.yamcs.sampleParameter(query.parameter, {
      start: request.range!.from.toISOString(),
      stop: request.range!.to.toISOString(),
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
