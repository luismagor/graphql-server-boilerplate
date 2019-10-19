const bcrypt = require('bcryptjs');

exports.hashPassword = password => {
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  return bcrypt.hash(password, 12);
};

exports.verifyPassword = (candidatePassword, password) => {
  return bcrypt.compare(candidatePassword, password);
};
