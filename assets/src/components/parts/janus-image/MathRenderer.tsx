import React, { useState } from 'react';
import { MathJax, MathJaxContext } from 'better-react-mathjax';

const config = {
  loader: {
    load: ['[tex]/mhchem'], // ✅ only load what's not included in base bundle
  },
  tex: {
    packages: { '[+]': ['mhchem'] },
  },
  options: {
    enableAssistiveMml: true,
  },
};

const MathRenderer: React.FC = () => {
  const [input, setInput] = useState(String.raw`\pu{123 kJ*mol-1}`);

  const isMathML = input.trim().startsWith('<math');
  const mathContent = isMathML ? input : `\\(${input}\\)`;

  return (
    <MathJaxContext
      src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"
      config={config}
      version={3}
    >
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={3}
        style={{ width: '100%', fontSize: 16 }}
      />
      <div style={{ marginTop: '1rem', fontSize: '20px' }}>
        <MathJax dynamic>
          <div dangerouslySetInnerHTML={{ __html: mathContent }} aria-label="Math content" />
        </MathJax>
      </div>
    </MathJaxContext>
  );
};

export default MathRenderer;
