const User = {
  email(parent, args, { userId }) {
    if (userId && userId === parent.id) {
      return parent.email;
    } else {
      return null;
    }
  },
  password() {
    return '';
  }
};

module.exports = User;
