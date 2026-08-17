// deps

    // locals
    import EventEmitter from "./EventEmitter";

// types & interfaces

    // natives
    type Timeout = ReturnType<typeof setTimeout>;

    // locals
    import type { components, paths, operations } from "./Descriptor";
    type tEvents = components["schemas"]["PushEventPluginInitialized"] | components["schemas"]["PushEventPluginReleased"] | components["schemas"]["PushEventPluginError"] | components["schemas"]["PushEventUserAdded"] | components["schemas"]["PushEventUserRemoved"];

    type HttpMethodsOf<P extends keyof paths> = {
        [M in keyof paths[P]]: paths[P][M] extends { "responses": unknown }
            ? M
            : never;
    }[keyof paths[P]];

// component

export class SDK extends EventEmitter<{
    "connected": [];
    "disconnected": [ number, string ];
    "initialized": [];
    "released": [];
    "error": [ components["schemas"]["PushEventPluginError"]["data"] ];
    "user.added": [ components["schemas"]["User"] ];
    "user.removed": [ components["schemas"]["User"] ];
}> {

    // static

        private static readonly _tokenKey: string = "MIAApp-token-auth";

    // protected

        protected _socket: WebSocket | null;
        protected _reconnectTimeout: Timeout | null;
        protected _token: string | null;

    // constructor

    public constructor () {

        super();

        this._socket = null;
        this._reconnectTimeout = null;

        this._token = localStorage.getItem(SDK._tokenKey);

    }

    // protected methods

    protected _parseResponse (res: Response): Promise<unknown> {

        if (res.ok) {

            return new Promise((resolve: (content: unknown) => void, reject: (error: Error) => void): void => {

                res.text().then((content: string): void => {

                    try {
                        return resolve(JSON.parse(content));
                    }
                    catch (e: unknown) { // eslint-disable-line @typescript-eslint/no-unused-vars
                        return resolve(content);
                    }

                }).catch((err: Error): void => {
                    console.warn(err);
                    return reject(new Error("Impossible to parse response"));
                });

            });

        }

        return new Promise((resolve: unknown, reject: (error: Error) => void): void => {

            res.json().then((content: components["schemas"]["Error"]): void => {
                return reject(new Error(content.message));
            }).catch((): void => {
                return reject(new Error("Problem with request getPluginStatus has status '" + res.status + "' (" + res.statusText + ")"));
            });

        });

    }

    // public methods

    public connect (): void {

        if (WebSocket.OPEN === this._socket?.readyState) {
            return;
        }

        if (this._reconnectTimeout) {
            return;
        }

        this._socket = new WebSocket(
            ("https:" === window.location.protocol ? "wss:" : "ws:")
            + "//" + window.location.host
        );

        this._socket.onopen = (): void => {
            this.emit("connected");
        };

        this._socket.onclose = (event: CloseEvent): void => {

            this.emit("disconnected", event.code, event.reason);

            // normal closure
            if (1000 === event.code) {
                return;
            }

            this._reconnectTimeout = setTimeout((): void => {
                this._reconnectTimeout = null;
                return this.connect();
            }, 1000);

        };

        this._socket.onerror = (evt: Event): void => {

            // avoid catching error on reconnection
            if (evt instanceof ErrorEvent) {

                this.emit("error", {
                    "code": "unknown",
                    "message": evt.message
                });

            }

        };

        this._socket.onmessage = (event: MessageEvent<string>): void => {

            const parsedMessage: tEvents = JSON.parse(event.data) as tEvents;

            // must disable the rule because the plugin name can be sended by another plugin
            if ("mia-users-management" === parsedMessage.plugin) { // eslint-disable-line @typescript-eslint/no-unnecessary-condition

                switch (parsedMessage.command) {

                    case "initialized":
                        this.emit("initialized");
                    break;
                    case "released":
                        this.emit("released");
                    break;
                    case "error":
                        this.emit("error", parsedMessage.data);
                    break;
                    case "user.added":
                        this.emit("user.added", parsedMessage.data);
                    break;
                    case "user.removed":
                        this.emit("user.removed", parsedMessage.data);
                    break;

                    default:
                        // nothing to do here
                    break;

                }

            }

        };

    }

    public disconnect (): void {

        if (this._reconnectTimeout) {
            clearTimeout(this._reconnectTimeout);
            this._reconnectTimeout = null;
        }

        if (this._socket
            && (
                WebSocket.CONNECTING === this._socket.readyState
                || WebSocket.OPEN === this._socket.readyState
            )
        ) {
            this._socket.close(1000, "Normal closure");
        }

        this._socket = null;

    }

    // api

    public isLoggedIn (): boolean {
        return Boolean(this._token);
    }

    public getPluginDescriptor (): Promise<operations["getPluginDescriptor"]["responses"]["200"]["content"]["application/json"]> {

        const url: keyof paths = "/mia-users-management/api/descriptor";
        const method: HttpMethodsOf<typeof url> = "get";

        return fetch(url, {
            "method": method,
            "headers": {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + this._token
            }
        }).then((res: Response): Promise<operations["getPluginDescriptor"]["responses"]["200"]["content"]["application/json"]> => {

            return this._parseResponse(res) as Promise<operations["getPluginDescriptor"]["responses"]["200"]["content"]["application/json"]>;

        });

    }

    public getPluginStatus (): Promise<operations["getPluginStatus"]["responses"]["200"]["content"]["application/json"]> {

        const url: keyof paths = "/mia-users-management/api/status";
        const method: HttpMethodsOf<typeof url> = "get";

        return fetch(url, {
            "method": method,
            "headers": {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + this._token
            }
        }).then((res: Response): Promise<operations["getPluginStatus"]["responses"]["200"]["content"]["application/json"]> => {

            if (404 === res.status) {
                return Promise.resolve("RELEASED");
            }

            return this._parseResponse(res) as Promise<operations["getPluginStatus"]["responses"]["200"]["content"]["application/json"]>;

        });

    }

    public getUsers (): Promise<operations["getUsers"]["responses"]["200"]["content"]["application/json"]> {

        const url: keyof paths = "/mia-users-management/api/users";
        const method: HttpMethodsOf<typeof url> = "get";

        return fetch(url, {
            "method": method,
            "headers": {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + this._token
            }
        }).then((res: Response): Promise<operations["getUsers"]["responses"]["200"]["content"]["application/json"]> => {

            return this._parseResponse(res) as Promise<operations["getUsers"]["responses"]["200"]["content"]["application/json"]>;

        });

    }

    public createUser (
        data: operations["createUser"]["requestBody"]["content"]["application/json"]
    ): Promise<operations["createUser"]["responses"]["201"]["content"]["application/json"]> {

        const url: keyof paths = "/mia-users-management/api/users";
        const method: HttpMethodsOf<typeof url> = "put";

        return fetch(url, {
            "method": method,
            "headers": {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + this._token
            },
            "body": JSON.stringify(data)
        }).then((res: Response): Promise<operations["createUser"]["responses"]["201"]["content"]["application/json"]> => {

            return this._parseResponse(res) as Promise<operations["createUser"]["responses"]["201"]["content"]["application/json"]>;

        });

    }

    public getUser (
        name: operations["getUser"]["parameters"]["path"]["name"]
    ): Promise<operations["getUser"]["responses"]["200"]["content"]["application/json"]> {

        const url: `/mia-users-management/api/users/${string}` = `/mia-users-management/api/users/${encodeURIComponent(name)}`;
        const method: HttpMethodsOf<"/mia-users-management/api/users/{name}"> = "get";

        return fetch(url, {
            "method": method,
            "headers": {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + this._token
            }
        }).then((res: Response): Promise<operations["getUser"]["responses"]["200"]["content"]["application/json"]> => {

            return this._parseResponse(res) as Promise<operations["getUser"]["responses"]["200"]["content"]["application/json"]>;

        });

    }

    public updateUser (
        name: operations["updateUser"]["parameters"]["path"]["name"],
        data: operations["updateUser"]["requestBody"]["content"]["application/json"]
    ): Promise<operations["updateUser"]["responses"]["200"]["content"]["application/json"]> {

        const url: `/mia-users-management/api/users/${string}` = `/mia-users-management/api/users/${encodeURIComponent(name)}`;
        const method: HttpMethodsOf<"/mia-users-management/api/users/{name}"> = "post";

        return fetch(url, {
            "method": method,
            "headers": {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + this._token
            },
            "body": JSON.stringify(data)
        }).then((res: Response): Promise<operations["updateUser"]["responses"]["200"]["content"]["application/json"]> => {

            return this._parseResponse(res) as Promise<operations["updateUser"]["responses"]["200"]["content"]["application/json"]>;

        });

    }

    public deleteUser (name: operations["deleteUser"]["parameters"]["path"]["name"]): Promise<void> {

        const url: `/mia-users-management/api/users/${string}` = `/mia-users-management/api/users/${encodeURIComponent(name)}`;
        const method: HttpMethodsOf<"/mia-users-management/api/users/{name}"> = "delete";

        return fetch(url, {
            "method": method,
            "headers": {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + this._token
            }
        }).then((res: Response): Promise<void> => {

            if (res.ok) {
                return Promise.resolve();
            }

            return this._parseResponse(res) as Promise<void>;

        });

    }

    public getUserTokens (
        name: operations["getUserTokens"]["parameters"]["path"]["name"]
    ): Promise<operations["getUserTokens"]["responses"]["200"]["content"]["application/json"]> {

        const url: `/mia-users-management/api/users/${string}/tokens` = `/mia-users-management/api/users/${encodeURIComponent(name)}/tokens`;
        const method: HttpMethodsOf<"/mia-users-management/api/users/{name}/tokens"> = "get";

        return fetch(url, {
            "method": method,
            "headers": {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + this._token
            }
        }).then((res: Response): Promise<operations["getUserTokens"]["responses"]["200"]["content"]["application/json"]> => {

            return this._parseResponse(res) as Promise<operations["getUserTokens"]["responses"]["200"]["content"]["application/json"]>;

        });

    }

    public deleteToken (
        data: operations["deleteToken"]["requestBody"]["content"]["application/json"]
    ): Promise<void> {

        const url: keyof paths = "/mia-users-management/api/tokens";
        const method: HttpMethodsOf<typeof url> = "delete";

        return fetch(url, {
            "method": method,
            "headers": {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + this._token
            },
            "body": JSON.stringify(data)
        }).then((res: Response): Promise<void> => {

            if (res.ok) {
                return Promise.resolve();
            }

            return this._parseResponse(res) as Promise<void>;

        });

    }

}

let _sdk: SDK | null = null;

export default function getSDK (): SDK {

    _sdk ??= new SDK();

    return _sdk;

}
