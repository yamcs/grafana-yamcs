import defaults from 'lodash/defaults';

import { getBackendSrv } from '@grafana/runtime';
// import React, { ChangeEvent, PureComponent } from 'react';
import React, { PureComponent } from 'react';
import { LegacyForms, InlineFormLabel } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { DataSource } from './DataSource';
import { defaultQuery, MyDataSourceOptions, MyQuery } from './types';
// const { FormField } = LegacyForms;
const { AsyncSelect } = LegacyForms;

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

let options: Array<SelectableValue<string | undefined>> = [{ label: 'No parameter', value: undefined }];

let isUpdated = false;
let parameterPath: string | undefined = '';

export const setParameterPath = function(val: string | undefined) {
  parameterPath = val;
};

export const setIsUpdated = function(val: boolean) {
  isUpdated = val;
};

export class QueryEditor extends PureComponent<Props> {
  bol = false;

  filterOptions = (input: string) => {
    const res = options.filter((e: any) => {
      return e.label.toLowerCase().includes(input.toLowerCase());
    });
    return res;
  };

  loadAsyncOptions = (input: string) => {
    console.log(this);

    console.log('PROPS');

    console.log(this.props);

    // fetch the parameters only the first time. Will trigger again if the browser page is refreshed.
    if (!isUpdated) {
      isUpdated = true;
      return new Promise<Array<SelectableValue<string | undefined>>>(resolve => {
        const proxyUrl = this.props.datasource.url;
        const routePath = '/param';
        const url = proxyUrl + routePath + `?system=${parameterPath}&pos=0&limit=100`;
        // const url = proxyUrl + routePath;

        getBackendSrv()
          .datasourceRequest({
            url: url,
            method: 'GET',
          })
          .then(({ data }: any) => {
            let res: Array<SelectableValue<string | undefined>> = [{ label: 'No parameter', value: undefined }];
            data.parameters.forEach(({ name }: { name: string }) => {
              res.push({ label: name, value: name });
            });
            options = res;
            resolve(res);
          });
      });
    }
    // return the parameters otherwise.
    return new Promise<Array<SelectableValue<string | undefined>>>(resolve => resolve(this.filterOptions(input)));
  };

  onParamChange = (selected: SelectableValue<string | undefined>) => {
    const { onChange, query, onRunQuery } = this.props;
    onChange({ ...query, param: selected.value! });
    // executes the query
    onRunQuery();
  };

  render() {
    const query = defaults(this.props.query, defaultQuery);
    const { param } = query;

    return (
      <div className="gf-form">
        <InlineFormLabel width={8}>AsyncParameter</InlineFormLabel>
        <AsyncSelect
          cacheOptions
          defaultOptions
          loadOptions={this.loadAsyncOptions}
          value={{ label: param ? param : 'No parameter', value: param }}
          className="gf-form-select"
          onChange={this.onParamChange}
        />
      </div>
    );
  }
}
