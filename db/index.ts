import { MikroORM } from '@mikro-orm/core';
import type { Options, Configuration } from '@mikro-orm/core';
import type { EntityManager, PostgreSqlDriver } from '@mikro-orm/postgresql';

const mikroOrmConfig: Options<PostgreSqlDriver> | Configuration<PostgreSqlDriver> = {
  type: 'postgresql',
  dbName: '',
  user: '',
  password: '',
  host: '',
  port: 5432,
};

const db = {} as {
  orm: MikroORM<PostgreSqlDriver>;
  em: EntityManager<PostgreSqlDriver>;
};

export const initialize = async (): Promise<void> => {
  db.orm = await MikroORM.init<PostgreSqlDriver>(mikroOrmConfig);

  db.em = db.orm.em;
};

export default db;
