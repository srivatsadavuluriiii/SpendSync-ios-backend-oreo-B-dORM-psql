declare module '../../../../shared/errors' {
  export class BadRequestError extends Error {
    constructor(message: string);
  }
  // Add other error classes as needed
} 