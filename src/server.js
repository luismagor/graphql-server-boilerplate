const { GraphQLServer } = require('graphql-yoga');
const { prisma } = require('./generated/prisma-client');
const resolvers = require('./resolvers');
const { getUserId } = require('./utils/Token');

const server = new GraphQLServer({
  typeDefs: './src/schema.graphql',
  resolvers,
  context: async contextParams => {
    const userId = await getUserId(contextParams);

    return {
      prisma,
      userId
    };
  }
});

module.exports = server;
