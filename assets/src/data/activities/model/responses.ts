import { Maybe } from 'tsmonad';
import {
  ChoiceId,
  ChoiceIdsToResponseId,
  HasParts,
  Response,
  makeResponse,
} from 'components/activities/types';
import { containsRule, eqRule, equalsRule, matchRule } from 'data/activities/model/rules';
import { getByUnsafe, getPartById } from 'data/activities/model/utils';

export const Responses = {
  catchAll: (text = 'Incorrect') => makeResponse(matchRule('.*'), 0, text),
  forTextInput: (correctText = 'Correct', incorrectText = 'Incorrect') => [
    makeResponse(containsRule('answer'), 1, correctText),
    Responses.catchAll(incorrectText),
  ],
  forNumericInput: (correctText = 'Correct', incorrectText = 'Incorrect') => [
    makeResponse(eqRule(1), 1, correctText),
    Responses.catchAll(incorrectText),
  ],
  forMathInput: (correctText = 'Correct', incorrectText = 'Incorrect') => [
    makeResponse(equalsRule(''), 1, correctText),
    Responses.catchAll(incorrectText),
  ],
  forMultipleChoice: (
    correctChoiceId: ChoiceId,
    correctText = 'Correct',
    incorrectText = 'Incorrect',
  ) => [
    makeResponse(matchRule(correctChoiceId), 1, correctText),
    makeResponse(matchRule('.*'), 0, incorrectText),
  ],
};

export const RESPONSES_PATH = '$..responses';
export const getResponses = (model: HasParts): Response[] =>
  model.authoring.parts.map((p) => p.responses).flat();

export const getResponsesByPartId = (model: HasParts, partId: string): Response[] =>
  getPartById(model, partId).responses;

export const getResponseBy = (model: HasParts, predicate: (x: Response) => boolean) =>
  getByUnsafe(getResponses(model), predicate);


export const hasCustomScoring = (model: HasParts, partId?: string): boolean => {
  const outOf = getOutOfPoints(model, partId || model.authoring.parts[0].id);
  console.info('hasCustomScoring', outOf, model, partId)
  return outOf !== null && outOf !== undefined;
};

export const getOutOfPoints = (model: HasParts, partId: string) => {
  const part = getPartById(model, partId);
  return part?.outOf;
};

export const getIncorrectPoints = (model: HasParts, partId: string) => {
  const part = getPartById(model, partId);
  return part?.incorrectScore;
};

// Does not take into account partial credit
export const getCorrectResponse = (model: HasParts, partId: string) => {
  return Maybe.maybe(getResponsesByPartId(model, partId).find((r) => r.score >= 1)).valueOrThrow(
    new Error('Could not find correct response'),
  );
};
export const getIncorrectResponse = (model: HasParts, partId: string) => {
  return Maybe.maybe(
    getResponsesByPartId(model, partId).find((r) => r.rule === matchRule('.*')),
  ).valueOrThrow(new Error('Could not find incorrect response'));
};

export interface ResponseMapping {
  response: Response;
  choiceIds: ChoiceId[];
}
export const getTargetedResponseMappings = (
  model: HasParts & {
    authoring: { targeted: ChoiceIdsToResponseId[] };
  },
): ResponseMapping[] =>
  model.authoring.targeted.map((assoc) => ({
    response: getResponseBy(model, (r) => r.id === getResponseId(assoc)),
    choiceIds: getChoiceIds(assoc),
  }));

// Choices
export const getChoiceIds = ([choiceIds]: ChoiceIdsToResponseId) => choiceIds;
export const getCorrectChoiceIds = (model: { authoring: { correct: ChoiceIdsToResponseId } }) =>
  getChoiceIds(model.authoring.correct);
export const getIncorrectChoiceIds = (model: { authoring: { incorrect: ChoiceIdsToResponseId } }) =>
  getChoiceIds(model.authoring.incorrect);
export const getTargetedChoiceIds = (model: { authoring: { targeted: ChoiceIdsToResponseId[] } }) =>
  model.authoring.targeted.map(getChoiceIds);
export const isCorrectChoice = (
  model: { authoring: { correct: ChoiceIdsToResponseId } },
  choiceId: ChoiceId,
) => getCorrectChoiceIds(model).includes(choiceId);

// Responses
export const getResponseId = ([, responseId]: ChoiceIdsToResponseId) => responseId;
export const getTargetedResponses = (
  model: HasParts & { authoring: { targeted: ChoiceIdsToResponseId[] } },
) =>
  model.authoring.targeted.map((assoc) =>
    getResponseBy(model, (r) => r.id === getResponseId(assoc)),
  );
