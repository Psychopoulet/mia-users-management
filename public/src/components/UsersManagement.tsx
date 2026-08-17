// deps

    // externals
    import React from "react";
    import {
        Card, CardHeader, CardList, CardFooter,
        Alert, Button
    } from "react-bootstrap-fontawesome";

    // locals
    import getSDK from "../SDK";
    import { canCreateUser } from "../utils/userPermissions";
    import { CurrentUserContext } from "./CurrentUserContext";
    import UserListItem from "./UserListItem";
    import UserCreateModal from "./UserCreateModal";
    import UserEditModal from "./UserEditModal";
    import UserDeleteModal from "./UserDeleteModal";
    import UserTokensModal from "./UserTokensModal";

// types & interfaces

    // externals
    import type { iPropsNode } from "react-bootstrap-fontawesome";

    // locals
    import type { components } from "../Descriptor";

    type User = components["schemas"]["User"];

    interface iProps extends iPropsNode {
        "onError": (err: Error) => void;
    }

    interface iState {
        "loading": boolean;
        "users": User[];
        "createOpened": boolean;
        "editUser": User | null;
        "deleteUser": User | null;
        "tokensUser": User | null;
    }

// component

export default class UsersManagement extends React.Component<iProps, iState> {

    // name

        public static displayName: string = "UsersManagement";

        public static contextType: typeof CurrentUserContext = CurrentUserContext;

        declare public context: React.ContextType<typeof CurrentUserContext>;

    // constructor

    public constructor (props: iProps) {

        super(props);

        this.state = {
            "loading": true,
            "users": [],
            "createOpened": false,
            "editUser": null,
            "deleteUser": null,
            "tokensUser": null
        };

    }

    public componentDidMount (): void {

        this._loadUsers();

    }

    // private

    private _loadUsers (): void {

        this.setState({
            "loading": true
        });

        getSDK().getUsers().then((users: User[]): void => {

            this.setState({
                "loading": false,
                "users": users
            });

        }).catch((err: Error): void => {

            this.props.onError(err);
            this.setState({
                "loading": false
            });

        });

    }

    // interface handlers

    private readonly _handleOpenCreate = (e: React.MouseEvent<HTMLButtonElement>): void => {

        e.preventDefault();
        e.stopPropagation();

        this.setState({
            "createOpened": true
        });

    };

    private readonly _handleCloseCreate = (): void => {

        this.setState({
            "createOpened": false
        });

    };

    private readonly _handleEdit = (user: User): void => {

        this.setState({
            "editUser": user
        });

    };

    private readonly _handleCloseEdit = (): void => {

        this.setState({
            "editUser": null
        });

    };

    private readonly _handleDelete = (user: User): void => {

        this.setState({
            "deleteUser": user
        });

    };

    private readonly _handleCloseDelete = (): void => {

        this.setState({
            "deleteUser": null
        });

    };

    private readonly _handleTokens = (user: User): void => {

        this.setState({
            "tokensUser": user
        });

    };

    private readonly _handleCloseTokens = (): void => {

        this.setState({
            "tokensUser": null
        });

    };

    private readonly _handleRefresh = (): void => {

        this._loadUsers();

    };

    // render

    public render (): React.JSX.Element {

        const me: User | null = this.context.user;
        const showCreate: boolean = Boolean(me && canCreateUser(me));

        return <>

            { this.state.createOpened && <UserCreateModal
                onClose={ this._handleCloseCreate }
                onCreated={ this._handleRefresh }
                onError={ this.props.onError }
            /> }

            { this.state.editUser && <UserEditModal
                user={ this.state.editUser }
                onClose={ this._handleCloseEdit }
                onUpdated={ this._handleRefresh }
                onError={ this.props.onError }
            /> }

            { this.state.deleteUser && <UserDeleteModal
                user={ this.state.deleteUser }
                onClose={ this._handleCloseDelete }
                onDeleted={ this._handleRefresh }
                onError={ this.props.onError }
            /> }

            { this.state.tokensUser && <UserTokensModal
                userName={ this.state.tokensUser.name }
                onClose={ this._handleCloseTokens }
                onError={ this.props.onError }
            /> }

            <Card>

                <CardHeader>Users</CardHeader>

                <CardList>

                    { this.state.loading && <Alert variant="info">Loading users...</Alert> }

                    { !this.state.loading && !this.state.users.length && <Alert variant="secondary">No users</Alert> }

                    { !this.state.loading && this.state.users.map((user: User): React.JSX.Element => {

                        return <UserListItem key={ user.name }
                            user={ user }
                            onEdit={ this._handleEdit }
                            onDelete={ this._handleDelete }
                            onTokens={ this._handleTokens }
                        />;

                    }) }

                </CardList>

                { showCreate && <CardFooter>
                    <Button icon="plus" variant="success" onClick={ this._handleOpenCreate }>
                        Create user
                    </Button>
                </CardFooter> }

            </Card>

        </>;

    }

}
