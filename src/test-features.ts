// Test namespace
namespace API {
  export interface Config {
    endpoint: string;
    version: number;
  }
}

// Test decorators and class features
@logger
class AdvancedService {
  private readonly config: API.Config;
  
  constructor(config: API.Config) {
    this.config = config;
  }

  @memoize
  async getData(id?: string): Promise<object | null> {
    // Test optional chaining and nullish coalescing
    const result = await this.fetchData(id?.trim() ?? 'default');
    return result?.data ?? null;
  }

  // Test private methods
  private async fetchData(id: string): Promise<any> {
    const module = await import('./data-service');
    return module.default.fetch(id);
  }

  // Test const enum
  static readonly Status = {
    OK: 200,
    ERROR: 500
  } as const;
}

// Test decorator factory
function logger<T extends { new (...args: any[]): {} }>(constructor: T) {
  return class extends constructor {
    constructor(...args: any[]) {
      console.log(`Creating instance of ${constructor.name}`);
      super(...args);
    }
  };
}

// Test method decorator
function memoize(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  const cache = new Map();

  descriptor.value = async function(...args: any[]) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = await originalMethod.apply(this, args);
    cache.set(key, result);
    return result;
  };

  return descriptor;
}

export default AdvancedService; 