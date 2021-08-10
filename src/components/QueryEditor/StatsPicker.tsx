import { Registry, SelectableValue } from '@grafana/data';
import { Select } from '@grafana/ui';
import React, { PureComponent } from 'react';
import { StatType } from '../../types';

interface Props {
  onChange: (stats: StatType[]) => void;
  stats: StatType[];
  className?: string;
  menuPlacement?: 'auto' | 'bottom' | 'top';
}

export const statRegistry = new Registry(() => [
  { id: StatType.AVG, name: 'Average' },
  { id: StatType.COUNT, name: 'Count' },
  { id: StatType.MAX, name: 'Max' },
  { id: StatType.MIN, name: 'Min' },
]);

export class StatsPicker extends PureComponent<Props> {
  componentDidMount() {
    this.checkInput();
  }

  componentDidUpdate() {
    this.checkInput();
  }

  checkInput = () => {
    const { stats, onChange } = this.props;

    const current = statRegistry.list(stats);
    if (current.length !== stats.length) {
      onChange(current.map((stat) => stat.id));
    }

    if (stats.length === 0) {
      onChange([StatType.AVG]);
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
    const { stats, className, menuPlacement } = this.props;

    const select = statRegistry.selectOptions(stats);
    return (
      <Select
        value={select.current}
        className={className}
        isClearable={true}
        isMulti={true}
        isSearchable={true}
        options={select.options as any}
        onChange={this.onSelectionChange}
        menuPlacement={menuPlacement}
      />
    );
  }
}
