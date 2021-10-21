import context from 'react-bootstrap/esm/AccordionContext';
import { getJanusCAPIRequestTypeString, JanusCAPIRequestTypes } from './JanusCAPIRequestTypes';

export const writeCapiLog = (id: string, msg: any, ...rest: any[]) => {
  const boolWriteLog = false;
  let colorStyle = 'background: #222; color: #bada55';
  const [logStyle] = rest;
  const args = rest;
  if (logStyle && logStyle === 1) {
    colorStyle = 'background: #222; color: yellow;';
    args.shift();
  }
  if (logStyle && logStyle === 2) {
    colorStyle = 'background: darkred; color: white;';
    args.shift();
  }
  if (logStyle && logStyle === 3) {
    colorStyle = 'background: blue; color: white;';
    args.shift();
  }
  //help debug during development. set boolWriteLog = false once you are ready to check-in the code
  if (boolWriteLog) {
    console.log(`%c Capi(${id}) - ${msg}`, colorStyle, ...args);
  }
};
interface CapiHandshake {
  requestToken: string;
  authToken: string;
  version?: string;
  config: any;
}
interface CapiMessage {
  handshake: CapiHandshake;
  options?: any;
  type: JanusCAPIRequestTypes;
  values: any;
}

const sendToIframe = (data: any, iFrame: HTMLIFrameElement) => {
  iFrame?.contentWindow?.postMessage(JSON.stringify(data), '*');
};

const sendFormedResponse = (
  handshake: CapiHandshake,
  options: any,
  type: JanusCAPIRequestTypes,
  values: any,
  iFrame: HTMLIFrameElement,
) => {
  const responseMsg: CapiMessage = {
    handshake,
    options,
    type,
    values,
  };
  writeCapiLog(`Response (${getJanusCAPIRequestTypeString(type)} : ${type}): `, 1, responseMsg);
  sendToIframe(responseMsg, iFrame);
};

// This method should almost never be used directly, use send message instead.
const sendMessageToFrame = function (message: any, iFrame: HTMLIFrameElement) {};

/*
 * Two-way mapping for apps and their registered listeners on simId & key pairs
 */
const registeredLocalChangeApps = {};
const localChangeListeners = {};
/*
 * Broadcast a handshake reply to iframes. Only the iframe with the
 * same requestToken should accept the message. Other iframes should ignore
 * any HANDSHAKE_RESPONSE that has a different response.
 */
const replyToHandshake = (
  handshake: any,
  iFrame: HTMLIFrameElement,
  simLife: any,
  context: string,
) => {
  const {
    handshake: { requestToken: msgRequestToken },
  } = handshake;
  simLife.handshakeMade = true;
  simLife.handshake.requestToken = msgRequestToken;

  // taken from simcapi.js TODO move somewhere, use from settings
  simLife.handshake.config = { context: context };

  // TODO: here in the handshake response we should send come config...
  sendFormedResponse(simLife.handshake, {}, JanusCAPIRequestTypes.HANDSHAKE_RESPONSE, [], iFrame);
};
/*
 * Handles the check trigger
 */
const handleCheckTrigger = function (message: any, iFrame: HTMLIFrameElement) {};

/*
 * Replaced notifyCheckResponse
 * Notify clients that check has been completed
 */
const notifyCheckCompleteResponse = (iFrame: HTMLIFrameElement) => {};

/*
 * Notify clients that check has been clicked
 */
const notifyCheckStartResponse = (iFrame: HTMLIFrameElement) => {};

/*
 * Update the snapshot with new values received from the appropriate iframe.
 */
const updateSnapshot = (values: any, iFrame: HTMLIFrameElement) => {};

/*
 * Handles the get data
 */
const handleGetData = (message: any, iFrame: HTMLIFrameElement) => {};

/*
 * Handles the set data
 */
const handleSetData = (message: any, iFrame: HTMLIFrameElement) => {};

const handleOnReadyMessage = (message: any, iFrame: HTMLIFrameElement) => {};

const handleApiRequest = (message: any, iFrame: HTMLIFrameElement) => {};

/* */
const handleResizeParentContainerRequest = (message: any, iFrame: HTMLIFrameElement) => {};

/* */
const handleAllowInternalAccessRequest = (message: any, iFrame: HTMLIFrameElement) => {};

const handleRegisterLocalDataChange = (message: any, iFrame: HTMLIFrameElement) => {};
/*
 * A router to call appropriate functions for handling different types of CapiMessages.
 */
export const capiMessageHandler = (
  message: any,
  iFrame: HTMLIFrameElement,
  simFrame: any,
  context: string,
) => {
  //logIncoming(message);
  if (!message.handshake) {
    return;
  }

  switch (message.type) {
    case JanusCAPIRequestTypes.HANDSHAKE_REQUEST:
      replyToHandshake(message.handshake, iFrame, simFrame, context);
      break;
    case JanusCAPIRequestTypes.ON_READY:
      handleOnReadyMessage(message, iFrame);
      break;
    case JanusCAPIRequestTypes.VALUE_CHANGE:
      updateSnapshot(message.values, iFrame);
      break;
    case JanusCAPIRequestTypes.CHECK_REQUEST:
      handleCheckTrigger(message, iFrame);
      break;
    case JanusCAPIRequestTypes.GET_DATA_REQUEST:
      handleGetData(message, iFrame);
      break;
    case JanusCAPIRequestTypes.SET_DATA_REQUEST:
      handleSetData(message, iFrame);
      break;
    case JanusCAPIRequestTypes.API_CALL_REQUEST:
      handleApiRequest(message, iFrame);
      break;
    case JanusCAPIRequestTypes.RESIZE_PARENT_CONTAINER_REQUEST:
      handleResizeParentContainerRequest(message, iFrame);
      break;
    case JanusCAPIRequestTypes.ALLOW_INTERNAL_ACCESS:
      handleAllowInternalAccessRequest(message, iFrame);
      break;
    case JanusCAPIRequestTypes.REGISTER_LOCAL_DATA_CHANGE_LISTENER:
      handleRegisterLocalDataChange(message, iFrame);
      break;
  }
};
