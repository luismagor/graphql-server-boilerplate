const { ApolloClient } = require('apollo-client');
const { InMemoryCache } = require('apollo-cache-inmemory');
const { HttpLink } = require('apollo-link-http');
const { ApolloLink, Observable } = require('apollo-link');
const { WebSocketLink } = require('apollo-link-ws');
const { getMainDefinition } = require('apollo-utilities');

class Client {
  constructor(
    httpURL = 'http://localhost:4000',
    websocketURL = 'ws://localhost:4000'
  ) {
    this.httpURL = httpURL;
    this.websocketURL = websocketURL;

    this.clients = {};
  }

  getClient(jwt) {
    if (!jwt && this.clients.unauthorized) {
      return this.clients.unauthorized;
    }

    if (jwt && Object.keys(this.clients).includes(jwt)) {
      return this.clients[jwt];
    }

    const request = operation => {
      operation.setContext({
        headers: {
          Authorization: `Bearer ${jwt}`
        }
      });
    };

    let httpLink, wsLink;

    if (jwt) {
      const requestLink = new ApolloLink(
        (operation, forward) =>
          new Observable(observer => {
            let handle;
            Promise.resolve(operation)
              .then(oper => request(oper))
              .then(() => {
                handle = forward(operation).subscribe({
                  next: observer.next.bind(observer),
                  error: observer.error.bind(observer),
                  complete: observer.complete.bind(observer)
                });
              })
              .catch(observer.error.bind(observer));

            return () => {
              if (handle) handle.unsubscribe();
            };
          })
      );

      httpLink = ApolloLink.from([
        requestLink,
        new HttpLink({
          uri: this.httpURL,
          credentials: 'same-origin'
        })
      ]);

      wsLink = new WebSocketLink({
        uri: this.websocketURL,
        options: {
          reconnect: true,
          connectionParams: () => {
            if (jwt) {
              return {
                Authorization: `Bearer ${jwt}`
              };
            }
          }
        }
      });
    } else {
      httpLink = new HttpLink({
        uri: this.httpURL,
        credentials: 'same-origin'
      });

      wsLink = new WebSocketLink({
        uri: this.websocketURL,
        options: {
          reconnect: true
        }
      });
    }

    const link = ApolloLink.split(
      ({ query }) => {
        const { kind, operation } = getMainDefinition(query);
        return kind === 'OperationDefinition' && operation === 'subscription';
      },
      wsLink,
      httpLink
    );

    const client = new ApolloClient({
      link,
      cache: new InMemoryCache()
    });

    if (jwt) {
      this.clients[jwt] = client;
    } else {
      this.clients.unauthorized = client;
    }

    return client;
  }

  gqlSendRequest({ request, variables, jwt }) {
    if (!request) {
      throw new Error('gqlSendRequest: request parameter is mandatory');
    }
    if (!variables) {
      variables = {};
    }

    const client = jwt ? this.getClient(jwt) : this.getClient();

    const operation = request.definitions[0].operation;

    switch (operation) {
      case 'query':
        return client.query({ query: request, variables });

      case 'mutation':
        return client.mutate({ mutation: request, variables });

      case 'subscription':
        return client.subscribe({ query: request, variables });

      default:
        console.log('GraphQL operation not supported');
    }
  }
}

const defaultClient = new Client();
const send = defaultClient.gqlSendRequest.bind(defaultClient);

module.exports = { Client, defaultClient, send };
