const jwt = require('jsonwebtoken');

const jwt_secret = process.env.JWT_SECRET || 'do_not_use_this_secret';
const jwt_exp = process.env.JWT_EXPIRES_IN || '1 day';

// This functions returns a promise. When resolved, it gives the jwt for that id
exports.generateToken = id => {
  return new Promise((resolve, reject) => {
    jwt.sign({ id }, jwt_secret, { expiresIn: jwt_exp }, (err, token) => {
      if (err) reject(err);

      resolve(token);
    });
  });
};

const verifyToken = token => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, jwt_secret, (err, data) => {
      if (err) reject(err);

      resolve(data);
    });
  });
};

// This functions returns a promise. When resolved, it gives the userId for that jwt
exports.getUserId = async contextParams => {
  const authorization = contextParams.request
    ? contextParams.request.headers.authorization
    : contextParams.connection.context.Authorization;

  if (authorization) {
    const token = authorization.replace('Bearer ', '');
    try {
      const { id } = await verifyToken(token);
      return id;
    } catch (err) {
      return null;
    }
  }

  return null;
};
