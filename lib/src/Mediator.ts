// deps

    // natives
    import { readFile } from "node:fs/promises";
    import { join } from "node:path";

    // externals
    import {
        Mediator,
        ConflictError, NotFoundError, UnauthorizedError
    } from "node-pluginsmanager-plugin";
    import type ContainerPattern from "node-containerpattern";
    import type { iDescriptorUserOptions, iEventsMinimal } from "node-pluginsmanager-plugin";

    // locals
    import getCaller from "./utils/getCaller";
    import type { iUrlWithHeaders } from "./utils/getCaller";
    import { assertAdmin, assertSelfOrAdmin } from "./utils/assertPermissions";
    import { serializeToken, serializeUser } from "./utils/serializeAuth";
    import type { AuthDatabase, AuthTokenPublic, AuthUserPublic, FullAuthPublic } from "./@types/AuthDatabase";
    import type { components, operations } from "./Descriptor";

// module

export default class MediatorUsersManagement extends Mediator<iEventsMinimal & {
    "initialized": [ ContainerPattern ];
    "released": [ ContainerPattern ];
    "error": [ components["schemas"]["PushEventPluginError"]["data"] ];
}> {

    // attributes

        private _authDb: AuthDatabase | null;

    // constructor

    public constructor (data: iDescriptorUserOptions) {

        super(data);

        this._authDb = null;

    }

    protected _initWorkSpace (container: ContainerPattern): Promise<void> {

        this._authDb = container.get<AuthDatabase>("auth-db");

        return Promise.resolve();

    }

    protected _releaseWorkSpace (): Promise<void> {

        this._authDb = null;

        return Promise.resolve();

    }

    private _getAuthDb (): AuthDatabase {

        if (!this._authDb) {
            throw new Error("Auth database is not initialized");
        }

        return this._authDb;

    }

    // front files

    public getFrontIndex (): Promise<operations["getFrontIndex"]["responses"]["200"]["content"]["text/html"]> {

        return readFile(join(__dirname, "..", "..", "public", "index.html"), "utf-8").then((content: string): string => {

            return content

                .replace(/{{plugin.name}}/g, this.getPluginName())
                .replace(/{{plugin.version}}/g, this.getPluginVersion())
                .replace(/{{plugin.description}}/g, this.getPluginDescription());

        });

    }

    public getFrontApp (): Promise<operations["getFrontApp"]["responses"]["200"]["content"]["application/javascript"]> {

        return readFile(join(__dirname, "..", "..", "public", "dist", "bundle.min.js"), "utf-8").then((content: string): string => {

            return content

                .replace(/{{plugin.name}}/g, this.getPluginName())
                .replace(/{{plugin.version}}/g, this.getPluginVersion())
                .replace(/{{plugin.description}}/g, this.getPluginDescription());

        });

    }

    public getFrontAppMap (): Promise<string> { // tricks return to avoid costful parsing
        return readFile(join(__dirname, "..", "..", "public", "dist", "bundle.min.js.map"), "utf-8");
    }

    // api

    public getUsers (): Promise<operations["getUsers"]["responses"]["200"]["content"]["application/json"]> {

        return this._getAuthDb().getUsers().then((users: AuthUserPublic[]): operations["getUsers"]["responses"]["200"]["content"]["application/json"] => {

            return users.map(serializeUser);

        });

    }

    public createUser (
        urlParameters: operations["createUser"]["parameters"] & iUrlWithHeaders,
        bodyParameters: operations["createUser"]["requestBody"]["content"]["application/json"]
    ): Promise<operations["createUser"]["responses"]["201"]["content"]["application/json"]> {

        const authDb: AuthDatabase = this._getAuthDb();

        return getCaller(authDb, urlParameters).then((caller: FullAuthPublic): Promise<void> => {

            assertAdmin(caller);

            return authDb.getUserByName(bodyParameters.name).then((existing: AuthUserPublic | undefined): Promise<void> => {

                if (existing) {
                    throw new ConflictError("User '" + bodyParameters.name + "' already exists");
                }

                return authDb.addUser(bodyParameters.name, bodyParameters.password, Boolean(bodyParameters.isAdmin));

            });

        }).then((): Promise<AuthUserPublic | undefined> => {

            return authDb.getUserByName(bodyParameters.name);

        }).then((user: AuthUserPublic | undefined): operations["createUser"]["responses"]["201"]["content"]["application/json"] => {

            if (!user) {
                throw new Error("User was not created");
            }

            return serializeUser(user);

        });

    }

    public getUser (
        urlParameters: operations["getUser"]["parameters"]
    ): Promise<operations["getUser"]["responses"]["200"]["content"]["application/json"]> {

        const name: string = urlParameters.path.name;

        return this._getAuthDb().getUserByName(name).then((user: AuthUserPublic | undefined): operations["getUser"]["responses"]["200"]["content"]["application/json"] => {

            if (!user) {
                throw new NotFoundError("User '" + name + "' not found");
            }

            return serializeUser(user);

        });

    }

    public updateUser (
        urlParameters: operations["updateUser"]["parameters"] & iUrlWithHeaders,
        bodyParameters: operations["updateUser"]["requestBody"]["content"]["application/json"]
    ): Promise<operations["updateUser"]["responses"]["200"]["content"]["application/json"]> {

        const authDb: AuthDatabase = this._getAuthDb();
        const name: string = urlParameters.path.name;

        return getCaller(authDb, urlParameters).then((caller: FullAuthPublic): Promise<void> => {

            assertSelfOrAdmin(caller, name);

            if ("boolean" === typeof bodyParameters.isAdmin && !caller.isAdmin) {
                throw new UnauthorizedError("Admin privileges required to change isAdmin");
            }

            return authDb.getUserByName(name).then((existing: AuthUserPublic | undefined): Promise<void> => {

                if (!existing) {
                    throw new NotFoundError("User '" + name + "' not found");
                }

                let lastAdminGuard: Promise<void> = Promise.resolve();

                if (false === bodyParameters.isAdmin && existing.isAdmin) {

                    lastAdminGuard = authDb.getUsers().then((users: AuthUserPublic[]): void => {

                        const adminCount: number = users.filter((user: AuthUserPublic): boolean => {
                            return user.isAdmin;
                        }).length;

                        if (1 >= adminCount) {
                            throw new ConflictError("Cannot remove the last admin");
                        }

                    });

                }

                return lastAdminGuard.then((): Promise<void> => {

                    const tasks: Array<Promise<void>> = [];

                    if ("string" === typeof bodyParameters.password) {
                        tasks.push(authDb.editUserPassword(name, bodyParameters.password));
                    }

                    if ("boolean" === typeof bodyParameters.isAdmin) {
                        tasks.push(authDb.editUserIsAdmin(name, bodyParameters.isAdmin));
                    }

                    return Promise.all(tasks).then((): void => {
                        // no-op: wait for password / isAdmin updates
                    });

                });

            });

        }).then((): Promise<AuthUserPublic | undefined> => {

            return authDb.getUserByName(name);

        }).then((user: AuthUserPublic | undefined): operations["updateUser"]["responses"]["200"]["content"]["application/json"] => {

            if (!user) {
                throw new NotFoundError("User '" + name + "' not found");
            }

            return serializeUser(user);

        });

    }

    public deleteUser (
        urlParameters: operations["deleteUser"]["parameters"] & iUrlWithHeaders
    ): Promise<void> {

        const authDb: AuthDatabase = this._getAuthDb();
        const name: string = urlParameters.path.name;

        return getCaller(authDb, urlParameters).then((caller: FullAuthPublic): Promise<void> => {

            assertSelfOrAdmin(caller, name);

            return authDb.getUserByName(name).then((existing: AuthUserPublic | undefined): Promise<void> => {

                if (!existing) {
                    throw new NotFoundError("User '" + name + "' not found");
                }

                if (!existing.isAdmin) {
                    return authDb.removeUser(name);
                }

                return authDb.getUsers().then((users: AuthUserPublic[]): Promise<void> => {

                    const adminCount: number = users.filter((user: AuthUserPublic): boolean => {
                        return user.isAdmin;
                    }).length;

                    if (1 >= adminCount) {
                        throw new ConflictError("Cannot delete the last admin");
                    }

                    return authDb.removeUser(name);

                });

            });

        });

    }

    public getUserTokens (
        urlParameters: operations["getUserTokens"]["parameters"] & iUrlWithHeaders
    ): Promise<operations["getUserTokens"]["responses"]["200"]["content"]["application/json"]> {

        const authDb: AuthDatabase = this._getAuthDb();
        const name: string = urlParameters.path.name;

        return getCaller(authDb, urlParameters).then((caller: FullAuthPublic): Promise<AuthTokenPublic[]> => {

            assertSelfOrAdmin(caller, name);

            return authDb.getUserByName(name).then((existing: AuthUserPublic | undefined): Promise<AuthTokenPublic[]> => {

                if (!existing) {
                    throw new NotFoundError("User '" + name + "' not found");
                }

                return authDb.getTokensByUserName(name);

            });

        }).then((tokens: AuthTokenPublic[]): operations["getUserTokens"]["responses"]["200"]["content"]["application/json"] => {

            return tokens.map(serializeToken);

        });

    }

    public deleteToken (
        urlParameters: operations["deleteToken"]["parameters"] & iUrlWithHeaders,
        bodyParameters: operations["deleteToken"]["requestBody"]["content"]["application/json"]
    ): Promise<void> {

        const authDb: AuthDatabase = this._getAuthDb();
        const token: string = bodyParameters.token;

        return getCaller(authDb, urlParameters).then((caller: FullAuthPublic): Promise<void> => {

            return authDb.getUserByToken(token).then((owner: FullAuthPublic | undefined): Promise<void> => {

                if (!owner) {
                    throw new NotFoundError("Token not found");
                }

                if (!caller.isAdmin && caller.name !== owner.name) {
                    throw new UnauthorizedError("Forbidden");
                }

                return authDb.removeToken(token);

            });

        });

    }

}
