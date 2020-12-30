import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { LegacyForms } from '@grafana/ui';
import React, { ChangeEvent, PureComponent } from 'react';
import { YamcsDataSourceOptions } from './types';

const { /*SecretFormField,*/ FormField } = LegacyForms;

interface Props extends DataSourcePluginOptionsEditorProps<YamcsDataSourceOptions> { }

interface State { }

export class ConfigEditor extends PureComponent<Props, State> {

  onServerURLChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onOptionsChange, options } = this.props;
    const jsonData = {
      ...options.jsonData,
      serverURL: event.target.value,
    };
    onOptionsChange({ ...options, jsonData });
  };

  onInstanceChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onOptionsChange, options } = this.props;
    const jsonData = {
      ...options.jsonData,
      instance: event.target.value,
    };
    onOptionsChange({ ...options, jsonData });
  };

  render() {
    const { options } = this.props;
    const { jsonData /*, secureJsonFields*/ } = options;
    // const secureJsonData = (options.secureJsonData || {}) as MySecureJsonData;

    return (
      <div className="gf-form-group">
        <div className="gf-form">
          <FormField
            label="Server URL"
            labelWidth={6}
            inputWidth={20}
            onChange={this.onServerURLChange}
            value={jsonData.serverURL || 'http://localhost:8090'}
            placeholder="Base address of Yamcs"
          />
        </div>
        <div className="gf-form">
          <FormField
            label="Instance"
            labelWidth={6}
            inputWidth={20}
            onChange={this.onInstanceChange}
            value={jsonData.instance || ''}
            placeholder="name of the Yamcs instance"
          />
        </div>
      </div>
    );
  }
}
