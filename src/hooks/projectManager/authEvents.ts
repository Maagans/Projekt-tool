type LogoutHandler = () => void;

let logoutHandler: LogoutHandler | null = null;
let hasPendingUnauthorizedEvent = false;

export const registerUnauthorizedLogoutHandler = (handler: LogoutHandler) => {
  logoutHandler = handler;

  if (hasPendingUnauthorizedEvent) {
    hasPendingUnauthorizedEvent = false;
    handler();
  }
};

export const unregisterUnauthorizedLogoutHandler = (handler: LogoutHandler) => {
  if (logoutHandler === handler) {
    logoutHandler = null;
  }
};

export const notifyUnauthorizedLogout = () => {
  if (logoutHandler) {
    logoutHandler();
  } else {
    hasPendingUnauthorizedEvent = true;
  }
};
