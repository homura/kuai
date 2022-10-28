import { ContainerCreateOptions } from 'dockerode';
import { DockerManager } from './docker-manager';
import { join } from 'path';

export class CkbNetManager {
  public static async create(): Promise<CkbNetManager> {
    return new CkbNetManager(await DockerManager.create());
  }

  private _dockerManager: DockerManager;

  private constructor(dockerManager: DockerManager) {
    this._dockerManager = dockerManager;
  }

  public async start({ port, detached = false }: { port: number; detached?: boolean }): Promise<void> {
    await this._dockerManager.buildImage(
      {
        context: join(__dirname, '../ckb'),
        src: ['Dockerfile', 'dev.toml', 'ckb-miner.toml', 'entrypoint.sh'],
      },
      { t: 'kuai/ckb-dev' },
    );

    const config: ContainerCreateOptions = {
      HostConfig: {
        AutoRemove: true,
        PortBindings: { '8114/tcp': [{ HostPort: port }] },
      },
    };

    if (!detached) {
      return this._dockerManager._docker.run('kuai/ckb-dev', [], process.stdout, config);
    }

    this._dockerManager._docker.createContainer(
      { Image: 'kuai/ckb-dev', Tty: false, ...config },
      function (err, container) {
        if (err || !container) {
          throw err;
        }

        container.start();
      },
    );
  }

  public async stop(): Promise<void> {
    const containers = await this._dockerManager._docker.listContainers();

    await Promise.all(
      containers
        .filter((container) => container.Image === 'kuai/ckb-dev')
        .map((container) => this._dockerManager._docker.getContainer(container.Id).stop()),
    );
  }
}
