import { DataSource } from './DataSource';
import { DictionaryEntry } from './DictionaryEntry';
import { ListParametersPage } from './YamcsClient';

export class Dictionary {
    private loaded = false;
    private entriesByName = new Map<string, DictionaryEntry>();

    constructor(private dataSource: DataSource) {
    }

    async loadDictionary() {
        if (this.loaded) {
            return;
        }

        this.entriesByName.clear();
        let page: ListParametersPage | null = null;
        while (!page || page.continuationToken) {
            if (!page) {
                page = await this.dataSource.yamcs.listParameters();
            } else {
                page = await this.dataSource.yamcs.listParameters({ next: page.continuationToken });
            }
            for (const parameter of (page.parameters || [])) {
                const entry = new DictionaryEntry(parameter);
                this.entriesByName.set(entry.name, entry);
            }
        }
        this.loaded = true;
    }

    getEntry(name: string): DictionaryEntry {
        const entry = this.entriesByName.get(name);
        if (entry) {
            return entry;
        } else {
            throw 'entry not found';
        }
    }
}
