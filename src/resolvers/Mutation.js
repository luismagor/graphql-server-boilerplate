const { hashPassword, verifyPassword } = require('../utils/Password');
const { generateToken } = require('../utils/Token');
const { requireAuth } = require('../utils/Authentication');

const Mutation = {
  // USER RELATED MUTATIONS
  createUser: async (parent, args, { prisma }) => {
    args.data.password = await hashPassword(args.data.password);

    const user = await prisma.createUser({ ...args.data });

    return {
      user,
      token: await generateToken(user.id)
    };
  },

  login: async (parent, args, { prisma }) => {
    const user = await prisma.user({ email: args.data.email });
    if (!user) {
      throw new Error('Unable to login');
    }

    if (!(await verifyPassword(args.data.password, user.password))) {
      throw new Error('Unable to login');
    }

    return {
      user,
      token: await generateToken(user.id)
    };
  },

  updateUser: requireAuth(async (parent, args, { prisma, userId }) => {
    if (typeof args.data.password === 'string') {
      args.data.password = await hashPassword(args.data.password);
    }

    return prisma.updateUser({ where: { id: userId }, data: args.data });
  }),

  deleteUser: requireAuth((parent, args, { prisma, userId }) => {
    return prisma.deleteUser({ id: userId });
  }),

module.exports = Mutation;
