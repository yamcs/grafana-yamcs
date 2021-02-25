import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { InlineField, Select } from '@grafana/ui';
import defaults from 'lodash/defaults';
import React, { PureComponent } from 'react';
import { DataSource } from '../DataSource';
import { changeQueryType, QueryTypeInfo, yamcsQueryTypes } from '../queryInfo';
import { QueryType, YamcsOptions, YamcsQuery } from '../types';
import { QueryEditorParameters } from './QueryEditorParameters';

export interface Props extends QueryEditorProps<DataSource, YamcsQuery, YamcsOptions> {
}

const queryDefaults: Partial<YamcsQuery> = {
  queryType: QueryType.ParameterSamples,
  maxPages: 1,
};

export class QueryEditor extends PureComponent<Props> {

  onQueryTypeChange = (sel: SelectableValue<QueryType>) => {
    const { onChange, query, onRunQuery } = this.props;
    onChange(changeQueryType(query, sel as QueryTypeInfo));
    onRunQuery();
  };

  renderQuery(query: YamcsQuery) {
    if (!query.queryType) {
      return;
    }
    switch (query.queryType) {
      case QueryType.ListEvents:
        return null; // Nothing required
      case QueryType.ParameterSamples:
        return <QueryEditorParameters {...this.props} />
      default:
        return <div>Missing UI for query type: {query.queryType}</div>;
    }
  }

  render() {
    const query = defaults(this.props.query, queryDefaults);
    const currentQueryType = yamcsQueryTypes.find(v => v.value === query.queryType);
    return (
      <>
        <div className="gf-form">
          <InlineField label="Query type"
            labelWidth={14}
            grow={true}
            tooltip="What resource are you querying for?">
            <Select
              options={yamcsQueryTypes}
              value={currentQueryType}
              onChange={this.onQueryTypeChange}
              placeholder="Select query type"
              menuPlacement="bottom"
            />
          </InlineField>
        </div>
        {this.renderQuery(query)}
      </>
    );
  }
}
