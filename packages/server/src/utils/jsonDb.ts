import fs from 'fs/promises';
import path from 'path';

export class JsonDb<T> {
  private filePath: string;

  constructor(fileName: string) {
    this.filePath = path.join(__dirname, '../../../../data', fileName);
  }

  async read(): Promise<T[]> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // If file doesn't exist, return empty array and create file
        await this.write([]);
        return [];
      }
      throw error;
    }
  }

  async write(data: T[]): Promise<void> {
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  async add(item: T): Promise<void> {
    const data = await this.read();
    data.push(item);
    await this.write(data);
  }

  async update(predicate: (item: T) => boolean, newItem: T): Promise<void> {
    const data = await this.read();
    const index = data.findIndex(predicate);
    if (index !== -1) {
      data[index] = newItem;
      await this.write(data);
    }
  }

  async delete(predicate: (item: T) => boolean): Promise<void> {
    const data = await this.read();
    const newData = data.filter(item => !predicate(item));
    await this.write(newData);
  }
}
