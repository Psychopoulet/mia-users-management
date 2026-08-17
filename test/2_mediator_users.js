// deps

    // natives
    const { strictEqual, deepStrictEqual, rejects } = require("node:assert");

    // externals
    const { UnauthorizedError, NotFoundError, ConflictError } = require("node-pluginsmanager-plugin");

    // locals
    const {
        createAuthDb, authHeaders, loadDescriptor, createMediator
    } = require("./utils/mediatorTestHelpers");

// tests

describe("Mediator users", () => {

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

    describe("getUsers / getUser", () => {

        it("should list users", async () => {

            const users = await mediator.getUsers();

            strictEqual(users.length, 3);
            strictEqual(users[0].name, "admin");
            strictEqual(typeof users[0].createdAt, "string");

        });

        it("should get a user by name", async () => {

            const user = await mediator.getUser({
                "path": {
                    "name": "alice"
                }
            });

            deepStrictEqual(user, {
                "name": "alice",
                "isAdmin": false,
                "createdAt": "2024-01-01T00:00:00.000Z"
            });

        });

        it("should fail when user is missing", async () => {

            await rejects(() => {
                return mediator.getUser({
                    "path": {
                        "name": "ghost"
                    }
                });
            }, NotFoundError);

        });

    });

    describe("createUser", () => {

        it("should allow admin to create a user", async () => {

            const user = await mediator.createUser(authHeaders("tok-admin"), {
                "name": "carol",
                "password": "secret",
                "isAdmin": false
            });

            strictEqual(user.name, "carol");
            strictEqual(user.isAdmin, false);

        });

        it("should forbid non-admin create", async () => {

            await rejects(() => {
                return mediator.createUser(authHeaders("tok-alice"), {
                    "name": "carol",
                    "password": "secret"
                });
            }, UnauthorizedError);

        });

        it("should conflict when user already exists", async () => {

            await rejects(() => {
                return mediator.createUser(authHeaders("tok-admin"), {
                    "name": "alice",
                    "password": "secret"
                });
            }, ConflictError);

        });

    });

    describe("updateUser", () => {

        it("should allow self to update password", async () => {

            const user = await mediator.updateUser({
                ...authHeaders("tok-alice"),
                "path": {
                    "name": "alice"
                }
            }, {
                "password": "new-pass"
            });

            strictEqual(user.name, "alice");

        });

        it("should allow admin to update another user", async () => {

            const user = await mediator.updateUser({
                ...authHeaders("tok-admin"),
                "path": {
                    "name": "bob"
                }
            }, {
                "isAdmin": true
            });

            strictEqual(user.isAdmin, true);

        });

        it("should forbid editing another user when not admin", async () => {

            await rejects(() => {
                return mediator.updateUser({
                    ...authHeaders("tok-alice"),
                    "path": {
                        "name": "bob"
                    }
                }, {
                    "password": "x"
                });
            }, UnauthorizedError);

        });

        it("should forbid non-admin from changing isAdmin", async () => {

            await rejects(() => {
                return mediator.updateUser({
                    ...authHeaders("tok-alice"),
                    "path": {
                        "name": "alice"
                    }
                }, {
                    "isAdmin": true
                });
            }, UnauthorizedError);

        });

        it("should fail when target user is missing", async () => {

            await rejects(() => {
                return mediator.updateUser({
                    ...authHeaders("tok-admin"),
                    "path": {
                        "name": "ghost"
                    }
                }, {
                    "password": "x"
                });
            }, NotFoundError);

        });

    });

    describe("deleteUser", () => {

        it("should allow self delete", async () => {

            await mediator.deleteUser({
                ...authHeaders("tok-bob"),
                "path": {
                    "name": "bob"
                }
            });

            await rejects(() => {
                return mediator.getUser({
                    "path": {
                        "name": "bob"
                    }
                });
            }, NotFoundError);

        });

        it("should forbid deleting another user when not admin", async () => {

            await rejects(() => {
                return mediator.deleteUser({
                    ...authHeaders("tok-alice"),
                    "path": {
                        "name": "bob"
                    }
                });
            }, UnauthorizedError);

        });

        it("should fail when deleting a missing user", async () => {

            await rejects(() => {
                return mediator.deleteUser({
                    ...authHeaders("tok-admin"),
                    "path": {
                        "name": "ghost"
                    }
                });
            }, NotFoundError);

        });

        it("should forbid deleting the last admin", async () => {

            await rejects(() => {
                return mediator.deleteUser({
                    ...authHeaders("tok-admin"),
                    "path": {
                        "name": "admin"
                    }
                });
            }, ConflictError);

            const user = await mediator.getUser({
                "path": {
                    "name": "admin"
                }
            });

            strictEqual(user.name, "admin");

        });

    });

});
