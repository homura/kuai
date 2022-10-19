import Docker, { ImageBuildContext } from 'dockerode';
import fsExtra from 'fs-extra';
import { IncomingMessage } from 'http';
import {
  DockerBadGatewayError,
  DockerHubConnectionError,
  DockerNotInstalledError,
  DockerNotRunningError,
  DockerServerError,
  ExecutableNotFoundError,
  ImageDoesntExistError,
} from './errors';
import { Image } from './types';

const DOCKER_SOCKET_PATH = '/var/run/docker.sock';

export class DockerManager {
  public static async create(): Promise<DockerManager> {
    if (!(await DockerManager.isInstalled())) {
      throw new DockerNotInstalledError();
    }

    // TODO: This doesn't support windows
    if (!(await fsExtra.pathExists(DOCKER_SOCKET_PATH))) {
      throw new DockerNotRunningError();
    }

    return new DockerManager(Docker);
  }

  public static async isInstalled(): Promise<boolean> {
    // TODO: This doesn't support windows
    const { exec } = await import('child_process');
    return new Promise((resolve) => {
      exec('which docker', (error?) => resolve(!error));
    });
  }

  public static imageToRepoTag(image: Image): string {
    return `${image.repository}:${image.tag}`;
  }

  readonly _docker: Docker;

  // The constructor is private, see [[DockerManager.create]].
  private constructor(DockerImpl: typeof Docker) {
    // TODO: This doesn't support windows
    this._docker = new DockerImpl({ socketPath: DOCKER_SOCKET_PATH });
  }

  public async isRunning(): Promise<boolean> {
    try {
      const result = await this._withCommonErrors(this._docker.ping());
      return result === 'OK';
    } catch (error) {
      if (error instanceof DockerNotRunningError) {
        return false;
      }

      if (error instanceof DockerBadGatewayError) {
        return false;
      }

      throw error;
    }
  }

  public async imageExists(image: Image): Promise<boolean> {
    const { got } = await import('got-cjs');

    const repositoryPath = this._imageToRepositoryPath(image);

    const imageEndpoint = `https://registry.hub.docker.com/v2/repositories/${repositoryPath}/tags/${image.tag}/`;

    try {
      const res = await got(imageEndpoint, { method: 'GET' });
      return res.statusCode >= 200 && res.statusCode <= 299;
    } catch (error) {
      throw new DockerHubConnectionError(error as Error);
    }
  }

  public async hasPulledImage(image: Image): Promise<boolean> {
    const images = await this._withCommonErrors<Docker.ImageInfo[]>(this._docker.listImages());

    return images.some(
      (img) =>
        img.RepoTags !== null &&
        img.RepoTags.some((repoAndTag: string) => repoAndTag === DockerManager.imageToRepoTag(image)),
    );
  }

  public async pullImage(image: Image): Promise<void> {
    if (!(await this.imageExists(image))) {
      throw new ImageDoesntExistError(image);
    }

    const im: IncomingMessage = await this._withCommonErrors(
      this._docker.pull(DockerManager.imageToRepoTag(image), {}),
    );

    return new Promise((resolve, reject) => {
      im.on('end', resolve);
      im.on('error', reject);

      // Not having the data handler causes the process to exit
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      im.on('data', () => {});
    });
  }

  public async buildImage(
    file: string | NodeJS.ReadableStream | ImageBuildContext,
    options?: { [key: string]: any }, // eslint-disable-line @typescript-eslint/no-explicit-any
  ): Promise<void> {
    const stream = await this._docker.buildImage(file, options);
    await this.followStream(stream);
  }

  private async _withCommonErrors<T>(promise: Promise<T>): Promise<T> {
    try {
      return await promise;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        throw new DockerNotRunningError(error);
      }

      if (error.statusCode === 502) {
        throw new DockerBadGatewayError(error);
      }

      if (error.statusCode === 500) {
        throw new DockerServerError(error);
      }

      if (
        error.statusCode === 400 &&
        error.message !== undefined &&
        error.message.includes('executable file not found')
      ) {
        throw new ExecutableNotFoundError(error);
      }

      throw error;
    }
  }

  public async followStream(stream: NodeJS.ReadableStream): Promise<void> {
    await new Promise((resolve, reject) => {
      this._docker.modem.followProgress(
        stream,
        (err: unknown, res: unknown) => {
          if (err) {
            console.error(err);
            reject(err);
          } else {
            resolve(res);
          }
        },
        (event: unknown) => console.debug(event),
      );
    });
  }

  private _imageToRepositoryPath(image: Image): string {
    return image.repository.includes('/') ? image.repository : `library/${image.repository}`;
  }
}
