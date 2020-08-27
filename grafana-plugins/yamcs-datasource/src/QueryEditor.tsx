import defaults from 'lodash/defaults';
import { fetchCascaderOptions, findByName } from './util';
// import React, { ChangeEvent, PureComponent } from 'react';
import React, { PureComponent } from 'react';
import { InlineFormLabel, Button } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { DataSource } from './DataSource';
import { MyDataSourceOptions, MyQuery, defaultQuery } from './types';

// const { FormField } = LegacyForms;

import { Cascader, CascaderOption } from '@grafana/ui';
import { Select } from '@grafana/ui';
import { Checkbox } from '@grafana/ui';

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

let betterOpt: CascaderOption[] = [{ label: 'No Parameter', value: undefined }];

let profileOptions: Array<SelectableValue<string | number>> = [
  { label: 'profile 1', value: 1 },
  { label: 'profile 2', value: 2 },
  { label: 'profile 3', value: 3 },
];

export class QueryEditor extends PureComponent<Props> {
  isReady = false;

  showRawValues = true;

  setCascaderOptions = async () => {
    let res: CascaderOption[] = await fetchCascaderOptions('' + this.props.datasource.url);
    betterOpt.push(...res);
  };

  handleCascaderSelect = async (input: any) => {
    let elem = findByName({ value: '', items: betterOpt }, input);
    if (elem.items && elem.items.length) {
      return;
    }

    const { onChange, query, onRunQuery } = this.props;
    onChange({ ...query, param: input });
    // executes the query
    onRunQuery();
  };

  // filterOptions = (input: string) => {
  //   const res = options.filter((e: any) => {
  //     return e.label.toLowerCase().includes(input.toLowerCase());
  //   });
  //   return res;
  // };

  // loadAsyncOptions = (input: string) => {
  //   console.log(this);
  //
  //   console.log('PROPS');
  //
  //   console.log(this.props);
  //
  //   // fetch the parameters only the first time. Will trigger again if the browser page is refreshed.
  //   if (!isUpdated) {
  //     isUpdated = true;
  //     return new Promise<Array<SelectableValue<string | undefined>>>(resolve => {
  //       const proxyUrl = this.props.datasource.url;
  //       const routePath = '/param';
  //       const url = proxyUrl + routePath + `?system=${parameterPath}&pos=0&limit=100`;
  //       // const url = proxyUrl + routePath;
  //
  //       getBackendSrv()
  //         .datasourceRequest({
  //           url: url,
  //           method: 'GET',
  //         })
  //         .then(({ data }: any) => {
  //           let res: Array<SelectableValue<string | undefined>> = [{ label: 'No parameter', value: undefined }];
  //           data.parameters.forEach(({ name }: { name: string }) => {
  //             res.push({ label: name, value: name });
  //           });
  //           options = res;
  //           resolve(res);
  //         });
  //     });
  //   }
  //   // return the parameters otherwise.
  //   return new Promise<Array<SelectableValue<string | undefined>>>(resolve => resolve(this.filterOptions(input)));
  // };

  // onParamChange = (selected: SelectableValue<string | undefined>) => {
  //   const { onChange, query, onRunQuery } = this.props;
  //   onChange({ ...query, param: selected.value! });
  //   // executes the query
  //   onRunQuery();
  // };

  render() {
    const query = defaults(this.props.query, defaultQuery);
    const { param } = query;

    if (!this.isReady) {
      this.isReady = true;
      this.setCascaderOptions().then(() => {
        console.log('it is ready');
      });
    }

    return (
      <div>
        <div className="gf-form">
          <InlineFormLabel width={10}>
            Parameter
            <Button size={'sm'} icon={'question-circle'} onClick={() => console.log('click')}>
              Info
            </Button>
          </InlineFormLabel>
          <Cascader
            options={betterOpt}
            onSelect={this.handleCascaderSelect}
            placeholder={param ? param : 'Select a parameter'}
          />
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
