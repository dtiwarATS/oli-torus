/* eslint-disable react/prop-types */
import React, { CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import { MathJax, MathJaxContext } from 'better-react-mathjax';
import debounce from 'lodash/debounce';
import { clone } from 'utils/common';
import { AuthorPartComponentProps } from '../types/parts';
import MathRenderer from './MathRenderer';
import { ImageModel } from './schema';

const ImageAuthor: React.FC<AuthorPartComponentProps<ImageModel>> = (props) => {
  const { model, onSaveConfigure } = props;
  const [ready, setReady] = useState<boolean>(false);
  const [imgSrc, setImgSrc] = useState<string>('');
  const id: string = props.id;

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }
    props.onReady({ id, responses: [] });
  }, [ready]);

  const { width, height, src, imageSrc, alt, defaultSrc } = model;
  const imageStyles: CSSProperties = {
    width,
    height,
  };

  const debounceWaitTime = 1000;
  const debounceImage = useCallback(
    debounce((updatedModel: any) => {
      manipulateImageSize(updatedModel, true);
    }, debounceWaitTime),
    [],
  );

  useEffect(() => {
    //Image Source will take precedence ( if there is an image link present in it). If Image Sorce is blank then it will display image link from src.
    const imageSource = imageSrc?.length && imageSrc != defaultSrc ? imageSrc : src;
    setImgSrc(imageSource);
    if (imageSource != defaultSrc && model?.lockAspectRatio) {
      debounceImage(model);
    }
  }, [model]);
  const imageContainerRef = useRef<HTMLImageElement>(null);
  const manipulateImageSize = (updatedModel: ImageModel, isfromDebaunce: boolean) => {
    if (!imageContainerRef?.current || !isfromDebaunce) {
      return;
    }
    const naturalWidth = imageContainerRef.current.naturalWidth;
    const naturalHeight = imageContainerRef.current.naturalHeight;

    const currentWidth = imageContainerRef.current.width;
    const currentHeight = imageContainerRef.current.height;

    const updatedWidth = updatedModel?.width || 0;
    if (
      naturalWidth <= 0 ||
      naturalHeight <= 0 ||
      currentWidth <= 0 ||
      currentHeight <= 0 ||
      updatedWidth <= 0
    ) {
      return;
    }
    const ratioWidth = naturalWidth / currentWidth;
    const ratioHeight = naturalHeight / currentHeight;
    if (ratioWidth == ratioHeight) {
      return;
    }
    let newAdjustedHeight = imageContainerRef.current.height;
    let newAdjustedWidth = imageContainerRef.current.width;
    if (ratioWidth > ratioHeight) {
      newAdjustedHeight = parseInt(Number(naturalHeight / ratioWidth).toFixed());
    } else {
      newAdjustedWidth = parseInt(Number(naturalWidth / ratioHeight).toFixed());
    }
    const modelClone = clone(updatedModel);
    modelClone.height = newAdjustedHeight;
    modelClone.width = newAdjustedWidth;
    if (newAdjustedHeight != updatedModel.height || newAdjustedWidth != updatedModel.width) {
      //we need to save the new width and height of the image so that the custom property is updated with adjusted values
      onSaveConfigure({ id, snapshot: modelClone });
    }
  };

  const [showModal, setShowModal] = useState(false);
  const [mathData, setMathData] = useState({ input: '', altText: '' });
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

  const isMathML = mathData.input.trim().startsWith('<math');
  const content = isMathML ? mathData.input : `\\(${mathData.input}\\)`;
  return ready ? (
    <>
      <div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          {mathData.input ? 'Edit Expression' : 'Add Math Expression'}
        </button>

        <MathRenderer
          show={showModal}
          onClose={() => setShowModal(false)}
          onSave={(data) => setMathData(data)}
          initialInput={mathData.input}
          initialAlt={mathData.altText}
        />

        {mathData.input && (
          <div style={{ marginTop: 24 }}>
            <MathJaxContext
              config={config}
              version={3}
              src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"
            >
              <MathJax dynamic>
                <div
                  dangerouslySetInnerHTML={{ __html: content }}
                  role="math"
                  aria-label={mathData.altText}
                />
              </MathJax>
            </MathJaxContext>
          </div>
        )}
      </div>
      <img
        ref={imageContainerRef}
        onLoad={() => {
          manipulateImageSize(model, false);
        }}
        draggable="false"
        alt={alt}
        src={imgSrc}
        style={imageStyles}
      />
    </>
  ) : null;
};

export const tagName = 'janus-image';

export default ImageAuthor;
