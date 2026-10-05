import http from "node:http";
import https from "node:https";
import net from "node:net";
import tls from "node:tls";

const deny = () => {
  throw new Error("Network access forbidden in CLI smoke check");
};
globalThis.fetch = deny;
http.request = deny;
https.request = deny;
net.Socket.prototype.connect = deny;
tls.connect = deny;
