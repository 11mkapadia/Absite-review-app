import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

// Push subscriptions persisted as a JSON array, keyed by endpoint.
export class SubscriptionStore {
  constructor(file) {
    this.file = file;
  }

  async all() {
    try {
      return JSON.parse(await readFile(this.file, 'utf8'));
    } catch (err) {
      if (err.code === 'ENOENT') return [];
      throw err;
    }
  }

  async add(sub) {
    const subs = (await this.all()).filter((s) => s.endpoint !== sub.endpoint);
    subs.push(sub);
    await this.#save(subs);
    return subs.length;
  }

  async remove(endpoints) {
    const drop = new Set(endpoints);
    const subs = (await this.all()).filter((s) => !drop.has(s.endpoint));
    await this.#save(subs);
  }

  async #save(subs) {
    await mkdir(dirname(this.file), { recursive: true });
    await writeFile(this.file, JSON.stringify(subs, null, 2));
  }
}
