/**
 * Cache Service
 *
 * Redis-based caching for API responses and expensive operations
 */
export declare const CACHE_TTLs: {
    settlement: number;
    settlementList: number;
    debtGraph: number;
    exchangeRates: number;
    friendships: number;
};
declare class CacheService {
    private redisClient;
    private readonly defaultTTL;
    constructor();
    private connect;
    /**
     * Generate a cache key from parts
     */
    generateCacheKey(prefix: string, ...parts: (string | Record<string, any>)[]): string;
    /**
     * Get data from cache
     */
    get<T>(key: string): Promise<T | null>;
    /**
     * Set data in cache
     */
    set(key: string, data: any, ttl?: number): Promise<boolean>;
    /**
     * Delete data from cache
     */
    del(key: string): Promise<boolean>;
    /**
     * Cache function result
     */
    cacheResult<T>(fn: () => Promise<T>, key: string, ttl?: number): Promise<T>;
    /**
     * Clear cache by pattern
     */
    clearByPattern(pattern: string): Promise<boolean>;
}
export declare const cacheService: CacheService;
export {};
