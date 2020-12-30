import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { getBackendSrv } from '@grafana/runtime';
import { AsyncSelect, HorizontalGroup, InlineFormLabel } from '@grafana/ui';
import defaults from 'lodash/defaults';
import React, { PureComponent, ReactNode } from 'react';
import { DataSource } from './DataSource';
import { defaultQuery, MyQuery, YamcsDataSourceOptions } from './types';

type Props = QueryEditorProps<DataSource, MyQuery, YamcsDataSourceOptions>;

export class QueryEditor extends PureComponent<Props> {
  key = 0;
  components: ReactNode[] = [];
  previousRes: string[] = [];
  init = true;

  loadAsyncOptions = async (path: string[], i: number, input: string) => {
    let parentPath = path.slice(0, i).join('/');

    const proxyUrl = this.props.datasource.url;
    const routePath = '/param';
    let url = proxyUrl + routePath + `?system=/${parentPath}&pos=0&limit=1000`;

    let res: Array<SelectableValue<string>> = [];

    let response = await getBackendSrv().datasourceRequest({
      url: url,
      method: 'GET',
    });

    if (!response.data) {
      return new Promise<Array<SelectableValue<string>>>(resolve => {
        resolve(res);
      });
    }

    // this part is good with <1000 spaceSystems
    response.data.spaceSystems?.forEach((name: string) => {
      res.push({ label: name, value: name.slice(1) + '/' });
    });

    response.data.parameters?.forEach(({ name, qualifiedName }: { name: string; qualifiedName: string }) => {
      res.push({ label: name, value: qualifiedName.slice(1) });
    });

    for (let i = 1000; i < response.data.totalSize; i += 1000) {
      url = proxyUrl + routePath + `?system=/${parentPath}?pos=${i}&limit=1000`;
      let response = await getBackendSrv().datasourceRequest({
        url: url,
        method: 'GET',
      });
      if (!response.data) {
        break;
      }
      response.data.parameters?.forEach(({ name, qualifiedName }: { name: string; qualifiedName: string }) => {
        res.push({ label: name, value: qualifiedName.slice(1) });
      });
    }

    if (input) {
      res = res.filter((e: any) => {
        return e.label.toLowerCase().includes(input.toLowerCase());
      });
    }

    return new Promise<Array<SelectableValue<string>>>(resolve => {
      resolve(res);
    });
  };

  handlePathChange = async (v: SelectableValue<string>) => {
    this.init = false;
    const { onChange, query, onRunQuery } = this.props;
    const dir = v.value!.endsWith('/');
    let param = dir ? 'No Parameter' : '' + v.value;

    onChange({
      ...query,
      selectedPath: '' + v.value,
      param: param,
    });

    onRunQuery();
  };

  createComp = (path: string[], i: number, open: boolean) => {
    const val = path[i];
    return (
      <AsyncSelect
        key={this.key}
        autoFocus={!this.init && open}
        openMenuOnFocus={true}
        menuPlacement={'bottom'}
        defaultOptions={true}
        cacheOptions={true}
        loadOptions={input => {
          return this.loadAsyncOptions(path, i, input);
        }}
        value={{ label: val, value: val + '/' }}
        onChange={e => {
          this.handlePathChange(e);
        }}
      />
    );
  };

  render() {
    const query = defaults(this.props.query, defaultQuery);
    const { selectedPath } = query;

    let res = selectedPath.split('/');

    let i = 0;
    for (i = 0; i < Math.min(res.length, this.previousRes.length); i++) {
      if (res[i] !== this.previousRes[i]) {
        break;
      }
    }
    // this.components.length = 0;
    this.components = this.components.slice(0, i);

    for (let j = i; j < res.length; j++) {
      this.components.push(this.createComp(res, j, j === i + 1 ? true : false));
      this.key = this.key + 1;
    }

    this.previousRes = res;

    return (
      <div>
        <div className="gf-form">
          <HorizontalGroup>
            <InlineFormLabel width={5}>Parameter</InlineFormLabel>
            {this.components}
          </HorizontalGroup>
        </div>
      </div>
    );
  }
}
