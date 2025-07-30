/* eslint-disable react/prop-types */
import React, { CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import debounce from 'lodash/debounce';
import { clone } from 'utils/common';
import { AuthorPartComponentProps } from '../types/parts';
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

  const { width, height, alt } = model;
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
    if (!model) return;

    const { imageSrc, src, defaultSrc } = model;

    //Image Source will take precedence ( if there is an image link present in it). If Image Sorce is blank then it will display image link from src.
    const preferred = imageSrc && imageSrc !== defaultSrc ? imageSrc : src;

    // Set image src for display
    setImgSrc(preferred);

    // Debounce if a real image and aspect lock enabled
    if (preferred && preferred !== defaultSrc && model.lockAspectRatio) {
      debounceImage(model);
    }

    // Sync logic: only sync if both fields are set and not clearing one of them
    const bothHaveValue = imageSrc && src;
    const valuesOutOfSync = imageSrc !== src;

    if (bothHaveValue && valuesOutOfSync) {
      const modelClone = clone(model);
      modelClone.imageSrc = preferred;
      modelClone.src = preferred;

      onSaveConfigure({ id, snapshot: modelClone });
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
  return ready ? (
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
  ) : null;
};

export const tagName = 'janus-image';

export default ImageAuthor;
