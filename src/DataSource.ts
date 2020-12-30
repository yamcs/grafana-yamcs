import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  FieldType,
  MutableDataFrame
} from '@grafana/data';
import { CascaderOption, CompletionItemGroup } from '@grafana/ui';
import { ListParametersPage, ParameterQuery, YamcsOptions } from './types';
import { YamcsClient } from './YamcsClient';

export class DataSource extends DataSourceApi<ParameterQuery, YamcsOptions> {

  readonly yamcs: YamcsClient;

  constructor(private settings: DataSourceInstanceSettings<YamcsOptions>) {
    super(settings);
    this.yamcs = new YamcsClient(settings);
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
  async query(options: DataQueryRequest<ParameterQuery>): Promise<DataQueryResponse> {
    const promises = options.targets.map(async target => {

      const frame = new MutableDataFrame({
        refId: target.refId,
        fields: [{
          name: 'time',
          type: FieldType.time,
        }, {
          name: 'value',
          type: FieldType.string,
          config: { displayName: target.parameter },
        }, {
          name: 'level',
          type: FieldType.string,
          config: {

          }
        }],
      });

      if (!target.parameter) {
        return frame;
      }

      const samples = await this.yamcs.sampleParameter(target.parameter, {
        start: options.range!.from.toISOString(),
        stop: options.range!.to.toISOString(),
        count: options.maxDataPoints,
      });
      for (const sample of samples) {
        frame.add({
          time: this.parseTime(sample.time),
          value: 'abcc ' + sample.avg,
          level: 'error',
        });
      }

      return frame;
    });

    // Wait for all requests to finish before returning the data
    return Promise.all(promises).then(data => ({ data }));
  }

  async suggestParameters(q: string): Promise<CompletionItemGroup[]> {
    const page = await this.yamcs.listParameters({ q, limit: 15 });

    // Group by space system
    const groups = new Map<String, CompletionItemGroup>();
    for (const parameter of (page.parameters || [])) {
      const spaceSystem = this.extractSpacesystem(parameter.qualifiedName);
      let group = groups.get(spaceSystem);
      if (!group) {
        group = {
          label: spaceSystem,
          items: [],
        };
        groups.set(spaceSystem, group);
      }
      group.items.push({
        label: parameter.name,
        filterText: parameter.qualifiedName.toLowerCase(),
        insertText: parameter.qualifiedName,
      })
    }
    return [...groups.values()];
  }

  async cascadeParameters(): Promise<CascaderOption[]> {
    const top: CascaderOption = {
      label: '',
      value: '',
      children: [],
    };

    let page: ListParametersPage | null = null;

    while (!page || page.continuationToken) {
      if (!page) {
        page = await this.yamcs.listParameters();
      } else {
        page = await this.yamcs.listParameters({ next: page.continuationToken });
      }
      for (const parameter of (page.parameters || [])) {
        const parts = parameter.qualifiedName.split('/');
        this.addCascadeOption(top, parameter.qualifiedName, parts);
      }
    }

    return top.children!;
  }

  private addCascadeOption(node: CascaderOption, qualifiedName: string, parts: string[], offset = 1) {
    if (offset === parts.length - 1) {
      node.children!.push({
        label: parts[offset],
        value: node.value + '/' + parts[offset],
      });
      return;
    }

    let matchedChild: CascaderOption | null = null;
    for (const child of node.children!) {
      if (child.label === parts[offset]) {
        matchedChild = child;
      }
    }
    if (!matchedChild) {
      matchedChild = {
        label: parts[offset],
        value: node.value + '/' + parts[offset],
        children: [],
      }
      node.children!.push(matchedChild);
    }

    this.addCascadeOption(matchedChild, qualifiedName, parts, offset + 1);
  }

  private parseTime(isostring: string): number {
    const date = new Date(Date.parse(isostring));
    return date.getTime();
  }

  private extractSpacesystem(qualifiedName: string) {
    const idx = qualifiedName.lastIndexOf('/');
    return (idx === -1) ? qualifiedName : qualifiedName.substring(0, idx);
  }
}
