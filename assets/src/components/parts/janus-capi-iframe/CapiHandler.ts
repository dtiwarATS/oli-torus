import { JanusCAPIRequestTypes } from './JanusCAPIRequestTypes';

/*
 * Broadcast a handshake reply to all iframes. Only the iframe with the
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

/*
 * @since 0.94
 */
const handleResizeParentContainerRequest = (message: any) => {};

/*
 * @since 1.01
 */
const handleAllowInternalAccessRequest = (message: any) => {};

const handleRegisterLocalDataChange = (message: any) => {};
/*
 * A router to call appropriate functions for handling different types of CapiMessages.
 */
const capiMessageHandler = (message: any) => {
  //logIncoming(message);
  // not a valid JanusCAPIRequestTypes, e.g., SPMMessage.js, VideoPostMessage.js
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
