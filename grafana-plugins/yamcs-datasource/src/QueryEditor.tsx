import defaults from 'lodash/defaults';
// import { findByName } from './util';
// import React, { ChangeEvent, PureComponent } from 'react';
import React, { PureComponent, ReactNode } from 'react';
import { InlineFormLabel, Button } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { DataSource } from './DataSource';
import { MyDataSourceOptions, MyQuery, defaultQuery } from './types';

// const { FormField } = LegacyForms;

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

  loadAsyncOptions = (path: string[], i: number, input: string) => {
    // console.log('INPUT : ', input);

    let parentPath = path.slice(0, i).join('/');
    // console.log('parentPath', parentPath);

    return new Promise<Array<SelectableValue<string>>>(resolve => {
      const proxyUrl = this.props.datasource.url;
      const routePath = '/param';
      const url = proxyUrl + routePath + `?system=/${parentPath}&pos=0&limit=100`;

      // console.log(url);

      // resolve([{ label: 'bla', value: 'bla' }]);
      getBackendSrv()
        .datasourceRequest({
          url: url,
          method: 'GET',
        })
        .then(({ data }: any) => {
          let res: Array<SelectableValue<string>> = [{ label: 'No Parameter', value: 'No Parameter' }];
          data.spaceSystems?.forEach((name: string) => {
            res.push({ label: name, value: name.slice(1) + '/' });
          });
          data.parameters?.forEach(({ name, qualifiedName }: { name: string; qualifiedName: string }) => {
            res.push({ label: name, value: qualifiedName.slice(1) });
          });
          if (!input) {
            resolve(res);
          } else {
            resolve(
              res.filter((e: any) => {
                return e.label.toLowerCase().includes(input.toLowerCase());
              })
            );
          }
        });
    });
  };

  // static optionsLoaded = false;
  // static cascaderOptions: CascaderOption[] = [
  //   { label: 'Base Option', value: 'Base Option', items: [{ label: 'Base Child', value: 'Base Child' }] },
  // ];No Parameter

  // static cascaderOptions: any = [
  //   { label: 'No Parameter', value: 'No Parameter', items: [{ label: 'Other Option', value: 'Other Option' }] },
  //   { label: 'Other Option', value: 'Other Option' },
  // ];
  showRawValues = true;

  constructor(input: any) {
    super(input);

    // this.setCascaderOptions();
  }

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

  createComp = (path: string[], i: number) => {
    const val = path[i];

    return (
      <AsyncSelect
        key={this.key}
        menuPlacement={'bottom'}
        defaultOptions={true}
        cacheOptions={true}
        loadOptions={input => {
          console.log('load options called');
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
    console.log('-----', this.props.query.selectedPath, '------------');

    const query = defaults(this.props.query, defaultQuery);
    const { selectedPath } = query;

    let res = selectedPath.split('/');

    console.log('PREV RES : ', this.previousRes);
    console.log('RES : ', res);

    let i = 0;
    for (i = 0; i < Math.min(res.length, this.previousRes.length); i++) {
      if (res[i] !== this.previousRes[i]) {
        break;
      }
    }
    console.log('i : ', i);

    // console.log(res);
    // this.components.length = 0;
    this.components = this.components.slice(0, i);
    console.log(this.components);

    for (let j = i; j < res.length; j++) {
      this.components.push(this.createComp(res, j));
      console.log(this.key);
      this.key = this.key + 1;
    }
    console.log(this.components);

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
