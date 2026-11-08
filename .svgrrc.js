module.exports = {
  jsxRuntime: 'classic',
  plugins: ['@svgr/plugin-jsx'],
  svgoConfig: {
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: {
            removeViewBox: false,
          },
        },
      },
    ],
  },
  jsx: {
    babelConfig: {
      plugins: [
        [
          '@babel/plugin-transform-react-jsx',
          {
            throwIfNamespace: false,
            useBuiltIns: true,
          },
        ],
      ],
    },
  },
};
