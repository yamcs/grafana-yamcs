import { QueryEditorProps } from '@grafana/data';
import { ButtonCascader, CascaderOption, QueryField, TypeaheadInput, TypeaheadOutput } from '@grafana/ui';
import React, { PureComponent } from 'react';
import { DataSource } from './DataSource';
import { ParameterQuery, YamcsOptions } from './types';

type Props = QueryEditorProps<DataSource, ParameterQuery, YamcsOptions>;

interface QueryState {
  options?: CascaderOption[];
}

export class QueryEditor extends PureComponent<Props, QueryState> {

  async componentDidMount() {
    this.props.datasource.cascadeParameters().then(options => {
      this.setState({
        ... this.state,
        options,
      })
    });
  }

  onChangeCascade = (value: string[], selectedOptions: CascaderOption[]): void => {
    const parameter = value[value.length - 1];
    this.onChangeQuery(parameter, true);
  };

  onChangeQuery = (parameter: string, force?: boolean): void => {
    this.props.onChange({ ...this.props.query, parameter });
    if (force) {
      this.props.onRunQuery();
    }
  };

  onTypeahead = async (input: TypeaheadInput): Promise<TypeaheadOutput> => {
    const suggestions = await this.props.datasource.suggestParameters(input.prefix);
    return { suggestions };
  };

  render() {
    const cascadeOptions = this.state?.options || [];
    const cascadeDisabled = !cascadeOptions.length;
    return (
      <div className="gf-form-inline gf-form-inline--nowrap">
        <div className="gf-form flex-shrink-0 min-width-5">
          <ButtonCascader
            options={cascadeOptions}
            disabled={cascadeDisabled}
            onChange={this.onChangeCascade}>
            Parameters
          </ButtonCascader>
        </div>
        <div className="gf-form gf-form--grow flex-shrink-1">
          <QueryField
            query={this.props.query.parameter || ''}
            onBlur={this.props.onBlur}
            onChange={this.onChangeQuery}
            onRunQuery={this.props.onRunQuery}
            onTypeahead={this.onTypeahead}
            placeholder="Enter a Yamcs query (run with Shift+Enter)"
            portalOrigin="yamcs"
          />
        </div>
      </div>
    );
  }
}
