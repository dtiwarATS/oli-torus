import { JanusCAPIRequestTypes } from './JanusCAPIRequestTypes';

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

// This method should almost never be used directly, use send message instead.
const sendMessageToFrame = function (message: any) {};

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
const replyToHandshake = (handshake: any) => {};
/*
 * Handles the check trigger
 */
const handleCheckTrigger = function (message: any) {};

/*
 * Replaced notifyCheckResponse
 * Notify clients that check has been completed
 */
const notifyCheckCompleteResponse = () => {};

/*
 * Notify clients that check has been clicked
 */
const notifyCheckStartResponse = () => {};

/*
 * Update the snapshot with new values received from the appropriate iframe.
 */
const updateSnapshot = (values: any) => {};

/*
 * Handles the get data
 */
const handleGetData = (message: any) => {};

/*
 * Handles the set data
 */
const handleSetData = (message: any) => {};

const handleOnReadyMessage = (message: any) => {};

const handleApiRequest = (message: any) => {};

/* */
const handleResizeParentContainerRequest = (message: any) => {};

/* */
const handleAllowInternalAccessRequest = (message: any) => {};

const handleRegisterLocalDataChange = (message: any) => {};
/*
 * A router to call appropriate functions for handling different types of CapiMessages.
 */
export const capiMessageHandler = (message: any) => {
  //logIncoming(message);
  if (!message.handshake) {
    return;
  }

  switch (message.type) {
    case JanusCAPIRequestTypes.HANDSHAKE_REQUEST:
      replyToHandshake(message.handshake);
      break;
    case JanusCAPIRequestTypes.ON_READY:
      handleOnReadyMessage(message);
      break;
    case JanusCAPIRequestTypes.VALUE_CHANGE:
      updateSnapshot(message.values);
      break;
    case JanusCAPIRequestTypes.CHECK_REQUEST:
      handleCheckTrigger(message);
      break;
    case JanusCAPIRequestTypes.GET_DATA_REQUEST:
      handleGetData(message);
      break;
    case JanusCAPIRequestTypes.SET_DATA_REQUEST:
      handleSetData(message);
      break;
    case JanusCAPIRequestTypes.API_CALL_REQUEST:
      handleApiRequest(message);
      break;
    case JanusCAPIRequestTypes.RESIZE_PARENT_CONTAINER_REQUEST:
      handleResizeParentContainerRequest(message);
      break;
    case JanusCAPIRequestTypes.ALLOW_INTERNAL_ACCESS:
      handleAllowInternalAccessRequest(message);
      break;
    case JanusCAPIRequestTypes.REGISTER_LOCAL_DATA_CHANGE_LISTENER:
      handleRegisterLocalDataChange(message);
      break;
  }
};
