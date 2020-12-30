import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  FieldType,
  MutableDataFrame,
} from '@grafana/data';
import { getBackendSrv } from '@grafana/runtime';
import defaults from 'lodash/defaults';
import { defaultQuery, MyDataSourceOptions, MyQuery } from './types';

export class DataSource extends DataSourceApi<MyQuery, MyDataSourceOptions> {
  url?: string;

  constructor(instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>) {
    super(instanceSettings);
    this.url = instanceSettings.url;

    // fetchCascaderOptions('' + this.url).then(({ cascaderParameters, flatParameters }) =>
    //   QueryEditor.setCascaderOptions(flatParameters, cascaderParameters)
    // );
  }

  async query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse> {
    const { range, maxDataPoints } = options;

    const from = range!.from.valueOf();
    const to = range!.to.valueOf();

    let data = await Promise.all(
      options.targets.map(async target => {
        const query = defaults(target, defaultQuery);

        const frame = new MutableDataFrame({
          refId: query.refId,
          fields: [
            // basic plot data : value wrt time
            { name: 'time', type: FieldType.time },
            { name: 'value', type: FieldType.number, config: { displayName: query.param } },
          ],
        });

        const routePath = '/samples';
        const baseUrl = this.url + routePath;

        const param = query.param;
        if (param === 'No Parameter') {
          return frame;
        }
        const start = this.timestampToYamcs(from);
        const end = this.timestampToYamcs(to);
        const count = maxDataPoints;

        const url = `${baseUrl}/${param}/samples?start=${start}&stop=${end}&count=${count}`;
        let response = await getBackendSrv().datasourceRequest({
          url: url,
          method: 'GET',
        });

        if (!response || !response.data || !response.data.sample) {
          return frame;
        }
        let ls = response.data.sample;

        for (let pt of ls) {
          const timestamp = this.yamcsToTimestamp(pt.time);
          let val = pt.avg;

          frame.add({ time: timestamp, value: val });
        }

        return frame;
      })
    );

    return { data };
  }

  yamcsToTimestamp(yamcsDate: string): number {
    const date = new Date(yamcsDate); // converts ISO date to date
    return date.getTime();
  }

  timestampToYamcs(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toISOString();
  }

  async testDatasource() {
    // Tests if the host and instance names are correct.

    // let ls: CascaderOption[] = [{ label: 'static label', value: 'static value' }];
    // QueryEditor.setCascaderOptions(ls);

    const routePath = '/instance';
    const url = this.url + routePath;

    await getBackendSrv().datasourceRequest({
      url: url,
      method: 'GET',
      auth: {},
    });

    return {
      status: 'success',
      message: 'Success',
    };
  }
}
