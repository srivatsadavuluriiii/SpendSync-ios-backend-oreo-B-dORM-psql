import { CircuitBreakerError } from './errors';

enum State {
  CLOSED,
  OPEN,
  HALF_OPEN
}

interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number;
  halfOpenRetries?: number;
}

export class CircuitBreaker {
  private state: State = State.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime?: number;
  private halfOpenSuccesses: number = 0;

  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private readonly halfOpenRetries: number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.halfOpenRetries = options.halfOpenRetries || 3;
  }

  async execute<T>(
    serviceName: string,
    fn: () => Promise<T>
  ): Promise<T> {
    if (this.state === State.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = State.HALF_OPEN;
      } else {
        throw new CircuitBreakerError(serviceName);
      }
    }

    try {
      const result = await fn();

      if (this.state === State.HALF_OPEN) {
        this.halfOpenSuccesses++;
        if (this.halfOpenSuccesses >= this.halfOpenRetries) {
          this.reset();
        }
      }

      return result;
    } catch (error) {
      this.handleFailure();
      throw error;
    }
  }

  private handleFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === State.HALF_OPEN || this.failureCount >= this.failureThreshold) {
      this.state = State.OPEN;
      this.halfOpenSuccesses = 0;
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return true;
    return Date.now() - this.lastFailureTime >= this.resetTimeout;
  }

  private reset(): void {
    this.state = State.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = undefined;
    this.halfOpenSuccesses = 0;
  }

  // For monitoring and testing
  getState(): string {
    return State[this.state];
  }

  getStats(): object {
    return {
      state: State[this.state],
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      halfOpenSuccesses: this.halfOpenSuccesses
    };
  }
} 