const router = {
  push: jest.fn(),
  replace: jest.fn(),
};

module.exports = {
  Tabs: Object.assign(({ children }) => children, {
    Screen: () => null,
  }),
  useLocalSearchParams: () => ({}),
  useRouter: () => router,
};
