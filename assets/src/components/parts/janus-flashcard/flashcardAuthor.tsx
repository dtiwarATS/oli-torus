import React, { CSSProperties, useEffect } from 'react';
import { AuthorPartComponentProps } from 'components/parts/types/parts';
import { AudioModel } from './schema';

const FlashcardAuthor: React.FC<AuthorPartComponentProps<AudioModel>> = (props) => {
  const { model } = props;

  const { height } = model;
  const styles: CSSProperties = {
    cursor: 'pointer',
    width: '100%',
    outline: 'none',
    height,
    borderRadius: '25px',
    border: '1px solid #ccc!important',
    background: 'whitesmoke',
    textAlign: 'center',
  };

  useEffect(() => {
    // all activities *must* emit onReady
    props.onReady({ id: `${props.id}` });
  }, []);

  return (
    <div data-janus-type={tagName} style={styles}>
      <h1>I M flash card</h1>
    </div>
  );
};

export const tagName = 'janus-flashcard';

export default FlashcardAuthor;
