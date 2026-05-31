const React = require("react");

function createHostComponent(name) {
  return function HostComponent({ children, ...props }) {
    return React.createElement(name, props, children);
  };
}

const StyleSheet = {
  create: (styles) => styles,
  flatten: (styles) => styles,
};

const Platform = {
  OS: "ios",
  select: (values) => values.ios || values.default,
};

module.exports = {
  ActivityIndicator: createHostComponent("ActivityIndicator"),
  FlatList: createHostComponent("FlatList"),
  Image: createHostComponent("Image"),
  Modal: createHostComponent("Modal"),
  RefreshControl: createHostComponent("RefreshControl"),
  ScrollView: createHostComponent("ScrollView"),
  StyleSheet,
  Text: createHostComponent("Text"),
  TextInput: createHostComponent("TextInput"),
  Switch: createHostComponent("Switch"),
  TouchableOpacity: createHostComponent("TouchableOpacity"),
  View: createHostComponent("View"),
  Linking: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    getInitialURL: jest.fn(async () => null),
  },
  Platform,
};
