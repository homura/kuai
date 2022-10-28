import { Image } from './types';

export class DockerError extends Error {
  constructor(public readonly parent?: Error) {
    super();
    Object.setPrototypeOf(this, DockerError.prototype);
  }
}

export class DockerHubConnectionError extends DockerError {
  constructor(public readonly parent?: Error) {
    super(parent);
    Object.setPrototypeOf(this, DockerHubConnectionError.prototype);
  }
}

export class DockerNotInstalledError extends DockerError {
  constructor(public readonly parent?: Error) {
    super(parent);
    Object.setPrototypeOf(this, DockerNotInstalledError.prototype);
  }
}

export class DockerNotRunningError extends DockerError {
  constructor(public readonly parent?: Error) {
    super(parent);
    Object.setPrototypeOf(this, DockerNotRunningError.prototype);
  }
}

export class DockerBadGatewayError extends DockerError {
  constructor(public readonly parent?: Error) {
    super(parent);
    Object.setPrototypeOf(this, DockerBadGatewayError.prototype);
  }
}

export class ImageDoesntExistError extends DockerError {
  constructor(public readonly image: Image, public readonly parent?: Error) {
    super(parent);
    Object.setPrototypeOf(this, ImageDoesntExistError.prototype);
  }
}

export class DockerServerError extends DockerError {
  constructor(public readonly parent?: Error) {
    super(parent);
    Object.setPrototypeOf(this, DockerServerError.prototype);
  }

  public getServerErrorMessage(): string {
    if (this.parent !== undefined) {
      if (this.parent.message !== undefined) {
        return this.parent.message;
      }
    }

    return 'Docker server error';
  }
}

export class ExecutableNotFoundError extends DockerError {
  constructor(public readonly parent?: Error) {
    super(parent);
    Object.setPrototypeOf(this, ExecutableNotFoundError.prototype);
  }
}
