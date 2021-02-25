import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  FieldType,
  MutableDataFrame
} from '@grafana/data';
import { ListEventsQuery, ParameterSamplesQuery, QueryType, StatType, YamcsOptions, YamcsQuery } from './types';
import { YamcsCache } from './YamcsCache';
import { YamcsClient } from './YamcsClient';

export class DataSource extends DataSourceApi<YamcsQuery, YamcsOptions> {

  private cache?: YamcsCache;
  readonly yamcs: YamcsClient;

  constructor(private settings: DataSourceInstanceSettings<YamcsOptions>) {
    super(settings);
    this.yamcs = new YamcsClient(settings);
  }

  getCache(): YamcsCache {
    if (!this.cache) {
      this.cache = new YamcsCache(this);
    }
    return this.cache;
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
        case QueryType.ParameterSamples:
          return this.queryParameterSamples(request, target, target as ParameterSamplesQuery);
        case QueryType.ListEvents:
          return this.queryEvents(request, target, target as ListEventsQuery);
        default:
          throw new Error(`Unexpected query type ${target.queryType}`);
      }
    });

    // Wait for all requests to finish before returning the data
    return Promise.all(promises).then(data => ({ data }));
  }

  private async queryParameterSamples(
    request: DataQueryRequest<YamcsQuery>,
    target: YamcsQuery,
    query: ParameterSamplesQuery,
  ) {
    const frame = new MutableDataFrame({
      refId: target.refId,
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
    target: YamcsQuery,
    query: ListEventsQuery,
  ) {
    const frame = new MutableDataFrame({
      refId: target.refId,
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
