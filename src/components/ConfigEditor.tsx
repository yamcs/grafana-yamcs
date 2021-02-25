import { DataSourcePluginOptionsEditorProps, onUpdateDatasourceJsonDataOption } from '@grafana/data';
import { DataSourceHttpSettings, LegacyForms } from '@grafana/ui';
import React, { PureComponent } from 'react';
import { YamcsOptions } from '../types';

export type Props = DataSourcePluginOptionsEditorProps<YamcsOptions>;

export class ConfigEditor extends PureComponent<Props> {

  constructor(props: Props) {
    super(props);
  }

  render() {
    return (
      <>
        <DataSourceHttpSettings
          defaultUrl="http://localhost:8090"
          dataSourceConfig={this.props.options}
          showAccessOptions={true}
          onChange={this.props.onOptionsChange}
        />
        <h3 className="page-heading">Yamcs Details</h3>
        <div className="gf-form-group">
          <div className="gf-form-inline">
            <div className="gf-form">
              <LegacyForms.FormField
                label="Instance"
                labelWidth={13}
                inputWidth={20}
                onChange={onUpdateDatasourceJsonDataOption(this.props, 'instance')}
                value={this.props.options.jsonData.instance || ''}
                placeholder="myproject"
              />
            </div>
          </div>
        </div>
      </>
    );
  }
}
