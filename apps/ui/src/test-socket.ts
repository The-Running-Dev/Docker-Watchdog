/** The socket the app opens in tests (socket.io-client is mocked in test-setup); emit() fires server events. */
export const fakeSocket = {
  handlers: new Map<string, ((payload: unknown) => void)[]>(),
  on(event: string, handler: (payload: unknown) => void) {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]);

    return this;
  },
  disconnect() {
    this.handlers.clear();
  },
  emit(event: string, payload?: unknown) {
    for (const handler of this.handlers.get(event) ?? []) handler(payload);
  },
};
