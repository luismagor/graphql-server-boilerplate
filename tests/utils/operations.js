const gql = require('graphql-tag');

exports.createUser = gql`
  mutation($data: CreateUserInput!) {
    createUser(data: $data) {
      token
      user {
        id
        name
        email
      }
    }
  }
`;

exports.updateUser = gql`
  mutation($data: UpdateUserInput!) {
    updateUser(data: $data) {
      id
      name
      email
    }
  }
`;

exports.deleteUser = gql`
  mutation {
    deleteUser {
      id
    }
  }
`;

exports.getUsers = gql`
  query {
    users {
      id
      name
      email
    }
  }
`;

exports.login = gql`
  mutation($data: LoginUserInput!) {
    login(data: $data) {
      token
    }
  }
`;

exports.getProfile = gql`
  query {
    me {
      id
      name
      email
    }
  }
`;

