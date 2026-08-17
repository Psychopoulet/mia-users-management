// deps

    // externals
    import { Server } from "node-pluginsmanager-plugin";

// types & interfaces

    // locals
    import type MediatorUsersManagement from "./Mediator";
    import type { components } from "./Descriptor";

// module

export default class ServerUsersManagement extends Server {

    public _initWorkSpace (): Promise<void> {

        (this._Mediator as MediatorUsersManagement)

            .on("initialized", this._onPluginInitialized)
            .on("released", this._onPluginReleased)
            .on("error", this._onPluginError)
            .on("user.added", this._onUserAdded)
            .on("user.removed", this._onUserRemoved);

        return Promise.resolve();

    }

    public _releaseWorkSpace (): Promise<void> {

        (this._Mediator as MediatorUsersManagement)

            .off("initialized", this._onPluginInitialized)
            .off("released", this._onPluginReleased)
            .off("error", this._onPluginError)
            .off("user.added", this._onUserAdded)
            .off("user.removed", this._onUserRemoved);

        return Promise.resolve();

    }

    // <events>

    private readonly _onPluginInitialized = (): void => {

        this.push("initialized");

    };

    private readonly _onPluginReleased = (): void => {

        this.push("released");

    };

    private readonly _onPluginError = (data: components["schemas"]["PushEventPluginError"]["data"]): void => {

        this.push("error", data);

    };

    private readonly _onUserAdded = (data: components["schemas"]["PushEventUserAdded"]["data"]): void => {

        this.push("user.added", data);

    };

    private readonly _onUserRemoved = (data: components["schemas"]["PushEventUserRemoved"]["data"]): void => {

        this.push("user.removed", data);

    };

}
