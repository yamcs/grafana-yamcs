import { SelectableValue } from '@grafana/data';
import { InlineField, Select } from '@grafana/ui';
import React, { PureComponent } from 'react';
import { ParameterSamplesQuery, ValueKind } from '../../types';
import { YamcsQueryEditorProps } from './types';

type Props = YamcsQueryEditorProps<ParameterSamplesQuery>;

const valueKinds: Array<SelectableValue<ValueKind>> = [
  { value: ValueKind.RAW, label: 'RAW' },
  { value: ValueKind.ENGINEERING, label: 'ENGINEERING' },
];

export class ValueKindRow extends PureComponent<Props> {
  onValueKindChange = (sel: SelectableValue<ValueKind>) => {
    const { onChange, query, onRunQuery } = this.props;
    onChange({ ...query, valueKind: sel.value });
    onRunQuery();
  };

  render() {
    const { query } = this.props;
    return (
      <>
        <div className="gf-form">
          <InlineField label="Value" labelWidth={14}>
            <Select
              width={20}
              options={valueKinds}
              value={valueKinds.find((v) => v.value === query.valueKind) ?? valueKinds[1]}
              onChange={this.onValueKindChange}
              isSearchable={true}
              menuPlacement="bottom"
            />
          </InlineField>
        </div>
      </>
    );
  }
}
