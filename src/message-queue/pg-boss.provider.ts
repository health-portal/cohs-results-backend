import { PgBoss } from 'pg-boss';
import { QueueTable } from './message-queue.schema';
import { env } from 'src/lib/environment';
import { Provider } from '@nestjs/common';

export const PgBossProvider: Provider = {
  provide: 'PG_BOSS',
  useFactory: async () => {
    const boss = new PgBoss(env.DATABASE_URL);
    await boss.start();

    const queues = await boss.getQueues();
    const existing = queues.map((q) => q.name);

    for (const table of Object.values(QueueTable)) {
      if (!existing.includes(table)) {
        await boss.createQueue(table);
      }
    }

    return boss;
  },
};
