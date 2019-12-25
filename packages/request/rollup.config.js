import babel from 'rollup-plugin-babel';
import nodeResolve from 'rollup-plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';
import pkg from './package.json';

const extensions = ['.ts'];
const externalPackages = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
];

const cjs = {
    input: './packages/request/src/index.ts',
    output: {
        file: './packages/request/lib/index.js',
        format: 'cjs',
        indent: false,
        exports: 'named',
    },
    external: externalPackages,
    plugins: [
        nodeResolve({
            extensions,
        }),
        typescript({
            tsconfig: './packages/request/tsconfig.json',
            useTsconfigDeclarationDir: true,
        }),
        babel({
            extensions,
            runtimeHelpers: true,
        }),
    ],
};

const es = {
    input: './packages/request/src/index.ts',
    output: {
        file: './packages/request/es/index.js',
        format: 'es',
        indent: false,
    },
    external: externalPackages,
    plugins: [
        nodeResolve({
            extensions,
        }),
        typescript({
            tsconfig: './packages/request/tsconfig.json',
            tsconfigOverride: { compilerOptions: { declaration: false } },
        }),
        babel({
            extensions,
            runtimeHelpers: true,
        }),
    ],
};

export default [cjs, es];
