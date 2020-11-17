import defaults from 'lodash/defaults';
import React, { PureComponent, ReactNode } from 'react';
import { InlineFormLabel, Button } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { DataSource } from './DataSource';
import { MyDataSourceOptions, MyQuery, defaultQuery } from './types';

import { AsyncSelect } from '@grafana/ui';
import { Checkbox } from '@grafana/ui';
import { Select } from '@grafana/ui';
import { HorizontalGroup } from '@grafana/ui';

import { getBackendSrv } from '@grafana/runtime';

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

let profileOptions: Array<SelectableValue<string | number>> = [
  { label: 'profile 1', value: 1 },
  { label: 'profile 2', value: 2 },
  { label: 'profile 3', value: 3 },
];

export class QueryEditor extends PureComponent<Props> {
  key = 0;
  components: ReactNode[] = [];
  previousRes: string[] = [];
  init = true;

  loadAsyncOptions = async (path: string[], i: number, input: string) => {
    // console.log('CALLED WITH INPUT : ', input);

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

    // console.log('RESP', response);

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

  showRawValues = true;

  handleButton = async () => {
    const { onChange, query, onRunQuery } = this.props;
    onChange({
      ...query,
      selectedPath: query.selectedPath + '/Z',
    });
    // executes the query
    onRunQuery();
  };

  handlePathChange = async (v: SelectableValue<string>) => {
    this.init = false;
    const { onChange, query, onRunQuery } = this.props;
    // console.log('v', v);
    const dir = v.value!.endsWith('/');
    let param = dir ? 'No Parameter' : '' + v.value;

    // console.log('param', param);
    onChange({
      ...query,
      selectedPath: '' + v.value,
      param: param,
    });
    // executes the query
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
          // console.log('load options called');
          return this.loadAsyncOptions(path, i, input);
        }}
        value={{ label: val, value: val + '/' }}
        onChange={e => {
          // console.log(e);
          this.handlePathChange(e);
        }}
      />
    );
  };

  render() {
    // console.log('-----', this.props.query.selectedPath, '------------');

    const query = defaults(this.props.query, defaultQuery);
    const { selectedPath } = query;

    let res = selectedPath.split('/');

    // console.log('PREV RES : ', this.previousRes);
    // console.log('RES : ', res);

    let i = 0;
    for (i = 0; i < Math.min(res.length, this.previousRes.length); i++) {
      if (res[i] !== this.previousRes[i]) {
        break;
      }
    }
    // console.log('i : ', i);

    // console.log(res);
    // this.components.length = 0;
    this.components = this.components.slice(0, i);
    // console.log(this.components);

    for (let j = i; j < res.length; j++) {
      this.components.push(this.createComp(res, j, j === i + 1 ? true : false));
      // console.log(this.key);
      this.key = this.key + 1;
    }
    // console.log(this.components);

    this.previousRes = res;

    return (
      <div>
        <div className="gf-form">
          <HorizontalGroup>
            <InlineFormLabel width={5}>Parameter</InlineFormLabel>
            {this.components}
            <Button
              size={'sm'}
              icon={'question-circle'}
              onClick={() => {
                console.log('clicked');
                this.handleButton();
              }}
            >
              Info
            </Button>
          </HorizontalGroup>
        </div>
        <div className="gf-form">
          <HorizontalGroup>
            <InlineFormLabel width={5}>Profile</InlineFormLabel>
            <Select width={10} options={profileOptions} placeholder={'default'} onChange={e => console.log(e)} />
            <Checkbox
              label={'show raw values'}
              defaultChecked={this.showRawValues}
              onChange={e => {
                this.showRawValues = !this.showRawValues;
                console.log(this.showRawValues);
              }}
            />
          </HorizontalGroup>
        </div>
      </div>
    );
  }
}
