exports.requireAuth = resolver => {
  return (parent, args, context) => {
    if (!context.userId) {
      throw new Error('Authentication required');
    }

    return resolver(parent, args, context);
  };
};
