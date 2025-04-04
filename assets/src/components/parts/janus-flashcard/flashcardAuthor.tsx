import React, { CSSProperties, useEffect, useState } from 'react';
import { AuthorPartComponentProps } from 'components/parts/types/parts';
import './FlashCard.scss';
import { FlashCardModel } from './schema';

// Define a card type to manage multiple cards
interface FlashCard {
  id: string;
  front: string;
  back: string;
}

const FlashcardAuthor: React.FC<AuthorPartComponentProps<FlashCardModel>> = (props) => {
  const { id, model, onSaveConfigure, onConfigure } = props;

  const {
    z,
    label,
    frontText = 'Front side of the card',
    backText = 'Back side of the card',
    cards = [],
  } = model;

  // Initialize with one card if none exist
  const [flashcards, setFlashcards] = useState<FlashCard[]>(
    cards.length > 0 ? cards : [{ id: '1', front: frontText, back: backText }],
  );

  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  const [newFrontText, setNewFrontText] = useState('');
  const [newBackText, setNewBackText] = useState('');

  useEffect(() => {
    // all activities *must* emit onReady
    props.onReady({ id: `${props.id}` });
  }, []);

  useEffect(() => {
    // Save cards to model when they change
    const modelClone = { ...model, cards: flashcards };
    onSaveConfigure({ id, snapshot: modelClone });
  }, [flashcards]);

  const addNewCard = () => {
    const newCard: FlashCard = {
      id: Date.now().toString(),
      front: 'New front text',
      back: 'New back text',
    };
    setFlashcards([...flashcards, newCard]);
    setCurrentCardIndex(flashcards.length);
  };

  const deleteCurrentCard = () => {
    if (flashcards.length <= 1) return; // Don't allow removing the last card

    const newCards = [...flashcards];
    newCards.splice(currentCardIndex, 1);
    setFlashcards(newCards);
    setCurrentCardIndex(Math.min(currentCardIndex, newCards.length - 1));
  };

  const startEditing = () => {
    console.log('asdadasd');
    onConfigure({ id, configure: true });
    setNewFrontText(flashcards[currentCardIndex].front);
    setNewBackText(flashcards[currentCardIndex].back);
    setEditing(true);
  };

  const saveEditing = () => {
    const newCards = [...flashcards];
    newCards[currentCardIndex] = {
      ...newCards[currentCardIndex],
      front: newFrontText,
      back: newBackText,
    };
    setFlashcards(newCards);
    setEditing(false);
  };

  const cancelEditing = () => {
    setEditing(false);
  };

  const goToPreviousCard = () => {
    setCurrentCardIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const goToNextCard = () => {
    setCurrentCardIndex((prev) => (prev < flashcards.length - 1 ? prev + 1 : prev));
  };

  const currentCard = flashcards[currentCardIndex];

  const cardStyles: CSSProperties = {
    width: '100%',
    height: '200px',
    perspective: '1000px',
  };

  const cardInnerStyles: CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    textAlign: 'center',
    transition: 'transform 0.6s',
    transformStyle: 'preserve-3d',
    zIndex: z,
  };

  const cardFaceStyles: CSSProperties = {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
  };

  const cardFrontStyles: CSSProperties = {
    ...cardFaceStyles,
    backgroundColor: '#f8f9fa',
    color: '#212529',
  };

  const cardBackStyles: CSSProperties = {
    ...cardFaceStyles,
    backgroundColor: '#e9ecef',
    color: '#212529',
    transform: 'rotateY(180deg)',
  };

  const buttonStyles: CSSProperties = {
    margin: '0 5px',
    padding: '8px 12px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#007bff',
    color: '#fff',
    cursor: 'pointer',
  };

  const navigationStyles: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '10px',
  };

  const formGroupStyles: CSSProperties = {
    marginBottom: '15px',
  };

  const labelStyles: CSSProperties = {
    display: 'block',
    marginBottom: '5px',
    fontWeight: 'bold',
  };

  const textareaStyles: CSSProperties = {
    width: '100%',
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    minHeight: '80px',
  };

  return (
    <div data-janus-type={tagName} className="flashcard-container">
      {label && <div className="flashcard-label">{label}</div>}

      {editing ? (
        <div className="card-editor">
          <div style={formGroupStyles}>
            <label style={labelStyles}>Front Text:</label>
            <textarea
              style={textareaStyles}
              value={newFrontText}
              onChange={(e) => setNewFrontText(e.target.value)}
            />
          </div>
          <div style={formGroupStyles}>
            <label style={labelStyles}>Back Text:</label>
            <textarea
              style={textareaStyles}
              value={newBackText}
              onChange={(e) => setNewBackText(e.target.value)}
            />
          </div>
          <div>
            <button style={buttonStyles} onClick={saveEditing}>
              Save
            </button>
            <button style={{ ...buttonStyles, backgroundColor: '#6c757d' }} onClick={cancelEditing}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div style={cardStyles}>
            <div style={cardInnerStyles}>
              <div style={cardFrontStyles}>
                <div>{currentCard?.front || 'Front text'}</div>
              </div>
              <div style={cardBackStyles}>
                <div>{currentCard?.back || 'Back text'}</div>
              </div>
            </div>
          </div>

          <div style={navigationStyles}>
            <div>
              <button style={buttonStyles} onClick={startEditing}>
                Edit Card
              </button>
              <button
                style={{ ...buttonStyles, backgroundColor: '#dc3545' }}
                onClick={deleteCurrentCard}
                disabled={flashcards.length <= 1}
              >
                Delete Card
              </button>
              <button style={{ ...buttonStyles, backgroundColor: '#28a745' }} onClick={addNewCard}>
                Add Card
              </button>
            </div>
            <div>
              <span>
                Card {currentCardIndex + 1} of {flashcards.length}
              </span>
              <button
                style={{ ...buttonStyles, marginLeft: '10px' }}
                onClick={goToPreviousCard}
                disabled={currentCardIndex === 0}
              >
                Previous
              </button>
              <button
                style={buttonStyles}
                onClick={goToNextCard}
                disabled={currentCardIndex === flashcards.length - 1}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export const tagName = 'janus-flashcard';

export default FlashcardAuthor;
