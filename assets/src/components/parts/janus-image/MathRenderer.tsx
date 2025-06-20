import React, { useState } from 'react';
import { Button, Modal } from 'react-bootstrap';
import { MathJax, MathJaxContext } from 'better-react-mathjax';

const config = {
  loader: {
    load: ['[tex]/mhchem'],
  },
  tex: {
    packages: { '[+]': ['mhchem'] },
  },
  options: {
    enableAssistiveMml: true,
  },
};

interface MathEditorModalProps {
  show: boolean;
  onClose: () => void;
  onSave: (data: { input: string; altText: string }) => void;
  initialInput: string;
  initialAlt: string;
}

const MathRenderer: React.FC<MathEditorModalProps> = ({
  show,
  onClose,
  onSave,
  initialInput,
  initialAlt,
}) => {
  const [input, setInput] = useState(initialInput || '');
  const [altText, setAltText] = useState(initialAlt || '');

  const isMathML = input.trim().startsWith('<math');
  const content = isMathML ? input : `\\(${input}\\)`;

  const handleSave = () => {
    onSave({ input, altText });
    onClose();
  };

  return (
    <Modal show={show} onHide={onClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Math Expression Editor</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <label>
          Math/LaTeX or MathML:
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={3}
            style={{ width: '100%', fontSize: 16 }}
            placeholder="Enter LaTeX or MathML here"
          />
        </label>

        <label style={{ display: 'block', marginTop: 12 }}>
          Alt text (for screen readers):
          <input
            type="text"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder="Please enter alt text for screen reader"
            style={{ width: '100%', fontSize: 14 }}
          />
        </label>

        <div style={{ marginTop: 16, fontSize: 18 }}>
          <MathJaxContext
            config={config}
            version={3}
            src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"
          >
            <MathJax dynamic>
              <div dangerouslySetInnerHTML={{ __html: content }} role="math" aria-label={altText} />
            </MathJax>
          </MathJaxContext>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Save
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default MathRenderer;
