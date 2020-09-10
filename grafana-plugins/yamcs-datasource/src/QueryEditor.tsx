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
  components: ReactNode[] = [];

  getComponents = () => {
    return this.components;
  };
  options = [
    { label: 'abc', value: 'abc' },
    { label: 'def', value: 'def' },
  ];

  loadAsyncOptions = (path: string[], i: number, input: string) => {
    console.log('INPUT : ', input);

    let parentPath = path.slice(0, i).join('/');
    console.log('parentPath', parentPath);

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
          resolve(
            res.filter((e: any) => {
              return e.label.toLowerCase().includes(input.toLowerCase());
            })
          );
        });
    });
  };

  // static optionsLoaded = false;
  // static cascaderOptions: CascaderOption[] = [
  //   { label: 'Base Option', value: 'Base Option', items: [{ label: 'Base Child', value: 'Base Child' }] },
  // ];

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
    onChange({
      ...query,
      selectedPath: '' + v.value,
    });
    // executes the query
    onRunQuery();
  };

  createComp = (path: string[], i: number) => {
    const val = path[i];

    return (
      <AsyncSelect
        defaultOptions={true}
        cacheOptions={false}
        loadOptions={input => {
          return this.loadAsyncOptions(path, i, input);
        }}
        value={{ label: val, value: val + '/' }}
        onChange={e => {
          console.log(e);
          this.handlePathChange(e);
        }}
      />
    );
  };

  render() {
    const query = defaults(this.props.query, defaultQuery);
    const { param, selectedPath } = query;

    let testComps: ReactNode[] = [];

    console.log(selectedPath);
    let res = selectedPath.split('/');
    console.log(res);

    for (let i = 0; i < res.length; i++) {
      testComps.push(this.createComp(res, i));
    }

    return (
      <div>
        <HorizontalGroup>{testComps}</HorizontalGroup>
        <div>{param === 'No Parameter' && <>See me if no param only</>}</div>
        <div className="gf-form">
          <InlineFormLabel width={10}>
            Parameter
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
          </InlineFormLabel>
        </div>
        <div className="gf-form">
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
        </div>
      </div>
    );
  }
}
