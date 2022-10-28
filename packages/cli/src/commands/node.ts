import { Command } from 'commander';
import { CkbNetManager } from '@kuaiproject/docker';

interface Args {
  port: number;
  detached: boolean;
}

const node = new Command('node');
node
  .option('-p --port <number>', 'port number', '8114')
  .option('-d --detached', 'run in backend')
  .action(async (args: Args) => {
    console.log(`ckb running on: ${args.port}`);

    const ckbNetManager = await CkbNetManager.create();

    if (!args.detached) {
      process.on('SIGINT', async () => {
        await ckbNetManager.stop();
      });
    }

    await ckbNetManager.start({ port: args.port, detached: args.detached });
  });

node.command('stop').action(async () => {
  const ckbNetManager = await CkbNetManager.create();
  await ckbNetManager.stop();
});

export { node };
