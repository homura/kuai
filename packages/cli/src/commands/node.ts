import { Command } from 'commander';
import { CkbNetManager } from '@kuaiproject/docker';

interface Args {
  port: number;
}

const node = new Command('node');
node.option('-p --port <number>', 'port number', '8114').action(async (args: Args) => {
  console.log(`ckb running on: ${args.port}`);

  const ckbNetManager = await CkbNetManager.create();
  await ckbNetManager.start(args.port);

  process.on('SIGINT', async () => {
    await ckbNetManager.stop();
  });
});

export { node };
