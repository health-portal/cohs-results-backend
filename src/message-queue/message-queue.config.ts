import { PrismaClient } from 'prisma/client/message-queue';
import { pgmq } from 'prisma-pgmq';
import { QueueTable } from './message-queue.schema';

async function main() {
  const prisma = new PrismaClient();

  try {
    const queues = await pgmq.listQueues(prisma);
    const queueNames = queues.map((queue) => queue.queue_name);
    const tables = Object.values(QueueTable);
    for (const table of tables) {
      if (!queueNames.includes(table)) {
        await pgmq.createQueue(prisma, table);
        console.log(`Queue ${table} created`);
      } else {
        console.log(`Queue ${table} already exists`);
      }
    }
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
