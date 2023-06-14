const http = (url: URL) => Object.freeze(url.hostname === 'localhost' ? `http://${url.host}` : `https://api-${url.host}`);
const socket = (url: URL) => Object.freeze(url.hostname === 'localhost' ? `ws://${url.host}/cable` : `wss://api-${url.host}/cable`);
let VAR_REST_HOST: string;
let VAR_SOCKET_HOST: string;

export const configHosts = (url: URL) => {
  if (url) {
    VAR_REST_HOST = http(url);
    VAR_SOCKET_HOST = socket(url);
    return {VAR_REST_HOST, VAR_SOCKET_HOST};
  } return {};
};

export const hosts = () => ({
  REST_HOST: VAR_REST_HOST,
  SOCKET_HOST: VAR_SOCKET_HOST
});
