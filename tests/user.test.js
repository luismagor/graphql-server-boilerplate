require('cross-fetch/polyfill');
const { prisma } = require('../src/generated/prisma-client');
const { verifyPassword } = require('../src/utils/Password');
const { seedDatabase, db } = require('./utils/Database');
const { send } = require('./utils/Client');
const {
  createUser,
  updateUser,
  deleteUser,
  getUsers,
  login,
  getProfile
} = require('./utils/operations');

const testUser = {
  id: undefined,
  name: 'Mike',
  email: 'mike@example.com',
  password: 'mike1234',
  token: undefined
};

beforeAll(seedDatabase);

describe('createUser mutation', () => {
  test('Should not sign up with short password', async () => {
    const variables = {
      data: {
        name: testUser.name,
        email: testUser.email,
        password: 'short'
      }
    };

    await expect(send({ request: createUser, variables })).rejects.toThrow(
      'Password must be at least 8 characters'
    );
  });

  test('Should create a new user', async () => {
    const variables = {
      data: {
        name: testUser.name,
        email: testUser.email,
        password: testUser.password
      }
    };

    const response = await send({
      request: createUser,
      variables
    });

    const exists = await prisma.$exists.user({
      id: response.data.createUser.user.id
    });

    expect(exists).toBe(true);
    expect(response.data.createUser.user.name).toBe(testUser.name);
    testUser.id = response.data.createUser.user.id;
  });

  test('Should store password encrypted', async () => {
    const response = await prisma.user({ id: testUser.id });
    expect(response.password).not.toBe(testUser.password);
  });

  test('Should not create a user with duplicate email', async () => {
    const variables = {
      data: {
        name: 'Test user',
        email: testUser.email,
        password: '12345678'
      }
    };

    await expect(send({ request: createUser, variables })).rejects.toThrow(
      'A unique constraint would be violated on User'
    );
  });
});

describe('login mutation', () => {
  test('Should not login with bad credentials', async () => {
    const variables = {
      data: {
        email: testUser.email,
        password: 'invalid'
      }
    };

    await expect(send({ request: login, variables })).rejects.toThrow(
      'Unable to login'
    );
  });

  test('Should login with correct credentials', async () => {
    const variables = {
      data: {
        email: testUser.email,
        password: testUser.password
      }
    };

    await expect(send({ request: login, variables })).resolves.toHaveProperty(
      'data.login.token'
    );
  });

  test('Should return a valid token', async () => {
    const variables = {
      data: {
        email: testUser.email,
        password: testUser.password
      }
    };

    const response = await send({ request: login, variables });
    testUser.token = response.data.login.token;

    await expect(
      send({ request: getProfile, jwt: response.data.login.token })
    ).resolves.toEqual(expect.any(Object));
  });
});

describe('me query', () => {
  test('Should require authentication', async () => {
    await expect(send({ request: getProfile })).rejects.toThrow(
      'Authentication required'
    );
  });

  test('Should fetch user profile', async () => {
    const response = await send({
      request: getProfile,
      jwt: testUser.token
    });

    expect(response.data.me.id).toBe(testUser.id);
    expect(response.data.me.name).toBe(testUser.name);
    expect(response.data.me.email).toBe(testUser.email);
  });

  test('Should not expose password', async () => {
    const response = await send({
      request: getProfile,
      jwt: testUser.token
    });

    expect(response.data.me.password).toBeFalsy();
  });
});

describe('users query', () => {
  test('Should return author profiles', async () => {
    const response = await send({ request: getUsers });

    expect(response.data.users.length).toBe(3);
  });

  test("Should not expose users' emails", async () => {
    const response = await send({ request: getUsers });

    response.data.users.forEach(user => {
      expect(user.email).toBe(null);
    });
  });

  test('Should return own email', async () => {
    const response = await send({ request: getUsers, jwt: testUser.token });

    expect(response.data.users).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: testUser.id,
          email: testUser.email
        })
      ])
    );
  });
});

describe('updateUser mutation', () => {
  test('Should require authentication', async () => {
    variables = {
      data: {
        name: 'Changed name'
      }
    };

    await expect(send({ request: updateUser, variables })).rejects.toThrow(
      'Authentication required'
    );
  });

  test('Should fail if email is duplicate', async () => {
    const variables = {
      data: {
        email: db.users[0].email
      }
    };

    expect(
      send({
        request: updateUser,
        variables,
        jwt: testUser.token
      })
    ).rejects.toThrow('A unique constraint would be violated on User');
  });

  test('Should update user data', async () => {
    const variables = {
      data: {
        name: 'Changed name',
        email: 'changed_email@example.com',
        password: 'changed_credentials'
      }
    };
    await send({
      request: updateUser,
      variables,
      jwt: testUser.token
    });

    const response = await prisma.user({ id: testUser.id });

    const passwordValid = await verifyPassword(
      'changed_credentials',
      response.password
    );
    expect(response.name).toBe('Changed name');
    expect(response.email).toBe('changed_email@example.com');
    expect(passwordValid).toBe(true);
  });
});

describe('deleteUser mutation', () => {
  test('Should require authentication', async () => {
    await expect(send({ request: deleteUser })).rejects.toThrow(
      'Authentication required'
    );
  });

  test('Should delete user', async () => {
    const response = await send({ request: deleteUser, jwt: testUser.token });

    expect(response.data.deleteUser.id).toBe(testUser.id);
    const exists = await prisma.$exists.user({ id: testUser.id });
    expect(exists).toBe(false);
  });

  test('Should delete related comments', async () => {
    await send({ request: deleteUser, jwt: db.users[1].token });

    let exists = await prisma.$exists.comment({ id: db.comments[0].id });
    expect(exists).toBe(false);
    exists = await prisma.$exists.comment({ id: db.comments[1].id });
    expect(exists).toBe(true);
  });

  test('Should delete related posts', async () => {
    await send({ request: deleteUser, jwt: db.users[0].token });

    let exists = await prisma.$exists.post({ id: db.posts[0].id });
    expect(exists).toBe(false);
    exists = await prisma.$exists.post({ id: db.posts[1].id });
    expect(exists).toBe(false);
  });

  test('Should not login if user is deleted', async () => {
    const variables = {
      data: {
        email: db.users[0].email,
        password: db.users[0].password
      }
    };

    await expect(
      send({ request: login, variables, jwt: db.users[0].token })
    ).rejects.toThrow('Unable to login');
  });
});
