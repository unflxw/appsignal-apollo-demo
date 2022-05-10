import http from 'http';

import { createApolloPlugin } from '@appsignal/apollo-server';
import { Appsignal } from '@appsignal/nodejs';
import { makeExecutableSchema } from '@graphql-tools/schema';
import type { TypeSource, IResolvers } from '@graphql-tools/utils';
import { RequestContext } from '@mikro-orm/core';
import { ApolloServerPluginDrainHttpServer } from 'apollo-server-core';
import { ApolloServer } from 'apollo-server-koa';
import { applyMiddleware } from 'graphql-middleware';
import Koa from 'koa';

import db, { initialize as initializeDatabase } from '@/db';

// eslint-disable-next-line
require('dotenv').config();

const {
  CONFIG,
} = process.env;

const config = {
  server: {
    port: 8000,
  },
  graphqlApiPath: '',
};

const typeDefs = {} as any;
const resolvers = {};
const permissions = {};

const appSignal = new Appsignal({
  active: CONFIG === 'production',
  name: 'Pythia',
});

const {
  server: {
    port: serverPort,
  },
  graphqlApiPath,
} = config;

const app = new Koa();

app.use((ctx, next) => RequestContext.createAsync(db.orm.em, next));

interface StartServerParams {
  typeDefs: TypeSource;
  resolvers: IResolvers;
}

async function startServer(apolloServerParams: StartServerParams) {
  await initializeDatabase();

  const httpServer = http.createServer();
  const schema = makeExecutableSchema(apolloServerParams);
  const schemaWithPermissions = applyMiddleware(schema, permissions);

  const server = new ApolloServer({
    schema: schemaWithPermissions,
    context: ({ ctx, connection }) => {
      if (connection) {
        return connection.context;
      }

      // Query or Mutation
      return {
        client: ctx.client,
        isAuthenticated: ctx.isAuthenticated(),
      };
    },
    formatError(err) {
      console.error(err);

      err.message = err.message || 'Internal server error. Please contact the administrator';

      return err;
    },
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer }), createApolloPlugin(appSignal) as any],
  });

  await server.start();
  server.applyMiddleware({ app, path: graphqlApiPath });
  httpServer.on('request', app.callback());

  // eslint-disable-next-line no-promise-executor-return
  await new Promise<void>(resolve => httpServer.listen({ port: serverPort }, resolve));

  return { server, app };
}

void startServer({ typeDefs, resolvers });
