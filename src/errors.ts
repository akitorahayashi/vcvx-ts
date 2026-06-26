export class ClientError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class ClientConfigurationError extends ClientError {}

export class HttpError extends ClientError {
  constructor(
    message: string,
    readonly status: number,
    readonly statusText: string,
    readonly body: string,
  ) {
    super(message);
  }
}

export class ResponseParseError extends ClientError {
  constructor(
    message: string,
    readonly body: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}
