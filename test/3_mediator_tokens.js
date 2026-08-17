// deps

    // natives
    const { strictEqual, rejects } = require("node:assert");

    // externals
    const { UnauthorizedError, NotFoundError } = require("node-pluginsmanager-plugin");

    // locals
    const {
        createAuthDb, authHeaders, loadDescriptor, createMediator
    } = require("./utils/mediatorTestHelpers");

// tests

describe("Mediator tokens & coverage", () => {

    let descriptor = null;
    let authDb = null;
    let mediator = null;

    before(async () => {
        descriptor = await loadDescriptor();
    });

    beforeEach(async () => {

        authDb = createAuthDb();
        authDb.seedUser("admin", true, "tok-admin");
        authDb.seedUser("alice", false, "tok-alice");
        authDb.seedUser("bob", false, "tok-bob");
        mediator = await createMediator(authDb, descriptor);

    });

    afterEach(async () => {

        const instance = mediator;
        mediator = null;
        authDb = null;

        if (null !== instance) {
            await instance.release();
        }

    });

    describe("tokens", () => {

        it("should list own tokens", async () => {

            const tokens = await mediator.getUserTokens({
                ...authHeaders("tok-alice"),
                "path": {
                    "name": "alice"
                }
            });

            strictEqual(tokens.length, 1);
            strictEqual(tokens[0].token, "tok-alice");
            strictEqual(typeof tokens[0].createdAt, "string");

        });

        it("should allow admin to list another user's tokens", async () => {

            const tokens = await mediator.getUserTokens({
                ...authHeaders("tok-admin"),
                "path": {
                    "name": "alice"
                }
            });

            strictEqual(tokens.length, 1);

        });

        it("should forbid listing another user's tokens when not admin", async () => {

            await rejects(() => {
                return mediator.getUserTokens({
                    ...authHeaders("tok-alice"),
                    "path": {
                        "name": "bob"
                    }
                });
            }, UnauthorizedError);

        });

        it("should allow owner to delete own token", async () => {

            await mediator.deleteToken(authHeaders("tok-alice"), {
                "token": "tok-alice"
            });

            const tokens = await mediator.getUserTokens({
                ...authHeaders("tok-admin"),
                "path": {
                    "name": "alice"
                }
            });

            strictEqual(tokens.length, 0);

        });

        it("should forbid deleting another user's token when not admin", async () => {

            await rejects(() => {
                return mediator.deleteToken(authHeaders("tok-alice"), {
                    "token": "tok-bob"
                });
            }, UnauthorizedError);

        });

        it("should fail when token is missing", async () => {

            await rejects(() => {
                return mediator.deleteToken(authHeaders("tok-admin"), {
                    "token": "unknown"
                });
            }, NotFoundError);

        });

        it("should fail when listing tokens of a missing user", async () => {

            await rejects(() => {
                return mediator.getUserTokens({
                    ...authHeaders("tok-admin"),
                    "path": {
                        "name": "ghost"
                    }
                });
            }, NotFoundError);

        });

    });

    describe("authorization errors", () => {

        it("should reject missing authorization on protected ops", async () => {

            let failed = false;

            try {
                await mediator.createUser({}, {
                    "name": "x",
                    "password": "y"
                });
            }
            catch (err) {
                failed = true;
                strictEqual(err instanceof Error, true);
                strictEqual(err.message, "Missing Authorization header");
            }

            strictEqual(failed, true);

        });

        it("should reject invalid authorization header", async () => {

            let failed = false;

            try {
                await mediator.createUser({
                    "headers": {
                        "authorization": "Basic nope"
                    }
                }, {
                    "name": "x",
                    "password": "y"
                });
            }
            catch (err) {
                failed = true;
                strictEqual(err instanceof Error, true);
                strictEqual(err.message, "Invalid Authorization header");
            }

            strictEqual(failed, true);

        });

        it("should reject invalid token", async () => {

            let failed = false;

            try {
                await mediator.createUser(authHeaders("tok-unknown"), {
                    "name": "x",
                    "password": "y"
                });
            }
            catch (err) {
                failed = true;
                strictEqual(err instanceof Error, true);
                strictEqual(err.message, "Invalid token");
            }

            strictEqual(failed, true);

        });

        it("should accept authorization from header alias and array value", async () => {

            const user = await mediator.createUser({
                "header": {
                    "Authorization": [ "Bearer tok-admin" ]
                }
            }, {
                "name": "dave",
                "password": "secret"
            });

            strictEqual(user.name, "dave");

        });

    });

    describe("front files", () => {

        it("should read front index", async () => {

            const html = await mediator.getFrontIndex();
            strictEqual(typeof html, "string");
            strictEqual(0 < html.length, true);

        });

        it("should read front app bundle", async () => {

            const js = await mediator.getFrontApp();
            strictEqual(typeof js, "string");

        });

        it("should read front app map", async () => {

            const map = await mediator.getFrontAppMap();
            strictEqual(typeof map, "string");

        });

    });

    describe("edge cases", () => {

        it("should fail when auth-db is not initialized", async () => {

            const current = mediator;
            mediator = null;
            await current.release();

            let failed = false;

            try {
                await current.getUsers();
            }
            catch (err) {
                failed = true;
                strictEqual(err.message, "Auth database is not initialized");
            }

            strictEqual(failed, true);

        });

        it("should fail when createUser cannot reload the user", async () => {

            const originalGet = authDb.getUserByName.bind(authDb);
            let calls = 0;

            authDb.getUserByName = (name) => {

                calls += 1;

                if (1 === calls) {
                    return Promise.resolve();
                }

                return originalGet(name);

            };

            authDb.addUser = () => {
                return Promise.resolve();
            };

            let failed = false;

            try {
                await mediator.createUser(authHeaders("tok-admin"), {
                    "name": "erin",
                    "password": "secret"
                });
            }
            catch (err) {
                failed = true;
                strictEqual(err.message, "User was not created");
            }

            strictEqual(failed, true);

        });

        it("should fail when updateUser cannot reload the user", async () => {

            const originalGet = authDb.getUserByName.bind(authDb);
            let calls = 0;

            authDb.getUserByName = (name) => {

                calls += 1;

                if (1 === calls) {
                    return originalGet(name);
                }

                return Promise.resolve();

            };

            await rejects(() => {
                return mediator.updateUser({
                    ...authHeaders("tok-admin"),
                    "path": {
                        "name": "alice"
                    }
                }, {
                    "password": "x"
                });
            }, NotFoundError);

        });

    });

});
