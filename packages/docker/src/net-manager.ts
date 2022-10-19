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

  public async start(port: number): Promise<void> {
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

    this._dockerManager._docker.run('kuai/ckb-dev', [], process.stdout, config);
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
