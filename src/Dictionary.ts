import { DataSource } from './DataSource';
import { DictionaryEntry } from './DictionaryEntry';

export class Dictionary {
  private entriesByName = new Map<string, DictionaryEntry>();

  constructor(private dataSource: DataSource) {}

  clearCache() {
    this.entriesByName.clear();
  }

  async getEntry(name: string) {
    const entry = this.entriesByName.get(name);
    if (entry) {
      return entry;
    } else {
      const parameter = await this.dataSource.yamcs.getParameter(name);
      const entry = new DictionaryEntry(parameter);
      this.entriesByName.set(entry.name, entry);
      return entry;
    }
  }
}
