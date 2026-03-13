export default {
  test: {
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      enabled: true,
    },
  },
};
