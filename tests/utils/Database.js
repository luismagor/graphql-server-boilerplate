const { prisma } = require('../../src/generated/prisma-client');
const { hashPassword } = require('../../src/utils/Password');
const { generateToken } = require('../../src/utils/Token');

const db = {
  users: [
    {
      id: undefined,
      name: 'Jen',
      email: 'jen@example.com',
      password: 'pass1234',
      token: undefined
    },
    {
      id: undefined,
      name: 'Jess',
      email: 'jess@example.com',
      password: 'pass1234',
      token: undefined
    }
  ]
};

const seedDatabase = async () => {
  // Delete database
  await prisma.deleteManyUsers();

  // Create test users
  await Promise.all(
    db.users.map(async user => {
      const response = await prisma.createUser({
        name: user.name,
        email: user.email,
        password: await hashPassword(user.password)
      });

      user.id = response.id;
      user.token = await generateToken(response.id);
    })
  );
};

module.exports = { seedDatabase, db };
