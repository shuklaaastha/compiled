import { transformSync } from '@babel/core';
import babelPlugin from '../../index';

jest.mock('@compiled/utils', () => {
  return { ...jest.requireActual('@compiled/utils'), hash: () => 'hash-test' };
});

const transform = (code: string) => {
  return transformSync(code, {
    configFile: false,
    babelrc: false,
    compact: true,
    plugins: [babelPlugin],
  })?.code;
};

describe('css prop behaviour', () => {
  it('should transform a self closing element', () => {
    const actual = transform(`
      import '@compiled/core';
      import React from 'react';

      <div css={{}} />
    `);

    expect(actual).toInclude('<div className="cc-hash-test"/>');
  });

  it('should replace css prop with class name', () => {
    const actual = transform(`
      import '@compiled/core';
      import React from 'react';

      <div css={{}}>hello world</div>
    `);

    expect(actual).toInclude('<div className="cc-hash-test">hello world</div>');
  });

  it('should pass through style identifier when there is no dynamic styles in the css', () => {
    const actual = transform(`
      import '@compiled/core';
      import React from 'react';

      const Component = ({ className, style }) => <div className={className} style={style} css={{ fontSize: 12 }}>hello world</div>;
    `);

    expect(actual).toInclude('style={style}');
  });

  it('should pass through style property access when there is no dynamic styles in the css', () => {
    const actual = transform(`
      import '@compiled/core';
      import React from 'react';

      const Component = ({ className, ...props }) => <div className={className} style={props.style} css={{ fontSize: 12 }}>hello world</div>;
    `);

    expect(actual).toInclude('style={props.style}');
  });

  it('should spread style identifier when there is dynamic styles in the css', () => {
    const actual = transform(`
      import '@compiled/core';
      import React from 'react';
      const [fontSize] = React.useState('10px');
      const red = 'red';

      const Component = ({ className, style }) => <div className={className} style={style} css={{ fontSize, color: red }}>hello world</div>;
    `);

    expect(actual).toInclude('style={{...style,"--var-hash-test":fontSize}}');
  });

  it('should spread style property access when there is dynamic styles in the css', () => {
    const actual = transform(`
      import '@compiled/core';
      import React from 'react';
      const [background] = React.useState("violet");
      const red = 'red';
      const Component = ({ className, ...props }) => <div className={className} style={props.style} css={{ fontSize: 12, color: red, background }}>hello world</div>;
    `);

    expect(actual).toInclude('style={{...props.style,"--var-hash-test":background}}');
  });

  it('should spread style identifier when there is styles already set', () => {
    const actual = transform(`
      import '@compiled/core';
      import React from 'react';

      const Component = ({ className, style }) => <div className={className} style={{ ...style, display: 'block' }} css={{ fontSize: 12 }}>hello world</div>;
    `);

    expect(actual).toInclude(`style={{...style,display:'block'}}`);
  });

  it('should spread style identifier when there is styles already set and using dynamic css', () => {
    const actual = transform(`
      import '@compiled/core';
      import React from 'react';

      const [background] = React.useState('yellow');
      const red = 'red';
      const Component = ({ className, style }) => <div className={className} style={{ ...style, display: 'block' }} css={{ fontSize: 12, color: red, background }}>hello world</div>;
    `);

    expect(actual).toInclude(`style={{...style,display:'block',\"--var-hash-test\":background}}`);
    expect(actual).toInclude(
      `.cc-hash-test{font-size:12px;color:red;background:var(--var-hash-test)}`
    );
  });

  it('should concat explicit use of class name prop on an element', () => {
    const actual = transform(`
      import '@compiled/core';
      import React from 'react';

      <div className="foobar" css={{}}>hello world</div>
    `);

    expect(actual).toInclude('className={"cc-hash-test"+(" "+"foobar")}');
  });

  it('should pass through spread props', () => {
    const actual = transform(`
      import '@compiled/core';
      import React from 'react';

      const props = {};

      <div
        css={{
          fontSize: 20,
        }}
        {...props}
      />
    `);

    expect(actual).toInclude('<div{...props}className="cc-hash-test"/>');
  });

  it('should pass through static props', () => {
    const actual = transform(`
      import '@compiled/core';
      import React from 'react';

      <div
        css={{
          fontSize: 20,
        }}
        role="menu"
      />
    `);

    expect(actual).toInclude('<div role="menu"className="cc-hash-test"/>');
  });

  it('should concat explicit use of class name prop from an identifier on an element', () => {
    const actual = transform(`
      import '@compiled/core';
      import React from 'react';

      const className = "foobar";
      <div className={className} css={{}}>hello world</div>
    `);

    expect(actual).toInclude('className={"cc-hash-test"+(className?" "+className:"")}');
  });

  it('should pick up array composition', () => {
    const actual = transform(`
      import '@compiled/core';
      import React from 'react';

      const base = { color: 'black' };
      const top = \` color: red; \`;

      <div css={[base, top]}>hello world</div>
    `);

    expect(actual).toInclude('.cc-hash-test{color:black;color:red}');
  });

  it('should persist static style prop', () => {
    const actual = transform(`
      import '@compiled/core';
      import React from 'react';

      <div style={{ display: 'block' }} css={{ color: 'blue' }}>hello world</div>
    `);

    expect(actual).toInclude(`.cc-hash-test{color:blue}`);
    expect(actual).toInclude(
      `<div style={{display:'block'}}className=\"cc-hash-test\">hello world</div>`
    );
  });

  it('should concat explicit use of style prop on an element when destructured template', () => {
    const actual = transform(`
      import '@compiled/core';
      import React from 'react';

      const [color] = ['blue'];
      <div style={{ display: 'block' }} css={{ color: \`\${color}\` }}>hello world</div>
    `);

    expect(actual).toInclude(`.cc-hash-test{color:var(--var-hash-test)}`);
    expect(actual).toInclude(`style={{display:'block',\"--var-hash-test\":color}}`);
  });

  it('should concat implicit use of class name prop where class name is a jsx expression', () => {
    const actual = transform(`
      import '@compiled/core';
      import React from 'react';

      const getFoo = () => 'foobar';

      <div css={{}} className={getFoo()}>hello world</div>
    `);

    expect(actual).toInclude('className={"cc-hash-test"+(getFoo()?" "+getFoo():"")}');
  });

  it('should allow inlined expressions as property values', () => {
    const actual = transform(`
      import '@compiled/core';

      let hello = true;
      hello = false;

      <div css={{ color: hello ? 'red' : 'blue', fontSize: 10 }}>hello world</div>
    `);

    expect(actual).toInclude('.cc-hash-test{color:var(--var-hash-test);font-size:10px}');
    expect(actual).toInclude(`style={{\"--var-hash-test\":hello?'red':'blue'}}`);
  });

  it('should inline multi interpolation constant variable', () => {
    // See: https://codesandbox.io/s/dank-star-443ps?file=/src/index.js
    const actual = transform(`
      import '@compiled/core';

      const N30 = 'gray';

      <div css={{
        backgroundImage: \`linear-gradient(45deg, \${N30} 25%, transparent 25%),
        linear-gradient(-45deg, \${N30} 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, \${N30} 75%),
        linear-gradient(-45deg, transparent 75%, \${N30} 75%)\`
      }}>hello world</div>
    `);

    expect(actual).toInclude(
      `.cc-hash-test{background-image:linear-gradient(45deg,gray 25%,transparent 25%),linear-gradient(-45deg,gray 25%,transparent 25%),linear-gradient(45deg,transparent 75%,gray 75%),linear-gradient(-45deg,transparent 75%,gray 75%)}`
    );
  });

  it('should move dynamic multi interpolation variable into css variable', () => {
    // See: https://codesandbox.io/s/dank-star-443ps?file=/src/index.js
    const actual = transform(`
      import '@compiled/core';
      import {useState} from 'react';

      let N30 = 'gray';
      N30 = 'blue';

      <div css={{
        backgroundImage: \`linear-gradient(45deg, \${N30} 25%, transparent 25%),
        linear-gradient(-45deg, \${N30} 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, \${N30} 75%),
        linear-gradient(-45deg, transparent 75%, \${N30} 75%)\`
      }}>hello world</div>
    `);

    expect(actual).toInclude(
      `.cc-hash-test{background-image:linear-gradient(45deg,var(--var-hash-test) 25%,transparent 25%),linear-gradient(-45deg,var(--var-hash-test) 25%,transparent 25%),linear-gradient(45deg,transparent 75%,var(--var-hash-test) 75%),linear-gradient(-45deg,transparent 75%,var(--var-hash-test) 75%)}`
    );
    expect(actual).toInclude('style={{"--var-hash-test":N30}}');
  });

  it('should allow expressions stored in a variable as shorthand property values', () => {
    const actual = transform(`
      import '@compiled/core';

      let hello = true;
      hello = false;
      let color = hello ? 'red' : 'blue' ;

      <div css={{ color }}>hello world</div>
    `);

    expect(actual).toInclude('.cc-hash-test{color:var(--var-hash-test)}');
    expect(actual).toInclude(`style={{\"--var-hash-test\":color}}`);
  });

  it('should allow expressions stored in a variable as property values', () => {
    const actual = transform(`
      import '@compiled/core';

      let hello = true;
      hello = false;
      let colorsz = hello ? 'red' : 'blue' ;

      <div css={{ color: colorsz }}>hello world</div>
    `);

    expect(actual).toInclude('.cc-hash-test{color:var(--var-hash-test)}');
    expect(actual).toInclude(`style={{\"--var-hash-test\":colorsz}}`);
  });

  it('should remove css prop', () => {
    const actual = transform(`
      import '@compiled/core';
      import React from 'react';

      const color = 'blue';

      <div css={{ color: color }} style={{ display: "block" }}>hello world</div>
    `);

    expect(actual).not.toInclude('css={');
  });

  it('should keep other props around', () => {
    const actual = transform(`
      import '@compiled/core';
      import React from 'react';

      const color = 'blue';

      <div data-testid="yo" css={{ color: color }} style={{ display: "block" }}>hello world</div>
    `);

    expect(actual).toInclude('data-testid="yo"');
  });

  it('should add an identifier nonce to the style element', () => {
    const actual = transformSync(
      `
    import '@compiled/core';
    import React from 'react';

    const color = 'blue';

    <div data-testid="yo" css={{ color: color }} style={{ display: "block" }}>hello world</div>
  `,
      {
        configFile: false,
        babelrc: false,
        compact: true,
        plugins: [[babelPlugin, { nonce: '__webpack_nonce__' }]],
      }
    )?.code;

    expect(actual).toInclude('<CS nonce={__webpack_nonce__}hash="hash-test">');
  });

  it('should bubble up top level pseudo inside a media atrule', () => {
    const actual = transform(`
    import '@compiled/core';
    import React from 'react';

    const fontSize = 20;

    <div css={\`
      @media screen {
        :hover {
          color: red;
        }
      }
    \`}>hello world</div>
  `);

    expect(actual).toInclude('.cc-hash-test:hover{color:red}');
  });

  it('should bubble up top level pseduo inside a support atrule', () => {
    const actual = transform(`
    import '@compiled/core';
    import React from 'react';

    const fontSize = 20;

    <div css={\`
      @supports (display: grid) {
        :hover {
          color: red;
        }
      }
    \`}>hello world</div>
  `);

    expect(actual).toInclude('.cc-hash-test:hover{color:red}');
  });
});
