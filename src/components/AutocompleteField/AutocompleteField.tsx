import { CompletionItem, CompletionItemGroup, Icon, Input, TypeaheadOutput } from '@grafana/ui';
import React, { KeyboardEvent } from 'react';
import { Typeahead } from '../Typeahead/Typeahead';

interface Props {
  onTypeahead?: (typeahead: string) => Promise<TypeaheadOutput>;
  onSelectSuggestion?: (value: string) => void;
  onBlur?: (value?: string) => void;
  placeholder?: string;
  portalPrefix?: string;
  query?: string;
}

interface State {
  suggestions: CompletionItemGroup[];
  value?: string;
}

export class AutocompleteField extends React.PureComponent<Props, State> {
  typeaheadRef?: Typeahead;
  state: State;

  constructor(props: Props) {
    super(props);
    this.state = {
      suggestions: [],
      value: props.query || '',
    };
  }

  onChange = (e: any) => {
    const newValue = e.target.value;
    const changed = newValue !== this.state.value;
    const { onTypeahead } = this.props;
    this.setState({ value: newValue }, () => {
      if (changed) {
        if (onTypeahead) {
          requestAnimationFrame(() => {
            onTypeahead(newValue).then((result) => {
              this.setState({ suggestions: result.suggestions || [] });
            });
          });
        }
      }
    });
  };

  onKeyDown = (event: KeyboardEvent) => {
    const hasSuggestions = this.state.suggestions?.length || false;
    switch (event.key) {
      case 'Escape':
        if (hasSuggestions) {
          event.preventDefault();
          this.setState({ suggestions: [] });
        }
        break;

      case 'ArrowDown':
      case 'ArrowUp':
        if (hasSuggestions) {
          event.preventDefault();
          this.typeaheadRef?.moveMenuIndex(event.key === 'ArrowDown' ? 1 : -1);
        }
        break;

      case 'Enter':
        if (!(event.shiftKey || event.ctrlKey) && hasSuggestions) {
          event.preventDefault();
          this.typeaheadRef?.insertSuggestion();
        }
        break;
    }
  };

  onBlur = () => {
    const value = this.state.value;
    this.setState({ suggestions: [] }, () => {
      if (this.props.onBlur) {
        this.props.onBlur(value);
      }
    });
  };

  selectSuggestion = (suggestion: CompletionItem) => {
    const newValue = suggestion.insertText!;
    this.setState(
      {
        value: newValue,
        suggestions: [],
      },
      () => {
        if (this.props.onSelectSuggestion) {
          this.props.onSelectSuggestion(newValue);
        }
      }
    );
  };

  renderMenu = () => {
    const { suggestions } = this.state;
    const hasSuggestions = suggestions && suggestions.length > 0;
    if (!hasSuggestions) {
      return null;
    }

    return (
      <Typeahead
        menuRef={(menu: Typeahead) => (this.typeaheadRef = menu)}
        origin="yamcs"
        prefix={this.state.value}
        isOpen={!!suggestions.length}
        groupedItems={suggestions}
        onSelectSuggestion={this.selectSuggestion}
      />
    );
  };

  render() {
    return (
      <>
        {this.renderMenu()}
        <Input
          autoComplete="off"
          onKeyDown={this.onKeyDown}
          onChange={this.onChange}
          onBlur={this.onBlur}
          prefix={<Icon name="search" />}
          placeholder={this.props.placeholder}
          spellCheck={false}
          value={this.state.value}
        />
      </>
    );
  }
}
