import { Registry, SelectableValue } from '@grafana/data';
import { Select } from '@grafana/ui';
import React, { PureComponent } from 'react';
import { ParameterInfo, StatType } from '../../types';

interface Props {
    parameterInfo?: ParameterInfo;
    onChange: (stats: StatType[]) => void;
    stats: StatType[];
    allowMultiple?: boolean;
    defaultStat?: StatType;
    className?: string;
    menuPlacement?: 'auto' | 'bottom' | 'top';
}

const AnyTypeOK = (p: ParameterInfo) => true;
const OnlyNumbers = (p: ParameterInfo) => p.engType !== 'STRING';

export const statRegistry = new Registry(() => [
    { id: StatType.AVG, name: 'Average', isValid: OnlyNumbers },
    { id: StatType.COUNT, name: 'Count', isValid: AnyTypeOK },
    { id: StatType.MAX, name: 'Max', isValid: OnlyNumbers },
    { id: StatType.MIN, name: 'Min', isValid: OnlyNumbers },
]);

export class StatsPicker extends PureComponent<Props> {
    static defaultProps: Partial<Props> = {
        allowMultiple: true,
    };

    componentDidMount() {
        this.checkInput();
    }

    componentDidUpdate(prevProps: Props) {
        this.checkInput();
    }

    checkInput = () => {
        const { stats, allowMultiple, defaultStat, onChange } = this.props;

        const current = statRegistry.list(stats);
        if (current.length !== stats.length) {
            onChange(current.map(stat => stat.id));
        }

        // Make sure there is only one
        if (!allowMultiple && stats.length > 1) {
            onChange([stats[0]]);
        }

        // Set the reducer from callback
        if (defaultStat && stats.length < 1) {
            onChange([defaultStat]);
        }
    };

    onSelectionChange = (item: SelectableValue<StatType>) => {
        const { onChange } = this.props;
        if (Array.isArray(item)) {
            onChange(item.map((v) => v.value));
        } else {
            onChange(item && item.value ? [item.value] : []);
        }
    };

    render() {
        const { stats, allowMultiple, defaultStat, className, menuPlacement, parameterInfo: parameterInfo } = this.props;

        const select = statRegistry.selectOptions(stats);
        if (parameterInfo && parameterInfo.engType === 'STRING') {
            select.options = statRegistry.list().filter(a => a.isValid(parameterInfo));
        }
        return (
            <Select
                value={select.current}
                className={className}
                isClearable={!defaultStat}
                isMulti={allowMultiple}
                isSearchable={true}
                options={select.options as any}
                onChange={this.onSelectionChange}
                menuPlacement={menuPlacement}
            />
        );
    }
}
