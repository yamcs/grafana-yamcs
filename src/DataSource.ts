// import { client } from 'websocket';
import defaults from 'lodash/defaults';
import { Observable, merge } from 'rxjs';
import { getBackendSrv } from '@grafana/runtime';
import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  FieldType,
  CircularDataFrame,
} from '@grafana/data';

import { MyQuery, MyDataSourceOptions, defaultQuery } from './types';

export class DataSource extends DataSourceApi<MyQuery, MyDataSourceOptions> {
  url?: string;
  // sockets = new Map<string, WebSocket>();

  constructor(instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>) {
    super(instanceSettings);
    this.url = instanceSettings.url;
  }

  query(options: DataQueryRequest<MyQuery>): Observable<DataQueryResponse> {
    // const client = this.createWebSocketClient({ name: 'Alpha', namespace: '/YSS/SIMULATOR' });
    // console.log(client);

    // console.log(client);
    // const { range, maxDataPoints } = options;

    // const from = range!.from.valueOf();
    // const to = range!.to.valueOf();

    // return a list of observables, one for each query.
    const observables = options.targets.map(target => {
      const query = defaults(target, defaultQuery);
      // let client = this.sockets.get(query.refId);
      let client = new WebSocket('ws://localhost:8090/api/websocket', 'json');

      // subscribe function
      const subscribe = (subscriber: any) => {
        // [Why create a new frame each time ? Is a new observer asked each time ?]

        // each observable contains a circular dataframe with last [CAPACITY] values.
        const frame = new CircularDataFrame({
          append: 'tail',
          capacity: 100, // TODO: unHarcode
        });
        frame.refId = query.refId;
        frame.addField({ name: 'time', type: FieldType.time });
        frame.addField({ name: 'value', type: FieldType.number, config: { displayName: query.param } });

        console.log(query.param);
        if (query.param === 'No Parameter') {
          return () => {
            // this.sockets.get(query.refId)?.close();
            // client.close();
          }; // TODO : check return
        }

        const index = query.param.lastIndexOf('/');
        const namespace = '/' + query.param.substring(0, index);
        const param = query.param.substring(index + 1);
        const namedObjectId = { name: param, namespace: namespace };

        // first attempt : close and recreate (better to unsubscibe and resubscribe probably)

        // if (!client) {
        //   client = new WebSocket('ws://localhost:8090/api/websocket', 'json');
        //   this.sockets.set(query.refId, client);
        // }
        // this.sockets.get(query.refId)?.close();

        // client = new WebSocket('ws://localhost:8090/api/websocket', 'json');
        // this.sockets.set(query.refId, client);

        // TODO: unhardcode instance and processor
        const msg = {
          type: 'parameters',
          options: {
            instance: 'simulator',
            processor: 'realtime',
            id: [namedObjectId],
          },
        };

        client.onerror = (error: any) => {
          console.log('Connect Error:' + error.toString());
        };

        client.onopen = (connection: any) => {
          console.log('WebSocket Client Connected');
          client!.send(JSON.stringify(msg));
        };

        client.onclose = () => {
          console.log('Connection Closed');
        };

        client.onmessage = (message: any) => {
          const parsedMessage = JSON.parse(message.data);
          console.log(parsedMessage);
          if (parsedMessage.type === 'parameters') {
            frame.add({
              time: new Date(parsedMessage.data.values[0].acquisitionTimeUTC).getTime(),
              value: parsedMessage.data.values[0].engValue.floatValue,
            });

            subscriber.next({
              data: [frame],
              key: query.refId,
            });
          }
        };

        return () => {
          client!.close();
        };
      };

      // build observable
      return new Observable<DataQueryResponse>(subscribe);
    });

    return merge(...observables);
  }

  createWebSocketClient = (namedObjectId: any) => {
    const client = new WebSocket('ws://localhost:8090/api/websocket', 'json');

    const msg = {
      type: 'parameters',
      id: 10,
      options: {
        instance: 'simulator',
        processor: 'realtime',
        id: [namedObjectId],
      },
    };

    client.onerror = (error: any) => {
      console.log('Connect Error:' + error.toString());
    };

    client.onopen = (connection: any) => {
      console.log('WebSocket Client Connected');
      client.send(JSON.stringify(msg));
    };

    client.onclose = () => {
      console.log('Connection Closed');
    };

    client.onmessage = (message: any) => {
      console.log(JSON.parse(message.data));
    };

    // function subscribeToProcessor(processor: any){
    //   if (connection.connected){
    //     const msg = {
    //       "type": "processors",
    //       "id": 1,
    //       "options": {
    //         "instance": "simulator",
    //         "processor": "realtime"
    //       }
    //     };
    //     connection.sendUTF(JSON.stringify(msg));
    //   }
    // }
    return client;
  };

  //
  //
  //   let data = await Promise.all(
  //     options.targets.map(async target => {
  //       const query = defaults(target, defaultQuery);
  //
  //       const frame = new MutableDataFrame({
  //         refId: query.refId,
  //         fields: [
  //           // basic plot data : value wrt time
  //           { name: 'time', type: FieldType.time },
  //           { name: 'value', type: FieldType.number, config: { displayName: query.param } },
  //         ],
  //       });
  //
  //       const routePath = '/samples';
  //       const baseUrl = this.url + routePath;
  //
  //       const param = query.param;
  //       if (param === 'No Parameter') {
  //         return frame;
  //       }
  //       const start = this.timestampToYamcs(from);
  //       const end = this.timestampToYamcs(to);
  //       const count = maxDataPoints;
  //
  //       const url = `${baseUrl}/${param}/samples?start=${start}&stop=${end}&count=${count}`;
  //       let response = await getBackendSrv().datasourceRequest({
  //         url: url,
  //         method: 'GET',
  //       });
  //
  //       if (!response || !response.data || !response.data.sample) {
  //         return frame;
  //       }
  //       let ls = response.data.sample;
  //
  //       for (let pt of ls) {
  //         const timestamp = this.yamcsToTimestamp(pt.time);
  //         let val = pt.avg;
  //
  //         frame.add({ time: timestamp, value: val });
  //       }
  //
  //       return frame;
  //     })
  //   );
  //
  //   return { data };
  // }

  yamcsToTimestamp(yamcsDate: string): number {
    const date = new Date(yamcsDate); // converts ISO date to date
    return date.getTime();
  }

  timestampToYamcs(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toISOString();
  }

  async testDatasource() {
    // const socket = new WebSocket('ws://localhost:8090/api/websocket', 'json');
    //
    // const msg = {
    //   type: 'parameters',
    //   id: 10,
    //   options: {
    //     instance: 'simulator',
    //     processor: 'realtime',
    //     id: [{ name: 'Alpha', namespace: '/YSS/SIMULATOR' }],
    //   },
    // };
    //
    // socket.addEventListener('open', function(event) {
    //   console.log('Hello Server!');
    //   socket.send(JSON.stringify(msg));
    // });
    // socket.addEventListener('close', function(event) {
    //   console.log('Server connection closed');
    // });
    //
    // socket.addEventListener('message', function(event) {
    //   console.log('Message from server ', event.data);
    // });

    // Tests if the host and instance names are correct.

    // console.log(this);
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
