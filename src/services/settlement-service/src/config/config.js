export interface Config {
  port: number;
  env: string;
  mongodb: {
    uri: string;
  };
  redis: {
    host: string;
    port: number;
  };
}

export const config: Config = {
  port: Number(process.env.PORT) || 4003,
  env: process.env.NODE_ENV || 'development',
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/spendsync'
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
  }
}; 