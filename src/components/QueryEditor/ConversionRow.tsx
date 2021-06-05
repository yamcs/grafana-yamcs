import { SelectableValue } from '@grafana/data';
import { InlineField, Select } from '@grafana/ui';
import React, { PureComponent } from 'react';
import { ConversionType, ParameterSamplesQuery } from '../../types';
import { YamcsQueryEditorProps } from './types';

type Props = YamcsQueryEditorProps<ParameterSamplesQuery>;

const conversionTypes: Array<SelectableValue<ConversionType>> = [
    { value: ConversionType.RAW, label: 'RAW' },
    { value: ConversionType.ENGINEERING, label: 'ENGINEERING' },
];

export class ConversionRow extends PureComponent<Props> {

    onConversionChange = (sel: SelectableValue<ConversionType>) => {
        const { onChange, query, onRunQuery } = this.props;
        onChange({ ...query, conversion: sel.value });
        onRunQuery();
    };

    render() {
        const { query } = this.props;
        return (
            <>
                <div className="gf-form">
                    <InlineField label="Conversion" labelWidth={14}>
                        <Select
                            width={20}
                            options={conversionTypes}
                            value={conversionTypes.find(v => v.value === query.conversion) ?? conversionTypes[1]}
                            onChange={this.onConversionChange}
                            isSearchable={true}
                            menuPlacement="bottom"
                        />
                    </InlineField>
                </div>
            </>
        );
    }
}
