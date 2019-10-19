const { requireAuth } = require('../utils/Authentication');

const Query = {
  // users query
  users: (parent, args, { prisma }) => {
    const opArgs = {
      first: args.first,
      skip: args.skip,
      after: args.after,
      orderBy: args.orderBy
    };

    if (args.query) {
      opArgs.where = {
        OR: [
          {
            name_contains: args.query
          }
        ]
      };
    }

    return prisma.users(opArgs);
  },

  me: requireAuth((parent, args, { prisma, userId }) => {
    return prisma.user({ id: userId });
  })
};

module.exports = Query;
