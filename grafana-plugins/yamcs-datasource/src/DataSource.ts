import defaults from 'lodash/defaults';

import { getBackendSrv } from '@grafana/runtime';
import { setParameterPath, setIsUpdated } from './QueryEditor';
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
  url?: string;
  parameterPath?: string;
  constructor(instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>) {
    super(instanceSettings);
    this.url = instanceSettings.url;
    this.parameterPath = instanceSettings.jsonData.path;
    setParameterPath(this.parameterPath);
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
        const baseUrl = this.url + routePath + this.parameterPath;

        const param = query.param;
        if (!param) {
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
    // Implement a health check for your data source.
    setIsUpdated(false);
    // const routePath = '/yamcs';
    // const url =
    //   this.url +
    //   routePath +
    //   '/api/archive/simulator/parameters/YSS/SIMULATOR/Psi/samples?start=2020-08-05T12:37:14.086Z&stop=2020-08-05T12:42:14.086Z&count=10';
    //
    // await getBackendSrv().datasourceRequest({
    //   url: url,
    //   method: 'GET',
    // });

    return {
      status: 'success',
      message: 'Success',
    };
  }
}
