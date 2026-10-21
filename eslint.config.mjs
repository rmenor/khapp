import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'data/**',
      'next-env.d.ts',
      'public/**',
    ],
  },
  {
    // Los componentes de src/components/ui son código de shadcn/ui: se
    // actualizan desde el upstream y no se modifican localmente.
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];

export default eslintConfig;
