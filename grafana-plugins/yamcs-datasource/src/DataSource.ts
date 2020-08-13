import defaults from 'lodash/defaults';

import { getBackendSrv } from '@grafana/runtime';

import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  MutableDataFrame,
  FieldType,
} from '@grafana/data';

import { MyQuery, MyDataSourceOptions, defaultQuery } from './types';

export class DataSource extends DataSourceApi<MyQuery, MyDataSourceOptions> {
  constructor(instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>) {
    console.log('instanceSettings');

    console.log(instanceSettings);

    super(instanceSettings);
  }

  async query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse> {
    const { range, maxDataPoints } = options;
    console.log('options');
    console.log(options);

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
            { name: 'value', type: FieldType.number },
          ],
        });

        const baseUrl = 'http://localhost:8090/api/archive/simulator/parameters/YSS/SIMULATOR/';
        const param = query.param;
        if (!param) {
          return frame;
        }
        const start = this.timestampToYamcs(from);
        const end = this.timestampToYamcs(to);
        const count = maxDataPoints;

        const url = `${baseUrl}${param}/samples?start=${start}&stop=${end}&count=${count}`;

        let response = await getBackendSrv().datasourceRequest({
          url: url,
          method: 'GET',
        });
        console.log('RESPONSE');

        console.log(response);

        if (!response || !response.data || !response.data.sample) {
          console.log('resp undefined');

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
    // Implement a health check for your data source.

    const start = 1596631034086; // grafana query from user
    const end = 1596631334086; // grafana query from user

    const baseUrl = 'http://localhost:8090/api/archive/simulator/parameters/YSS/SIMULATOR/';
    const param = 'Psi';
    const startUrl = this.timestampToYamcs(start);
    const endUrl = this.timestampToYamcs(end);
    const count = 10;

    const url = `${baseUrl}${param}/samples?start=${startUrl}&stop=${endUrl}&count=${count}`;

    console.log(url);

    return {
      status: 'success',
      message: 'Success',
    };
  }
}
