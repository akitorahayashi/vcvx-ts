export class VoicevoxError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'VoicevoxError';
  }
}

export class HttpError extends VoicevoxError {
  readonly body: string;
  readonly method: string;
  readonly path: string;
  readonly status: number;

  constructor(details: {
    body: string;
    method: string;
    path: string;
    status: number;
  }) {
    super(
      `VOICEVOX request failed: ${details.status} ${details.method} ${details.path}`,
    );
    this.name = 'HttpError';
    this.body = details.body;
    this.method = details.method;
    this.path = details.path;
    this.status = details.status;
  }
}

export class ResponseParseError extends VoicevoxError {
  readonly contentType: string | null;
  readonly method: string;
  readonly path: string;

  constructor(details: {
    contentType: string | null;
    cause?: unknown;
    method: string;
    path: string;
  }) {
    super(
      `VOICEVOX response parsing failed for ${details.method} ${details.path}`,
      details.cause === undefined ? undefined : { cause: details.cause },
    );
    this.name = 'ResponseParseError';
    this.contentType = details.contentType;
    this.method = details.method;
    this.path = details.path;
  }
}

export class ResponseValidationError extends VoicevoxError {
  readonly path: string;

  constructor(details: { message: string; path: string }) {
    super(
      `VOICEVOX response is invalid for ${details.path}: ${details.message}`,
    );
    this.name = 'ResponseValidationError';
    this.path = details.path;
  }
}

export class RequestValidationError extends VoicevoxError {
  constructor(message: string) {
    super(`VOICEVOX request is invalid: ${message}`);
    this.name = 'RequestValidationError';
  }
}
